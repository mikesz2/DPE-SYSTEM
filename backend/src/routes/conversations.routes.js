const router = require('express').Router();
const prisma = require('../config/prisma');
const { asyncRoute, HttpError } = require('../utils/http');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

/** Lista as conversas do membro logado, com a última mensagem de cada uma. */
router.get('/', asyncRoute(async (req, res) => {
  const memberships = await prisma.conversationMember.findMany({
    where: { memberId: req.member.id },
    include: { conversation: { include: { members: { include: { member: true } }, messages: { orderBy: { createdAt: 'desc' }, take: 1 } } } },
  });
  const conversations = memberships.map(m => {
    const other = m.conversation.members.map(x => x.member).filter(x => x.id !== req.member.id);
    return { id: m.conversation.id, with: other.map(o => o.habboName), lastMessage: m.conversation.messages[0] || null };
  });
  res.json({ conversations });
}));

/** Busca (ou cria) a conversa 1-a-1 com outro membro. */
router.post('/with/:memberId', asyncRoute(async (req, res) => {
  const otherId = Number(req.params.memberId);
  if (otherId === req.member.id) throw new HttpError(400, 'Você não pode conversar consigo mesmo.');

  const existing = await prisma.conversation.findFirst({
    where: { AND: [{ members: { some: { memberId: req.member.id } } }, { members: { some: { memberId: otherId } } }] },
  });
  if (existing) return res.json({ conversation: existing });

  const conversation = await prisma.conversation.create({
    data: { members: { create: [{ memberId: req.member.id }, { memberId: otherId }] } },
  });
  res.status(201).json({ conversation });
}));

router.get('/:id/messages', asyncRoute(async (req, res) => {
  const conversationId = Number(req.params.id);
  const isMember = await prisma.conversationMember.findUnique({ where: { conversationId_memberId: { conversationId, memberId: req.member.id } } });
  if (!isMember) throw new HttpError(403, 'Você não participa dessa conversa.');

  const messages = await prisma.message.findMany({ where: { conversationId }, include: { author: true }, orderBy: { createdAt: 'asc' }, take: 200 });
  res.json({ messages: messages.map(m => ({ id: m.id, from: m.author.habboName, text: m.text, time: m.createdAt })) });
}));

router.post('/:id/messages', asyncRoute(async (req, res) => {
  const conversationId = Number(req.params.id);
  const { text } = req.body;
  if (!text || !text.trim()) throw new HttpError(400, 'Mensagem vazia.');
  const isMember = await prisma.conversationMember.findUnique({ where: { conversationId_memberId: { conversationId, memberId: req.member.id } } });
  if (!isMember) throw new HttpError(403, 'Você não participa dessa conversa.');

  const message = await prisma.message.create({ data: { conversationId, authorId: req.member.id, text: text.trim() }, include: { author: true } });
  res.status(201).json({ message: { id: message.id, from: message.author.habboName, text: message.text, time: message.createdAt } });
}));

module.exports = router;
