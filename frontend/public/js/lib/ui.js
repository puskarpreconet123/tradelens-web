// /js/lib/ui.js — DOM helpers, toast, modal
export const $  = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export function el(tag, attrs = {}, ...children) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class' || k === 'className') e.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
    else if (k === 'dataset' && typeof v === 'object') Object.assign(e.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') e.innerHTML = v;
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    if (c instanceof Node) e.appendChild(c);
    else e.appendChild(document.createTextNode(String(c)));
  }
  return e;
}

export function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

/* Toast */
let toastIdSeq = 0;
export function toast({ title, description, kind = 'default', timeout = 4200 }) {
  const stack = document.getElementById('toast-stack');
  if (!stack) return;
  const id = ++toastIdSeq;
  const t = el('div', { class: `toast ${kind === 'error' ? 'error' : kind === 'success' ? 'success' : ''}`, dataset: { id } },
    el('div', { class: 't-title' }, title || ''),
    description ? el('div', { class: 't-desc' }, description) : null,
  );
  stack.appendChild(t);
  setTimeout(() => {
    t.style.transition = 'opacity 200ms ease, transform 200ms ease';
    t.style.opacity = '0';
    t.style.transform = 'translateX(20px)';
    setTimeout(() => t.remove(), 220);
  }, timeout);
}

/* Modal */
export function openModal({ title, content, confirmText = 'Confirm', cancelText = 'Cancel', danger = false, onConfirm, hideCancel = false }) {
  const root = document.getElementById('modal-root');
  if (!root) return;
  const overlay = el('div', { class: 'modal-overlay' });
  let textareaValue = '';
  const close = () => overlay.remove();
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  const body = el('div', { class: 'modal' });
  body.appendChild(el('h3', {}, title));
  if (typeof content === 'string') body.appendChild(el('p', {}, content));
  else if (content instanceof Node) body.appendChild(content);

  if (typeof content === 'object' && content?.textarea) {
    const ta = el('textarea', {
      class: 'modal-textarea',
      style: { width: '100%', minHeight: '90px', padding: '10px 12px', borderRadius: '9px', background: 'rgba(8,12,16,0.7)', color: '#e6edf3', border: '1px solid rgba(94, 234, 212, 0.18)', fontSize: '14px', fontFamily: 'Inter, sans-serif', resize: 'vertical', marginBottom: '14px' },
      placeholder: content.placeholder || '',
      onInput: (e) => { textareaValue = e.target.value; },
    });
    body.appendChild(ta);
    setTimeout(() => ta.focus(), 50);
  }

  const actions = el('div', { class: 'actions' });
  if (!hideCancel) actions.appendChild(el('button', { class: 'btn ghost', onClick: close }, cancelText));
  actions.appendChild(el('button', {
    class: `btn ${danger ? 'danger' : 'primary'}`,
    onClick: async () => {
      try { await onConfirm?.(textareaValue); } finally { close(); }
    },
  }, confirmText));
  body.appendChild(actions);
  overlay.appendChild(body);
  root.appendChild(overlay);
  return close;
}

export function fmtDate(d) {
  if (!d) return '—';
  const x = (typeof d === 'string') ? new Date(d.replace(' ', 'T') + (d.endsWith('Z') ? '' : 'Z')) : new Date(d);
  if (isNaN(x.getTime())) return d;
  return x.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export function fmtDateOnly(d) {
  if (!d) return '—';
  const x = (typeof d === 'string') ? new Date(d.replace(' ', 'T') + (d.endsWith('Z') ? '' : 'Z')) : new Date(d);
  if (isNaN(x.getTime())) return d;
  return x.toLocaleDateString();
}

export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
