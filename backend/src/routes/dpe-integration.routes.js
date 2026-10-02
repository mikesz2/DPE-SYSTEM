const router = require('express').Router();
const { asyncRoute, audit } = require('../utils/http');
const dpeCommandAuth = require('../middleware/dpeCommandAuth');
const {
  stationFrom,
  sectorFrom,
  memberByNickname,
  changeShift,
  setShiftSector,
  setShiftStation,
  serializeShiftMutation,
} = require('../services/shifts');

const shiftAudit = (...args) => serializeShiftMutation(() => audit(...args));

router.use(dpeCommandAuth);

router.post('/heartbeat', (req, res) => {
  const { updateDpeCommandHeartbeat } = require('../utils/systemHealth');
  const heartbeat = updateDpeCommandHeartbeat(req.body || {});
  res.set('Cache-Control', 'no-store');
  res.json({ ok: true, receivedAt: heartbeat.receivedAt });
});

router.post('/shifts/start', asyncRoute(async (req, res) => {
  const station = stationFrom(req.body?.station);
  const member = await memberByNickname(req.body?.nickname);
  const result = await changeShift(member.id, 'start', station);

  if (!result.alreadyActive) {
    await shiftAudit(member.id, 'SHIFT_STARTED_BY_DPE_COMMAND', {
      shiftId: result.shift.id,
      station,
    });
  }

  res.status(result.alreadyActive ? 200 : 201).json({
    ok: true,
    member: { id: member.id, habboName: member.habboName },
    ...result,
  });
}));

router.post('/shifts/station', asyncRoute(async (req, res) => {
  const station = stationFrom(req.body?.station);
  const member = await memberByNickname(req.body?.nickname);
  const result = await setShiftStation(member.id, station);

  if (!result.noActiveShift && !result.alreadyInStation) {
    await shiftAudit(member.id, 'SHIFT_STATION_CHANGED_BY_DPE_COMMAND', {
      shiftId: result.shift.id,
      station,
      pendingUntilReturn: Boolean(result.pendingUntilReturn),
    });
  }

  res.json({
    ok: true,
    member: { id: member.id, habboName: member.habboName },
    ...result,
  });
}));

router.post('/shifts/sector', asyncRoute(async (req, res) => {
  const sector = sectorFrom(req.body?.station || req.body?.sector);
  const member = await memberByNickname(req.body?.nickname);
  const result = await setShiftSector(member.id, sector);

  if (!result.noActiveShift && !result.alreadyInSector) {
    await shiftAudit(member.id, sector === 'Ausência'
      ? 'SHIFT_ABSENCE_STARTED_BY_DPE_COMMAND'
      : 'SHIFT_ABSENCE_ENDED_BY_DPE_COMMAND', {
      shiftId: result.shift.id,
      sector: result.sector,
      addedAbsenceSeconds: Math.round(result.addedAbsenceSeconds || 0),
    });
  }

  res.json({
    ok: true,
    member: { id: member.id, habboName: member.habboName },
    ...result,
  });
}));

router.post('/shifts/stop', asyncRoute(async (req, res) => {
  const member = await memberByNickname(req.body?.nickname);
  const result = await changeShift(member.id, 'stop');

  if (!result.alreadyStopped) {
    await shiftAudit(member.id, 'SHIFT_ENDED_BY_DPE_COMMAND', {
      shiftId: result.shift.id,
      durationHours: Math.round(result.durationHours * 10000) / 10000,
      absenceSeconds: Math.round(result.absenceSeconds || 0),
    });
  }

  res.json({
    ok: true,
    member: { id: member.id, habboName: member.habboName },
    ...result,
  });
}));

// O nick vem do remetente real do sussurro, identificado pelo DPE Command.
async function lessonTeacher(nickname) {
  const member = await memberByNickname(nickname);
  return require('../config/prisma').member.findUnique({ where: { id: member.id }, include: { division: true } });
}
router.post('/lessons/guides', asyncRoute(async (_req, res) => {
  const prisma = require('../config/prisma');
  const guides = await prisma.member.findMany({
    where: {
      lessonGuide: true,
      status: { notIn: ['EXPULSO', 'DESLIGADO'] },
      registrationPending: false,
    },
    select: { id: true, habboName: true },
    orderBy: { habboName: 'asc' },
  });
  res.set('Cache-Control', 'no-store');
  res.json({
    ok: true,
    guides: guides.map(member => ({ id: member.id, nickname: member.habboName })),
  });
}));

router.post('/lessons/access', asyncRoute(async (req, res) => {
  const teacher = await lessonTeacher(req.body?.nickname);
  const { canPublishFromCommand } = require('../services/lessons');
  if (!canPublishFromCommand(teacher, req.body?.botLevel)) {
    return res.status(403).json({ error: 'Militar sem autorização para postagem de aula.' });
  }
  res.json({ ok: true, teacher: teacher.habboName, lessonGuide: Boolean(teacher.lessonGuide) });
}));
router.post('/lessons/validate', asyncRoute(async (req, res) => {
  const teacher = await lessonTeacher(req.body?.nickname);
  const { canPublishFromCommand, validateLessonRoster } = require('../services/lessons');
  if (!canPublishFromCommand(teacher, req.body?.botLevel)) {
    return res.status(403).json({ error: 'Militar sem autorização para postagem de aula.' });
  }
  const validation = await validateLessonRoster(req.body || {});
  res.set('Cache-Control', 'no-store');
  res.json({ ok: true, teacher: teacher.habboName, ...validation });
}));

router.post('/lessons/status', asyncRoute(async (req, res) => {
  const teacher = await lessonTeacher(req.body?.nickname);
  const requestKey = String(req.body?.requestKey || '').trim();
  if (!/^[a-zA-Z0-9-]{16,80}$/.test(requestKey)) {
    return res.status(400).json({ error: 'Identificador de postagem inválido.' });
  }

  const prisma = require('../config/prisma');
  const lesson = await prisma.lesson.findUnique({
    where: { requestKey },
    select: {
      id: true,
      authorId: true,
      lessonDate: true,
      approved: true,
      failed: true,
      createdAt: true,
    },
  });

  // Não revela existência de requestKey pertencente a outro professor.
  if (!lesson || lesson.authorId !== teacher.id) {
    return res.json({ ok: true, saved: false });
  }

  res.set('Cache-Control', 'no-store');
  res.json({
    ok: true,
    saved: true,
    lessonId: lesson.id,
    lessonDate: lesson.lessonDate,
    approvedCount: JSON.parse(lesson.approved).length,
    failedCount: JSON.parse(lesson.failed).length,
    createdAt: lesson.createdAt,
  });
}));

router.post('/lessons', asyncRoute(async (req, res) => {
  const teacher = await lessonTeacher(req.body?.nickname);
  const { postLesson, lessonOutcome } = require('../services/lessons');
  const lesson = await postLesson(teacher, req.body, { trustedCommand: true, botLevel: req.body?.botLevel });
  const outcome = await lessonOutcome(lesson);

  res.status(201).json({
    ok: true,
    lessonId: lesson.id,
    teacher: teacher.habboName,
    ...outcome,
  });
}));

module.exports = router;

