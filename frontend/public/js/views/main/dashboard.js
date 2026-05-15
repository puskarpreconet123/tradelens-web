// /js/views/main/dashboard.js — User dashboard
import { el, clear, toast, copyToClipboard, fmtDate, fmtDateOnly } from '../../lib/ui.js';
import { icons } from '../../lib/icons.js';
import { api, errorMessage } from '../../lib/api.js';
import { getUser, clearAuth } from '../../lib/auth.js';

export async function renderDashboard(root) {
  clear(root);
  const user = getUser();
  if (!user) { window.location.hash = '#/login'; return; }

  const app = el('div', { class: 'dash-app' });

  // Header
  const header = el('header', { class: 'dash-header' });
  header.appendChild(el('a', { class: 'brand', href: '#/' },
    el('div', { class: 'logo', html: icons.activity('sm') }),
    el('span', { class: 'brand-text' }, 'TradeLens'),
  ));
  header.appendChild(el('div', { class: 'dash-user' },
    el('span', { class: 'name' }, user.name),
    el('span', { class: 'email hide-sm' }, user.email),
    el('button', { class: 'btn ghost sm', onClick: () => { clearAuth(); window.location.hash = '#/'; }, html: `${icons.logOut('sm')} Sign out` }),
  ));
  app.appendChild(header);

  const main = el('main', { class: 'dash-main' });
  main.appendChild(el('div', { class: 'dash-hero' },
    el('span', { class: 'tl-eyebrow' }, 'Workspace'),
    el('h1', { html: `Welcome, <span class="accent">${escapeHtml(user.name.split(' ')[0])}</span>` }),
    el('p', {}, 'Manage your licenses, run backtests, and review your package requests.'),
  ));

  // License card
  const licenseCard = el('div', { class: 'tl-card license-card' });
  licenseCard.innerHTML = `<div class="row gap-12" style="justify-content:center;padding:18px 0;"><span class="spinner"></span></div>`;
  main.appendChild(licenseCard);

  // Backtest panel
  const btPanel = el('div', { class: 'tl-card panel' });
  btPanel.appendChild(el('div', { class: 'panel-head' },
    el('div', { class: 'row gap-8', html: `${icons.trending('sm')} <h2>Run a Backtest</h2>` }),
  ));
  const btForm = el('form', { class: 'bt-form' });
  btForm.appendChild(field('Strategy', 'strategy', 'momentum_rsi_14'));
  btForm.appendChild(field('Market',   'market',   'NASDAQ:AAPL'));
  btForm.appendChild(field('Capital (USD)', 'capital', '100000', 'number'));
  const runBtn = el('button', { type: 'submit', class: 'btn primary', html: `${icons.play('sm')} Run` });
  btForm.appendChild(runBtn);
  btPanel.appendChild(btForm);
  const btResult = el('div');
  btPanel.appendChild(btResult);
  main.appendChild(btPanel);

  // Requests panel
  const reqPanel = el('div', { class: 'tl-card panel' });
  reqPanel.appendChild(el('div', { class: 'panel-head' },
    el('div', { class: 'row gap-8', html: `${icons.inbox('sm')} <h2>My Plan Requests</h2>` }),
    el('a', { class: 'btn ghost sm', href: '#/' }, 'Request another plan'),
  ));
  const reqBody = el('div');
  reqPanel.appendChild(reqBody);
  main.appendChild(reqPanel);

  // Licenses panel
  const licensesPanel = el('div', { class: 'tl-card panel' });
  licensesPanel.appendChild(el('div', { class: 'panel-head' },
    el('div', { class: 'row gap-8', html: `${icons.shield('sm')} <h2>All Licenses</h2>` }),
  ));
  const licensesBody = el('div');
  licensesPanel.appendChild(licensesBody);
  main.appendChild(licensesPanel);

  app.appendChild(main);
  root.appendChild(app);

  // Load data
  let activeLicense = null;
  async function loadAll() {
    try {
      const [active, lics, reqs] = await Promise.all([
        api.get('/licenses/active'),
        api.get('/licenses'),
        api.get('/requests'),
      ]);
      activeLicense = active;
      renderLicenseCard(licenseCard, active);
      renderRequests(reqBody, reqs);
      renderLicensesTable(licensesBody, lics);
      runBtn.disabled = !active;
    } catch (e) {
      toast({ title: 'Failed to load workspace', description: errorMessage(e), kind: 'error' });
    }
  }
  loadAll();

  btForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!activeLicense) {
      toast({ title: 'No active license', description: 'Request and get a plan approved to run backtests.', kind: 'error' });
      return;
    }
    const data = Object.fromEntries(new FormData(btForm));
    runBtn.disabled = true; runBtn.innerHTML = '<span class="spinner"></span> Running\u2026';
    try {
      const result = await api.post('/backtest/run', { strategy: data.strategy, market: data.market, capital: Number(data.capital) || 100000 });
      renderBacktestResult(btResult, result);
      await loadAll();
      toast({ title: 'Backtest complete', description: `Sharpe ${result.sharpe} \u00b7 ${result.run_id}`, kind: 'success' });
    } catch (err) {
      toast({ title: 'Backtest failed', description: errorMessage(err), kind: 'error' });
    } finally {
      runBtn.disabled = !activeLicense;
      runBtn.innerHTML = `${icons.play('sm')} Run`;
    }
  });
}

function field(label, name, val, type = 'text') {
  return el('div', { class: 'field' },
    el('label', { for: name }, label),
    el('input', { id: name, name, type, value: val, required: true }),
  );
}

function renderLicenseCard(card, lic) {
  clear(card);
  card.appendChild(el('div', { class: 'license-head' },
    el('div', { class: 'license-icon', html: icons.shield('lg') }),
    el('div', { class: 'flex-1' },
      el('h3', { class: 'license-title' }, lic ? 'Active License' : 'No Active License'),
      el('p', { class: 'license-meta' },
        lic
          ? `${lic.plan_name} \u00b7 ${lic.period} \u00b7 expires ${fmtDateOnly(lic.expires_at)}`
          : 'Request a plan from the home page \u2014 you\u2019ll receive a license here once approved.',
      ),
    ),
    el('span', { class: `pill ${lic ? 'active' : 'expired'}`, html: `<span class="dot sm"></span> ${lic ? 'Active' : 'Inactive'}` }),
  ));
  if (!lic) return;
  const keys = el('div', { class: 'keys-row' });
  keys.appendChild(keyBox('License Key', lic.license_key));
  keys.appendChild(keyBox('API Key', lic.api_key));
  const used = Number(lic.backtests_used), limit = Number(lic.backtests_limit);
  const unlimited = limit >= 999999;
  const pct = unlimited ? 12 : Math.min(100, (used / Math.max(limit, 1)) * 100);
  keys.appendChild(el('div', { class: 'key-box' },
    el('div', { class: 'key-lab' }, 'Backtest Usage'),
    el('div', { class: 'mono', style: { fontSize: '17px', color: '#f1f5f9', marginTop: '6px' } }, `${used} / ${unlimited ? '\u221e' : limit.toLocaleString()}`),
    el('div', { class: 'usage-bar-outer' }, el('div', { class: 'usage-bar-inner', style: { width: pct + '%' } })),
  ));
  card.appendChild(keys);
}

function keyBox(lab, val) {
  const box = el('div', { class: 'key-box' },
    el('div', { class: 'key-lab' }, lab),
    el('div', { class: 'key-val-row' }),
  );
  const row = box.lastChild;
  row.appendChild(el('code', { class: 'key-val' }, val));
  const btn = el('button', { class: 'copy-btn', 'aria-label': 'Copy', onClick: async () => {
    if (await copyToClipboard(val)) {
      btn.classList.add('copied');
      btn.innerHTML = icons.check('sm');
      setTimeout(() => { btn.classList.remove('copied'); btn.innerHTML = icons.copy('sm'); }, 1400);
    }
  }, html: icons.copy('sm') });
  row.appendChild(btn);
  return box;
}

function renderRequests(body, reqs) {
  clear(body);
  if (!reqs.length) { body.appendChild(el('div', { class: 'empty-state' }, 'No requests yet. Browse plans on the home page to submit one.')); return; }
  const wrap = el('div', { class: 'table-wrap' });
  const table = el('table', { class: 'tl-table' });
  table.innerHTML = `<thead><tr><th>Date</th><th>Plan</th><th>Period</th><th>Price</th><th>Status</th></tr></thead>`;
  const tbody = el('tbody');
  reqs.forEach(r => {
    const tr = el('tr');
    tr.appendChild(el('td', {}, fmtDate(r.created_at)));
    tr.appendChild(el('td', {}, r.plan_name));
    tr.appendChild(el('td', {}, r.period));
    tr.appendChild(el('td', {}, `$${Number(r.price_usd).toFixed(2)}`));
    const status = r.status;
    const pill = el('span', { class: `pill ${status}` }, status);
    const cell = el('td', {});
    cell.appendChild(pill);
    if (status === 'rejected' && r.reject_reason) {
      cell.appendChild(el('div', { style: { fontSize: '11.5px', color: '#fda4af', marginTop: '4px' } }, r.reject_reason));
    }
    tr.appendChild(cell);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  wrap.appendChild(table);
  body.appendChild(wrap);
}

function renderLicensesTable(body, lics) {
  clear(body);
  if (!lics.length) { body.appendChild(el('div', { class: 'empty-state' }, 'No licenses yet.')); return; }
  const wrap = el('div', { class: 'table-wrap' });
  const table = el('table', { class: 'tl-table' });
  table.innerHTML = `<thead><tr><th>Issued</th><th>Plan</th><th>License Key</th><th>Usage</th><th>Expires</th><th>Status</th></tr></thead>`;
  const tbody = el('tbody');
  lics.forEach(l => {
    const tr = el('tr');
    const used = Number(l.backtests_used), limit = Number(l.backtests_limit);
    tr.appendChild(el('td', {}, fmtDateOnly(l.issued_at)));
    tr.appendChild(el('td', {}, `${l.plan_name} \u00b7 ${l.period}`));
    tr.appendChild(el('td', { html: `<code>${l.license_key}</code>` }));
    tr.appendChild(el('td', {}, `${used} / ${limit >= 999999 ? '\u221e' : limit.toLocaleString()}`));
    tr.appendChild(el('td', {}, fmtDateOnly(l.expires_at)));
    tr.appendChild(el('td', { html: `<span class="pill ${l.status}">${l.status}</span>` }));
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  wrap.appendChild(table);
  body.appendChild(wrap);
}

function renderBacktestResult(host, result) {
  clear(host);
  const res = el('div', { class: 'bt-result' });
  res.appendChild(el('div', { class: 'bt-metrics' },
    metric('Sharpe', result.sharpe),
    metric('Max DD', `${result.max_drawdown}%`),
    metric('Trades', Number(result.trades).toLocaleString()),
    metric('Net P&L', `$${Number(result.net_pnl).toLocaleString()}`, true),
    metric('Duration', `${result.duration_ms}ms`),
  ));
  res.appendChild(equityChart(result.equity_curve));
  res.appendChild(el('div', { class: 'run-id', html: `Run ID: <code>${result.run_id}</code>` }));
  host.appendChild(res);
}

function metric(lab, val, accent) {
  return el('div', { class: 'bt-metric' + (accent ? ' accent' : '') },
    el('div', { class: 'lab' }, lab),
    el('div', { class: 'val' }, String(val)),
  );
}

function equityChart(curve) {
  const w = 600, h = 160;
  const min = Math.min(...curve), max = Math.max(...curve);
  const range = max - min || 1;
  const pts = curve.map((v, i) => {
    const x = (i / (curve.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 16) - 8;
    return `${x},${y}`;
  }).join(' ');
  const change = ((curve[curve.length - 1] - curve[0]) / curve[0] * 100).toFixed(2);
  const box = el('div', { class: 'chart-box' });
  box.innerHTML = `
    <svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" preserveAspectRatio="none">
      <defs><linearGradient id="eq" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#22d3ee" stop-opacity="0.45"/><stop offset="100%" stop-color="#22d3ee" stop-opacity="0"/></linearGradient></defs>
      <polyline points="${pts} ${w},${h} 0,${h}" fill="url(#eq)" stroke="none"/>
      <polyline points="${pts}" fill="none" stroke="#22d3ee" stroke-width="1.8"/>
    </svg>
    <div class="chart-meta"><span>Equity Curve</span><span style="color:${change >= 0 ? '#5eead4' : '#fb7185'}">${change >= 0 ? '+' : ''}${change}%</span></div>`;
  return box;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
