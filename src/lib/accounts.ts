import type { Account, AccountData, CategoryId, Details, Lang } from '../types';

/**
 * Account backend client. The prototype talks to the local demo server (server/demoApi.ts);
 * a production backend only has to serve the same routes.
 */
export interface RegisterInput {
  fullName: string;
  username: string;
  email: string;
  mobile: string;
  password: string;
  category: CategoryId;
  state: string;
  district: string;
  preferredLang: Lang;
  gender?: string;
  details: Details;
  data?: AccountData;
}

export type AccountPatch = Partial<Pick<Account, 'fullName' | 'email' | 'mobile' | 'category' | 'state' | 'district' | 'preferredLang' | 'gender' | 'details'>> & { data?: AccountData };

export class AccountError extends Error {
  constructor(public code: 'server' | 'credentials' | 'taken' | 'invalid' | 'session' | 'nomatch') {
    super(code);
  }
}

async function call<T>(method: string, path: string, body?: unknown, token?: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new AccountError('server');
  }
  const json = await res.json().catch(() => null);
  if (!res.ok || !json) {
    const map: Record<number, AccountError['code']> = { 401: path === '/login' ? 'credentials' : 'session', 409: 'taken', 400: 'invalid', 404: 'nomatch' };
    throw new AccountError(map[res.status] ?? 'server');
  }
  return json as T;
}

export const accounts = {
  register: (input: RegisterInput) => call<{ token: string; user: Account }>('POST', '/register', input),
  login: (identifier: string, password: string) => call<{ token: string; user: Account }>('POST', '/login', { identifier, password }),
  me: (token: string) => call<{ user: Account }>('GET', '/me', undefined, token).then((r) => r.user),
  update: (token: string, patch: AccountPatch) => call<{ user: Account }>('PATCH', '/me', patch, token).then((r) => r.user),
  logout: (token: string) => call('POST', '/me/logout', undefined, token).catch(() => undefined),
  resetPassword: (identifier: string, mobile: string, password: string) => call('POST', '/reset-password', { identifier, mobile, password }),
};

/* Session token: localStorage when "Remember me" is ticked, otherwise only for this tab. */
const TOKEN_KEY = 'schemesaathi:session';
export const session = {
  get(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token: string, remember: boolean) {
    try {
      (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
    } catch {
      /* ignore */
    }
  },
  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
  },
};
