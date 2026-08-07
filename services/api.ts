import axios, { isAxiosError } from 'axios';
import { getAccessToken } from '@/utils/session';

const DEFAULT_API_URL = 'https://apiparaba.maxfoot.com.br';

function normalizeApiUrl(url: string): string {
  const normalizedUrl = url.replace(/\/+$/, '');
  return normalizedUrl.endsWith('/api') ? normalizedUrl : `${normalizedUrl}/api`;
}

export const API_BASE_URL = normalizeApiUrl(process.env.EXPO_PUBLIC_PARABA_API_URL || DEFAULT_API_URL);

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    if (typeof config.headers.set === 'function') {
      config.headers.set('Content-Type', 'multipart/form-data');
    } else {
      config.headers['Content-Type'] = 'multipart/form-data';
    }
  }

  return config;
});

export function apiErrorMessage(error: unknown, fallback = 'Nao foi possivel concluir a operacao.'): string {
  if (isAxiosError(error)) {
    const data = error.response?.data as { message?: string; error?: string } | undefined;
    const detail = data?.error && data.error !== data.message ? ` (${data.error})` : '';
    return (data?.message || data?.error || error.message || fallback) + detail;
  }

  return error instanceof Error ? error.message : fallback;
}
