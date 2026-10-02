const { Prisma } = require('@prisma/client');

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  if (res.headersSent) return next(err);

  const httpStatus = Number(err.statusCode || err.status);
  if (Number.isInteger(httpStatus) && httpStatus >= 400 && httpStatus <= 599) {
    return res.status(httpStatus).json({ error: err.message });
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Já existe um registro com esse valor único.', fields: err.meta?.target });
    if (err.code === 'P2025') return res.status(404).json({ error: 'Registro não encontrado.' });
  }
  console.error('[error]', err);
  res.status(500).json({ error: 'Erro interno do servidor.' });
}

module.exports = errorHandler;
