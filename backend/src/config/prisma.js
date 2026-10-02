const { PrismaClient } = require('@prisma/client');

// Instância única do Prisma Client reaproveitada em toda a aplicação
// (evita esgotar conexões ao criar um client por requisição). SQLite: um
// único arquivo em disco, sem precisar de servidor de banco separado.
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

module.exports = prisma;
