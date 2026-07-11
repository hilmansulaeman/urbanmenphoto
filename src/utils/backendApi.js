import { getConfiguredBackendApiUrl } from './kioskConfig.js';

export const BACKEND_API_URL = (import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:8787').replace(/\/$/, '');

export function getBackendApiUrl() {
  return getConfiguredBackendApiUrl(BACKEND_API_URL);
}

export async function backendRequest(path, token, options = {}) {
  const headers = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(options.sessionToken ? { 'x-session-token': options.sessionToken } : {}),
    ...(options.headers || {}),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${getBackendApiUrl()}${path}`, {
    ...options,
    headers,
  });
  const payload = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(payload?.error?.message || `Request failed with status ${response.status}`);
    error.status = response.status;
    if (response.status === 401 && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('backend:unauthorized', { detail: { path } }));
    }
    throw error;
  }
  return payload?.data ?? payload;
}

export async function reportMonitoringError({ category, sessionId = '', message = '', source = 'client', metadata = {} } = {}) {
  try {
    await backendRequest('/api/events/errors', null, {
      method: 'POST',
      body: JSON.stringify({ category, sessionId, message, source, metadata }),
    });
  } catch (err) {
    console.warn('Failed to report monitoring error:', err);
  }
}

export function formatCurrency(value) {
  return `Rp ${Number(value || 0).toLocaleString('id-ID')}`;
}

export function formatDateTime(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('id-ID');
}
