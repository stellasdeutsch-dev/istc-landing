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
  const watch = (scope = d) => scope.querySelectorAll('.rv:not(.in), .stop:not(.in)').forEach(el => io.observe(el));
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

  // footer year
  d.querySelectorAll('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });
})();
