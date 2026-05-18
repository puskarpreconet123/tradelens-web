// /js/views/main/reset_password.js
import { el, clear, toast } from '../../lib/ui.js';
import { icons } from '../../lib/icons.js';
import { api, errorMessage } from '../../lib/api.js';

export async function renderResetPassword(root) {
  clear(root);

  const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
  const token = urlParams.get('token');

  const page = el('div', { class: 'auth-page' });
  page.appendChild(el('a', { class: 'brand auth-brand', href: '#/' },
    el('img', { src: '/eduflash_badge.svg', style: { width: '32px', height: '32px' } }),
    el('div', { class: 'brand-info' },
      el('span', { class: 'brand-text' }, 'EduFlash'),
    ),
  ));

  const card = el('form', { class: 'tl-card auth-card' });
  
  if (!token) {
    card.appendChild(el('h1', {}, 'Invalid Link'));
    card.appendChild(el('p', { class: 'sub' }, 'This password reset link is invalid or has expired.'));
    card.appendChild(el('a', { class: 'btn primary full', style: { marginTop: '16px' }, href: '#/forgot-password' }, 'Request new link'));
    page.appendChild(card);
    root.appendChild(page);
    return;
  }

  card.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(card));
    if (data.password !== data.password_confirm) {
      toast({ title: 'Passwords do not match', kind: 'error' });
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Resetting\u2026';
    try {
      await api.post('/auth/reset-password', { token, password: data.password });
      toast({ title: 'Password reset', description: 'Your password has been changed successfully.', kind: 'success' });
      setTimeout(() => { window.location.hash = '#/login'; }, 1500);
    } catch (err) {
      toast({ title: 'Reset failed', description: errorMessage(err), kind: 'error' });
      submitBtn.disabled = false;
      submitBtn.innerHTML = `Set New Password`;
    }
  });

  card.appendChild(el('h1', {}, 'Set New Password'));
  card.appendChild(el('p', { class: 'sub' }, 'Please enter your new password below.'));
  
  card.appendChild(el('div', { class: 'field' },
    el('label', { for: 'password' }, 'New Password'),
    el('input', { id: 'password', name: 'password', type: 'password', placeholder: '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022', required: true, minlength: 6 }),
  ));
  card.appendChild(el('div', { class: 'field' },
    el('label', { for: 'password_confirm' }, 'Confirm Password'),
    el('input', { id: 'password_confirm', name: 'password_confirm', type: 'password', placeholder: '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022', required: true, minlength: 6 }),
  ));

  const submitBtn = el('button', { type: 'submit', class: 'btn primary full', style: { marginTop: '8px' }, html: `Set New Password` });
  card.appendChild(submitBtn);

  page.appendChild(card);
  root.appendChild(page);
}
