const { verifyToken } = require('../utils/jwt');
const prisma = require('../config/prisma');
const { reconcileLeaveStates } = require('../services/leaves');

const LAST_SEEN_WRITE_INTERVAL_MS = 60_000;
const lastSeenWrites = new Map();

function touchLastSeen(memberId) {
  const now = Date.now();
  const previous = lastSeenWrites.get(memberId) || 0;
  if (now - previous < LAST_SEEN_WRITE_INTERVAL_MS) return;

  // Reserva a janela antes do acesso ao banco para que requisições paralelas
  // do mesmo usuário não criem várias escritas concorrentes no SQLite.
  lastSeenWrites.set(memberId, now);
  prisma.member.update({
    where: { id: memberId },
    data: { lastSeenAt: new Date(now) },
  }).catch(() => {
    // Em falha, libera uma nova tentativa futura sem bloquear a requisição atual.
    if (lastSeenWrites.get(memberId) === now) lastSeenWrites.delete(memberId);
  });
}


/** Exige um Bearer token válido; anexa o membro autenticado em req.member. */
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    req.securityAuthResult = 'MISSING_CREDENTIALS';
    return res.status(401).json({ error: 'Token de acesso ausente.' });
  }

  try {
    const payload = verifyToken(token);
    let member = await prisma.member.findUnique({ where: { id: payload.sub }, include: { rank: true, division: true } });
    if (!member) {
      req.securityAuthResult = 'INVALID_SESSION';
      return res.status(401).json({ error: 'Conta não encontrada.' });
    }
    const tokenSessionVersion = Number(payload.sv ?? 0);
    if (!Number.isInteger(tokenSessionVersion) || tokenSessionVersion !== Number(member.sessionVersion || 0)) {
      req.securityAuthResult = 'SESSION_REVOKED';
      return res.status(401).json({ error: 'Sessão revogada. Entre novamente.' });
    }
    const leaveState = await reconcileLeaveStates(member.id);
    if (leaveState.active || leaveState.expired) {
      member = await prisma.member.findUnique({ where: { id: member.id }, include: { rank: true, division: true } });
    }
    if (member.status === 'EXPULSO' && member.bannedUntil && member.bannedUntil <= new Date()) {
      member = await prisma.member.update({ where: { id: member.id }, data: { status: 'ATIVO' }, include: { rank: true, division: true } });
    }
    if (member.status === 'EXPULSO' || member.status === 'DESLIGADO') {
      req.securityAuthResult = 'ACCESS_REVOKED';
      return res.status(403).json({ error: 'Acesso revogado para esta conta.' });
    }
    req.member = member;
    req.securitySessionAuthenticated = true;
    req.securityAuthResult = 'AUTHENTICATED';
    // Atualiza o "visto por último" apenas em leituras. Requisições que
    // alteram dados não criam uma escrita best-effort concorrente no SQLite.
    if (req.method === 'GET' || req.method === 'HEAD') {
      res.once('finish', () => touchLastSeen(member.id));
    }
    next();
  } catch {
    req.securityAuthResult = 'INVALID_SESSION';
    return res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
}

/** Middleware opcional: anexa req.member se houver token válido, mas não bloqueia se não houver. */
async function optionalAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next();
  try {
    const payload = verifyToken(token);
    req.member = await prisma.member.findUnique({ where: { id: payload.sub } });
    const tokenSessionVersion = Number(payload.sv ?? 0);
    const validVersion = req.member && Number.isInteger(tokenSessionVersion)
      && tokenSessionVersion === Number(req.member.sessionVersion || 0);
    const accessActive = req.member && !['EXPULSO', 'DESLIGADO'].includes(req.member.status);
    if (validVersion && accessActive) {
      req.securitySessionAuthenticated = true;
      req.securityAuthResult = 'AUTHENTICATED';
    } else {
      req.member = null;
      req.securityAuthResult = validVersion ? 'ACCESS_REVOKED' : 'SESSION_REVOKED';
    }
  } catch { req.securityAuthResult = 'INVALID_SESSION'; }
  next();
}

module.exports = { requireAuth, optionalAuth };
