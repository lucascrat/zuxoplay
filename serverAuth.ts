import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';

// ---------------------------------------------------------------------------
// Admin session
// The admin password lives only in the environment (ADMIN_PASSWORD). Logging in returns a signed,
// expiring token that the admin panel sends with every request to a protected route.
// ---------------------------------------------------------------------------

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const TOKEN_SECRET = process.env.ADMIN_TOKEN_SECRET || '';
const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;

/** Without both variables the admin cannot log in at all: there is no built-in fallback password. */
export const ADMIN_AUTH_ENABLED = ADMIN_PASSWORD.length >= 10 && TOKEN_SECRET.length >= 32;

const b64url = (input: Buffer | string) => Buffer.from(input).toString('base64url');

function hmac(data: string): string {
  return crypto.createHmac('sha256', TOKEN_SECRET).update(data).digest('base64url');
}

/** Compares two secrets in constant time, whatever their lengths. */
export function safeEqual(a: string, b: string): boolean {
  const ha = crypto.createHash('sha256').update(a).digest();
  const hb = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

export function checkAdminPassword(candidate: string): boolean {
  return ADMIN_AUTH_ENABLED && safeEqual(candidate, ADMIN_PASSWORD);
}

export function issueAdminToken(): { token: string; expiresAt: number } {
  const expiresAt = Date.now() + TOKEN_TTL_MS;
  const body = b64url(JSON.stringify({ role: 'admin', exp: expiresAt }));
  return { token: `${body}.${hmac(body)}`, expiresAt };
}

function verifyAdminToken(token: string): boolean {
  if (!ADMIN_AUTH_ENABLED) return false;
  const [body, signature] = token.split('.');
  if (!body || !signature || !safeEqual(signature, hmac(body))) return false;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8'));
    return payload?.role === 'admin' && typeof payload.exp === 'number' && payload.exp > Date.now();
  } catch {
    return false;
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (token && verifyAdminToken(token)) return next();
  res.status(401).json({ error: 'Sessão de administrador inválida ou expirada.' });
}

// ---------------------------------------------------------------------------
// Rate limit (in memory, per address): slows down guessing of passwords and links
// ---------------------------------------------------------------------------

const hits = new Map<string, { count: number; resetAt: number }>();

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of hits) if (entry.resetAt <= now) hits.delete(key);
}, 60_000).unref();

export function rateLimit(name: string, max: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${name}:${req.ip}`;
    const now = Date.now();
    const entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    entry.count += 1;
    if (entry.count > max) {
      res.setHeader('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      return res.status(429).json({ error: 'Muitas tentativas. Aguarde alguns minutos e tente de novo.' });
    }
    next();
  };
}

// ---------------------------------------------------------------------------
// Client passwords (scrypt, salted). Format: scrypt$<salt>$<hash>
// ---------------------------------------------------------------------------

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 32);
  return `scrypt$${salt.toString('base64url')}$${hash.toString('base64url')}`;
}

export function verifyPassword(password: string, stored: unknown): boolean {
  if (typeof stored !== 'string') return false;
  const [scheme, saltText, hashText] = stored.split('$');
  if (scheme !== 'scrypt' || !saltText || !hashText) return false;
  try {
    const expected = Buffer.from(hashText, 'base64url');
    const actual = crypto.scryptSync(password, Buffer.from(saltText, 'base64url'), expected.length);
    return crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
