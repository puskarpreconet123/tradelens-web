// /js/lib/router.js — simple hash router
export class Router {
  constructor(rootId, routes, options = {}) {
    this.root = document.getElementById(rootId);
    this.routes = routes; // [{ path: /^\/login$/, view: fn }] or { '/login': fn }
    this.notFound = options.notFound || (() => '<div class="section"><h2 class="tl-h2">404</h2></div>');
    this.beforeEach = options.beforeEach || (() => true);
    window.addEventListener('hashchange', () => this.handle());
    window.addEventListener('popstate', () => this.handle());
  }

  static path() {
    const h = window.location.hash || '#/';
    return h.replace(/^#/, '') || '/';
  }

  navigate(p, opts = {}) {
    const target = '#' + (p.startsWith('/') ? p : '/' + p);
    if (opts.replace) {
      const url = window.location.pathname + window.location.search + target;
      window.location.replace(url);
    } else {
      window.location.hash = target;
    }
  }

  match(path) {
    if (Array.isArray(this.routes)) {
      for (const r of this.routes) {
        const m = path.match(r.path);
        if (m) return { route: r, params: m.slice(1) };
      }
      return null;
    }
    if (this.routes[path]) return { route: { view: this.routes[path] }, params: [] };
    return null;
  }

  async handle() {
    if (this._busy) return;
    this._busy = true;
    try {
      const h = window.location.hash || '#/';
      // If hash doesn't start with #/ and isn't empty, it's likely an anchor. Ignore it.
      if (h !== '#/' && h !== '#' && !h.startsWith('#/')) return;

      const path = Router.path();
      const ok = await this.beforeEach(path);
      if (!ok) return;
      const matched = this.match(path);
      if (!matched) {
        this.root.innerHTML = this.notFound(path);
        window.scrollTo(0, 0);
        return;
      }
      const result = await matched.route.view(this.root, matched.params);
      // Allow view to return a cleanup fn
      if (typeof this._cleanup === 'function') this._cleanup();
      this._cleanup = typeof result === 'function' ? result : null;
      if (!path.startsWith('/#')) window.scrollTo(0, 0);
    } finally {
      this._busy = false;
    }
  }

  start() { this.handle(); }
}

export function nav(p, opts) { window.dispatchEvent(new HashChangeEvent('hashchange')); window.location.hash = '#' + p; }
