const router = require('express').Router();
const prisma = require('../config/prisma');
const { asyncRoute } = require('../utils/http');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/permissions');

router.use(requireAuth, requireRole('ADMINISTRADOR'));

router.get('/', asyncRoute(async (req, res) => {
  const logs = await prisma.auditLog.findMany({ include: { actor: true }, orderBy: { createdAt: 'desc' }, take: 200 });
  res.json({
    logs: logs.map(l => ({
      id: l.id, action: l.action,
      details: l.details ? JSON.parse(l.details) : null, // guardado como texto no SQLite — volta a virar objeto aqui
      actor: l.actor.habboName, createdAt: l.createdAt,
    })),
  });
}));

module.exports = router;
