const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '.env'), quiet: true });

function numberEnv(name, fallback) {
  const value = process.env[name];
  if (value === undefined || value === '') return fallback;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function booleanEnv(name, fallback = false) {
  const value = process.env[name];
  if (value === undefined || value === '') return fallback;
  return value === 'true';
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

module.exports = {
  jwtSecretKey: requiredEnv('JWT_SECRET_KEY'),
  accessTokenExpiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || '1h',

  refreshTokenExpiresInMs: numberEnv(
    'REFRESH_TOKEN_EXPIRES_IN_MS',
    7 * 24 * 60 * 60 * 1000
  ),
  refreshTokenCookieOptions: {
    httpOnly: true,
    secure: process.env.REFRESH_TOKEN_COOKIE_SECURE === 'true',
    sameSite: process.env.REFRESH_TOKEN_COOKIE_SAME_SITE || 'lax',
    domain: process.env.REFRESH_TOKEN_COOKIE_DOMAIN || 'localhost',
    path: process.env.REFRESH_TOKEN_COOKIE_PATH || '/',
    maxAge: numberEnv('REFRESH_TOKEN_COOKIE_MAX_AGE', 7 * 24 * 60 * 60 * 1000),
  },

  emailUser: process.env.EMAIL_USER,
  emailPass: process.env.EMAIL_PASS,

  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_BASE_URL: process.env.OPENAI_BASE_URL || 'https://api.deepseek.com',
  HTTPS_PROXY_URL: process.env.HTTPS_PROXY_URL,

  embedding: {
    apiKey: process.env.EMBEDDING_API_KEY || process.env.OPENAI_API_KEY,
    baseURL: process.env.EMBEDDING_BASE_URL || process.env.OPENAI_BASE_URL,
    model: process.env.EMBEDDING_MODEL || '',
    dimensions: numberEnv('EMBEDDING_DIMENSIONS', 384),
    proxyURL: process.env.EMBEDDING_PROXY_URL || '',
    useLocalFallback: booleanEnv('EMBEDDING_LOCAL_FALLBACK', true),
  },

  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'smarttask',
  },
};
