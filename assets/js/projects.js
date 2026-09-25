/* ISTC projects page: charts + searchable database built from assets/data/projects.json */
(() => {
  const d = document;
  const $ = s => d.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const FLAG = { Armenia: 'am', Georgia: 'ge', Kazakhstan: 'kz', Kyrgyzstan: 'kg', Tajikistan: 'tj', Belarus: 'by' };
  const STATUS = {
    'Project underway': { k: 'u', short: 'Underway', color: '#FF6600' },
    'Submitted to Parties for Board Decision': { k: 's', short: 'Awaiting Board decision', color: '#FFA06A' },
    'Project completed': { k: 'c', short: 'Completed', color: '#3F6A95' },
    'Approved without Funding': { k: 'a', short: 'Approved, needs funder', color: '#D4D8E2' },
  };
  const STATUS_ORDER = Object.keys(STATUS);
  const flag = k => FLAG[k] ? `<span class="fi fi-${FLAG[k]}"></span>` : '<i data-lucide="globe" style="width:14px;height:14px"></i>';
  const stPill = s => { const m = STATUS[s]; return m ? `<span class="st ${m.k}">${m.short}</span>` : ''; };

  let ALL = [], view = [], shown = 0;
  const PAGE = 12;
  const state = { q: '', status: null, country: null, topic: null, sort: 'rel' };

  fetch('../assets/data/projects.json')
    .then(r => r.json())
    .then(data => { ALL = data; charts(); filtersUI(); apply(); summits(); openFromHash(); })
    .catch(() => { $('#count').textContent = 'Could not load the project list. Browse istc.int/projects instead.'; });

  /* ------------------------------------------------------------ charts */
  function count(fn) { const m = new Map(); ALL.forEach(p => [].concat(fn(p)).forEach(v => v != null && m.set(v, (m.get(v) || 0) + 1))); return m; }

  function charts() {
    const by = count(p => p.s);
    const awaiting = by.get('Approved without Funding') || 0;
    const aw = $('#awaitN'); if (aw) aw.textContent = awaiting;

    // donut
    const total = ALL.length, R = 60, C = 2 * Math.PI * R;
    let off = 0, rings = '', legend = '';
    STATUS_ORDER.forEach(s => {
      const n = by.get(s) || 0, len = n / total * C;
      rings += `<circle r="${R}" cx="75" cy="75" stroke="${STATUS[s].color}" stroke-dasharray="0 ${C}" data-da="${len.toFixed(1)} ${(C - len).toFixed(1)}" stroke-dashoffset="${(-off).toFixed(1)}"></circle>`;
      off += len;
      legend += `<div><i style="background:${STATUS[s].color}"></i>${STATUS[s].short}<b>${n}</b></div>`;
    });
    $('#ch-status .donut-wrap').innerHTML =
      `<svg class="donut" viewBox="0 0 150 150" role="img" aria-label="Projects by status">${rings}
        <text x="75" y="80" text-anchor="middle">${total}</text><text class="sub" x="75" y="96" text-anchor="middle">PROJECTS</text></svg>
       <div class="legend">${legend}</div>`;

    bars('#ch-country .bars', [...count(p => p.k)].sort((a, b) => b[1] - a[1]), k => `${flag(k)}${esc(k)}`);
    bars('#ch-topic .bars', [...count(p => p.t)].sort((a, b) => b[1] - a[1]), k => esc(k));

    // year columns
    const ys = count(p => p.y);
    const y0 = Math.min(...ys.keys()), y1 = Math.max(...ys.keys());
    const max = Math.max(...ys.values());
    let cols = '';
    for (let y = y0; y <= y1; y++) {
      const n = ys.get(y) || 0;
      cols += `<div class="c${y >= 2020 ? ' hi' : ''}" style="--h:${(n / max * 100).toFixed(1)}%" data-t="${y}: ${n}"></div>`;
    }
    $('#ch-year .cols').innerHTML = cols;
    const ax = d.querySelectorAll('#ch-year .axis span');
    ax[0].textContent = y0; ax[1].textContent = y1;

    // animate when visible
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      e.target.querySelectorAll('.donut circle').forEach(c => { c.style.strokeDasharray = c.dataset.da; });
      io.unobserve(e.target);
    }), { threshold: .3 });
    d.querySelectorAll('.chart').forEach(c => io.observe(c));
    window.ISTC && ISTC.icons();
  }

  function bars(sel, rows, label) {
    const max = Math.max(...rows.map(r => r[1]));
    $(sel).innerHTML = rows.map(([k, n]) =>
      `<div class="bar"><span class="lbl">${label(k)}</span><span class="trk"><span class="val" style="--w:${(n / max * 100).toFixed(1)}%"></span></span><b>${n}</b></div>`).join('');
  }

  /* ------------------------------------------------------------ filters */
  function chip(group, value, label, n) {
    return `<button class="fchip" data-g="${group}" data-v="${esc(value)}" aria-pressed="false">${label}${n != null ? ` <em>${n}</em>` : ''}</button>`;
  }

  function filtersUI() {
    const st = count(p => p.s), ct = count(p => p.k), tp = count(p => p.t);
    const row = (lbl, html) => `<div class="frow" role="group" aria-label="${lbl}"><span class="flbl">${lbl}</span>${html}</div>`;
    $('#filters').innerHTML =
      row('Status', STATUS_ORDER.map(s => chip('status', s, STATUS[s].short, st.get(s) || 0)).join('')) +
      row('Country', [...ct].sort((a, b) => b[1] - a[1]).map(([k, n]) => chip('country', k, `${flag(k)}${esc(k)}`, n)).join('')) +
      row('Topic', [...tp].sort((a, b) => b[1] - a[1]).map(([k, n]) => chip('topic', k, esc(k), n)).join(''));
    $('#filters').addEventListener('click', e => {
      const b = e.target.closest('.fchip'); if (!b) return;
      const g = b.dataset.g, v = b.dataset.v;
      state[g] = state[g] === v ? null : v;
      d.querySelectorAll(`.fchip[data-g="${g}"]`).forEach(x => x.setAttribute('aria-pressed', x.dataset.v === state[g]));
      apply();
    });
    let t;
    $('#q').addEventListener('input', e => { clearTimeout(t); t = setTimeout(() => { state.q = e.target.value.trim().toLowerCase(); apply(); }, 160); });
    $('#sort').addEventListener('change', e => { state.sort = e.target.value; apply(); });
    $('#more').addEventListener('click', () => render(true));
    window.ISTC && ISTC.icons();
  }

  function hay(p) {
    if (!p._h) p._h = [p.c, p.n, p.k, p.o, ...(p.t || []), ...Object.values(p.i || {}).flat()].join(' ').toLowerCase();
    return p._h;
  }

  function apply() {
    const words = state.q.split(/\s+/).filter(Boolean);
    view = ALL.filter(p =>
      (!state.status || p.s === state.status) &&
      (!state.country || p.k === state.country) &&
      (!state.topic || (p.t || []).includes(state.topic)) &&
      words.every(w => hay(p).includes(w)));
    const date = p => p.d || (p.y ? `${p.y}` : '');
    if (state.sort === 'new') view.sort((a, b) => date(b).localeCompare(date(a)));
    else if (state.sort === 'old') view.sort((a, b) => (date(a) || '9999').localeCompare(date(b) || '9999'));
    else if (state.sort === 'code') view.sort((a, b) => a.c.localeCompare(b.c, 'en', { numeric: true }));
    shown = 0;
    $('#plist').innerHTML = '';
    render();
  }

  function render(more) {
    const next = view.slice(shown, shown + PAGE);
    const html = next.map((p, i) => `
      <button class="pcard" data-code="${esc(p.c)}" style="animation-delay:${(i % PAGE) * 30}ms">
        <span class="top"><span class="code">${esc(p.c)}</span>${stPill(p.s)}</span>
        <h3>${esc(p.n)}</h3>
        <span class="meta"><span>${flag(p.k)}${esc(p.k)}</span>${p.y ? `<span>Start ${p.y}</span>` : ''}${p.m ? `<span>${p.m} months</span>` : ''}</span>
        ${(p.t || []).length ? `<span class="meta">${p.t.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</span>` : ''}
      </button>`).join('');
    $('#plist').insertAdjacentHTML('beforeend', html);
    shown += next.length;
    const n = view.length;
    $('#count').innerHTML = n ? `Showing <b>${shown}</b> of <b>${n}</b> projects` : '';
    if (!n) $('#plist').innerHTML = `<div class="empty" style="grid-column:1/-1">No projects match. Try a shorter word or clear a filter.</div>`;
    $('#more').hidden = shown >= n;
    window.ISTC && ISTC.icons();
    if (more) { const cards = d.querySelectorAll('.pcard'); cards[shown - next.length]?.focus({ preventScroll: true }); }
  }

  /* ------------------------------------------------------------ dialog */
  const dlg = $('#pd');
  $('#plist').addEventListener('click', e => { const c = e.target.closest('.pcard'); if (c) open(c.dataset.code); });
  $('#pd-x').addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener('close', () => { if (location.hash.startsWith('#p=')) history.replaceState(null, '', location.pathname + '#explore'); });

  const ROLE = { leading: 'Leading institute', participating: 'Participating institutes', collaborator: 'International collaborators' };
  function open(code) {
    const p = ALL.find(x => x.c === code); if (!p) return false;
    $('#pd-code').textContent = p.c;
    $('#pd-title').textContent = p.n;
    const facts = [
      ['Status', stPill(p.s) || esc(p.s)],
      ['Country', `${flag(p.k)} ${esc(p.k)}`],
      p.d ? ['Start', esc(p.d.split('-').reverse().join('.'))] : null,
      p.m ? ['Duration', `${p.m} months`] : null,
    ].filter(Boolean);
    const inst = Object.entries(p.i || {}).map(([r, list]) =>
      `<h4>${ROLE[r] || esc(r)}</h4><ul class="inst">${list.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`).join('');
    $('#pd-body').innerHTML = `
      <div class="facts" style="margin-top:0">${facts.map(([k, v]) => `<div class="fact"><small>${k}</small><p>${v}</p></div>`).join('')}</div>
      ${(p.t || []).length ? `<div style="margin-top:12px;display:flex;gap:6px;flex-wrap:wrap">${p.t.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>` : ''}
      ${p.o ? `<h4>Objective</h4><p>${esc(p.o)}</p>` : ''}
      ${inst}
      <div class="btn-row" style="margin-top:24px"><a class="btn" href="${esc(p.u)}" target="_blank" rel="noopener">Full page on istc.int <i data-lucide="arrow-up-right" class="i"></i></a></div>`;
    window.ISTC && ISTC.icons();
    if (!dlg.open) dlg.showModal();
    dlg.scrollTop = 0;
    history.replaceState(null, '', '#p=' + encodeURIComponent(p.c));
    return true;
  }

  function openFromHash() {
    const m = location.hash.match(/^#p=(.+)$/);
    if (m) open(decodeURIComponent(m[1]));
  }

  // "Summits reached in 2024" chips open the matching project when we have it
  function summits() {
    d.querySelectorAll('#summits a').forEach(a => {
      const code = a.querySelector('b')?.textContent.trim();
      const p = ALL.find(x => x.c === code);
      if (p) {
        a.href = p.u;
        a.addEventListener('click', e => { e.preventDefault(); open(code); });
      }
    });
  }
})();

/* ---------------------------------------------------------------- climb: hiker follows the scroll steps */
(() => {
  const sc = document.getElementById('climb');
  if (!sc) return;
  const svg = sc.querySelector('.mtn svg'), mtn = sc.querySelector('.mtn');
  const pts = [...svg.querySelectorAll('.wp circle')].map(c => [+c.getAttribute('cx'), +c.getAttribute('cy')]);
  const seg = pts.slice(1).map((p, k) => Math.hypot(p[0] - pts[k][0], p[1] - pts[k][1]));
  const total = seg.reduce((a, b) => a + b, 0);
  const cum = [0]; seg.forEach(v => cum.push(cum[cum.length - 1] + v / total * 100));
  const fill = svg.querySelector('.rt-fill'), hiker = svg.querySelector('.hiker');
  const wps = [...svg.querySelectorAll('.wp')], steps = [...sc.querySelectorAll('.sc-step')];
  const hud = { k: sc.querySelector('.hud .k'), nm: sc.querySelector('.hud .nm'), pc: sc.querySelector('.hud .pc'), when: sc.querySelector('.when') };
  let t;
  const go = i => {
    const k = i - 1, [x, y] = pts[k];
    fill.style.strokeDashoffset = (100 - cum[k]).toFixed(2);
    hiker.style.transform = `translate(${x}px, ${y}px)`;
    wps.forEach((w, j) => { w.classList.toggle('done', j <= k); w.classList.toggle('cur', j === k); });
    hud.k.textContent = i;
    hud.nm.textContent = steps[k].dataset.name;
    hud.nm.style.animation = 'none'; void hud.nm.offsetWidth; hud.nm.style.animation = '';
    hud.pc.textContent = `${Math.round(cum[k])}%`;
    hud.when.textContent = steps[k].dataset.when || '';
    mtn.classList.add('moving'); clearTimeout(t); t = setTimeout(() => mtn.classList.remove('moving'), 1200);
  };
  sc.addEventListener('scrollystep', e => go(e.detail));
  go(+sc.dataset.step || 1);
})();

/* ---------------------------------------------------------------- Call 2026 self-check */
(() => {
  const el = document.querySelector('[data-wiz="elig"]');
  if (!el || !window.Wizard) return;
  const CAC = { Armenia: 'am', Georgia: 'ge', Kazakhstan: 'kz', Kyrgyzstan: 'kg', Tajikistan: 'tj' };
  const money = v => '$' + v.toLocaleString('en-US');
  Wizard(el, {
    title: 'Call self-check',
    steps: [
      { key: 'where', q: 'Where is your lead institute?', options: [...Object.entries(CAC).map(([k, f]) => ({ v: k, label: k, flag: f })), { v: 'Other', label: 'Another country', icon: 'globe' }] },
      { key: 'jp', q: 'Do you have a Japanese research group?', hint: 'ISTC does not match teams with partners.', options: [
        { v: 'yes', label: 'Yes, a Japanese group is on board', icon: 'check', wide: true },
        { v: 'more', label: 'Yes — plus a partner from Europe or the US', icon: 'users', wide: true },
        { v: 'no', label: 'Not yet', icon: 'search', wide: true } ] },
      { key: 'area', q: 'Which priority does it address?', options: [
        { v: 'energy', label: 'Energy security', icon: 'zap' }, { v: 'bio', label: 'Biosafety & biosecurity', icon: 'shield-plus' },
        { v: 'water', label: 'Water safety & security', icon: 'waves' }, { v: 'other', label: 'Something else', icon: 'circle-help' } ] },
      { key: 'size', type: 'ranges', q: 'How big is the project?', hint: 'Drag the sliders.', ranges: [
        { key: 'budget', label: 'Budget', min: 50000, max: 400000, step: 10000, value: 200000, limit: 250000, fmt: money, note: 'limit $250,000' },
        { key: 'months', label: 'Duration', min: 6, max: 48, step: 1, value: 30, limit: 36, fmt: v => `${v} mo`, note: 'limit 36 months' } ] },
      { key: 'lead', q: 'Who leads it?', options: [
        { v: 'same', label: 'One person is PI and Project Manager', icon: 'user-check', wide: true },
        { v: 'split', label: 'PI and Project Manager are different people', icon: 'users', wide: true } ] },
    ],
    result(a) {
      const rules = [
        [a.where !== 'Other', 'Lead institute in Armenia, Georgia, Kazakhstan, Kyrgyzstan or Tajikistan', 'The lead must be in one of the five countries. You can still join as a foreign collaborator.'],
        [a.jp !== 'no', 'Japanese research group on board', 'Required. Find one through journals, networks and institute websites.'],
        [a.area !== 'other', 'Fits a 2026 priority', 'The 2026 Call covered energy security, biosafety & biosecurity, water safety & security.'],
        [a.budget <= 250000, `Budget ${money(a.budget)}`, `Over the $250,000 limit by ${money(a.budget - 250000)}.`],
        [a.months <= 36, `${a.months} months`, 'Projects can last up to 3 years (36 months).'],
        [a.lead === 'same', 'PI is also the Project Manager', 'They must be the same person. Name a separate scientific leader if needed.'],
      ];
      const ok = rules.filter(r => r[0]).length, pct = Math.round(ok / rules.length * 100);
      const extra = [];
      if (a.jp === 'more') extra.push('Bonus: with equal quality, proposals with a third-country partner get preference.');
      if (a.budget >= 240000 && a.months < 30) extra.push('Asking for the maximum over a short period needs a clear justification.');
      const icon = good => `<i data-lucide="${good ? 'circle-check' : 'circle-alert'}"></i>`;
      return `
        <div class="res-head">${Wizard.score(pct, `${ok}/${rules.length}`)}<div><h4>${ok === rules.length ? 'Ready for the next call' : `${rules.length - ok} thing${rules.length - ok > 1 ? 's' : ''} to fix`}</h4>
          <p>The 2026 Call is closed. Use this to prepare for the next one.</p></div></div>
        <ul class="checks">${rules.map((r, k) => `<li class="${r[0] ? 'ok' : 'no'}" style="--k:${k}">${icon(r[0])}<span>${r[0] ? `<b>${r[1]}</b>` : `<b>${r[1]}</b> — ${r[2]}`}</span></li>`).join('')}
          ${extra.map((x, k) => `<li class="ok" style="--k:${rules.length + k}"><i data-lucide="info"></i><span>${x}</span></li>`).join('')}</ul>
        <p class="small-h">Documents you'll need</p>
        <ul class="checks">
          <li class="ok" style="--k:7"><i data-lucide="file-text"></i><span><b>Step 1:</b> summary proposal + concurrence letters from your institutes</span></li>
          <li class="ok" style="--k:8"><i data-lucide="file-signature"></i><span><b>Step 2:</b> full proposal + letter of interest from the Japanese partner</span></li>
          <li class="ok" style="--k:9"><i data-lucide="landmark"></i><span><b>If shortlisted:</b> Host Government Concurrence letters</span></li>
        </ul>`;
    },
  });
})();
