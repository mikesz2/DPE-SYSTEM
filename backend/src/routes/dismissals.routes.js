const router = require('express').Router();
const prisma = require('../config/prisma');
const { requireAuth } = require('../middleware/auth');
const { requireRole, ROLE_ORDER } = require('../middleware/permissions');
const { asyncRoute, HttpError, audit } = require('../utils/http');
const { recordFieldChanges } = require('../services/field-changes');

router.use(requireAuth);

function todaySaoPaulo() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

router.post('/', requireRole('MODERADOR'), asyncRoute(async (req, res) => {
  const memberId = Number(req.body?.memberId);
  const dismissalDate = String(req.body?.dismissalDate || '').trim();
  const reason = String(req.body?.reason || '').trim();

  if (!Number.isInteger(memberId) || memberId < 1) throw new HttpError(400, 'Militar inválido.');
  if (dismissalDate !== todaySaoPaulo()) throw new HttpError(400, 'A data da demissão deve ser a data atual.');
  if (reason.length < 5 || reason.length > 500) throw new HttpError(400, 'Informe um motivo entre 5 e 500 caracteres.');
  if (memberId === req.member.id) throw new HttpError(400, 'Você não pode demitir a própria conta.');

  const result = await prisma.$transaction(async tx => {
    const member = await tx.member.findUnique({
      where: { id: memberId },
      include: { rank: true, division: true },
    });
    if (!member) throw new HttpError(404, 'Militar não encontrado.');
    if (member.status === 'DESLIGADO') throw new HttpError(409, 'Este militar já está desligado.');
    if (member.status === 'EXPULSO') throw new HttpError(409, 'Este militar está exonerado.');

    const actorLevel = ROLE_ORDER.indexOf(req.member.role);
    const targetLevel = ROLE_ORDER.indexOf(member.role);
    if (req.member.role !== 'SUPREMO' && targetLevel >= actorLevel) {
      throw new HttpError(403, 'Você não pode demitir alguém com cargo igual ou superior ao seu.');
    }

    const now = new Date();
    const activeShifts = await tx.shift.findMany({
      where: { memberId: member.id, endedAt: null },
      select: { id: true },
    });

    if (activeShifts.length) {
      await tx.shift.updateMany({
        where: { memberId: member.id, endedAt: null },
        data: { endedAt: now, stationStartedAt: null, absenceStartedAt: null },
      });
    }

    const updated = await tx.member.update({
      where: { id: member.id },
      data: {
        status: 'DESLIGADO',
        role: 'MEMBRO',
        divisionId: null,
        lessonGuide: false,
        sessionVersion: { increment: 1 },
      },
      include: { rank: true, division: true },
    });

    const post = await tx.profilePost.create({
      data: {
        type: 'DEMISSAO',
        title: 'Desligamento da DPE',
        description: reason,
        lessonDate: dismissalDate,
        authorId: req.member.id,
        subjectId: member.id,
      },
    });

    return { member, updated, post, activeShiftCount: activeShifts.length };
  });

  await recordFieldChanges(req.member.id,result.member.id,{Status:{from:result.member.status,to:'DESLIGADO'},Cargo:{from:result.member.role,to:'MEMBRO'},Divisao:{from:result.member.division?.sig||null,to:null},Guia:{from:result.member.lessonGuide,to:false}},'DISMISSAL');
  await audit(req.member.id, 'MEMBER_DISMISSED', {
    targetId: result.member.id,
    habboName: result.member.habboName,
    previousRank: result.member.rank.name,
    previousRole: result.member.role,
    previousDivision: result.member.division?.sig || null,
    dismissalDate,
    reason,
    activeShiftsClosed: result.activeShiftCount,
  });

  res.status(201).json({
    ok: true,
    member: {
      id: result.updated.id,
      habboName: result.updated.habboName,
      status: result.updated.status,
    },
    postId: result.post.id,
    dismissalDate,
  });
}));

module.exports = router;
