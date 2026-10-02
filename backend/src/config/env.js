require('dotenv').config();

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variável de ambiente obrigatória ausente: ${name}. Confira seu arquivo .env`);
  }
  return value;
}

const nodeEnv = process.env.NODE_ENV || 'development';
const corsOrigin = String(process.env.CORS_ORIGIN || '').trim();

module.exports = {
  port: process.env.PORT || 4000,
  nodeEnv,
  databaseUrl: required('DATABASE_URL'),
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  habboDomain: process.env.HABBO_DOMAIN || 'habbo.com.br',
  corsOrigin,
};
