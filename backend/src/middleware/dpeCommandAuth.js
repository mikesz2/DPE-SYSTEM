const crypto = require('crypto');

function dpeCommandAuth(req, res, next) {
  const configuredToken = String(process.env.DPE_COMMAND_API_TOKEN || '');
  if (!configuredToken) return res.status(503).json({ ok: false, error: 'INTEGRATION_NOT_CONFIGURED', message: 'Integração DPE Command não configurada.' });

  const authorization = String(req.headers.authorization || '');
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) return res.status(401).json({ ok: false, error: 'UNAUTHORIZED', message: 'Authorization inválido ou ausente.' });

  const received = Buffer.from(match[1]);
  const expected = Buffer.from(configuredToken);
  if (received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) {
    return res.status(403).json({ ok: false, error: 'FORBIDDEN', message: 'Token inválido.' });
  }
  next();
}

module.exports = dpeCommandAuth;
