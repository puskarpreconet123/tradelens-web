// /js/lib/api.js — fetch wrapper with auth header
import { getToken, clearAuth } from './auth.js';

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
  ? 'http://localhost:8000' 
  : 'https://tradelens-php.onrender.com';

async function request(path, opts = {}) {
  const headers = { 'Accept': 'application/json', ...(opts.headers || {}) };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (opts.body && !(opts.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
  let data = null;
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) data = await res.json();
  else data = await res.text();
  if (!res.ok) {
    const msg = data?.detail || data?.message || (typeof data === 'string' ? data : null) || res.statusText || `Request failed with status ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    if (res.status === 401) clearAuth();
    throw err;
  }
  return data;
}

export const api = {
  get:  (p)         => request(p, { method: 'GET' }),
  post: (p, body)   => request(p, { method: 'POST', body: body ? JSON.stringify(body) : null }),
  put:  (p, body)   => request(p, { method: 'PUT',  body: body ? JSON.stringify(body) : null }),
  del:  (p)         => request(p, { method: 'DELETE' }),
};

export function errorMessage(err, fallback = 'Something went wrong.') {
  const d = err?.data?.detail;
  if (Array.isArray(d)) return d.map(e => e.msg || e.message || JSON.stringify(e)).join(', ');
  if (typeof d === 'string') return d;
  return err?.message || fallback;
}
