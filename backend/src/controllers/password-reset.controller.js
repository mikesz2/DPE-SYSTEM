const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const { fetchHabboProfile, verifyMottoContainsCode } = require('../utils/habbo');
const { HttpError, audit } = require('../utils/http');

// Separate namespace in the existing verification store; registration cannot use these records.
const prefix = id => `password-reset:${id}:`;
const key = (id, token) => prefix(id) + crypto.createHash('sha256').update(token).digest('hex');

async function findAccount(habboName) {
  if (!habboName) throw new HttpError(400, 'Informe seu nick no Habbo.');
  const profile = await fetchHabboProfile(habboName);
  const member = await prisma.member.findUnique({ where: { habboUniqueId: profile.uniqueId } });
  if (!member) throw new HttpError(404, 'Este Habbo ainda não tem cadastro no System.');
  if (['EXPULSO', 'DESLIGADO'].includes(member.status)) throw new HttpError(403, 'Acesso revogado para esta conta.');
  return { member, profile };
}

async function start(req, res) {
  const { member, profile } = await findAccount(String(req.body.habboName || '').trim());
  const resetToken = crypto.randomBytes(32).toString('hex');
  const code = `DPE-${crypto.randomBytes(12).toString('hex').toUpperCase()}`;
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  await prisma.habboVerification.create({ data: { habboName: key(member.id, resetToken), code, expiresAt } });
  res.set('Cache-Control', 'no-store');
  res.json({ habboName: profile.name, code, resetToken, expiresAt });
}

async function complete(req, res) {
  const { newPassword, resetToken } = req.body;
  if (typeof newPassword !== 'string' || newPassword.length < 8 || Buffer.byteLength(newPassword, 'utf8') > 72) {
    throw new HttpError(400, 'Use uma senha com pelo menos 8 caracteres e no máximo 72 bytes.');
  }
  if (typeof resetToken !== 'string' || !/^[a-f0-9]{64}$/.test(resetToken)) throw new HttpError(400, 'Gere um novo código de recuperação.');
  const { member, profile } = await findAccount(String(req.body.habboName || '').trim());
  const where = { habboName: key(member.id, resetToken), verified: false, expiresAt: { gt: new Date() } };
  const pending = await prisma.habboVerification.findFirst({ where });
  if (!pending) throw new HttpError(400, 'Código expirado ou já utilizado. Gere um novo código.');
  const result = await verifyMottoContainsCode(profile.name, pending.code);
  if (!result.matches || result.profile.uniqueId !== member.habboUniqueId) {
    throw new HttpError(400, 'Código não encontrado na missão. Salve a missão no Habbo e tente novamente.');
  }
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.$transaction(async tx => {
    // Consume atomically and recheck expiry after the external request and password hashing.
    const consumed = await tx.habboVerification.deleteMany({ where: { ...where, id: pending.id, expiresAt: { gt: new Date() } } });
    if (consumed.count !== 1) throw new HttpError(400, 'Código expirado ou já utilizado. Gere um novo código.');
    await tx.member.update({
      where: { id: member.id },
      data: { passwordHash, sessionVersion: { increment: 1 } },
    });
    await tx.habboVerification.deleteMany({ where: { habboName: { startsWith: prefix(member.id) } } });
  });
  await audit(member.id, 'PASSWORD_RESET', {});
  res.json({ message: 'Senha redefinida! Entre com sua nova senha.', habboName: member.habboName });
}

module.exports = { start, complete };
