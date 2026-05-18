// /js/views/main/forgot_password.js
import { el, clear, toast } from '../../lib/ui.js';
import { icons } from '../../lib/icons.js';
import { api, errorMessage } from '../../lib/api.js';

export async function renderForgotPassword(root) {
  clear(root);

  const page = el('div', { class: 'auth-page' });
  page.appendChild(el('a', { class: 'brand auth-brand', href: '#/' },
    el('img', { src: '/eduflash_badge.svg', style: { width: '32px', height: '32px' } }),
    el('div', { class: 'brand-info' },
      el('span', { class: 'brand-text' }, 'EduFlash'),
    ),
  ));

  const card = el('form', { class: 'tl-card auth-card' });
  card.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(card));
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Sending\u2026';
    try {
      await api.post('/auth/forgot-password', { email: data.email });
      toast({ title: 'Email sent', description: 'If an account exists, a reset link has been sent.', kind: 'success' });
      card.innerHTML = '';
      card.appendChild(el('h1', {}, 'Check your email'));
      card.appendChild(el('p', { class: 'sub' }, 'We have sent password reset instructions to your email address.'));
      card.appendChild(el('a', { class: 'btn primary full', style: { marginTop: '16px' }, href: '#/login' }, 'Back to Sign in'));
    } catch (err) {
      toast({ title: 'Request failed', description: errorMessage(err), kind: 'error' });
      submitBtn.disabled = false;
      submitBtn.innerHTML = `Send Reset Link`;
    }
  });

  card.appendChild(el('h1', {}, 'Reset Password'));
  card.appendChild(el('p', { class: 'sub' }, 'Enter your email address and we will send you a link to reset your password.'));
  
  card.appendChild(el('div', { class: 'field' },
    el('label', { for: 'email' }, 'Email'),
    el('input', { id: 'email', name: 'email', type: 'email', placeholder: 'you@example.com', required: true, autocomplete: 'email' }),
  ));

  const submitBtn = el('button', { type: 'submit', class: 'btn primary full', style: { marginTop: '8px' }, html: `Send Reset Link` });
  card.appendChild(submitBtn);

  card.appendChild(el('div', { class: 'auth-alt' },
    el('span', { html: `<a href="#/login">${icons.arrowLeft('sm')} Back to Sign in</a>` }),
  ));

  page.appendChild(card);
  root.appendChild(page);
}
