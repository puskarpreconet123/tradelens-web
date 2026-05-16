// /js/main.js — Main app entry
import { Router } from './lib/router.js';
import { renderLanding } from './views/main/landing.js';
import { renderAuth } from './views/main/auth.js';
import { renderDashboard } from './views/main/dashboard.js';
import { renderCheckout } from './views/main/checkout.js';
import { isAuthed, isAdmin } from './lib/auth.js';

const routes = [
  { path: /^\/$/,            view: renderLanding },
  { path: /^\/login$/,       view: (root) => renderAuth(root, 'login') },
  { path: /^\/register$/,    view: (root) => renderAuth(root, 'register') },
  { path: /^\/dashboard$/,   view: renderDashboard },
  { path: /^\/checkout$/,    view: renderCheckout },
];

const router = new Router('app', routes, {
  beforeEach: (path) => {
    if (path === '/dashboard') {
      if (!isAuthed()) {
        window.location.hash = '#/login';
        return false;
      }
      if (isAdmin()) {
        window.location.href = '/admin/';
        return false;
      }
    }
    return true;
  },
  notFound: () => `<div class="section" style="min-height:60vh"><h2 class="tl-h2">Page not found</h2><p class="tl-sub">The page you\u2019re looking for doesn\u2019t exist.</p><a class="btn primary" href="#/">Back to home</a></div>`,
});

if (!window.location.hash) window.location.hash = '#/';
router.start();
window.tlRouter = router;
