import { cookies } from 'next/headers';
import crypto from 'node:crypto';

const COOKIE_NAME = 'vs_admin_session';
const SESSION_TTL_SECONDS = 60 * 60 * 12;

function secret() {
  return process.env.ADMIN_SESSION_SECRET || 'CHANGE_ME_BEFORE_PRODUCTION';
}

function sign(value: string) {
  return crypto.createHmac('sha256', secret()).update(value).digest('hex');
}

function createToken() {
  const expires = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = `admin:${expires}`;
  return `${payload}.${sign(payload)}`;
}

export function isAdminCredentials(username: string, password: string) {
  const expectedUser = process.env.ADMIN_USERNAME || 'admin';
  const expectedPassword = process.env.ADMIN_PASSWORD;
  if (!expectedPassword) return false;

  const a = Buffer.from(password);
  const b = Buffer.from(expectedPassword);
  return username === expectedUser && a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function createAdminSession() {
  const token = createToken();
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearAdminSession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function isAdminAuthenticated() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return false;

  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payload, signature] = parts;
  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;

  const match = /^admin:(\d+)$/.exec(payload);
  if (!match) return false;
  return Number(match[1]) > Math.floor(Date.now() / 1000);
}

export { COOKIE_NAME };
