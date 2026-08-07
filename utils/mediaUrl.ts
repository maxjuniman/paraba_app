import { API_BASE_URL } from '@/services/api';

export function apiOrigin(): string {
  return API_BASE_URL.replace(/\/api\/?$/, '');
}

export function resolveMediaUrl(pathOrUrl: string): string {
  const value = pathOrUrl.trim();
  if (!value) return value;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('/')) return `${apiOrigin()}${value}`;
  return `${apiOrigin()}/${value}`;
}
