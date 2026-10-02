const prisma = require('../config/prisma');
const { resolveClientIp } = require('../utils/clientIp');

const RETENTION_DAYS = Math.min(365, Math.max(1, Number(process.env.SECURITY_LOG_RETENTION_DAYS) || 90));
const MAX_EVENTS = Math.min(200000, Math.max(1000, Number(process.env.SECURITY_LOG_MAX_EVENTS) || 50000));
let lastCleanupAt = 0;

function safeText(value, max) {
  return String(value || '').replace(/[\u0000-\u001f\u007f]/g, '').slice(0, max);
}

function detectBot(userAgent) {
  const ua = String(userAgent || '');
  const patterns = [
    ['TelegramBot', /TelegramBot|TelegramBot \(like TwitterBot\)/i],
    ['Discordbot', /Discordbot/i],
    ['Googlebot', /Googlebot/i],
    ['Bingbot', /bingbot/i],
    ['FacebookBot', /facebookexternalhit|Facebot/i],
    ['WhatsApp', /WhatsApp/i],
    ['GenericBot', /(?:bot|crawler|spider|slurp|headless|preview)/i],
  ];
  const found = patterns.find(([, pattern]) => pattern.test(ua));
  return found ? { isBot: true, botName: found[0] } : { isBot: false, botName: null };
}

async function enforceRetention(now) {
  if (now - lastCleanupAt < 60 * 60 * 1000) return;
  lastCleanupAt = now;
  await prisma.securityEvent.deleteMany({ where: { occurredAt: { lt: new Date(now - RETENTION_DAYS * 86400000) } } });
  const count = await prisma.securityEvent.count();
  if (count <= MAX_EVENTS) return;
  const boundary = await prisma.securityEvent.findFirst({
    orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }], skip: MAX_EVENTS - 1,
    select: { occurredAt: true, id: true },
  });
  if (boundary) await prisma.securityEvent.deleteMany({ where: { OR: [
    { occurredAt: { lt: boundary.occurredAt } },
    { occurredAt: boundary.occurredAt, id: { lt: boundary.id } },
  ] } });
}

function securityLog(req, res, next) {
  const startedAt = new Date();
  res.once('finish', () => {
    const userAgent = safeText(req.get('user-agent') || 'Não informado', 512);
    const bot = detectBot(userAgent);
    const address = resolveClientIp(req);
    const authenticated = Boolean(req.member && req.securitySessionAuthenticated);
    const event = {
      occurredAt: startedAt,
      ip: safeText(address.clientIp || 'Indisponível', 64),
      proxyIp: address.proxyIp ? safeText(address.proxyIp, 64) : null,
      edgeProxyIp: address.edgeProxyIp ? safeText(address.edgeProxyIp, 64) : null,
      ipSource: address.source,
      userAgent,
      method: safeText(req.method, 12),
      route: safeText(req.path || '/', 300),
      statusCode: res.statusCode,
      authResult: safeText(req.securityAuthResult || (authenticated ? 'AUTHENTICATED' : 'ANONYMOUS'), 32),
      isBot: bot.isBot,
      botName: bot.botName,
      memberId: authenticated ? req.member.id : null,
    };
    prisma.securityEvent.create({ data: event })
      .then(() => enforceRetention(Date.now()))
      .catch(err => console.error('[security-log] falha ao gravar evento:', err.message));
  });
  next();
}

module.exports = { securityLog, detectBot, RETENTION_DAYS, MAX_EVENTS };
