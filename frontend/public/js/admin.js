// /js/admin.js — Admin app entry
import { Router } from './lib/router.js';
import { renderAdminLogin } from './views/admin/login.js';
import { renderAdminDashboard } from './views/admin/dashboard.js';
import { isAuthed, isAdmin } from './lib/auth.js';

const routes = [
  { path: /^\/$/,           view: (r) => { if (isAuthed() && isAdmin()) { window.location.hash = '#/dashboard'; } else { window.location.hash = '#/login'; } } },
  { path: /^\/login$/,      view: renderAdminLogin },
  { path: /^\/dashboard$/,  view: renderAdminDashboard },
];

const router = new Router('app', routes, {
  beforeEach: (path) => {
    if (path === '/dashboard' && (!isAuthed() || !isAdmin())) {
      window.location.hash = '#/login';
      return false;
    }
    return true;
  },
  notFound: () => `<div class="section"><h2 class="tl-h2">404</h2></div>`,
});

if (!window.location.hash) window.location.hash = '#/';
router.start();
