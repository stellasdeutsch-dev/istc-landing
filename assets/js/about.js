/* About page interactions: "Follow a proposal" player and the "Check your fit" wizard. */
(() => {
  const d = document;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ------------------------------------------------ follow a proposal */
  const bar = d.getElementById('govPlay');
  const flow = d.querySelector('.flow');
  if (bar && flow) {
    const nodes = [...flow.querySelectorAll('.node')];
    const token = flow.querySelector('.token');
    const narr = bar.querySelector('.narr');
    const pips = bar.querySelector('.pips');
    const playBtn = bar.querySelector('[data-a=play]');
    const prev = bar.querySelector('[data-a=prev]'), next = bar.querySelector('[data-a=next]');
    // node index: 0 Parties, 1 Board, 2 SAC, 3 Secretariat
    const STEPS = [
      { n: 3, t: 'Your institute sends a proposal. The Secretariat checks it is complete.' },
      { n: 2, t: 'Independent experts and the Scientific Advisory Committee rate the science.' },
      { n: 1, t: 'The Governing Board approves the project — by consensus.' },
      { n: 0, t: 'Parties and partners provide the funding.' },
      { n: 3, t: 'The Secretariat signs the agreement and runs the project with your team.' },
    ];
    pips.innerHTML = STEPS.map(() => '<i></i>').join('');
    let i = -1, timer = null;

    const place = () => {
      if (i < 0) return;
      const nb = nodes[STEPS[i].n].querySelector('.nic').getBoundingClientRect(), fb = flow.getBoundingClientRect();
      token.style.left = `${nb.left - fb.left + nb.width / 2 + 34}px`;
      token.style.top = `${nb.top - fb.top + nb.height / 2}px`;
    };
    const show = k => {
      i = Math.max(0, Math.min(STEPS.length - 1, k));
      nodes.forEach((nd, j) => nd.classList.toggle('active', j === STEPS[i].n));
      token.classList.add('on');
      place();
      narr.innerHTML = `<small>Step ${i + 1} of ${STEPS.length}</small><span>${esc(STEPS[i].t)}</span>`;
      [...pips.children].forEach((p, j) => p.classList.toggle('on', j <= i));
      prev.disabled = i === 0;
      next.disabled = i === STEPS.length - 1;
    };
    const stop = () => {
      clearInterval(timer); timer = null;
      playBtn.querySelector('span').textContent = i >= STEPS.length - 1 ? 'Replay' : 'Play';
      playBtn.querySelector('svg')?.remove();
      playBtn.insertAdjacentHTML('afterbegin', '<i data-lucide="' + (i >= STEPS.length - 1 ? 'rotate-ccw' : 'play') + '" class="i"></i>');
      window.ISTC && ISTC.icons();
    };
    const play = () => {
      if (timer) { stop(); return; }
      if (i >= STEPS.length - 1) i = -1;
      show(i + 1);
      playBtn.querySelector('span').textContent = 'Pause';
      playBtn.querySelector('svg')?.remove();
      playBtn.insertAdjacentHTML('afterbegin', '<i data-lucide="pause" class="i"></i>');
      window.ISTC && ISTC.icons();
      timer = setInterval(() => { if (i >= STEPS.length - 1) stop(); else show(i + 1); }, reduce ? 4000 : 2800);
    };
    playBtn.addEventListener('click', play);
    prev.addEventListener('click', () => { if (timer) stop(); show(i - 1); });
    next.addEventListener('click', () => { if (timer) stop(); show(i + 1); });
    addEventListener('resize', place);
    // start automatically the first time the diagram is on screen
    new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { o.disconnect(); setTimeout(() => { if (i < 0) play(); }, 900); } }, { threshold: .6 }).observe(flow);
  }

  /* ------------------------------------------------ check your fit */
  const wEl = d.querySelector('[data-wiz="fit"]');
  if (wEl && window.Wizard) {
    let data;
    const load = () => data || (data = fetch(wEl.dataset.src).then(r => r.json()));
    const CAC = { Armenia: 'am', Georgia: 'ge', Kazakhstan: 'kz', Kyrgyzstan: 'kg', Tajikistan: 'tj' };
    const TOPIC_ICON = { 'Health & Bio': 'heart-pulse', 'Nuclear & Radiation': 'radiation', 'Energy': 'zap', 'Environment & Water': 'droplets',
      'Earth & Seismic': 'activity', 'Materials & Chemistry': 'flask-conical', 'Physics & Engineering': 'cpu', 'Security & Export Control': 'shield-check' };
    Wizard(wEl, {
      title: 'Is ISTC a fit?',
      steps: [
        { key: 'where', q: 'Where is your team based?', options: [...Object.entries(CAC).map(([k, f]) => ({ v: k, label: k, flag: f })), { v: 'Other', label: 'Somewhere else', icon: 'globe' }] },
        { key: 'topic', q: 'What is your field?', options: Object.entries(TOPIC_ICON).map(([k, ic]) => ({ v: k, label: k, icon: ic })) },
        { key: 'goal', q: 'What do you want?', options: [
          { v: 'fund', label: 'Funding for our research', icon: 'flask-round', wide: true },
          { v: 'partner', label: 'To fund research as a partner', icon: 'handshake', wide: true },
          { v: 'collab', label: 'To join a team as a collaborator', icon: 'users', wide: true },
        ] },
      ],
      async result(a) {
        const all = await load();
        const cac = a.where !== 'Other';
        const same = all.filter(p => (p.t || []).includes(a.topic));
        const local = cac ? same.filter(p => p.k === a.where) : same;
        const pool = (local.length ? local : same).slice().sort((x, y) => (y.d || '').localeCompare(x.d || ''));
        const sims = pool.slice(0, 3);
        const byC = {}; same.forEach(p => { byC[p.k] = (byC[p.k] || 0) + 1; });
        const pct = Math.round(local.length / Math.max(1, cac ? Math.max(...Object.values(byC)) : all.length) * 100);
        const path = a.goal === 'partner'
          ? { t: 'Become an ISTC Partner', d: 'Fund a project, pick the team, agree the IP. Approval takes about 30 days.', href: 'https://www.istc.int/what-is-a-partner', cta: 'How to become a partner' }
          : a.goal === 'collab' || !cac
            ? { t: 'Join as a foreign collaborator', d: 'Lead institutes are in ISTC member countries. Find a team there and join their proposal.', href: 'projects/#explore', cta: 'Find a team' }
            : { t: 'Prepare for the next call', d: 'The 2026 call funded up to $250,000 for up to 3 years, with a partner in Japan.', href: 'projects/#route', cta: 'See the project route' };
        const flag = CAC[a.where] ? `<span class="fi fi-${CAC[a.where]}" style="width:22px;height:16px;border-radius:3px;vertical-align:-2px"></span> ` : '';
        return `
          <div class="res-head">${Wizard.score(Math.max(pct, 6), local.length)}<div><h4>${local.length ? 'Projects like yours exist' : 'New ground'}</h4>
            <p>${flag}${local.length} ISTC projects in ${esc(a.topic)}${cac ? ` from ${esc(a.where)}` : ' across all countries'} on the public database.</p></div></div>
          <p class="small-h">Your way in</p>
          <ul class="checks"><li class="ok" style="--k:0"><i data-lucide="flag"></i><span><b>${esc(path.t)}.</b> ${esc(path.d)}</span></li></ul>
          ${sims.length ? `<p class="small-h">Similar projects</p><div class="sims">${sims.map((p, k) => `<a style="--k:${k}" href="projects/#p=${encodeURIComponent(p.c)}"><b>${esc(p.c)}</b>${esc(p.n.length > 80 ? p.n.slice(0, 78) + '…' : p.n)}</a>`).join('')}</div>` : ''}
          <div class="btn-row" style="margin-top:18px"><a class="btn" href="${path.href}"${path.href.startsWith('http') ? ' target="_blank" rel="noopener"' : ''}>${esc(path.cta)} <i data-lucide="arrow-right" class="i"></i></a></div>`;
      },
    });
  }
})();
