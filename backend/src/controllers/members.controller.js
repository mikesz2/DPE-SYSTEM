const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const prisma = require('../config/prisma');
const { audit, HttpError } = require('../utils/http');
const { fetchHabboProfile, avatarImageUrl } = require('../utils/habbo');
const { serializeMember } = require('./auth.controller');
const { ROLE_ORDER } = require('../middleware/permissions');
const { recordFieldChanges } = require('../services/field-changes');

const ONLINE_WINDOW_MINUTES = 5;

async function list(req, res) {
  await prisma.member.updateMany({
    where: { status: 'EXPULSO', bannedUntil: { lte: new Date() } },
    data: { status: 'ATIVO' },
  });
  const { q, rankId, divisionId, status } = req.query;
  const members = await prisma.member.findMany({
    where: {
      ...(q ? { habboName: { contains: String(q) } } : {}), // SQLite: LIKE já é case-insensitive p/ ASCII
      ...(rankId ? { rankId: Number(rankId) } : {}),
      ...(divisionId ? { divisionId: Number(divisionId) } : {}),
      ...(status ? { status: String(status) } : {}),
    },
    include: {
      rank: true,
      division: true,
      purchases: { where: { equipped: true, item: { kind: 'EMBLEM', active: true } }, include: { item: true }, orderBy: { createdAt: 'asc' } },
      _count: { select: { medals: true } },
    },
    orderBy: [{ rank: { level: 'desc' } }, { habboName: 'asc' }],
  });
  const onlineSince = new Date(Date.now() - ONLINE_WINDOW_MINUTES * 60 * 1000);
  res.json({ members: members.map(m => ({
    ...serializeMember(m),
    medalCount: m._count.medals,
    emblems: m.purchases.map(purchase => ({ id: purchase.item.id, name: purchase.item.name, imageUrl: purchase.item.code === 'emblem-papai-noel-01' ? '/assets/store/gorro-papai-noel-v3.png' : purchase.item.imageUrl })),
    online: !!m.lastSeenAt && m.lastSeenAt > onlineSince,
  })) });
}

async function getOne(req, res) {
  const id = Number(req.params.id);
  const member = await prisma.member.findUnique({
    where: { id },
    include: {
      rank: true,
      division: true,
      medals: true,
      purchases: { where: { equipped: true, item: { kind: 'EMBLEM', active: true } }, include: { item: true }, orderBy: { createdAt: 'asc' } },
    },
  });
  if (!member) throw new HttpError(404, 'Militar não encontrado.');
  const following = id !== req.member.id && !!(await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId: req.member.id, followingId: id } },
  }));
  const onlineSince = new Date(Date.now() - ONLINE_WINDOW_MINUTES * 60 * 1000);
  res.json({ member: {
    ...serializeMember(member),
    online: !!member.lastSeenAt && member.lastSeenAt > onlineSince,
    medals: member.medals,
    emblems: member.purchases.map(purchase => ({ id: purchase.item.id, name: purchase.item.name, imageUrl: purchase.item.code === 'emblem-papai-noel-01' ? '/assets/store/gorro-papai-noel-v3.png' : purchase.item.imageUrl })),
  }, following });
}

/** Cadastro manual pelo staff (RH). A pessoa recebe uma senha temporária para o primeiro acesso. */
async function create(req, res) {
  const { habboName, rankId, divisionId } = req.body;
  if (!habboName || !rankId) throw new HttpError(400, 'Informe ao menos o nome do Habbo e a patente inicial.');

  const profile = await fetchHabboProfile(String(habboName).trim());
  const existing = await prisma.member.findUnique({ where: { habboName: profile.name } });
  if (existing) throw new HttpError(409, 'Esse militar já está cadastrado.');

  const tempPassword = crypto.randomBytes(5).toString('base64url');
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  const member = await prisma.member.create({
    data: { habboName: profile.name, habboUniqueId: profile.uniqueId, passwordHash, rankId: Number(rankId), rankStartedAt: new Date(), divisionId: divisionId ? Number(divisionId) : null },
    include: { rank: true, division: true },
  });
  await audit(req.member.id, 'MEMBER_CREATED', { targetId: member.id, habboName: member.habboName });
  res.status(201).json({ member: serializeMember(member), tempPassword, note: 'Repasse essa senha temporária ao militar — ele deve trocá-la no primeiro acesso.' });
}

/** Atualiza patente/divisão/papel/status — cada mudança relevante vira notificação + log de auditoria. */
async function update(req, res) {
  const id = Number(req.params.id);
  const current = await prisma.member.findUnique({ where: { id }, include: { rank: true, division: true } });
  if (!current) throw new HttpError(404, 'Militar não encontrado.');

  const data = {};
  const notifications = [];
  const { rankId, divisionId, role, status, coinsDelta } = req.body;

  const actingLevel = ROLE_ORDER.indexOf(req.member.role);
  const targetLevel = ROLE_ORDER.indexOf(current.role);
  if (req.member.role !== 'SUPREMO' && targetLevel >= actingLevel) {
    throw new HttpError(403, 'Você não pode alterar alguém com cargo igual ou superior ao seu.');
  }

  if (rankId && Number(rankId) !== current.rankId) {
    const newRank = await prisma.rank.findUnique({ where: { id: Number(rankId) } });
    if (!newRank) throw new HttpError(400, 'Patente inválida.');
    data.rankId = newRank.id;
    data.rankStartedAt = new Date();
    const isPromotion = newRank.level > current.rank.level;
    notifications.push({ icon: isPromotion ? '⬆️' : '⬇️', title: isPromotion ? 'Promoção' : 'Rebaixamento', text: `Você agora é ${newRank.name}.` });
    await audit(req.member.id, isPromotion ? 'MEMBER_PROMOTED' : 'MEMBER_DEMOTED', { targetId: id, from: current.rank.name, to: newRank.name });
  }
  if (divisionId !== undefined) {
    const nextDivisionId = divisionId ? Number(divisionId) : null;
    if (nextDivisionId !== current.divisionId) {
      let nextDivision = null;
      if (nextDivisionId) {
        nextDivision = await prisma.division.findUnique({ where: { id: nextDivisionId } });
        if (!nextDivision) throw new HttpError(400, 'Divisão inválida.');
      }
      data.divisionId = nextDivisionId;
      await audit(req.member.id, 'MEMBER_DIVISION_CHANGED', {
        targetId: id,
        from: current.division?.sig || null,
        to: nextDivision?.sig || null,
      });
      notifications.push({
        icon: '🛡️',
        title: 'Divisão atualizada',
        text: nextDivision ? `Sua divisão agora é ${nextDivision.sig}.` : 'Você não está mais vinculado a uma divisão.',
      });
    }
  }
  if (role) {
    if (!ROLE_ORDER.includes(role)) throw new HttpError(400, 'Cargo inválido.');
    // SUPREMO é o nível máximo. Só um SUPREMO pode conceder SUPREMO.
    // Nos demais casos, ninguém concede cargo igual ou superior ao próprio.
    const requestedLevel = ROLE_ORDER.indexOf(role);
    if (role === 'SUPREMO' && req.member.role !== 'SUPREMO') {
      throw new HttpError(403, 'Somente um Supremo pode conceder o cargo Supremo.');
    }
    if (req.member.role !== 'SUPREMO' && requestedLevel >= actingLevel) {
      throw new HttpError(403, 'Você não pode conceder um cargo igual ou superior ao seu.');
    }
    data.role = role;
    if (role !== current.role) {
      notifications.push({ icon: '🎖️', title: 'Cargo atualizado', text: `Seu cargo no System agora é ${role}.` });
      await audit(req.member.id, 'MEMBER_ROLE_CHANGED', { targetId: id, from: current.role, to: role });
    }
  }
  if (status) {
    if (status === 'EXPULSO') throw new HttpError(400, 'Use a ação de banimento para exonerar um policial.');
    data.status = status;
    if (status !== current.status) {
      await audit(req.member.id, 'MEMBER_STATUS_CHANGED', { targetId: id, from: current.status, to: status });
    }
  }
  if (coinsDelta !== undefined && coinsDelta !== null && coinsDelta !== '') {
    if (actingLevel < ROLE_ORDER.indexOf('ADMINISTRADOR')) {
      throw new HttpError(403, 'Somente Administradores ou superiores podem alterar Elite Coins.');
    }
    const delta = Number(coinsDelta);
    if (!Number.isInteger(delta) || Math.abs(delta) > 100000) {
      throw new HttpError(400, 'Ajuste de Elite Coins inválido.');
    }
    data.coins = { increment: delta };
  }

  const updated = await prisma.member.update({ where: { id }, data, include: { rank: true, division: true } });
  await recordFieldChanges(req.member.id,id,{
    Patente:{from:current.rank?.name||null,to:updated.rank?.name||null},
    Divisao:{from:current.division?.sig||null,to:updated.division?.sig||null},
    Cargo:{from:current.role,to:updated.role},
    Status:{from:current.status,to:updated.status},
    EliteCoins:{from:current.coins,to:updated.coins},
  },'MEMBER_UPDATE');
  if (notifications.length) {
    await prisma.notification.createMany({ data: notifications.map(n => ({ ...n, memberId: id })) });
  }
  res.json({ member: serializeMember(updated) });
}

async function ban(req, res) {
  const id = Number(req.params.id);
  const reason = String(req.body.reason || '').trim();
  const duration = String(req.body.duration || 'INDETERMINADO').toUpperCase();
  const allowedDurations = new Set(['1', '7', '30', '90', '365', 'INDETERMINADO']);
  if (id === req.member.id) throw new HttpError(400, 'Você não pode banir a própria conta.');
  if (reason.length < 5 || reason.length > 500) throw new HttpError(400, 'Informe um motivo entre 5 e 500 caracteres.');
  if (!allowedDurations.has(duration)) throw new HttpError(400, 'Tempo de banimento inválido.');

  const current = await prisma.member.findUnique({ where: { id }, include: { rank: true } });
  if (!current) throw new HttpError(404, 'Militar não encontrado.');
  if (current.status === 'EXPULSO') throw new HttpError(409, 'Este policial já está exonerado.');
  if (req.member.role !== 'SUPREMO' && ROLE_ORDER.indexOf(current.role) >= ROLE_ORDER.indexOf(req.member.role)) {
    throw new HttpError(403, 'Você não pode banir alguém com cargo igual ou superior ao seu.');
  }

  const recruit = await prisma.rank.findUnique({ where: { name: 'Recruta' } });
  if (!recruit) throw new HttpError(500, 'A patente Recruta não está cadastrada no System.');
  const bannedAt = new Date();
  const durationDays = duration === 'INDETERMINADO' ? null : Number(duration);
  const bannedUntil = durationDays ? new Date(bannedAt.getTime() + durationDays * 86400000) : null;
  const updated = await prisma.member.update({
    where: { id },
    data: {
      status: 'EXPULSO', role: 'MEMBRO', rankId: recruit.id, rankStartedAt: bannedAt,
      divisionId: null, bannedAt, bannedUntil, bannedReason: reason, bannedBy: req.member.habboName,
      sessionVersion: { increment: 1 },
    },
    include: { rank: true, division: true },
  });
  await audit(req.member.id, 'MEMBER_BANNED', {
    targetId: id, reason, durationDays, bannedUntil, previousRank: current.rank.name, previousRole: current.role,
  });
  res.json({ member: serializeMember(updated) });
}

async function unban(req, res) {
  const id = Number(req.params.id);
  const current = await prisma.member.findUnique({ where: { id }, include: { rank: true, division: true } });
  if (!current) throw new HttpError(404, 'Militar não encontrado.');
  if (current.status !== 'EXPULSO') throw new HttpError(409, 'Este militar não está banido.');

  const updated = await prisma.member.update({
    where: { id },
    data: {
      status: 'ATIVO',
      bannedAt: null,
      bannedUntil: null,
      bannedReason: null,
      bannedBy: null,
    },
    include: { rank: true, division: true },
  });
  await prisma.notification.create({
    data: { memberId: id, icon: '✅', title: 'Acesso restaurado', text: `Seu banimento foi removido por ${req.member.habboName}.` },
  });
  await audit(req.member.id, 'MEMBER_UNBANNED', {
    targetId: id,
    previousBannedAt: current.bannedAt,
    previousBannedUntil: current.bannedUntil,
    previousReason: current.bannedReason,
  });
  res.json({ member: serializeMember(updated) });
}

async function toggleFollow(req, res) {
  const targetId = Number(req.params.id);
  if (targetId === req.member.id) throw new HttpError(400, 'Você não pode seguir a si mesmo.');
  const existing = await prisma.follow.findUnique({ where: { followerId_followingId: { followerId: req.member.id, followingId: targetId } } });

  if (existing) {
    await prisma.$transaction([
      prisma.follow.delete({ where: { followerId_followingId: { followerId: req.member.id, followingId: targetId } } }),
      prisma.member.update({ where: { id: targetId }, data: { followerCount: { decrement: 1 } } }),
    ]);
    return res.json({ following: false });
  }
  await prisma.$transaction([
    prisma.follow.create({ data: { followerId: req.member.id, followingId: targetId } }),
    prisma.member.update({ where: { id: targetId }, data: { followerCount: { increment: 1 } } }),
    prisma.notification.create({
      data: {
        memberId: targetId,
        icon: '👤',
        title: 'Novo seguidor',
        text: `${req.member.habboName} começou a seguir você na Rede DPE.`,
      },
    }),
  ]);
  res.json({ following: true });
}

async function stats(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) throw new HttpError(400, 'Militar inválido.');

  const member = await prisma.member.findUnique({
    where: { id },
    include: { rank: true, division: true, _count: { select: { medals: true } } },
  });
  if (!member) throw new HttpError(404, 'Militar não encontrado.');

  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const [shifts, lessons, followerCount, socialPosts, socialLikes] = await prisma.$transaction([
    prisma.shift.findMany({
      where: { memberId: id },
      select: {
        startedAt: true, endedAt: true, station: true, stationStartedAt: true,
        baseSeconds: true, ocSeconds: true, obSeconds: true,
        absenceStartedAt: true, absenceSeconds: true,
      },
      orderBy: { startedAt: 'asc' },
    }),
    prisma.lesson.findMany({
      where: { authorId: id, createdAt: { gte: sixMonthsAgo } },
      select: { lessonDate: true, approved: true, failed: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.follow.count({ where: { followingId: id } }),
    prisma.post.count({ where: { authorId: id, channel: 'FEED' } }),
    prisma.postLike.count({ where: { post: { authorId: id, channel: 'FEED' } } }),
  ]);

  const sectors = { base: 0, oc: 0, ob: 0, absence: 0 };
  let totalSeconds = 0;
  let completedShifts = 0;
  const activeNow = Date.now();

  const monthly = new Map();
  for (let offset = 5; offset >= 0; offset--) {
    const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const key = d.toISOString().slice(0, 7);
    monthly.set(key, {
      key,
      label: new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit', timeZone: 'America/Sao_Paulo' }).format(d),
      shiftSeconds: 0,
      shifts: 0,
      lessons: 0,
      approved: 0,
      failed: 0,
    });
  }

  for (const shift of shifts) {
    const start = new Date(shift.startedAt).getTime();
    const end = shift.endedAt ? new Date(shift.endedAt).getTime() : activeNow;
    const duration = Math.max(0, Math.round((end - start) / 1000));
    totalSeconds += duration;
    if (shift.endedAt) completedShifts += 1;

    let base = Math.max(0, Number(shift.baseSeconds || 0));
    let oc = Math.max(0, Number(shift.ocSeconds || 0));
    let ob = Math.max(0, Number(shift.obSeconds || 0));
    let absence = Math.max(0, Number(shift.absenceSeconds || 0));
    const segmentStart = shift.stationStartedAt ? new Date(shift.stationStartedAt).getTime() : null;
    if (!shift.endedAt && segmentStart && Number.isFinite(segmentStart)) {
      const segment = Math.max(0, Math.round((activeNow - segmentStart) / 1000));
      if (shift.station === 'Oficial de Comando') oc += segment;
      else if (shift.station === 'Oficial de Base') ob += segment;
      else if (shift.station === 'Ausência') absence += segment;
      else base += segment;
    }
    if (!shift.endedAt && shift.station === 'Ausência' && shift.absenceStartedAt) {
      absence = Math.max(absence, Math.round((activeNow - new Date(shift.absenceStartedAt).getTime()) / 1000));
    }

    sectors.base += base;
    sectors.oc += oc;
    sectors.ob += ob;
    sectors.absence += absence;

    const key = new Date(shift.startedAt).toISOString().slice(0, 7);
    const bucket = monthly.get(key);
    if (bucket) {
      bucket.shiftSeconds += duration;
      bucket.shifts += 1;
    }
  }

  let approvedTotal = 0;
  let failedTotal = 0;
  for (const lesson of lessons) {
    let approved = [], failed = [];
    try { approved = JSON.parse(lesson.approved || '[]'); } catch {}
    try { failed = JSON.parse(lesson.failed || '[]'); } catch {}
    approvedTotal += approved.length;
    failedTotal += failed.length;
    const key = new Date(lesson.createdAt).toISOString().slice(0, 7);
    const bucket = monthly.get(key);
    if (bucket) {
      bucket.lessons += 1;
      bucket.approved += approved.length;
      bucket.failed += failed.length;
    }
  }

  const activeShift = shifts.find(shift => !shift.endedAt);
  res.set('Cache-Control', 'no-store');
  res.json({
    member: {
      id: member.id,
      habboName: member.habboName,
      rank: member.rank?.name || null,
      division: member.division?.sig || null,
    },
    service: {
      totalSeconds,
      completedShifts,
      active: Boolean(activeShift),
      sectors,
      averageShiftSeconds: completedShifts ? Math.round(shifts.filter(s => s.endedAt).reduce((sum, shift) => sum + Math.max(0, (new Date(shift.endedAt) - new Date(shift.startedAt)) / 1000), 0) / completedShifts) : 0,
    },
    lessons: {
      taught: lessons.length,
      approved: approvedTotal,
      failed: failedTotal,
      approvalRate: approvedTotal + failedTotal ? Math.round((approvedTotal / (approvedTotal + failedTotal)) * 1000) / 10 : null,
    },
    community: {
      medals: member._count.medals,
      followers: followerCount,
      posts: socialPosts,
      likesReceived: socialLikes,
    },
    monthly: [...monthly.values()],
  });
}

async function rankingByHours(req, res) {
  const members = await prisma.member.findMany({ include: { rank: true }, orderBy: { hours: 'desc' }, take: 20 });
  res.json({ ranking: members.map(m => ({ id: m.id, habboName: m.habboName, rank: m.rank.name, hours: m.hours, avatarUrl: avatarImageUrl(m.habboName) })) });
}

async function rankingByMedals(req, res) {
  const members = await prisma.member.findMany({ include: { _count: { select: { medals: true } } }, take: 100 });
  const ranked = members.map(m => ({ id: m.id, habboName: m.habboName, medals: m._count.medals })).sort((a, b) => b.medals - a.medals).slice(0, 20);
  res.json({ ranking: ranked });
}

async function rankingByFollowers(req, res) {
  const members = await prisma.member.findMany({ orderBy: { followerCount: 'desc' }, take: 20 });
  res.json({ ranking: members.map(m => ({ id: m.id, habboName: m.habboName, followers: m.followerCount })) });
}

async function listFollowers(req, res) {
  const targetId = Number(req.params.id);
  const rows = await prisma.follow.findMany({ where: { followingId: targetId }, include: { follower: { include: { rank: true } } } });
  res.json({ members: rows.map(r => mapMemberSlim(r.follower)) });
}

async function listFollowing(req, res) {
  const targetId = Number(req.params.id);
  const rows = await prisma.follow.findMany({ where: { followerId: targetId }, include: { following: { include: { rank: true } } } });
  res.json({ members: rows.map(r => mapMemberSlim(r.following)) });
}

function mapMemberSlim(m) {
  return { id: m.id, habboName: m.habboName, rank: m.rank ? m.rank.name : null, avatarUrl: avatarImageUrl(m.habboName) };
}

module.exports = { list, getOne, stats, create, update, ban, unban, toggleFollow, rankingByHours, rankingByMedals, rankingByFollowers, listFollowers, listFollowing };
