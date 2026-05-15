// Admin dashboard
import { el, clear, toast, openModal, fmtDate, fmtDateOnly } from '../../lib/ui.js';
import { icons } from '../../lib/icons.js';
import { api, errorMessage } from '../../lib/api.js';
import { getUser, clearAuth } from '../../lib/auth.js';

let currentFilter = 'pending';

export async function renderAdminDashboard(root) {
  clear(root);
  const user = getUser();
  const app = el('div', { class: 'admin-app' });

  // Header
  const header = el('header', { class: 'admin-header' });
  const inner = el('div', { class: 'admin-header-inner' });
  
  inner.appendChild(el('div', { class: 'row gap-12' },
    el('a', { class: 'brand', href: '/' },
      el('div', { class: 'logo', html: icons.activity('sm') }),
      el('span', { class: 'brand-text' }, 'EduFlash'),
    ),
    el('span', { class: 'admin-badge' }, 'Admin Console'),
  ));

  const right = el('div', { class: 'admin-nav-right' });
  right.appendChild(el('div', { class: 'dash-user hide-sm' },
    el('span', { class: 'name' }, user?.name || 'Admin'),
    el('span', { class: 'email' }, user?.email || ''),
  ));
  right.appendChild(el('button', { class: 'btn ghost sm hide-sm', onClick: () => { clearAuth(); window.location.hash = '#/login'; }, html: `${icons.logOut('sm')} Sign out` }));
  
  const menuBtn = el('button', { class: 'icon-btn menu-btn show-sm', 'aria-label': 'menu', html: icons.menu('sm') });
  right.appendChild(menuBtn);
  inner.appendChild(right);
  header.appendChild(inner);

  // Mobile menu
  const mobile = el('div', { class: 'admin-mobile-menu hidden' });
  const mobContent = el('div', { class: 'mobile-content' });
  mobContent.appendChild(el('div', { class: 'mob-user-info' },
    el('div', { class: 'name' }, user?.name || 'Admin'),
    el('div', { class: 'email' }, user?.email || ''),
  ));
  mobContent.appendChild(el('button', { class: 'btn ghost full', style: { marginTop: '12px' }, onClick: () => { clearAuth(); window.location.hash = '#/login'; }, html: `${icons.logOut('sm')} Sign out` }));
  mobile.appendChild(mobContent);
  header.appendChild(mobile);

  app.appendChild(header);

  menuBtn.addEventListener('click', (e) => { e.stopPropagation(); mobile.classList.toggle('hidden'); });
  document.addEventListener('click', (e) => { if (!header.contains(e.target)) mobile.classList.add('hidden'); });

  const main = el('main', { class: 'admin-main' });

  // Page title
  main.appendChild(el('div', { class: 'dash-hero' },
    el('span', { class: 'tl-eyebrow' }, 'Operations'),
    el('h1', { html: `Admin <span class="accent">Workspace</span>` }),
    el('p', {}, 'Review package requests, approve or reject, and monitor platform usage.'),
  ));

  // Stats
  const statsRow = el('div', { class: 'admin-stats' });
  main.appendChild(statsRow);

  // Requests panel
  const reqPanel = el('div', { class: 'tl-card panel' });
  reqPanel.appendChild(el('div', { class: 'panel-head' },
    el('div', { class: 'row gap-8', html: `${icons.inbox('sm')} <h2>Package Requests</h2>` }),
  ));
  const filterRow = el('div', { class: 'filter-row' });
  ['pending','approved','rejected','all'].forEach(f => {
    filterRow.appendChild(el('button', {
      class: 'filter-btn' + (f === currentFilter ? ' active' : ''),
      dataset: { f },
      onClick: () => { currentFilter = f; filterRow.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('active', b.dataset.f === f)); loadRequests(); },
    }, f));
  });
  reqPanel.appendChild(filterRow);
  const reqList = el('div');
  reqPanel.appendChild(reqList);
  main.appendChild(reqPanel);

  // Users panel
  const usersPanel = el('div', { class: 'tl-card panel' });
  usersPanel.appendChild(el('div', { class: 'panel-head' },
    el('div', { class: 'row gap-8', html: `${icons.users('sm')} <h2>Users</h2>` }),
  ));
  const usersBody = el('div');
  usersPanel.appendChild(usersBody);
  main.appendChild(usersPanel);

  app.appendChild(main);
  root.appendChild(app);

  async function loadStats() {
    try {
      const s = await api.get('/admin/stats');
      clear(statsRow);
      const items = [
        { v: s.users, l: 'Total Users' },
        { v: s.pending_requests, l: 'Pending Reqs', c: 'amber' },
        { v: s.approved_requests, l: 'Approved', c: 'green' },
        { v: s.rejected_requests, l: 'Rejected', c: 'rose' },
        { v: s.active_licenses, l: 'Active Licenses' },
        { v: s.total_backtests, l: 'USDT Flashed' },
      ];
      items.forEach(i => statsRow.appendChild(el('div', { class: 'admin-stat ' + (i.c || '') },
        el('div', { class: 'val' }, Number(i.v).toLocaleString()),
        el('div', { class: 'lab' }, i.l),
      )));
    } catch (e) { toast({ title: 'Failed to load stats', description: errorMessage(e), kind: 'error' }); }
  }

  async function loadRequests() {
    clear(reqList);
    reqList.appendChild(el('div', { class: 'row gap-12', style: { padding: '20px', justifyContent: 'center' } }, el('span', { class: 'spinner' })));
    try {
      const qs = currentFilter !== 'all' ? `?status=${currentFilter}` : '';
      const reqs = await api.get('/admin/requests' + qs);
      clear(reqList);
      if (!reqs.length) { reqList.appendChild(el('div', { class: 'empty-state' }, `No ${currentFilter} requests.`)); return; }
      reqs.forEach(r => reqList.appendChild(renderRequestCard(r, loadAll)));
    } catch (e) {
      clear(reqList);
      reqList.appendChild(el('div', { class: 'empty-state' }, errorMessage(e)));
    }
  }

  async function loadUsers() {
    try {
      const users = await api.get('/admin/users');
      clear(usersBody);
      if (!users.length) { usersBody.appendChild(el('div', { class: 'empty-state' }, 'No users.')); return; }
      const wrap = el('div', { class: 'table-wrap' });
      const table = el('table', { class: 'tl-table' });
      table.innerHTML = `<thead><tr><th>Joined</th><th>Name</th><th>Email</th><th>Contact</th><th>Role</th></tr></thead>`;
      const tbody = el('tbody');
      users.forEach(u => {
        const tr = el('tr');
        tr.appendChild(el('td', {}, fmtDateOnly(u.created_at)));
        tr.appendChild(el('td', {}, u.name));
        tr.appendChild(el('td', { html: `<code>${u.email}</code>` }));
        tr.appendChild(el('td', {}, u.contact_number || '-'));
        tr.appendChild(el('td', { html: `<span class="pill ${u.role === 'admin' ? 'active' : 'pending'}">${u.role}</span>` }));
        tbody.appendChild(tr);
      });
      table.appendChild(tbody); wrap.appendChild(table);
      usersBody.appendChild(wrap);
    } catch (e) {
      usersBody.innerHTML = '';
      usersBody.appendChild(el('div', { class: 'empty-state' }, errorMessage(e)));
    }
  }

  async function loadAll() { await Promise.all([loadStats(), loadRequests(), loadUsers()]); }
  loadAll();
}

function renderRequestCard(r, refresh) {
  const card = el('div', { class: 'tl-card req-card' });
  const info = el('div', { class: 'req-info' });
  info.appendChild(el('div', { class: 'req-top' },
    el('span', { class: 'req-plan' }, r.plan_name),
    el('span', { class: `pill ${r.status}` }, r.status),
    Number(r.is_demo) === 1 ? el('span', { class: 'pill expired' }, 'DEMO') : null,
  ));
  info.appendChild(el('div', { class: 'req-user', html: `${r.user_name} \u00b7 <code>${r.user_email}</code>` }));
  info.appendChild(el('div', { class: 'req-meta' },
    el('span', {}, `Period: ${r.period}`),
    el('span', {}, `Price: $${Number(r.price_usd).toFixed(2)}`),
    el('span', {}, `Submitted: ${fmtDate(r.created_at)}`),
  ));
  if (r.status === 'rejected' && r.reject_reason) {
    info.appendChild(el('div', { class: 'req-rejected-reason', html: `Reason: ${escapeHtml(r.reject_reason)}` }));
  }
  card.appendChild(info);

  if (r.status === 'pending') {
    const actions = el('div', { class: 'req-actions' });
    actions.appendChild(el('button', { class: 'btn primary sm', onClick: () => approve(r, refresh), html: `${icons.check('sm')} Approve` }));
    actions.appendChild(el('button', { class: 'btn danger sm', onClick: () => rejectFlow(r, refresh), html: `${icons.x('sm')} Reject` }));
    card.appendChild(actions);
  }
  return card;
}

async function approve(r, refresh) {
  openModal({
    title: 'Approve request?',
    content: `Approve ${r.plan_name} \u2014 ${r.period} for ${r.user_email}? A license will be issued immediately.`,
    confirmText: 'Yes, approve',
    onConfirm: async () => {
      try {
        const res = await api.post(`/admin/requests/${r.id}/approve`);
        toast({ title: 'Approved', description: `License ${res.license?.license_key} issued.`, kind: 'success' });
        refresh?.();
      } catch (e) { toast({ title: 'Approve failed', description: errorMessage(e), kind: 'error' }); }
    },
  });
}

async function rejectFlow(r, refresh) {
  openModal({
    title: 'Reject request?',
    content: { textarea: true, placeholder: 'Optional reason shown to the user...' },
    confirmText: 'Reject',
    danger: true,
    onConfirm: async (reason) => {
      try {
        await api.post(`/admin/requests/${r.id}/reject`, { reason });
        toast({ title: 'Request rejected', description: 'User will see the status in their dashboard.', kind: 'success' });
        refresh?.();
      } catch (e) { toast({ title: 'Reject failed', description: errorMessage(e), kind: 'error' }); }
    },
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
