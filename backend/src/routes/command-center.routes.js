const router = require('express').Router();
const prisma = require('../config/prisma');
const { asyncRoute, HttpError } = require('../utils/http');
const { requireAuth } = require('../middleware/auth');
const { dpeCommandStatus } = require('../utils/systemHealth');

router.use(requireAuth);

const ACTIVE_MEMBER_STATUSES = ['EXPULSO', 'DESLIGADO'];
const ONLINE_WINDOW_MS = 5 * 60 * 1000;
const LONG_SHIFT_WARNING_MS = 8 * 60 * 60 * 1000;
const LONG_SHIFT_DANGER_MS = 12 * 60 * 60 * 1000;
const LONG_ABSENCE_MS = 30 * 60 * 1000;
const ALERT_MUTE_MAX_MINUTES = 24 * 60;

function alert(level, code, title, text, extra = {}) {
  return { level, code, title, text, ...extra };
}

function stationKey(value) {
  if (value === 'Oficial de Comando') return 'oc';
  if (value === 'Oficial de Base') return 'ob';
  if (value === 'Ausência') return 'absence';
  return 'base';
}

router.get('/', asyncRoute(async (req, res) => {
  const started = Date.now();
  const now = new Date();
  const onlineSince = new Date(Date.now() - ONLINE_WINDOW_MS);
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);

  const [
    shifts,
    onlineMembers,
    pendingRequirements,
    pendingRegistrations,
    lessonsToday,
    recentLessons,
    serverErrors15m,
    alertMutes,
    activeOperations,
    activeTemporaryFunctions,
  ] = await prisma.$transaction([
    prisma.shift.findMany({
      where: { endedAt: null },
      orderBy: { startedAt: 'asc' },
      select: {
        id: true,
        memberId: true,
        startedAt: true,
        station: true,
        stationStartedAt: true,
        baseSeconds: true,
        absenceStartedAt: true,
        previousStation: true,
        member: {
          select: {
            habboName: true,
            role: true,
            rank: { select: { name: true } },
            division: { select: { sig: true } },
          },
        },
      },
    }),
    prisma.member.count({
      where: {
        status: { notIn: ACTIVE_MEMBER_STATUSES },
        lastSeenAt: { gte: onlineSince },
      },
    }),
    prisma.requirement.count({ where: { status: 'PENDENTE' } }),
    prisma.member.count({ where: { registrationPending: true } }),
    prisma.lesson.count({ where: { createdAt: { gte: dayStart } } }),
    prisma.lesson.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        lessonDate: true,
        description: true,
        approved: true,
        failed: true,
        createdAt: true,
        author: { select: { habboName: true } },
      },
    }),
    prisma.securityEvent.count({
      where: {
        occurredAt: { gte: new Date(Date.now() - 15 * 60 * 1000) },
        statusCode: { gte: 500 },
      },
    }),
    prisma.operationalAlertMute.findMany({
      where: { memberId: req.member.id, mutedUntil: { gt: now } },
      select: { code: true, mutedUntil: true },
    }),
    prisma.specialOperation.findMany({where:{status:'ATIVA'},select:{id:true,name:true,objective:true,location:true,startedAt:true,_count:{select:{participants:true}}},orderBy:{startedAt:'desc'},take:5}),
    prisma.temporaryFunction.findMany({where:{revokedAt:null,startsAt:{lte:now},endsAt:{gte:now}},select:{id:true,title:true,endsAt:true,member:{select:{id:true,habboName:true}},operation:{select:{id:true,name:true}}},orderBy:{endsAt:'asc'},take:20}),
  ]);

  const command = dpeCommandStatus();
  const stations = { base: 0, oc: 0, ob: 0, absence: 0 };
  for (const shift of shifts) stations[stationKey(shift.station)] += 1;

  const alerts = [];
  if (!command.configured) {
    alerts.push(alert('danger', 'BOT_NOT_CONFIGURED', 'DPE Command não configurado', 'A integração do bot ainda não possui token configurado.', { category: 'BOT' }));
  } else if (!command.online) {
    alerts.push(alert('danger', 'BOT_OFFLINE', 'DPE Command offline', 'O heartbeat do bot não foi recebido nos últimos 90 segundos.', { category: 'BOT', ageSeconds: command.ageSeconds }));
  } else if (!command.roomConnected) {
    alerts.push(alert('warning', 'BOT_OUTSIDE_ROOM', 'Bot fora do quarto', 'O processo está online, mas não está conectado a um quarto do Habbo.', { category: 'BOT' }));
  }

  if (shifts.length > 0 && stations.oc === 0) {
    alerts.push(alert('warning', 'NO_OC', 'Base sem O.C.', 'Há militares em serviço, mas nenhum Oficial de Comando está registrado.', { category: 'OPERATION', action: 'shifts' }));
  }

  const nowMs = now.getTime();
  for (const shift of shifts) {
    const shiftAge = Math.max(0, nowMs - new Date(shift.startedAt).getTime());
    if (shiftAge >= LONG_SHIFT_WARNING_MS) {
      const dangerous = shiftAge >= LONG_SHIFT_DANGER_MS;
      alerts.push(alert(
        dangerous ? 'danger' : 'warning',
        'LONG_SHIFT_' + shift.id,
        dangerous ? 'Turno excessivamente longo' : 'Turno acima de 8 horas',
        shift.member.habboName + ' está em turno há ' + Math.floor(shiftAge / 3600000) + 'h.',
        { category: 'SHIFT', memberId: shift.memberId, shiftId: shift.id, ageSeconds: Math.round(shiftAge / 1000), action: 'shifts' }
      ));
    }
    if (shift.station === 'Ausência' && shift.absenceStartedAt) {
      const absenceAge = Math.max(0, nowMs - new Date(shift.absenceStartedAt).getTime());
      if (absenceAge >= LONG_ABSENCE_MS) {
        alerts.push(alert(
          'warning',
          'LONG_ABSENCE_' + shift.id,
          'Ausência prolongada',
          shift.member.habboName + ' está em ausência há ' + Math.floor(absenceAge / 60000) + ' min.',
          { category: 'SHIFT', memberId: shift.memberId, shiftId: shift.id, ageSeconds: Math.round(absenceAge / 1000), action: 'shifts' }
        ));
      }
    }
  }

  if (pendingRegistrations > 0) {
    alerts.push(alert(
      pendingRegistrations >= 5 ? 'warning' : 'info',
      'PENDING_REGISTRATIONS',
      'Cadastros pendentes',
      pendingRegistrations + ' militar(es) aguardando conclusão do primeiro acesso.',
      { category: 'PEOPLE', action: 'members' }
    ));
  }
  if (pendingRequirements > 0) {
    alerts.push(alert(
      pendingRequirements >= 10 ? 'warning' : 'info',
      'PENDING_REQUIREMENTS',
      'Requisições pendentes',
      pendingRequirements + ' requisição(ões) aguardando análise.',
      { category: 'REQUESTS', action: 'requests' }
    ));
  }
  if (stations.absence > 0) {
    alerts.push(alert('info', 'ABSENCES', 'Militares em ausência', stations.absence + ' militar(es) estão marcados como ausentes.', { category: 'SHIFT', action: 'shifts' }));
  }
  if (command.online && command.lessons?.storageOk === false) {
    alerts.push(alert('danger', 'LESSON_STORAGE_ERROR', 'Falha no armazenamento das aulas', 'O DPE Command reportou erro no arquivo/armazenamento das aulas.', { category: 'LESSONS', action: 'requests-lesson' }));
  }
  if (command.online && Number(command.lessons?.openDrafts || 0) >= 5) {
    alerts.push(alert('warning', 'LESSON_DRAFT_BACKLOG', 'Fila de aulas acumulada', command.lessons.openDrafts + ' aulas estão abertas/pendentes no DPE Command.', { category: 'LESSONS', action: 'requests-lesson' }));
  }
  if (serverErrors15m > 0) {
    alerts.push(alert(
      serverErrors15m >= 5 ? 'danger' : 'warning',
      'SERVER_ERRORS_15M',
      'Erros recentes no System',
      serverErrors15m + ' resposta(s) HTTP 5xx foram registradas nos últimos 15 minutos.',
      { category: 'SYSTEM', action: 'system-health' }
    ));
  }

  const mutedByCode = new Map(alertMutes.map(item => [item.code, item.mutedUntil]));
  const visibleAlerts = alerts
    .map(item => ({ ...item, mutedUntil: mutedByCode.get(item.code) || null }))
    .filter(item => !item.mutedUntil)
    .sort((a, b) => ({ danger: 3, warning: 2, info: 1 }[b.level] - ({ danger: 3, warning: 2, info: 1 }[a.level])));

  const mutedAlerts = alerts
    .filter(item => mutedByCode.has(item.code))
    .map(item => ({ ...item, mutedUntil: mutedByCode.get(item.code) }));

  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    latencyMs: Date.now() - started,
    command,
    summary: {
      activeShifts: shifts.length,
      onlineMembers,
      pendingRequirements,
      pendingRegistrations,
      lessonsToday,
      serverErrors15m,
      stations,
      activeOperations: activeOperations.length,
      activeTemporaryFunctions: activeTemporaryFunctions.length,
    },
    shifts: shifts.map(shift => ({
      id: shift.id,
      memberId: shift.memberId,
      nick: shift.member?.habboName || 'Desconhecido',
      rank: shift.member?.rank?.name || '—',
      division: shift.member?.division?.sig || 'DPE',
      role: shift.member?.role || 'MEMBRO',
      station: shift.station || 'Base',
      startedAt: shift.startedAt,
      stationStartedAt: shift.stationStartedAt,
      baseSeconds: Number(shift.baseSeconds || 0),
      absenceStartedAt: shift.absenceStartedAt,
      previousStation: shift.previousStation,
    })),
    lessons: recentLessons.map(lesson => ({
      id: lesson.id,
      date: lesson.lessonDate,
      description: lesson.description,
      approved: lesson.approved,
      failed: lesson.failed,
      createdAt: lesson.createdAt,
      author: lesson.author?.habboName || 'DPE',
    })),
    operations: activeOperations,
    temporaryFunctions: activeTemporaryFunctions.map(f=>({id:f.id,title:f.title,endsAt:f.endsAt,memberId:f.member.id,nick:f.member.habboName,operation:f.operation})),
    alerts: visibleAlerts,
    mutedAlerts,
  });
}));

router.post('/alerts/:code/mute', asyncRoute(async (req, res) => {
  const code = String(req.params.code || '').trim();
  const minutes = Number(req.body?.minutes || 60);
  if (!/^[A-Z0-9_:-]{2,80}$/.test(code)) throw new HttpError(400, 'Alerta inválido.');
  if (!Number.isInteger(minutes) || minutes < 5 || minutes > ALERT_MUTE_MAX_MINUTES) {
    throw new HttpError(400, 'Tempo de silêncio deve ficar entre 5 minutos e 24 horas.');
  }
  const mutedUntil = new Date(Date.now() + minutes * 60 * 1000);
  await prisma.operationalAlertMute.upsert({
    where: { memberId_code: { memberId: req.member.id, code } },
    update: { mutedUntil },
    create: { memberId: req.member.id, code, mutedUntil },
  });
  res.json({ ok: true, code, mutedUntil });
}));

router.delete('/alerts/:code/mute', asyncRoute(async (req, res) => {
  const code = String(req.params.code || '').trim();
  await prisma.operationalAlertMute.deleteMany({ where: { memberId: req.member.id, code } });
  res.json({ ok: true, code });
}));

module.exports = router;
