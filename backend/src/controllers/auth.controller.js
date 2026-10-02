const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const { signToken } = require('../utils/jwt');
const { fetchHabboProfile, generateVerificationCode, verifyMottoContainsCode, avatarImageUrl } = require('../utils/habbo');
const { audit, HttpError } = require('../utils/http');

const CODE_TTL_MINUTES = 15;

/** Passo 1: gera um código pro usuário colar na missão do Habbo. */
async function findMemberByNickInsensitive(habboName, include = undefined) {
  const matches = await prisma.member.findMany({
    where: { habboName: { contains: habboName } },
    ...(include ? { include } : {}),
    take: 20,
  });
  return matches.find(member =>
    member.habboName.toLocaleLowerCase('pt-BR') === habboName.toLocaleLowerCase('pt-BR')
  ) || null;
}

async function startVerification(req, res) {
  const habboName = String(req.body.habboName || '').trim();
  if (!habboName) throw new HttpError(400, 'Informe o nome da conta Habbo.');

  const profile = await fetchHabboProfile(habboName);
  const existing = await findMemberByNickInsensitive(profile.name);

  if (!existing) {
    throw new HttpError(403, 'Cadastro não autorizado. Você precisa ser aprovado na aula de Soldado antes de criar sua conta no System.');
  }
  if (!existing.registrationPending) {
    throw new HttpError(409, 'Essa conta já está cadastrada no System. Faça login normalmente.');
  }
  if (existing.habboUniqueId !== profile.uniqueId) {
    throw new HttpError(403, 'A conta Habbo não corresponde ao militar aprovado na aula.');
  }

  const code = generateVerificationCode();
  const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000);
  await prisma.habboVerification.create({ data: { habboName: existing.habboName, code, expiresAt } });

  res.json({
    code,
    expiresAt,
    instructions: `Cole o código "${code}" na sua missão do Habbo e confirme em seguida. Ele expira em ${CODE_TTL_MINUTES} minutos.`,
  });
}

/** Passo 2: confirma se a missão realmente contém o código pendente. */
async function checkVerification(req, res) {
  const habboName = String(req.body.habboName || '').trim();
  if (!habboName) throw new HttpError(400, 'Informe o nome da conta Habbo.');

  const existing = await findMemberByNickInsensitive(habboName);
  if (!existing || !existing.registrationPending) {
    throw new HttpError(403, 'Cadastro não autorizado. A aprovação na aula de Soldado é obrigatória.');
  }

  const pending = await prisma.habboVerification.findFirst({
    where: { habboName: existing.habboName, verified: false, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  });
  if (!pending) throw new HttpError(400, 'Nenhuma verificação pendente (ou o código expirou). Gere um novo código.');

  const { matches, profile } = await verifyMottoContainsCode(existing.habboName, pending.code);
  if (profile.uniqueId !== existing.habboUniqueId) {
    throw new HttpError(403, 'A conta Habbo não corresponde ao militar aprovado na aula.');
  }
  if (!matches) return res.status(400).json({ verified: false, message: 'Código não encontrado na missão ainda. Confira se salvou a missão no Habbo e tente novamente.' });

  await prisma.habboVerification.update({ where: { id: pending.id }, data: { verified: true } });
  res.json({ verified: true, habboUniqueId: profile.uniqueId, message: 'Conta verificada! Agora defina uma senha para concluir o cadastro.' });
}

/** Passo 3: com a missão verificada, cria a conta local (senha própria do System). */
async function register(req, res) {
  const habboName = String(req.body.habboName || '').trim();
  const password = String(req.body.password || '');
  if (!habboName || password.length < 8) {
    throw new HttpError(400, 'Informe o nome do Habbo e uma senha com pelo menos 8 caracteres.');
  }

  const pendingMember = await findMemberByNickInsensitive(habboName, { rank: true, division: true });
  if (!pendingMember || !pendingMember.registrationPending) {
    throw new HttpError(403, 'Cadastro não autorizado. Você precisa ser aprovado na aula de Soldado antes de criar sua conta no System.');
  }

  const verification = await prisma.habboVerification.findFirst({
    where: {
      habboName: pendingMember.habboName,
      verified: true,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });
  if (!verification) {
    throw new HttpError(403, 'Essa conta Habbo ainda não foi verificada. Complete a verificação por missão primeiro.');
  }

  const profile = await fetchHabboProfile(pendingMember.habboName);
  if (profile.uniqueId !== pendingMember.habboUniqueId) {
    throw new HttpError(403, 'A conta Habbo não corresponde ao militar aprovado na aula.');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const member = await prisma.$transaction(async tx => {
    const activated = await tx.member.update({
      where: { id: pendingMember.id },
      data: {
        passwordHash,
        registrationPending: false,
        status: 'ATIVO',
      },
      include: { rank: true, division: true },
    });

    // O desafio Habbo é de uso único no fluxo de primeiro acesso.
    await tx.habboVerification.deleteMany({
      where: { habboName: pendingMember.habboName },
    });

    return activated;
  });

  await audit(member.id, 'MEMBER_REGISTRATION_ACTIVATED', {
    habboName: member.habboName,
    approvedRank: member.rank?.name || null,
  });

  const token = signToken(member);
  res.status(201).json({ token, member: serializeMember(member) });
}
async function login(req, res) {
  const habboName = String(req.body.habboName || '').trim();
  const password = String(req.body.password || '');
  let member = await findMemberByNickInsensitive(habboName, { rank: true, division: true });
  if (!member) {
    req.securityAuthResult = 'LOGIN_FAILED';
    throw new HttpError(401, 'Conta ou senha inválidos.');
  }
  if (member.registrationPending) {
    req.securityAuthResult = 'REGISTRATION_PENDING';
    throw new HttpError(403, 'Cadastro pendente. Conclua o primeiro acesso usando a verificação por missão.');
  }

  const ok = await bcrypt.compare(password, member.passwordHash);
  if (!ok) {
    req.securityAuthResult = 'LOGIN_FAILED';
    throw new HttpError(401, 'Conta ou senha inválidos.');
  }
  if (member.status === 'EXPULSO' && member.bannedUntil && member.bannedUntil <= new Date()) {
    member = await prisma.member.update({ where: { id: member.id }, data: { status: 'ATIVO' }, include: { rank: true, division: true } });
  }
  if (member.status === 'EXPULSO' || member.status === 'DESLIGADO') {
    req.securityAuthResult = 'ACCESS_REVOKED';
    throw new HttpError(403, 'Acesso revogado para esta conta.');
  }

  await prisma.member.update({ where: { id: member.id }, data: { lastLoginAt: new Date(), lastSeenAt: new Date() } });
  const token = signToken(member);
  req.securityAuthResult = 'LOGIN_SUCCESS';
  res.json({ token, member: serializeMember(member) });
}

async function me(req, res) {
  res.json({ member: serializeMember(req.member) });
}

async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 8) throw new HttpError(400, 'A nova senha precisa ter pelo menos 8 caracteres.');
  const ok = await bcrypt.compare(currentPassword || '', req.member.passwordHash);
  if (!ok) throw new HttpError(401, 'Senha atual incorreta.');
  const passwordHash = await bcrypt.hash(newPassword, 12);
  const member = await prisma.member.update({
    where: { id: req.member.id },
    data: { passwordHash, sessionVersion: { increment: 1 } },
    include: { rank: true, division: true },
  });
  const token = signToken(member);
  await audit(req.member.id, 'PASSWORD_CHANGED', { sessionVersion: member.sessionVersion });
  res.set('Cache-Control', 'no-store');
  res.json({ token });
}

function serializeMember(member) {
  return {
    id: member.id,
    habboName: member.habboName,
    role: member.role,
    status: member.status,
    registrationPending: Boolean(member.registrationPending),
    coins: member.coins,
    hours: member.hours,
    followerCount: member.followerCount,
    profileCoverUrl: member.profileCoverUrl,
    rank: member.rank ? { id: member.rank.id, name: member.rank.name, level: member.rank.level } : null,
    division: member.division ? { id: member.division.id, sig: member.division.sig, name: member.division.name } : null,
    joinedAt: member.joinedAt,
    rankStartedAt: member.rankStartedAt || member.joinedAt,
    bannedAt: member.bannedAt,
    bannedUntil: member.bannedUntil,
    bannedReason: member.bannedReason,
    bannedBy: member.bannedBy,
    lastSeenAt: member.lastSeenAt,
    lastLoginAt: member.lastLoginAt,
    avatarUrl: avatarImageUrl(member.habboName),
  };
}

module.exports = { startVerification, checkVerification, register, login, me, changePassword, serializeMember };
