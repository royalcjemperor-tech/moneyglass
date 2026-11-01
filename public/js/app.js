(() => {
  'use strict';

  const app = document.getElementById('app');
  const toastRegion = document.getElementById('toastRegion');
  const modalRoot = document.getElementById('modalRoot');
  const state = {
    user: null,
    dashboard: null,
    range: '30d',
    transactions: { items: [], page: 1, pages: 1, total: 0, categories: [] },
    txQuery: '',
    txCategory: 'all',
    txType: 'all',
    pendingImport: null,
    chat: [],
    busy: false
  };

  const ICONS = {
    dashboard: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/>',
    transactions: '<path d="M4 7h16M4 12h16M4 17h10"/><circle cx="18" cy="17" r="2"/>',
    import: '<path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5"/><path d="M4 16v3a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 20 19v-3"/>',
    budget: '<rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 10h18M7 15h4"/><path d="M7 5V3m10 2V3"/>',
    assistant: '<path d="M12 3v3m0 12v3M3 12h3m12 0h3"/><path d="m5.6 5.6 2.1 2.1m8.6 8.6 2.1 2.1m0-12.8-2.1 2.1m-8.6 8.6-2.1 2.1"/><circle cx="12" cy="12" r="4"/>',
    profile: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c.8-3.2 3.2-5 7-5s6.2 1.8 7 5"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.2 1-.9 1.6-1.5-.5a8 8 0 0 1-1.6.9l-.3 1.6h-1.9l-.3-1.6a8 8 0 0 1-1.6-.9l-1.5.5-.9-1.6 1.2-1a8 8 0 0 1 0-1.9l-1.2-1 .9-1.6 1.5.5a8 8 0 0 1 1.6-.9l.3-1.6h1.9l.3 1.6a8 8 0 0 1 1.6.9l1.5-.5.9 1.6-1.2 1a8 8 0 0 1 0 1.9Z"/>',
    search: '<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4 4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
    lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    chart: '<path d="M3 3v18h18"/><path d="m7 14 4-4 3 3 6-7"/>',
    wallet: '<rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 9h18m-5 6h2"/><path d="M6 5V3h12v2"/>',
    income: '<path d="M12 19V5m-6 6 6-6 6 6"/>',
    expense: '<path d="M12 5v14m-6-6 6 6 6-6"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    refresh: '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.5 9a7 7 0 0 1 12-2L20 12M4 12l2.5 5a7 7 0 0 0 12-2"/>',
    download: '<path d="M12 3v12m0 0 4-4m-4 4-4-4"/><path d="M4 17v3h16v-3"/>',
    trend: '<path d="m4 16 6-6 4 4 6-8"/><path d="M14 6h6v6"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    trash: '<path d="M4 7h16m-10 4v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3"/>',
    edit: '<path d="m4 16-.8 4.8L8 20l11.5-11.5a2.1 2.1 0 0 0-3-3L5 17Z"/><path d="m14.5 6.5 3 3"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/>',
    spark: '<path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"/><path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    alert: '<path d="M12 3 2.8 19h18.4L12 3Z"/><path d="M12 9v4m0 3h.01"/>',
    bank: '<path d="m3 9 9-6 9 6M4 10h16M6 10v8m4-8v8m4-8v8m4-8v8M3 21h18"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
    chevron: '<path d="m9 18 6-6-6-6"/>',
    logout: '<path d="M10 17l5-5-5-5m5 5H3"/><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8m-8 4h8"/>'
  };

  const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ICONS.info}</svg>`;
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const initials = name => String(name || 'MG').split(/\s+/).slice(0, 2).map(part => part[0] || '').join('').toUpperCase();
  const money = value => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value || 0));
  const moneyExact = value => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(value || 0));
  const dateFormat = value => {
    if (!value) return '—';
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };
  const localDateValue = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const todayLabel = () => new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const toast = (message, error = false) => {
    const node = document.createElement('div');
    node.className = `toast${error ? ' error' : ''}`;
    node.textContent = message;
    toastRegion.append(node);
    window.setTimeout(() => node.remove(), 3600);
  };

  async function api(url, options = {}) {
    const headers = new Headers(options.headers || {});
    if (options.body && !(options.body instanceof FormData) && !headers.has('content-type')) headers.set('content-type', 'application/json');
    const response = await fetch(url, { credentials: 'same-origin', ...options, headers });
    const contentType = response.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await response.json() : await response.text();
    if (!response.ok) throw new Error(data?.error || `Request failed (${response.status})`);
    return data;
  }

  function navigate(path, replace = false) {
    if (replace) history.replaceState({}, '', path);
    else history.pushState({}, '', path);
    window.scrollTo({ top: 0, behavior: 'instant' });
    renderRoute();
  }

  function publicNav() {
    return `<header class="public-nav">
      <a class="brand" href="/" data-nav><span class="brand-symbol">${icon('chart')}</span>moneyglass</a>
      <nav class="public-links" aria-label="Main navigation"><a href="#features">Features</a><a href="#how">How it works</a><a href="#privacy">Privacy</a></nav>
      <div class="nav-actions"><a class="btn btn-secondary" href="/login" data-nav>Sign in</a><a class="btn btn-primary" href="/signup" data-nav>Get started ${icon('arrow')}</a></div>
    </header>`;
  }

  function landingPage() {
    return `<div class="public-shell">
      ${publicNav()}
      <main>
        <section class="hero">
          <div class="hero-copy">
            <span class="hero-pill"><i class="pulse-dot"></i> YOUR FINANCES, FINALLY IN FOCUS</span>
            <h1 class="display">See where your money <span class="gradient-text">really goes.</span></h1>
            <p>Turn your bank statements into a clear picture of your financial life. Track spending, set budgets and ask better questions — in a private workspace you control.</p>
            <div class="hero-actions"><a class="btn btn-primary" href="/signup" data-nav>Create your private space ${icon('arrow')}</a><a class="btn btn-secondary" href="#how">See how it works</a></div>
            <div class="hero-note">${icon('shield')} Your transaction details are encrypted before they are stored. No ads. No paid AI API required.</div>
          </div>
          <div class="hero-visual" aria-label="Illustration of the Moneyglass finance dashboard">
            <div class="mock-window glass">
              <div class="mock-top"><div class="mock-dot-group"><i class="mock-dot"></i><i class="mock-dot"></i><i class="mock-dot"></i></div><span class="mock-label">MONEYGLASS / OVERVIEW</span><span class="mock-label">● PRIVATE</span></div>
              <div class="mock-balance"><small>NET CASH FLOW · SAMPLE PREVIEW</small><strong>₹ 42,850</strong><div class="mock-change">↗ Your numbers, made understandable</div></div>
              <div class="mock-stats"><div class="mock-stat"><small>Money in</small><strong>₹ 68,500</strong></div><div class="mock-stat"><small>Money out</small><strong>₹ 25,650</strong></div></div>
              <div class="mock-chart"><div class="mock-chart-head"><span>Monthly flow</span><span>Illustrative preview</span></div><div class="mock-bars"><i style="height:34%"></i><i style="height:53%"></i><i style="height:42%"></i><i style="height:76%"></i><i style="height:60%"></i><i style="height:88%"></i><i style="height:69%"></i><i style="height:100%"></i><i style="height:81%"></i><i style="height:94%"></i></div></div>
              <div class="mock-transaction"><div class="mock-left"><span class="mock-avatar">F</span><div><b>Food & dining</b><small>Category example · Today</small></div></div><strong>− ₹ 480</strong></div>
            </div>
            <div class="floating-chip one glass"><span class="chip-icon">${icon('lock')}</span><span><b>Private by design</b><br><small class="muted">Encrypted financial records</small></span></div>
            <div class="floating-chip two glass"><span class="chip-icon">${icon('spark')}</span><span><b>Ask your money anything</b><br><small class="muted">Answers based on your data</small></span></div>
          </div>
        </section>

        <div class="trust-strip"><span class="trust-item">${icon('shield')} Self-hosted by you</span><span class="trust-item">${icon('lock')} AES-GCM encrypted records</span><span class="trust-item">${icon('bank')} CSV · XLSX · PDF import</span><span class="trust-item">${icon('spark')} No paid AI key needed</span></div>

        <section class="section" id="features">
          <div class="section-head"><span class="eyebrow">A clearer money picture</span><h2>Less spreadsheet work.<br><span class="gradient-text">More financial clarity.</span></h2><p>Everything you need to make sense of everyday money, without turning your financial data into someone else's product.</p></div>
          <div class="feature-grid">
            <article class="feature-card glass"><span class="feature-icon">${icon('bank')}</span><h3>Bring your bank statement</h3><p>Import CSV, Excel or text-based PDF statements. Review the detected transactions and remove duplicates before saving.</p></article>
            <article class="feature-card glass"><span class="feature-icon">${icon('chart')}</span><h3>Understand every rupee</h3><p>See income, expenses, cash flow, category breakdowns, spending trends and recent transactions in one dashboard.</p></article>
            <article class="feature-card glass"><span class="feature-icon">${icon('spark')}</span><h3>Ask smarter questions</h3><p>Ask how much you spent, where it went, or what your biggest expense was. Answers use your analysed transaction data.</p></article>
          </div>
        </section>

        <section class="section" id="how">
          <div class="section-head"><span class="eyebrow">Simple by design</span><h2>From statement to insight<br>in three steps.</h2><p>No complicated setup and no mandatory third-party API subscriptions.</p></div>
          <div class="how-grid">
            <article class="step-card glass"><div class="step-num">01</div><h3>Create your private account</h3><p>Choose a password and open a personal workspace on the server you control.</p></article>
            <article class="step-card glass"><div class="step-num">02</div><h3>Import or add transactions</h3><p>Upload a statement, check the preview and keep your records organised by category.</p></article>
            <article class="step-card glass"><div class="step-num">03</div><h3>Explore and improve</h3><p>Use charts, monthly budgets and the private insights assistant to understand your habits.</p></article>
          </div>
        </section>

        <section class="cta-band glass" id="privacy"><div><h2>Your money data should stay yours.</h2><p>Self-host the app, keep the encryption key private and access your dashboard through your own domain.</p></div><a class="btn btn-primary" href="/signup" data-nav>Start your workspace ${icon('arrow')}</a></section>
      </main>
      <footer class="public-footer"><a class="brand" href="/" data-nav><span class="brand-symbol">${icon('chart')}</span>moneyglass</a><span>Private personal finance, on your terms.</span><div class="footer-links"><a href="/privacy" data-nav>Privacy</a><a href="/terms" data-nav>Terms</a><a href="/login" data-nav>Sign in</a></div></footer>
    </div>`;
  }

  function authPage(mode) {
    const signup = mode === 'signup';
    return `<a class="auth-back" href="/" data-nav>← Back to home</a>
      <div class="auth-shell">
        <section class="auth-intro"><a class="brand" href="/" data-nav><span class="brand-symbol">${icon('chart')}</span>moneyglass</a><span class="eyebrow" style="display:block;margin-top:36px">A more intentional money life</span><h1>Make your money make <span class="gradient-text">sense.</span></h1><p>A focused space for your bank transactions, spending patterns and monthly goals. Your records are encrypted before they reach the database.</p><div class="auth-bullets"><span>${icon('check')} Bank statement import with a review step</span><span>${icon('check')} Clear visual spending analytics</span><span>${icon('check')} Private assistant with no paid API dependency</span></div></section>
        <section class="auth-card glass"><h2>${signup ? 'Create your account' : 'Welcome back'}</h2><p>${signup ? 'Set up your personal finance workspace.' : 'Sign in to continue to your private dashboard.'}</p>
          <form id="${signup ? 'signupForm' : 'loginForm'}" novalidate>
            ${signup ? `<div class="field"><label for="fullName">Full name</label><input id="fullName" name="name" autocomplete="name" maxlength="80" placeholder="Your name" required></div>` : ''}
            <div class="field"><label for="email">Email address</label><input id="email" name="email" type="email" autocomplete="email" maxlength="254" placeholder="you@example.com" required></div>
            <div class="field"><label for="password">Password</label><div class="input-password"><input id="password" name="password" type="password" autocomplete="${signup ? 'new-password' : 'current-password'}" maxlength="128" placeholder="${signup ? 'At least 10 characters' : 'Enter your password'}" required><button class="password-toggle" type="button" data-action="toggle-password" data-target="password">Show</button></div>${signup ? '<div class="password-meter" id="passwordMeter"><i></i><i></i><i></i><i></i></div><small class="muted" id="passwordHint" style="font-size:9px">Use at least 10 characters with letters and numbers.</small>' : ''}</div>
            ${signup ? `<div class="field"><label for="confirmPassword">Confirm password</label><div class="input-password"><input id="confirmPassword" name="confirmPassword" type="password" autocomplete="new-password" maxlength="128" placeholder="Re-enter your password" required><button class="password-toggle" type="button" data-action="toggle-password" data-target="confirmPassword">Show</button></div></div>` : `<div class="form-row"><span>Protected with a private session</span><a href="#" data-action="forgot-password">Forgot password?</a></div>`}
            <button class="btn btn-primary btn-block" type="submit" id="authSubmit">${signup ? 'Create private account' : 'Sign in to Moneyglass'} ${icon('arrow')}</button><p class="form-message" id="authMessage" role="alert"></p>
          </form>
          <div class="auth-switch">${signup ? 'Already have an account?' : 'New to Moneyglass?'} <a href="/${signup ? 'login' : 'signup'}" data-nav>${signup ? 'Sign in' : 'Create an account'}</a></div>
          ${signup ? '<p class="muted" style="margin:14px 0 0;text-align:center;font-size:9px;line-height:1.7">Use a unique password. This self-hosted app does not provide email-based password recovery.</p>' : ''}
        </section>
      </div>`;
  }

  function navLink(path, name, label, active) {
    return `<a class="nav-link${active === path ? ' active' : ''}" href="${path}" data-nav>${icon(name)}<span>${label}</span></a>`;
  }

  function appShell(content, route) {
    const active = route === '/dashboard' ? '/dashboard' : route;
    const name = escapeHtml(state.user?.name || 'Your account');
    const email = escapeHtml(state.user?.email || '');
    return `<div class="app-layout">
      <aside class="sidebar">
        <a class="brand" href="/dashboard" data-nav><span class="brand-symbol">${icon('chart')}</span>moneyglass</a>
        <div class="sidebar-label">Workspace</div>
        <nav class="side-nav" aria-label="Dashboard navigation">
          ${navLink('/dashboard', 'dashboard', 'Overview', active)}
          ${navLink('/transactions', 'transactions', 'Transactions', active)}
          ${navLink('/import', 'import', 'Import statement', active)}
          ${navLink('/budgets', 'budget', 'Budgets', active)}
          ${navLink('/assistant', 'assistant', 'Money assistant', active)}
        </nav>
        <div class="sidebar-label">Account</div>
        <nav class="side-nav">${navLink('/profile', 'profile', 'My profile', active)}${navLink('/settings', 'settings', 'Settings & data', active)}</nav>
        <div class="sidebar-bottom"><div class="sidebar-note"><b>Private by design</b><p>Your transaction and profile details are encrypted before being stored. Keep your server key safe.</p></div><div class="user-mini"><span class="avatar">${escapeHtml(initials(name))}</span><div class="user-mini-copy"><b>${name}</b><small>${email}</small></div><button class="icon-btn" type="button" data-action="logout" aria-label="Sign out">${icon('logout')}</button></div></div>
      </aside>
      <div class="main-column">
        <header class="topbar"><div style="display:flex;align-items:center;gap:12px"><button class="icon-btn mobile-menu" type="button" data-action="mobile-nav" aria-label="Dashboard menu">${icon('menu')}</button><div class="breadcrumb">Workspace <span class="subtle">/</span> <span style="color:#d6dfeb">${routeTitle(route)}</span></div></div><div class="topbar-actions"><span class="topbar-date">${todayLabel()}</span><button class="icon-btn" type="button" data-action="refresh" aria-label="Refresh this page">${icon('refresh')}</button><a class="avatar" href="/profile" data-nav aria-label="Open profile">${escapeHtml(initials(name))}</a></div></header>
        <main class="page-content">${content}</main>
      </div>
    </div>`;
  }

  function routeTitle(route) {
    return ({ '/dashboard': 'Overview', '/transactions': 'Transactions', '/import': 'Import statement', '/budgets': 'Budgets', '/assistant': 'Money assistant', '/profile': 'My profile', '/settings': 'Settings & data' })[route] || 'Workspace';
  }

  function emptyState(title, copy, action = '') {
    return `<div class="empty-state">${icon('file')}<b>${escapeHtml(title)}</b><p>${escapeHtml(copy)}</p>${action}</div>`;
  }

  function kpiCard(label, value, trend, foot, iconName, changeType = 'neutral') {
    const change = trend === null || trend === undefined ? '—' : `${trend > 0 ? '+' : ''}${trend}%`;
    const trendClass = changeType === 'neutral' ? 'neutral' : changeType === 'down' ? 'down' : '';
    return `<article class="kpi-card glass"><div class="kpi-top"><span>${label}</span><span class="kpi-icon">${icon(iconName)}</span></div><div class="kpi-value">${value}</div><div class="kpi-bottom"><span>${foot}</span><span class="change ${trendClass}">${change}</span></div></article>`;
  }

  function lineChart(daily) {
    const hasData = daily.some(point => point.income || point.expenses);
    if (!hasData) return emptyState('Your chart starts here', 'Import a statement or add a transaction to see your cash flow over time.');
    const width = 760, height = 220, left = 42, right = 15, top = 16, bottom = 31;
    const plotW = width - left - right, plotH = height - top - bottom;
    const maxVal = Math.max(1, ...daily.flatMap(point => [point.income, point.expenses]));
    const y = value => top + plotH - (value / maxVal) * plotH;
    const x = index => left + (daily.length <= 1 ? plotW / 2 : (index / (daily.length - 1)) * plotW);
    const pathFor = key => daily.map((point, index) => `${index ? 'L' : 'M'}${x(index).toFixed(1)},${y(point[key]).toFixed(1)}`).join(' ');
    const grid = [0, .25, .5, .75, 1].map(f => `<line class="chart-gridline" x1="${left}" x2="${width - right}" y1="${top + plotH * f}" y2="${top + plotH * f}"/><text class="chart-axis" x="${left - 7}" y="${top + plotH * f + 3}" text-anchor="end">${escapeHtml(new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(maxVal * (1 - f)))}</text>`).join('');
    const tickIndexes = [...new Set([0, Math.floor((daily.length - 1) / 3), Math.floor((daily.length - 1) * 2 / 3), daily.length - 1])];
    const labels = tickIndexes.map(index => `<text class="chart-axis" x="${x(index)}" y="${height - 7}" text-anchor="middle">${new Date(`${daily[index].date}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</text>`).join('');
    const points = daily.map((point, index) => `<circle class="chart-point" cx="${x(index)}" cy="${y(point.expenses)}" r="2.8"><title>${dateFormat(point.date)} · Spend ${money(point.expenses)}</title></circle>`).join('');
    return `<div class="chart-wrap"><svg class="chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Income and expense trend chart"><defs><linearGradient id="areaFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#7de6d2" stop-opacity=".18"/><stop offset="100%" stop-color="#7de6d2" stop-opacity="0"/></linearGradient></defs>${grid}<path class="chart-area" d="${pathFor('expenses')} L${x(daily.length - 1)},${top + plotH} L${x(0)},${top + plotH} Z"/><path class="chart-line" d="${pathFor('expenses')}"/><path class="chart-line secondary" d="${pathFor('income')}"/>${points}${labels}</svg></div>`;
  }

  const PALETTE = ['#7de6d2', '#829cff', '#bd9cff', '#f5c979', '#ed8fa3', '#78b5f2', '#a5d88d', '#e7a2df'];
  function donutChart(categories) {
    if (!categories.length) return emptyState('No categories yet', 'Your category split will appear after you add expense transactions.');
    const total = categories.reduce((sum, item) => sum + item.value, 0);
    const radius = 63;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;
    const arcs = categories.slice(0, 8).map((item, index) => {
      const length = (item.value / total) * circumference;
      const circle = `<circle class="donut-arc" cx="90" cy="90" r="${radius}" stroke="${PALETTE[index % PALETTE.length]}" stroke-dasharray="${Math.max(0, length - 2)} ${circumference}" stroke-dashoffset="${-offset}"><title>${escapeHtml(item.name)}: ${money(item.value)}</title></circle>`;
      offset += length;
      return circle;
    }).join('');
    const legend = categories.slice(0, 5).map((item, index) => `<div class="donut-item"><div class="donut-label"><i style="background:${PALETTE[index % PALETTE.length]}"></i><span>${escapeHtml(item.name)}</span></div><b>${Math.round(item.value / total * 100)}%</b></div>`).join('');
    return `<div class="donut-layout"><svg class="donut-svg" viewBox="0 0 180 180" role="img" aria-label="Expenses by category"><circle class="donut-track" cx="90" cy="90" r="${radius}"/>${arcs}<text class="donut-center" x="90" y="87">${money(total)}</text><text class="donut-caption" x="90" y="103">TOTAL SPENT</text></svg><div class="donut-legend">${legend}</div></div>`;
  }

  function transactionRows(items, compact = false) {
    if (!items.length) return `<tr><td colspan="5">${emptyState('No transactions yet', 'Once you import a statement or add a transaction, your activity will appear here.', '<a class="text-link" href="/import" data-nav>Import a statement →</a>')}</td></tr>`;
    return items.map(tx => `<tr><td><div class="tx-name"><span class="tx-mark">${escapeHtml((tx.category || 'O')[0].toUpperCase())}</span><div><b>${escapeHtml(tx.description)}</b><small>${escapeHtml(tx.category || 'Other')}</small></div></div></td><td>${dateFormat(tx.date)}</td><td><span class="pill"><i class="pill-dot"></i>${escapeHtml(tx.category || 'Other')}</span></td><td class="${tx.amount < 0 ? 'amount-negative' : 'amount-positive'}">${tx.amount < 0 ? '−' : '+'}${moneyExact(Math.abs(tx.amount))}</td>${compact ? '' : `<td><div class="table-actions"><button class="icon-btn" type="button" data-action="edit-tx" data-id="${tx.id}" aria-label="Edit transaction">${icon('edit')}</button><button class="icon-btn" type="button" data-action="delete-tx" data-id="${tx.id}" aria-label="Delete transaction">${icon('trash')}</button></div></td>`}</tr>`).join('');
  }

  function dashboardPage() {
    const data = state.dashboard;
    if (!data) return `<div class="empty-state">${icon('refresh')}<b>Loading your overview…</b></div>`;
    const totals = data.totals;
    const expenseTrend = data.comparison.expenses.change;
    const incomeTrend = data.comparison.income.change;
    const expenseChangeType = expenseTrend === null ? 'neutral' : expenseTrend > 0 ? 'down' : 'up';
    const incomeChangeType = incomeTrend === null ? 'neutral' : incomeTrend < 0 ? 'down' : 'up';
    const trendLabel = trend => trend === null ? 'No previous period' : 'vs previous period';
    return `<div class="page-heading"><div><span class="eyebrow">YOUR FINANCIAL PICTURE</span><h1>Good to see you, ${escapeHtml((state.user?.name || 'there').split(' ')[0])}.</h1><p>Here is what your money has been doing.</p></div><div class="heading-actions"><select class="range-select" id="dashboardRange" aria-label="Select date range"><option value="today" ${state.range === 'today' ? 'selected' : ''}>Today</option><option value="7d" ${state.range === '7d' ? 'selected' : ''}>Last 7 days</option><option value="30d" ${state.range === '30d' ? 'selected' : ''}>Last 30 days</option><option value="90d" ${state.range === '90d' ? 'selected' : ''}>Last 90 days</option><option value="month" ${state.range === 'month' ? 'selected' : ''}>This month</option><option value="custom" ${state.range === 'custom' ? 'selected' : ''}>Custom dates</option></select>${state.range === 'custom' ? `<input class="range-select" type="date" id="customFrom" aria-label="From date" value="${state.customFrom || localDateValue(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}"><input class="range-select" type="date" id="customTo" aria-label="To date" value="${state.customTo || localDateValue(new Date())}">` : ''}<button class="btn btn-primary btn-small" type="button" data-action="add-transaction">${icon('plus')} Add transaction</button></div></div>
      <section class="kpi-grid" aria-label="Financial summary">
        ${kpiCard('Total income', money(totals.income), incomeTrend, trendLabel(incomeTrend), 'income', incomeChangeType)}
        ${kpiCard('Total expenses', money(totals.expenses), expenseTrend, trendLabel(expenseTrend), 'expense', expenseChangeType)}
        ${kpiCard('Net cash flow', money(totals.net), null, 'Income less expenses', 'wallet', 'neutral')}
        ${kpiCard('Savings rate', totals.savingsRate === null ? '—' : `${totals.savingsRate}%`, null, 'Net cash flow / income', 'trend', 'neutral')}
      </section>
      <section class="content-grid">
        <article class="panel glass"><div class="panel-head"><div><h2>Cash flow overview</h2><p>${dateFormat(data.range.start)} — ${dateFormat(data.range.end)}</p></div><div class="legend"><span><i></i> Expenses</span><span><i class="blue"></i> Income</span></div></div>${lineChart(data.daily)}</article>
        <article class="panel glass"><div class="panel-head"><div><h2>Spending by category</h2><p>Where your expenses are going</p></div><a class="text-link" href="/transactions" data-nav>View all</a></div>${donutChart(data.categories)}</article>
      </section>
      <section class="content-grid">
        <article class="panel glass"><div class="panel-head"><div><h2>Recent transactions</h2><p>Your latest activity in this date range</p></div><a class="text-link" href="/transactions" data-nav>All transactions ${icon('arrow')}</a></div><div class="table-wrap"><table class="data-table"><thead><tr><th>TRANSACTION</th><th>DATE</th><th>CATEGORY</th><th>AMOUNT</th></tr></thead><tbody>${transactionRows(data.recent, true)}</tbody></table></div></article>
        <article class="panel glass"><div class="panel-head"><div><h2>Top spending categories</h2><p>Ranked by total expenses</p></div></div>${data.categories.length ? `<div class="category-list">${data.categories.slice(0, 5).map(item => `<div class="category-row"><div class="category-row-head"><span>${escapeHtml(item.name)}</span><b>${money(item.value)}</b></div><div class="progress-track"><div class="progress-fill" style="width:${Math.max(2, item.value / data.categories[0].value * 100)}%"></div></div></div>`).join('')}</div>` : emptyState('Waiting for transactions', 'Add or import transactions to see category insights.')}</article>
      </section>
      <section class="content-grid equal">
        <article class="panel glass"><div class="panel-head"><div><h2>Monthly budget check-in</h2><p>How this month compares with your targets</p></div><a class="text-link" href="/budgets" data-nav>Manage budgets</a></div>${data.budgetProgress.length ? `<div class="category-list">${data.budgetProgress.slice(0, 4).map(item => `<div class="category-row"><div class="category-row-head"><span>${escapeHtml(item.category)}</span><b>${money(item.spent)} / ${money(item.amount)}</b></div><div class="progress-track"><div class="progress-fill" style="width:${item.percent}%"></div></div><div class="muted" style="font-size:9px">${Math.round(item.percent)}% used · ${money(item.remaining)} left</div></div>`).join('')}</div>` : emptyState('Set your first budget', 'Choose a spending category and monthly limit to stay intentional.', '<a class="text-link" href="/budgets" data-nav>Create a budget →</a>')}</article>
        <article class="panel glass"><div class="panel-head"><div><h2>Your money assistant</h2><p>Ask questions about your analysed transactions</p></div><span class="kpi-icon">${icon('spark')}</span></div><div class="quick-ask"><span class="spark">${icon('spark')}</span><div class="quick-ask-copy"><b>Get a clearer answer</b><small>Try “Where did I spend the most this month?”</small></div></div><button class="btn btn-secondary btn-block" type="button" data-nav="/assistant" style="margin-top:12px" data-action="go-assistant">Ask the assistant ${icon('arrow')}</button></article>
      </section>`;
  }

  async function loadDashboard() {
    state.dashboard = null;
    const content = document.querySelector('.page-content');
    if (content) content.innerHTML = dashboardPage();
    try {
      const dashboardParams = new URLSearchParams({ range: state.range });
      if (state.range === 'custom' && state.customFrom && state.customTo) { dashboardParams.set('from', state.customFrom); dashboardParams.set('to', state.customTo); }
      state.dashboard = await api(`/api/dashboard?${dashboardParams}`);
      if (location.pathname === '/dashboard') document.querySelector('.page-content').innerHTML = dashboardPage();
    } catch (error) { toast(error.message, true); }
  }

  async function loadTransactions(page = 1) {
    const params = new URLSearchParams({ page, limit: 20, q: state.txQuery, category: state.txCategory, type: state.txType });
    state.transactions = await api(`/api/transactions?${params}`);
  }

  function transactionsPage() {
    const result = state.transactions;
    return `<div class="page-heading"><div><span class="eyebrow">YOUR RECORDS</span><h1>Transactions</h1><p>Search, organise and review your money activity.</p></div><div class="heading-actions"><a class="btn btn-secondary btn-small" href="/api/export/csv">${icon('download')} Export CSV</a><button class="btn btn-primary btn-small" type="button" data-action="add-transaction">${icon('plus')} Add transaction</button></div></div>
      <section class="panel glass"><div class="toolbar"><div class="toolbar-search">${icon('search')}<input class="toolbar-input" id="txSearch" type="search" placeholder="Search description or category…" value="${escapeHtml(state.txQuery)}"></div><select class="filter-select" id="txType"><option value="all" ${state.txType === 'all' ? 'selected' : ''}>All types</option><option value="expense" ${state.txType === 'expense' ? 'selected' : ''}>Expenses</option><option value="income" ${state.txType === 'income' ? 'selected' : ''}>Income</option></select><select class="filter-select" id="txCategory"><option value="all">All categories</option>${result.categories.map(category => `<option value="${escapeHtml(category)}" ${state.txCategory === category ? 'selected' : ''}>${escapeHtml(category)}</option>`).join('')}</select></div>
      <div class="table-wrap"><table class="data-table"><thead><tr><th>TRANSACTION</th><th>DATE</th><th>CATEGORY</th><th>AMOUNT</th><th>ACTIONS</th></tr></thead><tbody>${transactionRows(result.items)}</tbody></table></div>
      <div class="pagination"><span>${result.total} transaction${result.total === 1 ? '' : 's'} · Page ${result.page} of ${result.pages}</span><div class="pagination-actions"><button class="btn btn-secondary btn-small" data-action="tx-page" data-page="${Math.max(1, result.page - 1)}" ${result.page <= 1 ? 'disabled' : ''}>Previous</button><button class="btn btn-secondary btn-small" data-action="tx-page" data-page="${Math.min(result.pages, result.page + 1)}" ${result.page >= result.pages ? 'disabled' : ''}>Next</button></div></div></section>`;
  }

  function importPage() {
    const preview = state.pendingImport;
    return `<div class="page-heading"><div><span class="eyebrow">STATEMENT IMPORT</span><h1>Bring your bank data in.</h1><p>Upload a statement, review what was detected and import only what you need.</p></div></div>
      <section class="panel glass"><div class="import-drop" id="importDrop"><span class="upload-icon">${icon('import')}</span><h3>Drop your statement here</h3><p>Choose a CSV, XLSX or text-based PDF file. Files are processed in memory and are not retained as uploads.</p><label class="btn btn-primary" for="statementFile">Choose a file ${icon('arrow')}</label><input id="statementFile" type="file" accept=".csv,.xlsx,.pdf,text/csv,application/pdf" hidden><div class="file-meta">Maximum file size: 12 MB · Scanned PDFs are not supported</div><p id="importStatus" class="form-message" role="status"></p></div>
      ${preview ? `<div class="preview-head"><div><h3>Review detected transactions</h3><p class="muted" style="margin:3px 0 0;font-size:9px">${escapeHtml(preview.fileName)} · ${preview.transactions.length} rows detected</p></div><button class="btn btn-primary btn-small" type="button" data-action="confirm-import">Import ${preview.transactions.length} rows ${icon('arrow')}</button></div>${preview.warnings.length ? `<ul class="warning-list">${preview.warnings.map(w => `<li>• ${escapeHtml(w)}</li>`).join('')}</ul>` : ''}<div class="table-wrap" style="max-height:360px"><table class="data-table"><thead><tr><th>DATE</th><th>DESCRIPTION</th><th>CATEGORY</th><th>AMOUNT</th><th>STATUS</th></tr></thead><tbody>${preview.transactions.slice(0, 100).map(tx => `<tr><td>${dateFormat(tx.date)}</td><td>${escapeHtml(tx.description)}</td><td>${escapeHtml(tx.category)}</td><td class="${tx.amount < 0 ? 'amount-negative' : 'amount-positive'}">${tx.amount < 0 ? '−' : '+'}${moneyExact(Math.abs(tx.amount))}</td><td>${tx.duplicate ? '<span class="pill">Possible duplicate</span>' : '<span class="pill"><i class="pill-dot"></i>Ready</span>'}</td></tr>`).join('')}</tbody></table></div>${preview.transactions.length > 100 ? `<p class="muted" style="font-size:9px">Showing the first 100 rows. All ${preview.transactions.length} detected rows will be imported.</p>` : ''}<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px"><button class="btn btn-ghost btn-small" data-action="cancel-import">Discard preview</button><button class="btn btn-primary btn-small" data-action="confirm-import">Confirm import ${icon('arrow')}</button></div>` : ''}</section>
      <section class="content-grid equal"><article class="panel glass"><div class="panel-head"><div><h2>What gets imported?</h2><p>Only the fields needed for your finance dashboard</p></div></div><div class="category-list"><div class="settings-row"><div><b>Transaction date</b><p>Used to place a record on the timeline.</p></div>${icon('calendar')}</div><div class="settings-row"><div><b>Description and amount</b><p>Used for merchant search and cash-flow totals.</p></div>${icon('wallet')}</div><div class="settings-row"><div><b>Category</b><p>Suggested from the description. You can edit it later.</p></div>${icon('chart')}</div></div></article><article class="panel glass"><div class="panel-head"><div><h2>A note about PDF files</h2><p>Bank formats are not all the same</p></div></div><p class="muted" style="font-size:10px;line-height:1.8">CSV and Excel exports generally give the most accurate results. PDF extraction is heuristic and works only when the document contains selectable text in a recognisable table. Always check the preview before importing. An image-only or scanned statement needs OCR outside this app.</p></article></section>`;
  }

  async function budgetsPage() {
    const [budgets, dashboard] = await Promise.all([api('/api/budgets'), api('/api/dashboard?range=month')]);
    const items = dashboard.budgetProgress;
    const all = budgets.items;
    return `<div class="page-heading"><div><span class="eyebrow">SPENDING TARGETS</span><h1>Budgets that feel realistic.</h1><p>Give a category a monthly guardrail, then see how it is tracking.</p></div><button class="btn btn-primary btn-small" type="button" data-action="add-budget">${icon('plus')} New budget</button></div>
      ${items.length ? `<div class="budget-grid">${items.map(item => `<article class="budget-card glass"><div class="budget-top"><div><h3>${escapeHtml(item.category)}</h3><p>Monthly spending limit</p></div><button class="icon-btn" data-action="delete-budget" data-id="${item.id}" aria-label="Delete budget">${icon('trash')}</button></div><div class="budget-amount">${money(item.spent)} <span class="muted" style="font-family:var(--font);font-size:10px;font-weight:400">/ ${money(item.amount)}</span></div><div class="progress-track"><div class="progress-fill" style="width:${item.percent}%"></div></div><div class="budget-foot"><span>${Math.round(item.percent)}% used</span><span>${money(item.remaining)} remaining</span></div></article>`).join('')}</div>` : `<section class="panel glass">${emptyState('No monthly budgets yet', 'Create a budget for the categories you want to keep an eye on.', '<button class="btn btn-primary btn-small" data-action="add-budget">Create your first budget</button>')}</section>`}
      <section class="panel glass" style="margin-top:14px"><div class="panel-head"><div><h2>Budget setup</h2><p>Budgets are personal to your account and stored encrypted.</p></div></div>${all.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>CATEGORY</th><th>MONTHLY LIMIT</th><th>CREATED</th><th></th></tr></thead><tbody>${all.map(item => `<tr><td>${escapeHtml(item.category)}</td><td>${money(item.amount)}</td><td>Current plan</td><td><button class="icon-btn" data-action="delete-budget" data-id="${item.id}" aria-label="Delete budget">${icon('trash')}</button></td></tr>`).join('')}</tbody></table></div>` : '<p class="muted" style="font-size:10px">Your budgets will be listed here.</p>'}</section>`;
  }

  function assistantPage() {
    const messages = state.chat.length ? state.chat : [{ role: 'assistant', text: 'Hello! I can help you understand the transactions you have imported. Ask me about spending, income, categories, your biggest expense or possible recurring payments.' }];
    return `<div class="page-heading"><div><span class="eyebrow">PRIVATE MONEY INSIGHTS</span><h1>Ask your money a question.</h1><p>Answers are grounded in the transactions stored in your account.</p></div></div>
      <div class="assistant-layout"><section class="chat-panel glass"><div class="chat-header"><span class="chat-avatar">${icon('spark')}</span><div><b>Moneyglass assistant</b><small>Private insights engine · ${state.user?.name ? 'Your account data' : 'Your data'}</small></div><span class="pill" style="margin-left:auto"><i class="pill-dot"></i> Online</span></div><div class="chat-messages" id="chatMessages">${messages.map(msg => `<div class="chat-message ${msg.role === 'user' ? 'user' : ''}">${escapeHtml(msg.text)}${msg.mode ? `<small>${msg.mode === 'local-model' ? 'Local language model' : 'Built-in private insights'}</small>` : ''}</div>`).join('')}</div><form class="chat-form" id="assistantForm"><input class="toolbar-input" id="assistantQuestion" placeholder="Ask something about your spending…" maxlength="500" autocomplete="off" required><button class="btn btn-primary btn-small" type="submit" ${state.busy ? 'disabled' : ''}>${state.busy ? 'Thinking…' : 'Ask'} ${icon('arrow')}</button></form></section>
      <aside class="panel glass assistant-side"><div class="panel-head"><div><h2>Try asking</h2><p>Quick questions to get started</p></div></div><div class="prompt-list">${['How much did I spend this month?', 'Where did I spend the most?', 'What was my biggest expense?', 'How much income did I receive last week?', 'Show possible subscription payments', 'What is my average daily spend?'].map(prompt => `<button class="prompt-button" data-action="assistant-prompt" data-prompt="${escapeHtml(prompt)}">${escapeHtml(prompt)} →</button>`).join('')}</div><div class="security-note" style="margin-top:17px">${icon('lock')}The default assistant runs on your server and uses your encrypted transaction records. It does not call a paid AI API. You can optionally connect a locally hosted Ollama model.</div></aside></div>`;
  }

  function profilePage() {
    const user = state.user;
    return `<div class="page-heading"><div><span class="eyebrow">ACCOUNT DETAILS</span><h1>Your profile.</h1><p>Manage the details and sign-in security for your workspace.</p></div></div>
      <div class="profile-layout"><div><section class="profile-banner glass"><span class="avatar">${escapeHtml(initials(user?.name))}</span><div><h2>${escapeHtml(user?.name)}</h2><p>${escapeHtml(user?.email)}</p></div><span class="pill" style="margin-left:auto">Personal account</span></section>
        <section class="panel glass" style="margin-top:13px"><div class="panel-head"><div><h2>Personal details</h2><p>Your name is encrypted before being stored.</p></div></div><form id="profileForm"><div class="field"><label for="profileName">Full name</label><input id="profileName" name="name" value="${escapeHtml(user?.name)}" maxlength="80" required></div><div class="field"><label>Email address</label><input value="${escapeHtml(user?.email)}" disabled></div><button class="btn btn-primary btn-small" type="submit">Save profile</button><p id="profileMessage" class="form-message" role="status"></p></form></section></div>
        <section class="panel glass"><div class="panel-head"><div><h2>Change password</h2><p>Use a unique password with at least 10 characters.</p></div></div><form id="passwordForm"><div class="field"><label for="currentPassword">Current password</label><input id="currentPassword" name="currentPassword" type="password" autocomplete="current-password" required></div><div class="field"><label for="newPassword">New password</label><input id="newPassword" name="newPassword" type="password" autocomplete="new-password" minlength="10" required></div><div class="field"><label for="confirmNewPassword">Confirm new password</label><input id="confirmNewPassword" name="confirmNewPassword" type="password" autocomplete="new-password" required></div><button class="btn btn-secondary btn-small" type="submit">Update password</button><p id="passwordMessage" class="form-message" role="status"></p></form><div class="security-note" style="margin-top:20px">${icon('shield')}Passwords are stored as salted scrypt hashes. Moneyglass never stores your plain-text password.</div></section></div>`;
  }

  function settingsPage() {
    return `<div class="page-heading"><div><span class="eyebrow">YOUR DATA, YOUR CONTROL</span><h1>Settings & data.</h1><p>Back up your records and manage the data in this workspace.</p></div></div>
      <div class="content-grid equal"><section class="panel glass"><div class="panel-head"><div><h2>Data portability</h2><p>Download a copy of your records at any time.</p></div></div><div class="settings-row"><div><b>JSON backup</b><p>Includes transactions and budgets in a portable format. The downloaded file is readable and should be kept private.</p></div><a class="btn btn-secondary btn-small" href="/api/export/json">${icon('download')} Backup</a></div><div class="settings-row"><div><b>CSV transactions</b><p>Open your transaction history in a spreadsheet.</p></div><a class="btn btn-secondary btn-small" href="/api/export/csv">${icon('download')} Export</a></div></section>
        <section class="panel glass"><div class="panel-head"><div><h2>Security overview</h2><p>What this self-hosted app protects</p></div></div><div class="security-note">${icon('lock')}Transaction and profile payloads are encrypted using AES-256-GCM before database storage. Passwords use salted scrypt hashes. Session tokens are stored as SHA-256 digests.</div><div class="settings-row"><div><b>Server encryption key</b><p>Stored in your private .env file, outside the SQLite database.</p></div><span class="pill"><i class="pill-dot"></i> Configured</span></div><div class="settings-row"><div><b>Sessions</b><p>HttpOnly, SameSite cookies; secure flag is enabled behind HTTPS.</p></div><span class="pill">Server-side</span></div></section></div>
      <section class="panel glass danger-zone" style="margin-top:14px"><div class="panel-head"><div><h2>Danger zone</h2><p>These actions cannot be undone.</p></div></div><div class="settings-row"><div><b>Delete this account and all its records</b><p>Removes your profile, sessions, budgets and encrypted transactions from this app's database.</p></div><button class="btn btn-danger btn-small" type="button" data-action="delete-account">Delete account</button></div></section>`;
  }

  function legalPage(kind) {
    const privacy = kind === 'privacy';
    return `<div class="public-shell">${publicNav()}<main class="page-content"><div class="page-heading"><div><span class="eyebrow">MONEYGLASS</span><h1>${privacy ? 'Privacy overview' : 'Terms of use'}</h1><p>Self-hosting means you control the deployment and the data environment.</p></div></div><article class="legal-copy glass"><p><b>Important:</b> This is starter policy text for your self-hosted installation, not legal advice. Review it and replace it with terms appropriate for your jurisdiction and actual deployment before making the app public.</p>${privacy ? `<h2>Data stored</h2><p>Moneyglass stores account email lookup metadata, password hashes, encrypted profile information, encrypted transactions, budgets, session records and application settings. Statement files are processed in memory for parsing and are not intentionally written to permanent storage.</p><h2>Encryption and access</h2><p>Transaction and profile payloads are encrypted with AES-256-GCM using a key supplied through your private environment configuration. The SQLite database also contains operational metadata such as user identifiers, timestamps, password hashes and session digests. This is application-level field encryption, not whole-file SQLite encryption. Anyone with access to the running server and its encryption key may be able to access the data.</p><h2>Third-party services</h2><p>The default assistant uses a built-in insights engine and does not send transaction information to a paid AI API. If you configure an Ollama endpoint, aggregate spending summaries are sent to that endpoint. Your Cloudflare Tunnel and hosting provider will also process network traffic as part of providing connectivity.</p><h2>Your controls</h2><p>You can export your records or delete your account from Settings. Keep a secure backup of your database volume and encryption key. If you lose the encryption key, previously stored encrypted records cannot be decrypted.</p>` : `<h2>Personal use</h2><p>You are responsible for securing the server, domain, Cloudflare account, environment secrets, backups and devices used to access your installation.</p><h2>No financial advice</h2><p>Moneyglass organises your own transaction data and provides informational summaries. It does not provide financial, investment, tax, accounting or legal advice. Verify important totals against original bank records.</p><h2>Accuracy and availability</h2><p>Statement parsing depends on the layout and quality of the source file. Imported transactions should be reviewed before use. The software is provided as-is, without a guarantee that every bank format or hosting configuration will work without adjustment.</p><h2>Changes</h2><p>Adapt these terms to your use case and applicable laws before operating a public service.</p>`}</article><div style="margin:18px 0 40px"><a class="btn btn-secondary btn-small" href="/" data-nav>← Back home</a></div></main></div>`;
  }

  function notFoundPage() {
    return `<div class="public-shell">${publicNav()}<main class="not-found"><strong>404</strong><h1>This page wandered off.</h1><p>The address may be incorrect, or the page may have moved.</p><a class="btn btn-primary" href="/" data-nav>Return home ${icon('arrow')}</a></main></div>`;
  }

  async function renderRoute() {
    let path = location.pathname.replace(/\/+$/, '') || '/';
    const protectedRoutes = ['/dashboard', '/transactions', '/import', '/budgets', '/assistant', '/profile', '/settings'];
    if (protectedRoutes.includes(path) && !state.user) {
      try { const result = await api('/api/auth/me'); state.user = result.user; }
      catch { navigate('/login', true); return; }
    }
    if ((path === '/login' || path === '/signup') && state.user) { navigate('/dashboard', true); return; }

    if (path === '/') app.innerHTML = landingPage();
    else if (path === '/login' || path === '/signup') app.innerHTML = authPage(path.slice(1));
    else if (path === '/privacy' || path === '/terms') app.innerHTML = legalPage(path.slice(1));
    else if (path === '/dashboard') { app.innerHTML = appShell(dashboardPage(), path); await loadDashboard(); }
    else if (path === '/transactions') {
      app.innerHTML = appShell('<div class="empty-state">Loading transactions…</div>', path);
      try { await loadTransactions(); document.querySelector('.page-content').innerHTML = transactionsPage(); }
      catch (error) { toast(error.message, true); }
    }
    else if (path === '/import') app.innerHTML = appShell(importPage(), path);
    else if (path === '/budgets') {
      app.innerHTML = appShell('<div class="empty-state">Loading budgets…</div>', path);
      try { document.querySelector('.page-content').innerHTML = await budgetsPage(); }
      catch (error) { toast(error.message, true); }
    }
    else if (path === '/assistant') app.innerHTML = appShell(assistantPage(), path);
    else if (path === '/profile') app.innerHTML = appShell(profilePage(), path);
    else if (path === '/settings') app.innerHTML = appShell(settingsPage(), path);
    else app.innerHTML = notFoundPage();
  }

  function openModal(title, body) {
    modalRoot.innerHTML = `<div class="modal-backdrop" data-action="modal-backdrop"><section class="modal-card glass" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}"><div class="modal-head"><h2>${escapeHtml(title)}</h2><button class="icon-btn" type="button" data-action="close-modal" aria-label="Close dialog">${icon('close')}</button></div>${body}</section></div>`;
    const first = modalRoot.querySelector('input,button,select');
    if (first) first.focus();
  }

  function closeModal() { modalRoot.innerHTML = ''; }

  function addTransactionModal(tx = null) {
    const isEdit = Boolean(tx);
    openModal(isEdit ? 'Edit transaction' : 'Add a transaction', `<form id="transactionForm" data-id="${tx?.id || ''}"><div class="field"><label for="txDate">Date</label><input id="txDate" name="date" type="date" value="${tx?.date || new Date().toISOString().slice(0,10)}" required></div><div class="field"><label for="txDescription">Description</label><input id="txDescription" name="description" maxlength="240" value="${escapeHtml(tx?.description || '')}" placeholder="e.g. Groceries, salary, rent" required></div><div class="field"><label for="txAmount">Amount (₹)</label><input id="txAmount" name="amount" type="number" min="0.01" step="0.01" value="${tx ? Math.abs(tx.amount) : ''}" placeholder="0.00" required></div><div class="field"><label for="txTypeInput">Transaction type</label><select id="txTypeInput" name="type"><option value="expense" ${!tx || tx.amount < 0 ? 'selected' : ''}>Expense</option><option value="income" ${tx?.amount > 0 ? 'selected' : ''}>Income</option></select></div><div class="field"><label for="txCategoryInput">Category</label><select id="txCategoryInput" name="category">${['Food & dining','Transport','Shopping','Subscriptions','Bills & utilities','Health','Education','Cash','Home','Travel','Income','Other'].map(c => `<option ${tx?.category === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div><button class="btn btn-primary btn-block" type="submit">${isEdit ? 'Save changes' : 'Save transaction'} ${icon('arrow')}</button><p class="form-message" id="txFormMessage" role="alert"></p></form>`);
  }

  function addBudgetModal() {
    openModal('Create monthly budget', `<form id="budgetForm"><div class="field"><label for="budgetCategory">Category</label><select id="budgetCategory" name="category">${['Food & dining','Transport','Shopping','Subscriptions','Bills & utilities','Health','Education','Cash','Home','Travel','Other'].map(c => `<option>${c}</option>`).join('')}</select></div><div class="field"><label for="budgetAmount">Monthly limit (₹)</label><input id="budgetAmount" type="number" name="amount" min="1" step="1" placeholder="e.g. 8000" required></div><button class="btn btn-primary btn-block" type="submit">Create budget ${icon('arrow')}</button><p class="form-message" id="budgetMessage" role="alert"></p></form>`);
  }

  async function confirmImport() {
    if (!state.pendingImport?.transactions?.length) return;
    const button = document.querySelector('[data-action="confirm-import"]');
    if (button) button.disabled = true;
    try {
      const result = await api('/api/import/commit', { method: 'POST', body: JSON.stringify({ transactions: state.pendingImport.transactions }) });
      state.pendingImport = null;
      toast(`${result.imported} transactions imported · ${result.duplicates} duplicates skipped.`);
      navigate('/dashboard');
    } catch (error) {
      toast(error.message, true);
      if (button) button.disabled = false;
    }
  }

  async function askAssistant(question) {
    const q = String(question || '').trim();
    if (!q || state.busy) return;
    state.chat.push({ role: 'user', text: q });
    state.busy = true;
    if (location.pathname !== '/assistant') navigate('/assistant');
    else document.querySelector('.page-content').innerHTML = assistantPage();
    try {
      const data = await api('/api/assistant', { method: 'POST', body: JSON.stringify({ question: q }) });
      state.chat.push({ role: 'assistant', text: data.answer, mode: data.mode });
    } catch (error) {
      state.chat.push({ role: 'assistant', text: error.message });
    } finally {
      state.busy = false;
      if (location.pathname === '/assistant') {
        document.querySelector('.page-content').innerHTML = assistantPage();
        const messages = document.getElementById('chatMessages');
        if (messages) messages.scrollTop = messages.scrollHeight;
      }
    }
  }

  document.addEventListener('click', async event => {
    const nav = event.target.closest('a[data-nav]');
    if (nav) {
      const destination = nav.getAttribute('href') || nav.dataset.nav;
      if (!destination) return;
      event.preventDefault();
      navigate(destination);
      return;
    }
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const action = button.dataset.action;
    try {
      if (action === 'toggle-password') {
        const input = document.getElementById(button.dataset.target);
        if (input) { input.type = input.type === 'password' ? 'text' : 'password'; button.textContent = input.type === 'password' ? 'Show' : 'Hide'; }
      } else if (action === 'forgot-password') {
        event.preventDefault();
        toast('Password recovery email is not configured. Ask your server administrator to restore access; do not reset the database key.', true);
      } else if (action === 'logout') {
        await api('/api/auth/logout', { method: 'POST', body: '{}' }); state.user = null; state.chat = []; navigate('/');
      } else if (action === 'add-transaction') addTransactionModal();
      else if (action === 'edit-tx') {
        const tx = state.transactions.items.find(item => item.id === button.dataset.id) || state.dashboard?.recent.find(item => item.id === button.dataset.id) || (await api('/api/transactions?limit=100')).items.find(item => item.id === button.dataset.id);
        if (tx) addTransactionModal(tx);
      }
      else if (action === 'delete-tx') {
        if (!confirm('Delete this transaction? This cannot be undone.')) return;
        await api(`/api/transactions/${button.dataset.id}`, { method: 'DELETE' });
        toast('Transaction deleted.');
        if (location.pathname === '/transactions') { await loadTransactions(); document.querySelector('.page-content').innerHTML = transactionsPage(); }
        else await loadDashboard();
      }
      else if (action === 'tx-page') { await loadTransactions(Number(button.dataset.page)); document.querySelector('.page-content').innerHTML = transactionsPage(); }
      else if (action === 'confirm-import') await confirmImport();
      else if (action === 'cancel-import') { state.pendingImport = null; document.querySelector('.page-content').innerHTML = importPage(); }
      else if (action === 'add-budget') addBudgetModal();
      else if (action === 'delete-budget') {
        if (!confirm('Remove this budget?')) return;
        await api(`/api/budgets/${button.dataset.id}`, { method: 'DELETE' });
        document.querySelector('.page-content').innerHTML = await budgetsPage(); toast('Budget removed.');
      }
      else if (action === 'assistant-prompt') askAssistant(button.dataset.prompt);
      else if (action === 'go-assistant') navigate('/assistant');
      else if (action === 'refresh') renderRoute();
      else if (action === 'close-modal') closeModal();
      else if (action === 'modal-backdrop' && event.target === button) closeModal();
      else if (action === 'delete-account') {
        openModal('Delete your account', `<p class="muted" style="font-size:10px;line-height:1.7">This permanently deletes your profile, encrypted transactions, budgets and sessions from this app's database. Export a backup first if you need one.</p><form id="deleteAccountForm"><div class="field"><label for="deletePassword">Confirm your password</label><input id="deletePassword" type="password" autocomplete="current-password" required></div><button class="btn btn-danger btn-block" type="submit">Permanently delete account</button><p class="form-message" id="deleteMessage" role="alert"></p></form>`);
      }
      else if (action === 'mobile-nav') {
        toast('Use the navigation icons along the bottom to switch sections.');
      }
    } catch (error) { toast(error.message, true); }
  });

  document.addEventListener('submit', async event => {
    const form = event.target;
    event.preventDefault();
    try {
      if (form.id === 'signupForm') {
        const data = Object.fromEntries(new FormData(form).entries());
        const message = document.getElementById('authMessage');
        if (data.password !== data.confirmPassword) { message.textContent = 'Your passwords do not match.'; return; }
        const button = document.getElementById('authSubmit'); button.disabled = true;
        try {
          const result = await api('/api/auth/signup', { method: 'POST', body: JSON.stringify(data) });
          state.user = result.user; toast('Your private workspace is ready.'); navigate('/dashboard', true);
        } finally { button.disabled = false; }
      } else if (form.id === 'loginForm') {
        const data = Object.fromEntries(new FormData(form).entries());
        const button = document.getElementById('authSubmit'); button.disabled = true;
        try {
          const result = await api('/api/auth/login', { method: 'POST', body: JSON.stringify(data) });
          state.user = result.user; toast('Welcome back.'); navigate('/dashboard', true);
        } finally { button.disabled = false; }
      } else if (form.id === 'transactionForm') {
        const data = Object.fromEntries(new FormData(form).entries());
        const id = form.dataset.id;
        data.amount = Number(data.amount) * (data.type === 'expense' ? -1 : 1);
        const endpoint = id ? `/api/transactions/${id}` : '/api/transactions';
        await api(endpoint, { method: id ? 'PATCH' : 'POST', body: JSON.stringify(data) });
        closeModal(); toast(id ? 'Transaction updated.' : 'Transaction saved.');
        if (location.pathname === '/transactions') { await loadTransactions(); document.querySelector('.page-content').innerHTML = transactionsPage(); }
        else { state.range = '30d'; await loadDashboard(); }
      } else if (form.id === 'budgetForm') {
        const data = Object.fromEntries(new FormData(form).entries());
        await api('/api/budgets', { method: 'POST', body: JSON.stringify(data) });
        closeModal(); document.querySelector('.page-content').innerHTML = await budgetsPage(); toast('Monthly budget created.');
      } else if (form.id === 'assistantForm') {
        const input = document.getElementById('assistantQuestion');
        const question = input.value; input.value = ''; askAssistant(question);
      } else if (form.id === 'profileForm') {
        const data = Object.fromEntries(new FormData(form).entries());
        const result = await api('/api/profile', { method: 'PATCH', body: JSON.stringify(data) });
        state.user = result.user; document.querySelector('.page-content').innerHTML = profilePage(); toast('Profile updated.');
      } else if (form.id === 'passwordForm') {
        const data = Object.fromEntries(new FormData(form).entries());
        const message = document.getElementById('passwordMessage');
        if (data.newPassword !== data.confirmNewPassword) { message.textContent = 'The new passwords do not match.'; return; }
        const result = await api('/api/profile/password', { method: 'POST', body: JSON.stringify(data) });
        message.textContent = result.message; form.reset();
      } else if (form.id === 'deleteAccountForm') {
        const password = document.getElementById('deletePassword').value;
        await api('/api/account', { method: 'DELETE', body: JSON.stringify({ password }) });
        state.user = null; state.dashboard = null; state.chat = []; closeModal(); toast('Account deleted.'); navigate('/', true);
      }
    } catch (error) {
      const message = form.querySelector('.form-message');
      if (message) message.textContent = error.message;
      else toast(error.message, true);
    }
  });

  document.addEventListener('change', async event => {
    const target = event.target;
    try {
      if (target.id === 'dashboardRange') { state.range = target.value; if (state.range === 'custom') { state.customFrom ||= localDateValue(new Date(new Date().getFullYear(), new Date().getMonth(), 1)); state.customTo ||= localDateValue(new Date()); } await loadDashboard(); }
      if (target.id === 'customFrom') { state.customFrom = target.value; if (state.customFrom && state.customTo) await loadDashboard(); }
      if (target.id === 'customTo') { state.customTo = target.value; if (state.customFrom && state.customTo) await loadDashboard(); }
      if (target.id === 'txType') { state.txType = target.value; await loadTransactions(); document.querySelector('.page-content').innerHTML = transactionsPage(); }
      if (target.id === 'txCategory') { state.txCategory = target.value; await loadTransactions(); document.querySelector('.page-content').innerHTML = transactionsPage(); }
      if (target.id === 'statementFile' && target.files?.[0]) {
        const status = document.getElementById('importStatus');
        status.textContent = `Reading ${target.files[0].name}…`;
        const formData = new FormData(); formData.append('statement', target.files[0]);
        const result = await api('/api/import/preview', { method: 'POST', body: formData });
        state.pendingImport = result;
        document.querySelector('.page-content').innerHTML = importPage();
      }
    } catch (error) { toast(error.message, true); const status = document.getElementById('importStatus'); if (status) status.textContent = error.message; }
  });

  let searchTimer;
  document.addEventListener('input', event => {
    if (event.target.id === 'txSearch') {
      state.txQuery = event.target.value;
      clearTimeout(searchTimer);
      searchTimer = window.setTimeout(async () => {
        try { await loadTransactions(); document.querySelector('.page-content').innerHTML = transactionsPage(); const input = document.getElementById('txSearch'); if (input) { input.focus(); input.setSelectionRange(input.value.length, input.value.length); } }
        catch (error) { toast(error.message, true); }
      }, 280);
    }
    if (event.target.id === 'password' && document.getElementById('passwordMeter')) {
      const value = event.target.value;
      let score = 0;
      if (value.length >= 10) score++;
      if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++;
      if (/\d/.test(value)) score++;
      if (/[^A-Za-z0-9]/.test(value)) score++;
      document.querySelectorAll('#passwordMeter i').forEach((node, index) => node.classList.toggle('active', index < score));
      document.getElementById('passwordHint').textContent = score < 2 ? 'Use 10+ characters, including letters and numbers.' : score < 4 ? 'Good. Add varied characters for a stronger password.' : 'Strong password.';
    }
  });

  document.addEventListener('dragover', event => {
    if (event.target.closest('#importDrop')) { event.preventDefault(); document.getElementById('importDrop')?.classList.add('dragover'); }
  });
  document.addEventListener('dragleave', event => {
    if (event.target.closest('#importDrop')) document.getElementById('importDrop')?.classList.remove('dragover');
  });
  document.addEventListener('drop', async event => {
    const drop = event.target.closest('#importDrop');
    if (!drop) return;
    event.preventDefault(); drop.classList.remove('dragover');
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    const formData = new FormData(); formData.append('statement', file);
    const status = document.getElementById('importStatus'); if (status) status.textContent = `Reading ${file.name}…`;
    try { state.pendingImport = await api('/api/import/preview', { method: 'POST', body: formData }); document.querySelector('.page-content').innerHTML = importPage(); }
    catch (error) { toast(error.message, true); if (status) status.textContent = error.message; }
  });

  window.addEventListener('popstate', () => renderRoute());

  async function start() {
    try { const result = await api('/api/auth/me'); state.user = result.user; }
    catch { state.user = null; }
    await renderRoute();
  }

  start();
})();
