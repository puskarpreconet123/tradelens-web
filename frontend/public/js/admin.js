// /js/admin.js — Admin app entry
import { Router } from './lib/router.js';
import { renderAdminDashboard } from './views/admin/dashboard.js';
import { isAuthed, isAdmin } from './lib/auth.js';

const routes = [
  { path: /^\/$/,           view: () => { if (isAuthed() && isAdmin()) { window.location.hash = '#/dashboard'; } else { window.location.href = '/#/login'; } } },
  { path: /^\/dashboard$/,  view: renderAdminDashboard },
];

const router = new Router('app', routes, {
  beforeEach: (path) => {
    if ((path === '/dashboard' || path === '/') && (!isAuthed() || !isAdmin())) {
      window.location.href = '/#/login';
      return false;
    }
    return true;
  },
  notFound: () => `<div class="section"><h2 class="tl-h2">404</h2></div>`,
});

if (!window.location.hash) window.location.hash = '#/';
router.start();
