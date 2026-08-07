import { secureDeleteItem, secureGetItem, secureSetItem } from './secureStorage';

const ACCESS_TOKEN_KEY = 'PARABA_ACCESS_TOKEN';
const REFRESH_TOKEN_KEY = 'PARABA_REFRESH_TOKEN';
const USER_DATA_KEY = 'PARABA_USER_DATA';

export type SessionUser = {
  id: string;
  nome: string;
  email: string;
  celular?: string;
  tipo?: 1 | 2 | 'admin' | 'professor' | 'aluno' | string;
  ativo?: boolean;
  alunoId?: string | null;
  foto?: string | null;
  faixaAtual?: string | null;
  graus?: number | null;
};

export type AuthPayload = {
  accessToken: string;
  refreshToken?: string;
  user: SessionUser;
};

export async function persistSession(payload: AuthPayload): Promise<void> {
  await secureSetItem(ACCESS_TOKEN_KEY, payload.accessToken);
  if (payload.refreshToken) {
    await secureSetItem(REFRESH_TOKEN_KEY, payload.refreshToken);
  }
  await secureSetItem(USER_DATA_KEY, JSON.stringify(payload.user));
}

export async function getAccessToken(): Promise<string | null> {
  return secureGetItem(ACCESS_TOKEN_KEY);
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const raw = await secureGetItem(USER_DATA_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export async function updateCurrentUser(user: SessionUser): Promise<void> {
  await secureSetItem(USER_DATA_KEY, JSON.stringify(user));
}

export async function hasSession(): Promise<boolean> {
  const token = await getAccessToken();
  return Boolean(token);
}

export async function signOut(): Promise<void> {
  await secureDeleteItem(ACCESS_TOKEN_KEY);
  await secureDeleteItem(REFRESH_TOKEN_KEY);
  await secureDeleteItem(USER_DATA_KEY);
}
