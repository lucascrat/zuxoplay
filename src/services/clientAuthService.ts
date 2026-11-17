import { UserProfile } from '../types';

/** Error with a message that can be shown to the person, plus the HTTP status (0 = no connection). */
export class ClientAuthError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function call(url: string, init?: RequestInit): Promise<UserProfile> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new ClientAuthError('Sem conexão. Verifique a internet e tente de novo.', 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ClientAuthError(data?.error || `Erro ${res.status}`, res.status);
  return data.client as UserProfile;
}

const post = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

/** The server checks the password and returns the client only when it matches. */
export const loginClient = (email: string, password: string) => call('/api/client/login', post({ email, password }));

export const registerClient = (data: {
  name: string;
  email: string;
  password: string;
  whatsapp: string;
  avatar: string;
  plan: string;
}) => call('/api/client/register', post(data));

/** Opens the client that owns a personal link. Status 404 means no client has it. */
export const fetchClientByLink = (slug: string) => call(`/api/client/link/${encodeURIComponent(slug)}`);
