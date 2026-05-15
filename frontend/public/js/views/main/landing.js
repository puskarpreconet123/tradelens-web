// /js/views/main/landing.js — Landing page renderer
import { el, clear, toast } from '../../lib/ui.js';
import { icons } from '../../lib/icons.js';
import { api } from '../../lib/api.js';
import { isAuthed, getUser } from '../../lib/auth.js';
import { renderNavbar, renderFooter, renderPreloader, statusBar, attachScrollNav } from './shared.js';

const HERO_STATS = [
  { val: 'AES-256', lab: 'Encryption', icon: 'shield' },
  { val: '<10ms',   lab: 'Tick Latency', icon: 'zap' },
  { val: '$2.4B+',  lab: 'Volume Analyzed', icon: 'barChart' },
];

const STEPS = [
  { num: '01', title: 'Choose Your Plan',       desc: 'Select from Starter, Pro, or Enterprise tiers based on your backtesting and data volume needs.',     icon: 'compass' },
  { num: '02', title: 'Submit Request',          desc: 'Confirm your selection \u2014 your request is sent to the admin team for review (no payment required).', icon: 'lock' },
  { num: '03', title: 'Admin Approval',          desc: 'Once approved by an administrator, you receive your license keys, API docs, and dashboard access.',     icon: 'rocket' },
  { num: '04', title: 'Run Your First Backtest', desc: 'Connect a strategy, pick a market, and analyze 10+ years of historical data in seconds.',              icon: 'barChart' },
];

const SYSREQ = [
  ['API Support', 'RESTful HTTP/2 + WS'], ['Authentication', 'OAuth 2.0 + API Keys'],
  ['Rate Limiting', '10,000 req/min'], ['Uptime Guarantee', '99.99% SLA'],
  ['Response Time', '<100ms average'],
];
const MARKETS = ['NASDAQ & NYSE Equities', 'CME Futures', 'FX Spot (28 pairs)', 'Crypto Spot & Perps', 'Options Chain Analytics'];

const BAND_STATS = [
  { val: '12B+',  lab: 'Ticks Processed' },
  { val: '10K+',  lab: 'Active Traders' },
  { val: '99.9%', lab: 'Engine Uptime' },
  { val: '24/7',  lab: 'Live Support' },
];

const FAQS = [
  ['What is TradeLens and how does it work?', 'TradeLens is a professional-grade analytics and backtesting platform. After your plan request is approved, you receive API access and a full dashboard to build, test, and monitor trading strategies across equities, FX, futures, and crypto markets \u2014 all powered by tick-level historical data.'],
  ['Which markets and data feeds are supported?', 'We support NASDAQ & NYSE equities, CME futures, FX spot (28 pairs), crypto spot and perpetuals, plus a full options analytics chain.'],
  ['How does the approval process work?', 'After selecting a plan, your request is sent to our admin team for review. They will approve or reject the request and contact you via the email you registered with. Once approved, your dashboard is unlocked immediately.'],
  ['How accurate is the historical data?', 'All backtests run on tick-level data sourced from primary venues with full corporate-action adjustment. We retain 10+ years for equities and futures, and full-history for crypto, with strict point-in-time integrity to prevent look-ahead bias.'],
  ['Can I connect my own strategies via API?', 'Yes. TradeLens provides a RESTful HTTP/2 API and WebSocket streams. You can deploy strategies in Python, JavaScript, or via our visual builder.'],
  ['Is TradeLens suitable for funds and trading desks?', 'Absolutely. The Enterprise plan includes a dedicated success manager, on-prem deployment option, custom indicator development, and a signed 99.99% uptime SLA.'],
  ['How do I get technical support?', 'All plans include email support. Pro and Enterprise tiers add priority Slack and Telegram support with guaranteed response times.'],
];

export async function renderLanding(root) {
  clear(root);
  const showPreloader = !sessionStorage.getItem('tl_preloaded');
  if (showPreloader) {
    const pre = renderPreloader();
    document.body.appendChild(pre);
    setTimeout(() => { pre.classList.add('fade-out'); setTimeout(() => pre.remove(), 600); sessionStorage.setItem('tl_preloaded', '1'); }, 2200);
  }

  root.appendChild(statusBar());
  root.appendChild(renderNavbar());
  attachScrollNav();

  // Hero
  const hero = el('section', { class: 'hero', id: 'top' },
    el('div', { class: 'hero-inner' },
      el('span', { class: 'tl-eyebrow', html: `<span class="dot sm"></span> Pro Trading Analytics` }),
      el('h1', { html: `Tick-Precise <br /><span class="accent">Strategy Backtesting</span>` }),
      el('p', { class: 'sub' }, 'Institutional-grade analytics for retail and pro traders. Backtest, monitor, and deploy strategies on 10+ years of tick-level data with bank-grade security and a 99.99% engine uptime.'),
      el('div', { class: 'hero-cta' },
        el('a', { class: 'btn primary lg', href: '#pricing', html: `Get Started ${icons.arrowRight('sm')}` }),
        el('a', { class: 'btn ghost lg', href: '#preview' }, 'View Platform'),
      ),
      el('div', { class: 'hero-stats' },
        ...HERO_STATS.map(s => el('div', { class: 'hero-stat' },
          el('div', { class: 'icon-wrap', html: icons[s.icon]() }),
          el('div', {},
            el('div', { class: 'val' }, s.val),
            el('div', { class: 'lab' }, s.lab),
          ),
        )),
      ),
    ),
  );
  root.appendChild(hero);

  // Software preview
  root.appendChild(renderPreviewSection());

  // Quick start
  root.appendChild(renderQuickStart());

  // Pricing
  root.appendChild(await renderPricing());

  // Stats band
  const band = el('section', { class: 'stats-band' },
    el('div', { class: 'stats-band-inner' },
      ...BAND_STATS.map(b => el('div', { class: 'stat-block' },
        el('div', { class: 'val' }, b.val),
        el('div', { class: 'lab' }, b.lab),
      )),
    ),
  );
  root.appendChild(band);

  // FAQ
  root.appendChild(renderFaq());

  // Footer
  root.appendChild(renderFooter());

  // Handle anchor jumps
  setTimeout(() => {
    const h = location.hash;
    if (h && h.length > 1 && h.startsWith('#') && !h.startsWith('#/')) {
      const t = document.querySelector(h);
      if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, 60);
}

function renderPreviewSection() {
  const section = el('section', { class: 'section', id: 'preview' });
  section.appendChild(el('div', { style: { textAlign: 'center', maxWidth: '720px', margin: '0 auto 36px' } },
    el('span', { class: 'tl-eyebrow' }, 'Platform Preview'),
    el('h2', { class: 'tl-h2', html: `A <span class="accent">trader-grade</span> dashboard` }),
    el('p', { class: 'tl-sub', style: { margin: '0 auto' } }, 'Real-time analytics, multi-market backtests, and audit-ready risk monitoring \u2014 unified in one workspace.'),
  ));

  const frame = el('div', { class: 'tl-card preview-frame' });
  // Chrome
  frame.appendChild(el('div', { class: 'chrome' },
    el('div', { class: 'dots' },
      el('span', { style: { background: '#ef4444' } }),
      el('span', { style: { background: '#f59e0b' } }),
      el('span', { style: { background: '#22c55e' } }),
    ),
    el('div', { class: 'url', html: `<span class="dot sm"></span> tradelens.app / workspace / momentum-rsi` }),
    el('div', { class: 'tag' }, 'v4.2 \u00b7 Pro'),
  ));
  // Tabs
  const tabs = el('div', { class: 'tabs' });
  const tabBtns = [
    ['dashboard', 'Dashboard', icons.trending],
    ['api', 'API Demo', icons.zap],
    ['security', 'Security', icons.shield],
  ];
  const body = el('div', { class: 'preview-body' });

  const setTab = (key) => {
    tabs.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === key));
    clear(body);
    body.appendChild(previewPane(key));
  };

  tabBtns.forEach(([key, label, ic], i) => {
    const b = el('button', { class: 'tab' + (i === 0 ? ' active' : ''), dataset: { tab: key }, onClick: () => setTab(key), html: `${ic('sm')} ${label}` });
    tabs.appendChild(b);
  });
  frame.appendChild(tabs);

  body.appendChild(previewPane('dashboard'));
  frame.appendChild(body);

  // Feat pills
  const feats = ['Sub-second backtest engine','Real-time tick analytics','Bank-grade data security','RESTful & WebSocket API'];
  frame.appendChild(el('div', { class: 'feat-pills' },
    ...feats.map(f => el('div', { class: 'pill-soft', html: `<span class="dot sm"></span> ${f}` })),
  ));

  section.appendChild(frame);
  return section;
}

function previewPane(key) {
  if (key === 'dashboard') {
    const wrap = el('div', { style: { display: 'grid', gap: '18px' } });
    wrap.style.gridTemplateColumns = window.innerWidth > 720 ? '1fr 1fr' : '1fr';
    wrap.appendChild(el('div', { html: `
      <div class="row" style="justify-content:space-between;padding-bottom:8px;border-bottom:1px solid rgba(94,234,212,0.08);font-size:13px;color:#cbd5e1;font-weight:500;">
        <span>Strategy Configuration</span><span class="mono" style="color:#5eead4;font-size:11px;"><span class="dot sm"></span> Live</span>
      </div>
      ${[['Strategy','Momentum / 14D RSI'],['Capital','$500,000.00 USD'],['Market','NASDAQ + Crypto'],['Timeframe','1H Candles']].map(([k,v]) => `<div class="row" style="justify-content:space-between;padding:10px 0;border-bottom:1px dashed rgba(94,234,212,0.08);"><span style="color:#94a3b8;font-size:13px;">${k}</span><span class="mono" style="color:#e6edf3;font-size:13px;">${v}</span></div>`).join('')}
      <div style="margin-top:14px;padding:12px;background:rgba(8,12,16,0.6);border:1px solid rgba(94,234,212,0.1);border-radius:10px;">
        <svg viewBox="0 0 400 110" width="100%" height="110" preserveAspectRatio="none">
          <defs><linearGradient id="g1" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#22d3ee" stop-opacity="0.55"/><stop offset="100%" stop-color="#22d3ee" stop-opacity="0"/></linearGradient></defs>
          <path d="M0,90 L25,82 L50,86 L75,70 L100,76 L125,60 L150,66 L175,48 L200,54 L225,38 L250,46 L275,30 L300,36 L325,22 L350,28 L375,14 L400,18 L400,110 L0,110 Z" fill="url(#g1)"/>
          <path d="M0,90 L25,82 L50,86 L75,70 L100,76 L125,60 L150,66 L175,48 L200,54 L225,38 L250,46 L275,30 L300,36 L325,22 L350,28 L375,14 L400,18" fill="none" stroke="#22d3ee" stroke-width="1.8"/>
        </svg>
        <div class="row" style="justify-content:space-between;font-size:11px;color:#94a3b8;margin-top:6px;" class="mono"><span>Equity Curve</span><span style="color:#5eead4;">+18.4% YTD</span></div>
      </div>
    `}));
    wrap.appendChild(el('div', { html: `
      <div class="row" style="justify-content:space-between;padding-bottom:8px;border-bottom:1px solid rgba(94,234,212,0.08);font-size:13px;color:#cbd5e1;font-weight:500;">
        <span>System Status</span><span class="mono" style="color:#5eead4;font-size:11px;"><span class="dot sm"></span> All Systems Operational</span>
      </div>
      <div class="mono" style="padding:8px 0;font-size:12px;color:#94a3b8;">Latency: <b style="color:#e6edf3;">42ms</b> \u2502 Uptime: <b style="color:#e6edf3;">99.99%</b></div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
        ${[['Win Rate','67.8%'],['Avg. Backtest','1.2s'],['Active Strategies','2,847']].map(([l,v]) => `<div style="padding:12px 8px;background:rgba(8,12,16,0.6);border:1px solid rgba(94,234,212,0.1);border-radius:9px;text-align:center;"><div class="mono" style="font-size:15px;color:#5eead4;font-weight:600;">${v}</div><div style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.12em;margin-top:4px;">${l}</div></div>`).join('')}
      </div>
    `}));
    return wrap;
  }
  if (key === 'api') {
    return el('div', { style: { display: 'grid', gap: '14px', gridTemplateColumns: window.innerWidth > 720 ? '1.5fr 1fr' : '1fr' } },
      el('pre', { style: { margin: 0, padding: '16px', background: '#06090d', border: '1px solid rgba(94,234,212,0.12)', borderRadius: '10px', fontSize: '12px', lineHeight: '1.7', color: '#cbd5e1', overflowX: 'auto' }, html: `<code>POST /v1/backtest
Authorization: Bearer tl_live_***
Content-Type: application/json

{
  "strategy": "momentum_rsi_14",
  "market": "NASDAQ:AAPL",
  "resolution": "1m",
  "capital": 500000
}

\u2192 200 OK
{
  "run_id": "bt_8a72f31c",
  "sharpe": 1.87,
  "max_drawdown": -8.4,
  "trades": 1284,
  "net_pnl": 142890.55
}</code>` }),
      el('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
        ...[['Endpoint','api.tradelens.app/v1'],['Auth','OAuth 2.0 + Bearer'],['Latency p50','87 ms']].map(([l,v]) =>
          el('div', { class: 'tl-card', style: { padding: '12px 14px', background: 'rgba(8,12,16,0.6)' }, html: `<div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.14em;">${l}</div><div class="mono" style="font-size:13px;color:#e6edf3;margin-top:4px;">${v}</div>` })
        ),
      ),
    );
  }
  // security
  const items = [['Encryption at rest','AES-256-GCM'],['Encryption in transit','TLS 1.3'],['Compliance','SOC 2 Type II'],['Audit logging','Immutable, 7y retention'],['Access control','SSO + 2FA + RBAC'],['Data residency','US / EU regions']];
  return el('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' } },
    ...items.map(([l, v]) => el('div', { style: { padding: '14px 16px', background: 'rgba(8,12,16,0.6)', border: '1px solid rgba(94,234,212,0.12)', borderRadius: '10px', display: 'flex', gap: '10px' }, html: `${icons.shield('sm')}<div><div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.12em;">${l}</div><div class="mono" style="font-size:13px;color:#e6edf3;margin-top:4px;">${v}</div></div>` })),
  );
}

function renderQuickStart() {
  const section = el('section', { class: 'section', id: 'start' });
  section.appendChild(el('div', { style: { textAlign: 'center', maxWidth: '720px', margin: '0 auto 36px' } },
    el('span', { class: 'tl-eyebrow' }, 'Quick Start Guide'),
    el('h2', { class: 'tl-h2', html: `Go live in <span class="accent">4 simple steps</span>` }),
    el('p', { class: 'tl-sub', style: { margin: '0 auto' } }, 'From plan request to your first backtest in minutes. Designed for individual traders and full desks.'),
  ));
  section.appendChild(el('div', { class: 'steps-grid' },
    ...STEPS.map(s => el('div', { class: 'tl-card step-card' },
      el('div', { class: 'top' },
        el('div', { class: 'icon-wrap', html: icons[s.icon]() }),
        el('span', { class: 'num' }, s.num),
      ),
      el('h3', {}, s.title),
      el('p', {}, s.desc),
    )),
  ));
  section.appendChild(el('div', { style: { textAlign: 'center', marginTop: '28px' } },
    el('a', { class: 'btn primary', href: '#pricing' }, 'Browse Plans'),
  ));
  section.appendChild(el('div', { class: 'spec-grid' },
    el('div', { class: 'tl-card spec-card' },
      el('h4', {}, 'Platform Specs'),
      ...SYSREQ.map(([k, v]) => el('div', { class: 'row', html: `<span>${k}</span><span>${v}</span>` })),
    ),
    el('div', { class: 'tl-card spec-card' },
      el('h4', {}, 'Supported Markets'),
      el('ul', {}, ...MARKETS.map(m => el('li', { html: `${icons.check('sm')} <span>${m}</span>` }))),
    ),
    el('div', { class: 'tl-card spec-card', style: { background: 'linear-gradient(150deg, rgba(20,184,166,0.14), rgba(8,12,16,0.7))' } },
      el('h4', {}, 'Onboarding Support Included'),
      el('p', { style: { color: '#cbd5e1', fontSize: '13.5px', lineHeight: '1.7', marginBottom: '12px' } }, 'All plans include guided onboarding via email and Slack. Pro and Enterprise plans add dedicated success managers.'),
      el('a', { class: 'btn ghost sm', href: '#pricing' }, 'View Plans'),
    ),
  ));
  return section;
}

async function renderPricing() {
  const section = el('section', { class: 'section', id: 'pricing' });
  section.appendChild(el('div', { style: { textAlign: 'center', maxWidth: '720px', margin: '0 auto 36px' } },
    el('span', { class: 'tl-eyebrow' }, 'Choose Your Plan'),
    el('h2', { class: 'tl-h2', html: `Request your <span class="accent">trading plan</span>` }),
    el('p', { class: 'tl-sub', style: { margin: '0 auto' } }, 'Pick a plan and submit a request. Our admin team reviews and approves \u2014 no payment required upfront.'),
  ));

  let plans = []; let demo = null;
  try {
    const res = await Promise.all([api.get('/plans'), api.get('/plans/demo')]);
    plans = Array.isArray(res[0]) ? res[0] : [];
    demo = res[1];
  } catch (e) {
    console.error('Pricing load error:', e);
    toast({ title: 'Could not load plans', description: e.message, kind: 'error' });
  }

  if (!plans || !Array.isArray(plans)) {
    return el('div', { class: 'section', style: { textAlign: 'center', padding: '40px' } }, 
      el('p', { style: { color: '#94a3b8' } }, 'Pricing plans are currently unavailable. Please try again later.')
    );
  }

  const grid = el('div', { class: 'pricing-grid' });
  const tierIcons = { Starter: 'rocket', Pro: 'sparkles', Enterprise: 'crown' };

  plans.forEach((p) => {
    let sel = 0;
    const card = el('div', { class: 'tl-card plan-card' + (p.popular ? ' popular' : '') });
    if (p.popular) card.appendChild(el('div', { class: 'popular-tag' }, 'Most Popular'));
    card.appendChild(el('div', { class: 'tier-head' },
      el('div', { class: 'tier-icon', html: icons[tierIcons[p.name] || 'rocket']() }),
      el('div', {},
        el('h3', { class: 'tier-name' }, p.name),
        el('p', { class: 'tier-tag' }, p.tag),
      ),
    ));
    const optRow = el('div', { class: 'opt-row' });
    p.options.forEach((o, idx) => {
      const b = el('button', { class: 'opt-btn' + (idx === 0 ? ' active' : ''), onClick: () => {
        sel = idx;
        optRow.querySelectorAll('.opt-btn').forEach((x, i) => x.classList.toggle('active', i === idx));
        buyBtn.textContent = `Request ${p.options[idx].period} \u2014 $${p.options[idx].price_usd}`;
      } },
        el('span', { class: 'opt-period' }, o.period),
        el('span', { class: 'opt-price' }, `$${o.price_usd}`),
        el('span', { class: 'opt-detail' }, o.detail),
      );
      optRow.appendChild(b);
    });
    card.appendChild(optRow);
    card.appendChild(el('ul', { class: 'features-list' },
      ...p.features.map(f => el('li', { html: `${icons.check('sm')} <span>${f}</span>` })),
    ));
    const buyBtn = el('button', { class: `btn ${p.popular ? 'primary' : 'ghost'} full`, onClick: () => onRequest(p, sel, buyBtn) }, `Request ${p.options[0].period} \u2014 $${p.options[0].price_usd}`);
    card.appendChild(buyBtn);
    grid.appendChild(card);
  });
  section.appendChild(grid);

  if (demo) {
    const dwrap = el('div', { class: 'tl-card demo-wrap' });
    dwrap.appendChild(el('div', {},
      el('span', { class: 'tl-eyebrow', html: `${icons.flask('xs')} Try Before You Buy` }),
      el('h3', { class: 'demo-title' }, demo.name),
      el('p', { class: 'demo-tag' }, 'Test every premium feature, risk-free.'),
    ));
    dwrap.appendChild(el('div', { class: 'demo-mid' },
      el('div', { class: 'demo-block' },
        el('div', { class: 'demo-lab' }, demo.duration),
        el('div', { class: 'demo-price' }, `$${demo.price_usd}`),
        el('div', { class: 'demo-lab' }, demo.limit),
      ),
      el('ul', { class: 'features-list', style: { minWidth: '200px' } },
        ...demo.perks.map(p => el('li', { html: `${icons.check('sm')} <span>${p}</span>` })),
      ),
    ));
    const demoBtn = el('button', { class: 'btn primary', style: { alignSelf: 'center', minWidth: '200px' }, onClick: () => onRequest({ id: 'demo' }, null, demoBtn, true) }, `Request Demo \u2014 $${demo.price_usd}`);
    dwrap.appendChild(demoBtn);
    section.appendChild(dwrap);
  }

  return section;
}

async function onRequest(plan, optIdx, btn, isDemo = false) {
  if (!isAuthed()) {
    toast({ title: 'Please sign in', description: 'You need an account to request a plan.' });
    window.location.hash = '#/login';
    return;
  }
  const original = btn.textContent;
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Submitting\u2026';
  try {
    const body = isDemo ? { demo: true } : { plan_id: plan.id, option_index: optIdx };
    await api.post('/requests', body);
    toast({ title: 'Request submitted', description: 'Your request has been sent to the admin team. You\u2019ll be notified once it\u2019s reviewed.', kind: 'success' });
    setTimeout(() => { window.location.hash = '#/dashboard'; }, 1200);
  } catch (e) {
    toast({ title: 'Could not submit', description: e.message, kind: 'error' });
  } finally {
    btn.disabled = false; btn.textContent = original;
  }
}

function renderFaq() {
  const section = el('section', { class: 'section', id: 'faq' });
  section.appendChild(el('div', { style: { textAlign: 'center', maxWidth: '720px', margin: '0 auto 36px' } },
    el('span', { class: 'tl-eyebrow' }, 'FAQ'),
    el('h2', { class: 'tl-h2', html: `Common <span class="accent">questions</span>` }),
    el('p', { class: 'tl-sub', style: { margin: '0 auto' } }, 'Everything you might want to know about TradeLens, data, and onboarding.'),
  ));
  const list = el('div', { class: 'faq-list' });
  let openIdx = 0;
  const items = FAQS.map(([q, a], i) => {
    const item = el('div', { class: 'tl-card faq-item' + (i === 0 ? ' open' : '') },
      el('button', { class: 'faq-head', onClick: () => {
        const isOpen = item.classList.contains('open');
        list.querySelectorAll('.faq-item').forEach(x => x.classList.remove('open'));
        if (!isOpen) item.classList.add('open');
      }},
        el('span', { class: 'q' }, q),
        el('span', { class: 'faq-toggle', html: icons.chevronDown('sm') }),
      ),
      el('div', { class: 'faq-body' }, el('p', {}, a)),
    );
    return item;
  });
  items.forEach(i => list.appendChild(i));
  section.appendChild(list);
  return section;
}
