const prisma = require('../config/prisma');
const { audit, HttpError } = require('../utils/http');

async function listTypes(req, res) {
  const types = await prisma.requirementType.findMany({ orderBy: { order: 'asc' } });
  res.json({ types });
}

async function list(req, res) {
  const { typeId, status, q } = req.query;
  const requirements = await prisma.requirement.findMany({
    where: {
      ...(typeId ? { typeId: String(typeId) } : {}),
      ...(status ? { status: String(status) } : {}),
      ...(q ? { OR: [{ targetText: { contains: String(q) } }, { author: { habboName: { contains: String(q) } } }] } : {}),
    },
    include: { type: true, author: true, decidedBy: true },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  res.json({ requirements: requirements.map(serialize) });
}

async function create(req, res) {
  const { typeId, targetText, reasonHtml } = req.body;
  if (!typeId || !targetText || !reasonHtml) throw new HttpError(400, 'Preencha tipo, alvo e o texto do requerimento.');

  const type = await prisma.requirementType.findUnique({ where: { id: typeId } });
  if (!type) throw new HttpError(400, 'Tipo de requerimento inválido.');

  const requirement = await prisma.requirement.create({
    data: { typeId, authorId: req.member.id, targetText, reasonHtml },
    include: { type: true, author: true, decidedBy: true },
  });
  await audit(req.member.id, 'REQUIREMENT_CREATED', { requirementId: requirement.id, typeId, targetText });
  res.status(201).json({ requirement: serialize(requirement) });
}

async function decide(req, res) {
  const id = Number(req.params.id);
  const { approve } = req.body;
  const requirement = await prisma.requirement.findUnique({ where: { id }, include: { author: true, type: true } });
  if (!requirement) throw new HttpError(404, 'Requerimento não encontrado.');
  if (requirement.status !== 'PENDENTE') throw new HttpError(409, 'Esse requerimento já foi decidido.');

  const updated = await prisma.requirement.update({
    where: { id },
    data: { status: approve ? 'APROVADO' : 'RECUSADO', decidedById: req.member.id, decidedAt: new Date() },
    include: { type: true, author: true, decidedBy: true },
  });

  await prisma.notification.create({
    data: {
      memberId: requirement.authorId,
      icon: approve ? '✅' : '❌',
      title: `Requerimento ${approve ? 'aprovado' : 'recusado'}`,
      text: `${requirement.type.name} para "${requirement.targetText}" foi ${approve ? 'aprovado' : 'recusado'} por ${req.member.habboName}.`,
    },
  });
  await audit(req.member.id, approve ? 'REQUIREMENT_APPROVED' : 'REQUIREMENT_REJECTED', { requirementId: id });
  res.json({ requirement: serialize(updated) });
}

function serialize(r) {
  return {
    id: r.id, type: r.type.name, typeId: r.typeId,
    author: r.author.habboName, target: r.targetText, text: r.reasonHtml,
    status: r.status, createdAt: r.createdAt,
    decidedBy: r.decidedBy ? r.decidedBy.habboName : null, decidedAt: r.decidedAt,
  };
}

module.exports = { listTypes, list, create, decide };
