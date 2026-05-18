// /js/views/main/auth.js — Login & Register pages
import { el, clear, toast } from '../../lib/ui.js';
import { icons } from '../../lib/icons.js';
import { api, errorMessage, getConfig } from '../../lib/api.js';
import { setToken, setUser, isAuthed } from '../../lib/auth.js';

export async function renderAuth(root, mode = 'login') {
  clear(root);
  if (isAuthed()) { window.location.hash = '#/dashboard'; return; }
  const isLogin = mode === 'login';

  const page = el('div', { class: 'auth-page' });
  page.appendChild(el('a', { class: 'brand auth-brand', href: '#/' },
    el('img', { src: '/eduflash_badge.svg', style: { width: '32px', height: '32px' } }),
    el('div', { class: 'brand-info' },
      el('span', { class: 'brand-text' }, 'EduFlash'),
      el('span', { class: 'brand-tagline' }, 'Blockchain Research Education & Laboratory'),
    ),
  ));

  const card = el('form', { class: 'tl-card auth-card' });
  card.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(card));
    const recaptchaToken = window.grecaptcha ? grecaptcha.getResponse() : null;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Please wait\u2026';
    try {
      const payload = isLogin
        ? { email: data.email, password: data.password, recaptcha_token: recaptchaToken }
        : { 
            email: data.email, 
            password: data.password, 
            name: data.name,
            contact_number: `${data.cc} ${data.contact_number}`,
            recaptcha_token: recaptchaToken
          };
      const res = await api.post(isLogin ? '/auth/login' : '/auth/register', payload);
      setToken(res.token);
      setUser(res.user);
      toast({ title: isLogin ? 'Welcome back' : 'Account created', description: 'Redirecting to your dashboard\u2026', kind: 'success' });
      setTimeout(() => {
        if (res.user.role === 'admin') {
          window.location.href = '/admin/';
        } else {
          window.location.hash = '#/dashboard';
        }
      }, 600);
    } catch (err) {
      toast({ title: 'Authentication failed', description: errorMessage(err), kind: 'error' });
      submitBtn.disabled = false;
      submitBtn.innerHTML = isLogin ? `Sign in ${icons.arrowRight('sm')}` : `Create account ${icons.arrowRight('sm')}`;
    }
  });

  card.appendChild(el('h1', {}, isLogin ? 'Welcome back' : 'Create your account'));
  card.appendChild(el('p', { class: 'sub' }, isLogin ? 'Sign in to access your dashboard.' : 'Enter your details to get started with Flash USDT.'));
  if (!isLogin) {
    card.appendChild(el('div', { class: 'field' },
      el('label', { for: 'name' }, 'Full Name'),
      el('input', { id: 'name', name: 'name', type: 'text', required: true, maxlength: 80, autocomplete: 'name' }),
    ));
    
    card.appendChild(el('div', { class: 'row gap-12', style: { alignItems: 'flex-start' } },
      el('div', { class: 'field', style: { width: '80px' } },
        el('label', { for: 'cc' }, 'Code'),
        el('input', { id: 'cc', name: 'cc', type: 'text', placeholder: '+1', required: true }),
      ),
      el('div', { class: 'field', style: { flex: 1 } },
        el('label', { for: 'contact_number' }, 'WhatsApp or Telegram No'),
        el('input', { id: 'contact_number', name: 'contact_number', type: 'text', placeholder: '1234567890', required: true }),
      )
    ));
    card.appendChild(el('div', { style: { fontSize: '11px', color: '#94a3b8', marginTop: '-8px', marginBottom: '14px' } }, 'Required for account verification and license activation.'));
  }
  card.appendChild(el('div', { class: 'field' },
    el('label', { for: 'email' }, 'Email'),
    el('input', { id: 'email', name: 'email', type: 'email', required: true, autocomplete: 'email' }),
  ));
  card.appendChild(el('div', { class: 'field' },
    el('label', { for: 'password' }, 'Password'),
    el('input', { id: 'password', name: 'password', type: 'password', required: true, minlength: 6, autocomplete: isLogin ? 'current-password' : 'new-password' }),
  ));

  const recaptchaEl = el('div', { class: 'g-recaptcha-wrap', style: { marginBottom: '16px', minHeight: '78px' } });
  const loadingEl = el('div', { class: 'g-recaptcha-loading' }, 
    el('span', { class: 'spinner' }), 'Loading captcha...'
  );
  recaptchaEl.appendChild(loadingEl);
  card.appendChild(recaptchaEl);
  
  // Render reCAPTCHA if script is loaded
  setTimeout(async () => {
    if (window.grecaptcha) {
      const config = await getConfig();
      if (config.recaptcha_site_key) {
        const target = el('div');
        recaptchaEl.appendChild(target);
        grecaptcha.render(target, { sitekey: config.recaptcha_site_key });
        loadingEl.style.display = 'none';
      }
    }
  }, 100);

  const submitBtn = el('button', { type: 'submit', class: 'btn primary full', style: { marginTop: '8px' }, html: isLogin ? `Sign in ${icons.arrowRight('sm')}` : `Create account ${icons.arrowRight('sm')}` });
  card.appendChild(submitBtn);

  card.appendChild(el('div', { class: 'auth-alt' },
    isLogin
      ? el('span', { html: `New to EduFlash? <a href="#/register">Create account</a>` })
      : el('span', { html: `Already have an account? <a href="#/login">Sign in</a>` }),
  ));

  page.appendChild(card);
  root.appendChild(page);
}
