// /js/views/main/shared.js — Navbar, Footer, Preloader, status bar
import { el } from '../../lib/ui.js';
import { icons } from '../../lib/icons.js';
import { isAuthed, getUser, clearAuth } from '../../lib/auth.js';

const NAV_LINKS = [
  { label: 'Platform',     href: '#/platform' },
  { label: 'How it works', href: '#/how-it-works' },
  { label: 'Pricing',      href: '#/pricing' },
  { label: 'FAQ',          href: '#/faq' },
];

export function statusBar() {
  return el('div', { class: 'statusbar', html: `<span class="dot"></span> <span>EduFlash \u2014 USDT Flash Network</span>` });
}

export function renderNavbar() {
  const authed = isAuthed();
  const u = getUser();
  const nav = el('header', { class: 'navbar' });
  const inner = el('div', { class: 'inner' });
  inner.appendChild(el('a', { class: 'brand', href: '#/' },
    el('img', { src: '/eduflash_badge.svg', style: { width: '32px', height: '32px', display: 'block' } }),
    el('div', { class: 'brand-info' },
      el('span', { class: 'brand-text' }, 'EduFlash'),
      el('span', { class: 'brand-tagline hide-sm' }, 'Blockchain Research Education & Laboratory'),
    ),
  ));
  inner.appendChild(el('nav', { class: 'nav-links' },
    ...NAV_LINKS.map(l => el('a', { href: l.href }, l.label)),
  ));

  const right = el('div', { class: 'nav-right' });
  if (authed) {
    if (u?.role === 'admin') {
      right.appendChild(el('a', { class: 'btn primary sm hide-sm', href: '/admin/', html: `${icons.crown('sm')} Admin Panel` }));
    } else {
      right.appendChild(el('a', { class: 'btn primary sm hide-sm', href: '#/dashboard', html: `${icons.layout('sm')} Dashboard` }));
    }
  } else {
    right.appendChild(el('a', { class: 'btn ghost sm hide-sm', href: '#/login' }, 'Sign in'));
    right.appendChild(el('a', { class: 'btn primary sm nav-cta-desktop', href: '#pricing' }, 'Get Access'));
  }
  const menuBtn = el('button', { class: 'icon-btn menu-btn', 'aria-label': 'menu', html: icons.menu('sm') });
  right.appendChild(menuBtn);
  inner.appendChild(right);
  nav.appendChild(inner);

  // Mobile menu
  const mobile = el('div', { class: 'mobile-menu hidden' });
  NAV_LINKS.forEach(l => mobile.appendChild(el('a', { href: l.href, onClick: () => mobile.classList.add('hidden') }, l.label)));
  const mobActions = el('div', { class: 'actions' });
  if (authed) {
    if (u?.role === 'admin') {
      mobActions.appendChild(el('a', { class: 'btn primary full', href: '/admin/', style: { marginBottom: '8px' }, html: `${icons.crown('sm')} Admin Panel` }));
    } else {
      mobActions.appendChild(el('a', { class: 'btn primary full', href: '#/dashboard', html: `${icons.layout('sm')} Dashboard` }));
    }
  } else {
    mobActions.appendChild(el('a', { class: 'btn ghost full', href: '#/login' }, 'Sign in'));
    mobActions.appendChild(el('a', { class: 'btn primary full', href: '#pricing' }, 'Get Access'));
  }
  mobile.appendChild(mobActions);
  nav.appendChild(mobile);

  menuBtn.addEventListener('click', () => mobile.classList.toggle('hidden'));
  document.addEventListener('click', (e) => {
    if (!nav.contains(e.target)) mobile.classList.add('hidden');
  });
  window.addEventListener('resize', () => { if (window.innerWidth >= 1024) mobile.classList.add('hidden'); });

  return nav;
}

export function attachScrollNav() {
  const onScroll = () => {
    const nav = document.querySelector('.navbar');
    if (!nav) return;
    nav.classList.toggle('scrolled', window.scrollY > 30);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

export function renderFooter() {
  const cols = [
    { title: 'Platform',  items: ['Flash Transfers','Network Monitoring','License Keys','Multi-Chain Support','Secure Nodes'] },
    { title: 'Company',   items: ['About','Customers','Careers','Press','Contact'] },
    { title: 'Resources', items: ['Documentation','API Reference','Changelog','Status','Security'] },
  ];
  const f = el('footer', { class: 'tl' });
  const inner = el('div', { class: 'footer-inner' });
  inner.appendChild(el('div', { class: 'footer-brand-col' },
    el('a', { class: 'brand', href: '#/' },
      el('img', { src: '/eduflash_badge.svg', style: { width: '32px', height: '32px', display: 'block' } }),
      el('div', { class: 'brand-info' },
        el('span', { class: 'brand-text' }, 'EduFlash'),
        el('span', { class: 'brand-tagline' }, 'Blockchain Research Education & Laboratory'),
      ),
    ),
    el('p', { style: { marginTop: '14px' } }, 'Enterprise-grade software for USDT flash transfers. Built for speed, anonymity, and trust.'),
    el('div', { class: 'socials' },
      el('a', { class: 'social-btn', href: '#', html: icons.twitter('sm') }),
      el('a', { class: 'social-btn', href: '#', html: icons.github('sm') }),
      el('a', { class: 'social-btn', href: '#', html: icons.linkedin('sm') }),
      el('a', { class: 'social-btn', href: '#', html: icons.mail('sm') }),
    ),
  ));
  cols.forEach(c => {
    inner.appendChild(el('div', {},
      el('h4', { class: 'col-title' }, c.title),
      el('ul', { class: 'col-list' }, ...c.items.map(i => el('li', {}, el('a', { href: '#' }, i)))),
    ));
  });
  f.appendChild(inner);
  f.appendChild(el('div', { class: 'footer-bottom' },
    el('span', {}, `\u00a9 ${new Date().getFullYear()} EduFlash, Inc. All rights reserved.`),
    el('div', { class: 'row gap-16 wrap', html: `<a href="#/terms">Terms</a> <a href="#/privacy">Privacy</a> <span class="mono" style="color:#5eead4;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;padding-left:14px;border-left:1px solid rgba(94,234,212,0.18);"><span class="dot sm"></span> All systems operational</span>` }),
  ));
  return f;
}

export function renderPreloader() {
  const pre = el('div', { class: 'preloader' });
  pre.appendChild(el('div', { class: 'row gap-12' },
    el('img', { src: '/eduflash_badge.svg', style: { width: '48px', height: '48px', display: 'block' } }),
    el('div', { class: 'brand-info' },
      el('div', { style: { fontFamily: 'Space Grotesk', fontSize: '24px', fontWeight: '600', color: '#f1f5f9', lineHeight: '1' } }, 'EduFlash'),
      el('div', { class: 'brand-tagline', style: { fontSize: '9px', opacity: '0.7' } }, 'Blockchain Research Education & Laboratory'),
      el('div', { class: 'mono', style: { fontSize: '11px', letterSpacing: '0.18em', color: '#5eead4', textTransform: 'uppercase', marginTop: '6px' } }, 'Loading secure environment\u2026'),
    ),
  ));
  const barOuter = el('div', { class: 'bar-outer' });
  const barInner = el('div', { class: 'bar-inner' });
  barOuter.appendChild(barInner);
  pre.appendChild(barOuter);
  const pct = el('div', { class: 'pct' }, '0%');
  pre.appendChild(pct);
  let p = 0; const start = performance.now();
  const tick = (t) => {
    p = Math.min(100, ((t - start) / 2000) * 100);
    barInner.style.width = p + '%'; pct.textContent = Math.round(p) + '%';
    if (p < 100) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  return pre;
}
