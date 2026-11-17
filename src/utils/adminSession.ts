// Admin session: a signed token issued by the server after the password is checked there.
// It lives only in this tab (sessionStorage) and expires on its own.

const TOKEN_KEY = 'zuxo_admin_token';
const EXPIRES_KEY = 'zuxo_admin_token_exp';

export function getAdminToken(): string | null {
  try {
    const token = sessionStorage.getItem(TOKEN_KEY);
    const expiresAt = Number(sessionStorage.getItem(EXPIRES_KEY) || 0);
    if (token && expiresAt > Date.now()) return token;
    if (token) clearAdminToken();
  } catch {}
  return null;
}

export function setAdminToken(token: string, expiresAt: number) {
  try {
    sessionStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(EXPIRES_KEY, String(expiresAt));
  } catch {}
}

export function clearAdminToken() {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(EXPIRES_KEY);
  } catch {}
}

/** Signs in with the admin password. Throws an Error with a message that can be shown to the person. */
export async function loginAdmin(password: string): Promise<void> {
  let res: Response;
  try {
    res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
  } catch {
    throw new Error('Não foi possível falar com o servidor. Verifique a conexão.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Erro ${res.status}`);
  setAdminToken(data.token, data.expiresAt);
}

/** fetch() for the protected admin routes. On 401 the session is dropped and the panel locks itself. */
export async function adminFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const token = getAdminToken();
  const res = await fetch(input, {
    ...init,
    headers: { ...(init.headers || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (res.status === 401) {
    clearAdminToken();
    window.dispatchEvent(new Event('zuxo-admin-expired'));
  }
  return res;
}
