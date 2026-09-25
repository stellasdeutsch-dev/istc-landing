/* ISTC landings — shared interactions: header, menu, reveal, counters, parallax, route fill, tabs. */
(() => {
  const d = document, root = d.documentElement;
  root.classList.remove('no-js');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // icons
  const icons = () => window.lucide && lucide.createIcons({ attrs: { 'stroke-width': 1.9 } });
  icons();
  window.ISTC = { icons };

  // header: glass on scroll, hide on scroll down
  const hdr = d.querySelector('.hdr');
  let lastY = 0;
  const onScroll = () => {
    const y = scrollY;
    if (hdr) {
      hdr.classList.toggle('scrolled', y > 40);
      hdr.classList.toggle('hide', y > 500 && y > lastY + 4 && !d.body.classList.contains('menu-open'));
      if (y < lastY - 4) hdr.classList.remove('hide');
    }
    lastY = y;
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // mobile menu
  const burger = d.querySelector('.burger');
  if (burger) {
    burger.addEventListener('click', () => {
      const open = d.body.classList.toggle('menu-open');
      burger.setAttribute('aria-expanded', open);
    });
    d.querySelectorAll('.mnav a').forEach(a => a.addEventListener('click', () => {
      d.body.classList.remove('menu-open');
      burger.setAttribute('aria-expanded', false);
    }));
  }

  // reveal on scroll
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: .14, rootMargin: '0px 0px -40px 0px' });
  // clipped headings have no visible area, so watch their parent instead
  const hio = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.querySelectorAll(':scope > .h2.rv').forEach(h => h.classList.add('in')); hio.unobserve(e.target); }
  }), { threshold: .1, rootMargin: '0px 0px -40px 0px' });
  const watch = (scope = d) => scope.querySelectorAll('.rv:not(.in), .stop:not(.in)').forEach(el => {
    if (el.matches('.h2.rv')) hio.observe(el.parentElement); else io.observe(el);
  });
  watch();
  window.ISTC.watch = watch;

  // counters
  const fmt = (n, dec) => n.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  const cio = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target, to = parseFloat(el.dataset.to), dec = +(el.dataset.dec || 0);
    cio.unobserve(el);
    if (reduce) { el.textContent = fmt(to, dec); return; }
    const t0 = performance.now(), dur = 1600 + Math.min(to, 5000) / 10;
    const step = t => {
      const p = Math.min((t - t0) / dur, 1), k = 1 - Math.pow(1 - p, 4);
      el.textContent = fmt(to * k, dec);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }), { threshold: .5 });
  const counters = (scope = d) => scope.querySelectorAll('[data-to]').forEach(el => cio.observe(el));
  counters();
  window.ISTC.counters = counters;

  // parallax layers
  const layers = [...d.querySelectorAll('[data-speed]')];
  if (layers.length && !reduce) {
    let ticking = false;
    const run = () => {
      const y = scrollY;
      if (y < innerHeight * 1.4) layers.forEach(l => { l.style.transform = `translate3d(0, ${y * +l.dataset.speed}px, 0)`; });
      ticking = false;
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(run); } }, { passive: true });
  }

  // story route: orange fill grows with scroll
  d.querySelectorAll('.route').forEach(r => {
    const fill = r.querySelector('.fill');
    if (!fill) return;
    const upd = () => {
      const b = r.getBoundingClientRect(), mid = innerHeight * .6;
      const p = Math.max(0, Math.min(1, (mid - b.top) / b.height));
      fill.style.height = (p * 100) + '%';
    };
    addEventListener('scroll', upd, { passive: true });
    upd();
  });

  // words light up one by one (mission quote)
  d.querySelectorAll('[data-words]').forEach(el => {
    const html = el.innerHTML;
    const tmp = d.createElement('div');
    tmp.innerHTML = html;
    const wrap = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = d.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(w => {
            if (!w.trim()) { frag.appendChild(d.createTextNode(w)); return; }
            const s = d.createElement('span'); s.className = 'word'; s.textContent = w; frag.appendChild(s);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && !n.classList.contains('q')) wrap(n);
      });
    };
    wrap(tmp);
    el.innerHTML = tmp.innerHTML;
    const words = [...el.querySelectorAll('.word')];
    const upd = () => {
      const b = el.getBoundingClientRect();
      const p = Math.max(0, Math.min(1, (innerHeight * .85 - b.top) / (b.height + innerHeight * .35)));
      const n = Math.round(p * words.length);
      words.forEach((w, i) => w.classList.toggle('on', i < n));
    };
    if (reduce) words.forEach(w => w.classList.add('on'));
    else { addEventListener('scroll', upd, { passive: true }); upd(); }
  });

  // tabs: [data-tabs] > [role=tab][aria-controls] + panels
  d.querySelectorAll('[data-tabs]').forEach(group => {
    const tabs = [...group.querySelectorAll('[role=tab]')];
    const show = t => {
      tabs.forEach(x => {
        const on = x === t;
        x.setAttribute('aria-selected', on);
        x.tabIndex = on ? 0 : -1;
        const p = d.getElementById(x.getAttribute('aria-controls'));
        if (p) { p.hidden = !on; if (on) { p.classList.remove('in'); requestAnimationFrame(() => p.classList.add('in')); counters(p); } }
      });
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => { show(t); if (innerWidth < 960) t.scrollIntoView({ block: 'nearest', inline: 'center', behavior: reduce ? 'auto' : 'smooth' }); });
      t.addEventListener('keydown', e => {
        const k = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        if (k) { e.preventDefault(); const n = tabs[(i + k + tabs.length) % tabs.length]; n.focus(); show(n); }
      });
    });
  });

  // marquee: duplicate content for a seamless loop
  d.querySelectorAll('.marquee .track').forEach(t => { if (!t.dataset.dup) { t.innerHTML += t.innerHTML; t.dataset.dup = 1; } });


  // scroll progress bar
  const bar = d.querySelector('.progress');
  if (bar) {
    const upd = () => { const h = root.scrollHeight - innerHeight; bar.style.transform = `scaleX(${h > 0 ? scrollY / h : 0})`; };
    addEventListener('scroll', upd, { passive: true }); upd();
  }

  // rotating word in the hero headline
  d.querySelectorAll('.rot-in').forEach(el => {
    const n = el.children.length - 1; // last item repeats the first for a seamless loop
    if (reduce || n < 1) return;
    let k = 0;
    setTimeout(() => {
      el.classList.add('go');
      setInterval(() => {
        k++; el.classList.remove('jump'); el.style.setProperty('--k', k);
        if (k === n) setTimeout(() => { el.classList.add('jump'); k = 0; el.style.setProperty('--k', 0); }, 850);
      }, 2400);
    }, 1400);
  });

  // gentle snowfall over the hero
  const cv = d.querySelector('.snow');
  if (cv && !reduce) {
    const ctx = cv.getContext('2d');
    let W = 0, H = 0, flakes = [], on = true;
    const size = () => {
      const r = cv.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
      W = r.width; H = r.height; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(Math.min(90, W / 14));
      flakes = Array.from({ length: n }, () => ({ x: Math.random() * W, y: Math.random() * H, r: .8 + Math.random() * 2.2, s: .25 + Math.random() * .6, o: Math.random() * 6.28 }));
    };
    size(); addEventListener('resize', size);
    new IntersectionObserver(es => { on = es[0].isIntersecting; if (on) requestAnimationFrame(tick); }).observe(cv);
    function tick(t) {
      if (!on) return;
      ctx.clearRect(0, 0, W, H);
      for (const f of flakes) {
        f.y += f.s; f.x += Math.sin(t / 1400 + f.o) * .35;
        if (f.y > H + 4) { f.y = -4; f.x = Math.random() * W; }
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 6.283);
        ctx.fillStyle = `rgba(160,178,201,${.35 + f.r / 6})`; ctx.fill();
      }
      requestAnimationFrame(tick);
    }
  }

  // 3D tilt on cards (mouse only)
  if (!reduce && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    d.querySelectorAll('.tile, .acard, .plan, .node, .hq, .gloss .g').forEach(el => {
      el.classList.add('tilt');
      el.addEventListener('pointermove', e => {
        const b = el.getBoundingClientRect(), x = (e.clientX - b.left) / b.width - .5, y = (e.clientY - b.top) / b.height - .5;
        el.classList.add('tilting');
        el.style.transform = `perspective(900px) rotateX(${(-y * 6).toFixed(2)}deg) rotateY(${(x * 8).toFixed(2)}deg) translateY(-4px)`;
      });
      el.addEventListener('pointerleave', () => { el.classList.remove('tilting'); el.style.transform = ''; });
    });
  }


  // scrollytelling: [data-scrolly] with .sc-step[data-i] cards; sets data-step + cumulative .pN classes
  d.querySelectorAll('[data-scrolly]').forEach(sc => {
    const steps = [...sc.querySelectorAll('.sc-step')];
    const n = steps.length;
    const dots = sc.querySelector('.sc-dots');
    if (dots) {
      dots.innerHTML = steps.map((_, k) => `<button aria-label="Step ${k + 1}"></button>`).join('');
      [...dots.children].forEach((b, k) => b.addEventListener('click', () => steps[k].scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' })));
    }
    const set = i => {
      if (sc._i === i) return;
      sc._i = i;
      sc.dataset.step = i;
      for (let k = 1; k <= n; k++) sc.classList.toggle('p' + k, k <= i);
      steps.forEach((s, k) => s.classList.toggle('on', k === i - 1));
      if (dots) [...dots.children].forEach((b, k) => b.classList.toggle('on', k === i - 1));
      sc.dispatchEvent(new CustomEvent('scrollystep', { detail: i }));
    };
    const io2 = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) set(+e.target.dataset.i); }), { rootMargin: innerWidth < 960 ? '-66% 0px -32% 0px' : '-48% 0px -48% 0px' });
    steps.forEach((s, k) => { s.dataset.i = k + 1; io2.observe(s); });
    set(1);
  });

  // footer year
  d.querySelectorAll('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });
})();
