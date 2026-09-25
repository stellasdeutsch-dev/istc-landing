/* Animated maps for the About page. Loads d3-geo + world-atlas (Natural Earth 110m) only when a map is near the viewport. */
(() => {
  const els = [...document.querySelectorAll('[data-map]')];
  if (!els.length) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const load = src => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  let world;
  const boot = () => world || (world = (async () => {
    await load('https://cdn.jsdelivr.net/npm/d3-array@3/dist/d3-array.min.js');
    await load('https://cdn.jsdelivr.net/npm/d3-geo@3/dist/d3-geo.min.js');
    await load('https://cdn.jsdelivr.net/npm/topojson-client@3/dist/topojson-client.min.js');
    const t = await (await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')).json();
    return topojson.feature(t, t.objects.countries).features.filter(f => +f.id !== 10); // drop Antarctica
  })());

  // ISO 3166 numeric codes
  const EU = [40, 56, 100, 191, 196, 203, 208, 233, 246, 250, 276, 300, 348, 372, 380, 428, 440, 442, 470, 528, 616, 620, 642, 703, 705, 724, 752];
  const PARTIES = new Set([...EU, 392, 840, 578, 410, 51, 268, 398, 417, 762]);
  const PROGRAMME = new Set([
    478, 504, 12, 788, 434, 818, 400, 275, 376, 422,          // Maghreb & Middle East (disaster preparedness)
    96, 116, 360, 418, 458, 104, 608, 702, 764, 704,          // ASEAN (CBRN medical preparedness)
    496, 586, 860, 8, 31, 70, 498, 499, 807, 688, 804, 368,   // critical infrastructure partners
    686, 710, 516, 404, 800, 834,                             // Africa (LabPlus Africa, nuclear security)
    112,                                                      // TB portal
  ]);
  const CAC = new Set([51, 268, 398, 417, 762]);
  const ASTANA = [71.45, 51.17];
  const NS = 'http://www.w3.org/2000/svg';

  function arc(a, b, lift) {
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1];
    const len = Math.hypot(dx, dy), k = lift * len;
    return { d: `M${a[0].toFixed(1)},${a[1].toFixed(1)} Q${(mx - dy / len * k).toFixed(1)},${(my + dx / len * k - k * .3).toFixed(1)} ${b[0].toFixed(1)},${b[1].toFixed(1)}`, len: len * 1.25 };
  }

  function draw(el, feats) {
    const kind = el.dataset.map;
    const box = el.getBoundingClientRect();
    const w = 1000, h = Math.round(1000 * box.height / box.width);
    const f = w / box.width; // user units per CSS px, so labels and pins keep a readable size
    const proj = kind === 'world' ? d3.geoEqualEarth() : d3.geoMercator();
    if (kind === 'world') proj.fitExtent([[10, 10], [w - 10, h - 10]], { type: 'FeatureCollection', features: feats });
    else proj.fitExtent([[30, 40], [w - 30, h - 30]], { type: 'MultiPoint', coordinates: [[36.5, 37], [86, 55], [36.5, 44], [86, 36.5]] });
    const path = d3.geoPath(proj);
    let out = `<svg xmlns="${NS}" viewBox="0 0 ${w} ${h}" aria-hidden="true">`;
    if (kind === 'world') out += `<path class="grat" d="${path(d3.geoGraticule10())}"/>`;
    const lon0 = kind === 'world' ? -170 : 35;
    feats.forEach(f => {
      const id = +f.id;
      let cls = 'land';
      if (kind === 'world') cls += PARTIES.has(id) ? ' pa' : PROGRAMME.has(id) ? ' pr' : '';
      else cls += id === 398 ? ' me' : CAC.has(id) ? ' pr' : '';
      const d = path(f); if (!d) return;
      const c = d3.geoCentroid(f)[0];
      out += `<path class="${cls}" style="--dl:${(Math.max(0, c - lon0) / (kind === 'world' ? 360 : 60) * .9).toFixed(2)}s" d="${d}"/>`;
    });

    const hub = proj(ASTANA);
    let arcs = '', pins = '';
    const pin = (p, cls, r, delay, label, lx = 12, ly = 4, anchor = 'start') => {
      const R = (cls === 'hq' ? 6 : r > 5 ? 4.5 : 3.2) * f, fs = (cls === 'hq' ? 13 : r > 5 ? 12 : 10) * f;
      return `<g class="pin" style="--dl:${delay}s"><circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${R.toFixed(1)}" fill="${cls === 'hq' ? '#FF6600' : '#fff'}" stroke="${cls === 'hq' ? '#fff' : '#6F93BA'}" stroke-width="${(1.6 * f).toFixed(1)}"/>` +
      (label ? `<text class="${cls}" style="font-size:${fs.toFixed(1)}px;stroke-width:${(3 * f).toFixed(1)}px" x="${(p[0] + (anchor === 'middle' ? 0 : Math.sign(lx) * (R + 4 * f))).toFixed(1)}" y="${(p[1] + (ly === 0 ? 0 : Math.sign(ly) * (R + (ly > 0 ? fs * .9 : 4 * f)))).toFixed(1)}" text-anchor="${anchor}" dominant-baseline="${ly === 0 ? 'middle' : 'auto'}">${label}</text>` : '') + '</g>';
    };

    if (kind === 'world') {
      const targets = [
        [[4.35, 50.85], 'Brussels'], [[139.7, 35.7], 'Tokyo'], [[-77, 38.9], 'Washington'], [[10.75, 59.9], 'Oslo'], [[127, 37.55], 'Seoul'],
        [[10.2, 34], null], [[35.5, 31.9], null], [[101.7, 3.1], null], [[105, 12.5], null], [[36.8, -1.3], null], [[-17.4, 14.7], null],
      ];
      targets.forEach(([ll, label], i) => {
        const p = proj(ll), a = arc(hub, p, .28);
        arcs += `<path class="arc" style="stroke-width:${(1.4 * f).toFixed(1)}px;--len:${a.len.toFixed(0)};--dl:${(1 + i * .12).toFixed(2)}s" d="${a.d}"/>`;
        pins += pin(p, 'b', 4.5, (1.6 + i * .12).toFixed(2), box.width > 640 ? label : null, label === 'Washington' ? -1 : 1, 0, label === 'Washington' ? 'end' : 'start');
      });
      pins += `<circle class="pulse-ring" style="stroke-width:${(1.5 * f).toFixed(1)}px" cx="${hub[0]}" cy="${hub[1]}" r="${(7 * f).toFixed(1)}"/>` + pin(hub, 'hq', 7, .9, 'Astana', 1, -1, 'start');
    } else {
      const br = [[[44.51, 40.18], 'Yerevan', -1, 1, 'end'], [[44.79, 41.72], 'Tbilisi', -1, -1, 'end'], [[74.59, 42.87], 'Bishkek', 1, 0, 'start'], [[68.78, 38.56], 'Dushanbe', 1, 1, 'middle']];
      br.forEach(([ll, label, lx, ly, an], i) => {
        const p = proj(ll), a = arc(hub, p, .22);
        arcs += `<path class="arc" style="stroke-width:${(1.4 * f).toFixed(1)}px;--len:${a.len.toFixed(0)};--dl:${(.9 + i * .2).toFixed(2)}s" d="${a.d}"/>`;
        pins += pin(p, 'b', 8, (1.5 + i * .2).toFixed(2), label, lx, ly, an);
      });
      pins += `<circle class="pulse-ring" style="stroke-width:${(1.5 * f).toFixed(1)}px" cx="${hub[0]}" cy="${hub[1]}" r="${(7 * f).toFixed(1)}"/>` + pin(hub, 'hq', 12, .7, 'Astana · HQ', 1, -1, 'middle');
    }
    out += arcs + pins + '</svg>';
    el.innerHTML = out;
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('in')));
  }

  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    io.unobserve(e.target);
    boot().then(f => draw(e.target, f)).catch(() => { e.target.innerHTML = '<div class="ph">Map unavailable offline</div>'; });
  }), { rootMargin: reduce ? '2000px' : '0px 0px -15% 0px' });
  els.forEach(el => io.observe(el));
})();
