import { UserProfile } from '../types';

/** Public address of the client site. The admin panel lives on another host, so links never use window.location. */
export const CLIENT_SITE_URL = 'https://zuxoplayer.online';
/** Same address without the protocol, for display ("zuxoplayer.online"). */
export const CLIENT_SITE_HOST = CLIENT_SITE_URL.replace(/^https?:\/\//, '');

// Words that are already used by the app, the server or the browser and cannot be a client link.
const RESERVED_SLUGS = new Set([
  'api', 'assets', 'icons', 'admin', 'adm', 'admzuxo', 'webhook', 'sw', 'manifest', 'favicon', 'robots',
  'index', 'login', 'cadastro', 'feed', 'cliente', 'clientes', 'painel', 'grade', 'zuxo', 'zuxoplay', 'static', 'public',
]);

const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/;

/** Turns any text into a link-safe slug: lowercase, no accents, only letters, numbers and hyphens (max 30). */
export function normalizeSlug(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30)
    .replace(/-+$/g, '');
}

/** Returns an error message in Portuguese, or null when the slug can be used. */
export function validateSlug(slug: string): string | null {
  if (slug.length < 3) return 'O link precisa ter pelo menos 3 caracteres.';
  if (slug.length > 30) return 'O link pode ter no máximo 30 caracteres.';
  if (!SLUG_PATTERN.test(slug)) return 'Use só letras minúsculas, números e hífen (sem espaços ou acentos).';
  if (RESERVED_SLUGS.has(slug)) return 'Este nome é reservado pelo sistema. Escolha outro.';
  return null;
}

export function isSlugTaken(slug: string, clients: UserProfile[], ignoreClientId?: string): boolean {
  return clients.some((c) => c.id !== ignoreClientId && (c.slug || '').toLowerCase() === slug);
}

/** A short random code that makes the link hard to guess, e.g. "lucas-7k3p". */
export function randomCode(length = 4): string {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
  let out = '';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}

/** Base name from the client name, with a random code so the link cannot be guessed. */
export function suggestSlug(name: string, clients: UserProfile[], ignoreClientId?: string): string {
  const base = normalizeSlug(name).slice(0, 24) || 'cliente';
  for (let i = 0; i < 20; i++) {
    const candidate = `${base}-${randomCode(4)}`;
    if (!validateSlug(candidate) && !isSlugTaken(candidate, clients, ignoreClientId)) return candidate;
  }
  return `${base}-${Date.now().toString(36).slice(-5)}`;
}

/** The link slug of an address like "/lucasrafael", or null when the path is not a client link. */
export function slugFromPath(pathname: string): string | null {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length !== 1) return null;
  let slug: string;
  try {
    slug = decodeURIComponent(segments[0]).toLowerCase();
  } catch {
    return null;
  }
  return validateSlug(slug) ? null : slug;
}

export function clientLinkUrl(slug: string): string {
  return `${CLIENT_SITE_URL}/${slug}`;
}
