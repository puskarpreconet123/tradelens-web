// Admin login page
import { el, clear, toast } from '../../lib/ui.js';
import { icons } from '../../lib/icons.js';
import { api, errorMessage } from '../../lib/api.js';
import { setToken, setUser, isAuthed, isAdmin } from '../../lib/auth.js';

export async function renderAdminLogin(root) {
  clear(root);
  if (isAuthed() && isAdmin()) { window.location.hash = '#/dashboard'; return; }

  const page = el('div', { class: 'auth-page' });
  page.appendChild(el('a', { class: 'brand auth-brand', href: '/' },
    el('div', { class: 'logo', html: icons.activity('sm') }),
    el('span', { class: 'brand-text' }, 'EduFlash'),
  ));

  const card = el('form', { class: 'tl-card auth-card' });
  card.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(card));
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Authenticating\u2026';
    try {
      const res = await api.post('/admin/login', { email: data.email, password: data.password });
      setToken(res.token); setUser(res.user);
      toast({ title: 'Admin sign-in successful', description: 'Loading admin console\u2026', kind: 'success' });
      setTimeout(() => { window.location.hash = '#/dashboard'; }, 500);
    } catch (err) {
      toast({ title: 'Sign-in failed', description: errorMessage(err), kind: 'error' });
      submitBtn.disabled = false;
      submitBtn.innerHTML = `Sign in ${icons.arrowRight('sm')}`;
    }
  });

  card.appendChild(el('div', { class: 'admin-badge', style: { width: 'fit-content', marginBottom: '14px' } }, 'Admin Console'));
  card.appendChild(el('h1', {}, 'Admin sign in'));
  card.appendChild(el('p', { class: 'sub' }, 'Restricted area. Authorized personnel only.'));
  card.appendChild(el('div', { class: 'field' },
    el('label', { for: 'email' }, 'Admin Email'),
    el('input', { id: 'email', name: 'email', type: 'email', required: true, autocomplete: 'email' }),
  ));
  card.appendChild(el('div', { class: 'field' },
    el('label', { for: 'password' }, 'Password'),
    el('input', { id: 'password', name: 'password', type: 'password', required: true, minlength: 6, autocomplete: 'current-password' }),
  ));
  const submitBtn = el('button', { type: 'submit', class: 'btn primary full', style: { marginTop: '8px' }, html: `Sign in ${icons.arrowRight('sm')}` });
  card.appendChild(submitBtn);
  card.appendChild(el('div', { class: 'auth-alt', html: `Need user access instead? <a href="/">Back to main site</a>` }));

  page.appendChild(card);
  root.appendChild(page);
}
