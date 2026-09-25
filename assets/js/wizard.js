/* Tiny step-by-step wizard: window.Wizard(el, config). Used by the About page fit-check and the Projects page Call self-check. */
(() => {
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  window.Wizard = function (el, cfg) {
    const n = cfg.steps.length;
    let i = 0, ans = {}, dir = 1;
    el.classList.add('wiz');
    el.innerHTML = `
      <div class="wiz-top"><div class="row"><span class="ttl">${esc(cfg.title)}</span><span class="cnt"></span></div><div class="wiz-bar"><i></i></div></div>
      <div class="wiz-body" aria-live="polite"></div>
      <div class="wiz-nav"><button class="btn-ghost" data-a="back">Back</button><button class="btn" data-a="next">Next</button></div>`;
    const body = el.querySelector('.wiz-body'), cnt = el.querySelector('.cnt'), bar = el.querySelector('.wiz-bar i');
    const back = el.querySelector('[data-a=back]'), next = el.querySelector('[data-a=next]');
    const icons = () => window.ISTC && ISTC.icons();

    function render() {
      const st = cfg.steps[i];
      cnt.textContent = `Step ${i + 1} / ${n}`;
      bar.style.width = `${(i / n) * 100}%`;
      back.hidden = i === 0;
      let h = `<div class="wiz-pane${dir < 0 ? ' back' : ''}"><p class="wiz-q">${esc(st.q)}</p>${st.hint ? `<p class="wiz-hint">${esc(st.hint)}</p>` : ''}`;
      if (st.type === 'ranges') {
        st.ranges.forEach(r => { if (ans[r.key] == null) ans[r.key] = r.value; });
        h += st.ranges.map(r => `<div class="rng" data-k="${r.key}"><label for="w-${r.key}">${esc(r.label)} <output>${r.fmt(ans[r.key])}</output></label>
          <input id="w-${r.key}" type="range" min="${r.min}" max="${r.max}" step="${r.step}" value="${ans[r.key]}">
          <div class="lim"><span>${r.fmt(r.min)}</span><span>${esc(r.note || '')}</span><span>${r.fmt(r.max)}</span></div></div>`).join('');
        next.hidden = false;
      } else {
        h += `<div class="opts${st.cols === 3 ? ' c3' : ''}">` + st.options.map((o, k) =>
          `<button class="opt${o.wide ? ' wide' : ''}" style="--k:${k}" data-v="${esc(o.v)}" aria-pressed="${ans[st.key] === o.v}">${o.flag ? `<span class="fi fi-${o.flag}"></span>` : ''}${o.icon ? `<i data-lucide="${o.icon}"></i>` : ''}<span>${esc(o.label)}</span></button>`).join('') + '</div>';
        next.hidden = ans[st.key] == null;
      }
      body.innerHTML = h + '</div>';
      next.textContent = i === n - 1 ? 'See result' : 'Next';
      icons();
      if (st.type === 'ranges') {
        body.querySelectorAll('.rng').forEach(box => {
          const r = st.ranges.find(x => x.key === box.dataset.k), inp = box.querySelector('input'), out = box.querySelector('output');
          const upd = () => { ans[r.key] = +inp.value; out.textContent = r.fmt(+inp.value); box.classList.toggle('bad', r.limit != null && +inp.value > r.limit); };
          inp.addEventListener('input', upd); upd();
        });
      } else {
        body.querySelectorAll('.opt').forEach(b => b.addEventListener('click', () => {
          ans[st.key] = b.dataset.v;
          body.querySelectorAll('.opt').forEach(x => x.setAttribute('aria-pressed', x === b));
          next.hidden = false;
          clearTimeout(el._t); el._t = setTimeout(go, 380);
        }));
      }
    }

    async function result() {
      cnt.textContent = 'Result';
      bar.style.width = '100%';
      back.hidden = false;
      next.hidden = false;
      next.textContent = 'Start again';
      body.innerHTML = `<div class="wiz-pane"><p class="wiz-hint">Working it out…</p></div>`;
      const html = await cfg.result(ans);
      body.innerHTML = `<div class="wiz-pane">${html}</div>`;
      icons();
      requestAnimationFrame(() => requestAnimationFrame(() => body.querySelectorAll('.score .fg').forEach(c => { c.style.strokeDashoffset = c.dataset.off; })));
      window.ISTC && ISTC.counters && ISTC.counters(body);
    }

    function go() {
      dir = 1;
      if (i === n) { i = 0; ans = {}; render(); return; }
      i++;
      if (i === n) result(); else render();
    }
    next.addEventListener('click', go);
    back.addEventListener('click', () => { dir = -1; i = Math.max(0, i - 1); render(); });
    render();
  };

  window.Wizard.score = (pct, label) =>
    `<div class="score"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="42" class="bg"/><circle cx="50" cy="50" r="42" class="fg" data-off="${(264 * (1 - pct / 100)).toFixed(0)}"/></svg><b>${label}</b></div>`;
})();
