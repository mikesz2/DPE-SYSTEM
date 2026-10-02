const router = require('express').Router();
const prisma = require('../config/prisma');
const { asyncRoute, audit, HttpError } = require('../utils/http');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/permissions');

router.use(requireAuth);

// -------------------------------- Banners -------------------------------------
router.get('/banners', asyncRoute(async (req, res) => {
  const banners = await prisma.banner.findMany({ where: { active: true }, orderBy: { order: 'asc' } });
  res.json({ banners });
}));

router.post('/banners', requireRole('ADMINISTRADOR'), asyncRoute(async (req, res) => {
  const { title, subtitle, gradient, imageUrl, order } = req.body;
  if (!title) throw new HttpError(400, 'Informe o título do banner.');
  const banner = await prisma.banner.create({ data: { title, subtitle, gradient, imageUrl, order: order ?? 0 } });
  res.status(201).json({ banner });
}));

// -------------------------------- Notícias -------------------------------------
router.get('/news', asyncRoute(async (req, res) => {
  const news = await prisma.news.findMany({ include: { author: true }, orderBy: { createdAt: 'desc' }, take: 20 });
  res.json({ news: news.map(n => ({ id: n.id, title: n.title, excerpt: n.excerpt, author: n.author?.habboName || 'DCC', readMinutes: n.readMinutes, views: n.views, likes: n.likes, createdAt: n.createdAt })) });
}));

router.post('/news', requireRole('ADMINISTRADOR'), asyncRoute(async (req, res) => {
  const { title, excerpt, readMinutes } = req.body;
  if (!title || !excerpt) throw new HttpError(400, 'Informe título e resumo da notícia.');
  const news = await prisma.news.create({ data: { title, excerpt, readMinutes: readMinutes || 4, authorId: req.member.id } });
  await audit(req.member.id, 'NEWS_PUBLISHED', { newsId: news.id });
  res.status(201).json({ news });
}));

router.post('/news/:id/view', asyncRoute(async (req, res) => {
  await prisma.news.update({ where: { id: Number(req.params.id) }, data: { views: { increment: 1 } } });
  res.status(204).end();
}));

// ------------------------------ Documentos -----------------------------------
router.get('/documents', asyncRoute(async (req, res) => {
  const documents = await prisma.document.findMany({ include: { author: true }, orderBy: { createdAt: 'desc' } });
  res.json({ documents: documents.map(document => ({
    id: document.id, title: document.title, category: document.category, summary: document.summary,
    content: document.content, icon: document.icon, author: document.author.habboName,
    divisionId: document.divisionId || null,
    createdAt: document.createdAt, updatedAt: document.updatedAt,
  })) });
}));

router.post('/documents', requireRole('MODERADOR'), asyncRoute(async (req, res) => {
  const title = String(req.body.title || '').trim();
  const category = String(req.body.category || 'Documento oficial').trim();
  const summary = String(req.body.summary || '').trim();
  const content = String(req.body.content || '').trim();
  const icon = String(req.body.icon || '📜').trim();
  const divisionId = req.body.divisionId ? Number(req.body.divisionId) : null;
  if (title.length < 3 || title.length > 120) throw new HttpError(400, 'O título deve ter entre 3 e 120 caracteres.');
  if (category.length < 2 || category.length > 60) throw new HttpError(400, 'A categoria deve ter entre 2 e 60 caracteres.');
  if (summary.length > 300) throw new HttpError(400, 'O resumo pode ter no máximo 300 caracteres.');
  if (content.length < 20 || content.length > 50000) throw new HttpError(400, 'O conteúdo deve ter entre 20 e 50.000 caracteres.');
  if (icon.length > 8) throw new HttpError(400, 'Use somente um ícone curto.');
  if (divisionId && !await prisma.division.findUnique({ where:{id:divisionId}, select:{id:true} })) throw new HttpError(400, 'Divisão inválida.');
  const document = await prisma.document.create({ data: { title, category, summary, content, icon: icon || '📜', authorId: req.member.id, divisionId } });
  await audit(req.member.id, 'DOCUMENT_PUBLISHED', { documentId: document.id, title });
  res.status(201).json({ document });
}));

router.put('/documents/:id', requireRole('MODERADOR'), asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const title = String(req.body.title || '').trim();
  const category = String(req.body.category || 'Documento oficial').trim();
  const summary = String(req.body.summary || '').trim();
  const content = String(req.body.content || '').trim();
  const icon = String(req.body.icon || '📜').trim();
  const divisionId = req.body.divisionId ? Number(req.body.divisionId) : null;
  if (!Number.isInteger(id) || id < 1) throw new HttpError(400, 'Documento inválido.');
  if (title.length < 3 || title.length > 120) throw new HttpError(400, 'O título deve ter entre 3 e 120 caracteres.');
  if (category.length < 2 || category.length > 60) throw new HttpError(400, 'A categoria deve ter entre 2 e 60 caracteres.');
  if (summary.length > 300) throw new HttpError(400, 'O resumo pode ter no máximo 300 caracteres.');
  if (content.length < 20 || content.length > 50000) throw new HttpError(400, 'O conteúdo deve ter entre 20 e 50.000 caracteres.');
  if (icon.length > 8) throw new HttpError(400, 'Use somente um ícone curto.');
  const existing = await prisma.document.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, 'Documento não encontrado.');
  if (divisionId && !await prisma.division.findUnique({ where:{id:divisionId}, select:{id:true} })) throw new HttpError(400, 'Divisão inválida.');
  const document = await prisma.document.update({ where: { id }, data: { title, category, summary, content, icon: icon || '📜', divisionId } });
  await audit(req.member.id, 'DOCUMENT_UPDATED', { documentId: id, title });
  res.json({ document });
}));

module.exports = router;
