/* =====================================================================
   main.js — all rendering, animation and interaction logic.
   Data comes from window.SITE_DATA (js/content.js).
   ===================================================================== */
(() => {
  'use strict';

  const D = window.SITE_DATA;
  if (!D) { console.error('SITE_DATA is missing: check js/content.js'); return; }

  /* ========== 1. HELPERS ========== */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ALT_PREFIX = 'AI and Young People exchange';

  const h = (tag, props = {}, ...kids) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (v === false || v == null) continue;
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k === 'html') n.innerHTML = v;
      else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : v);
    }
    kids.flat().forEach((c) => { if (c != null && c !== false) n.append(c); });
    return n;
  };

  const safeStorage = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage unavailable */ } },
    remove(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } }
  };

  const fmt = (n) => Number(n).toLocaleString('en-US');

  const star = (cx, cy, R, r, n) => Array.from({ length: n * 2 }, (_, i) => {
    const a = (Math.PI / n) * i - Math.PI / 2; const rad = i % 2 ? r : R;
    return `${(cx + rad * Math.cos(a)).toFixed(2)},${(cy + rad * Math.sin(a)).toFixed(2)}`;
  }).join(' ');
  const cross = (x, y) => `<rect x="${x - 1.5}" y="${y - 0.5}" width="3" height="1" fill="#E8112D"/><rect x="${x - 0.5}" y="${y - 1.5}" width="1" height="3" fill="#E8112D"/>`;
  const FLAGS = {
    romania: '<rect width="10" height="20" fill="#002B7F"/><rect x="10" width="10" height="20" fill="#FCD116"/><rect x="20" width="10" height="20" fill="#CE1126"/>',
    moldova: '<rect width="10" height="20" fill="#0046AE"/><rect x="10" width="10" height="20" fill="#FFD200"/><rect x="20" width="10" height="20" fill="#CC092F"/><ellipse cx="15" cy="10" rx="2.4" ry="3" fill="#A0602A"/>',
    ukraine: '<rect width="30" height="10" fill="#0057B7"/><rect y="10" width="30" height="10" fill="#FFD700"/>',
    poland: '<rect width="30" height="10" fill="#FFFFFF"/><rect y="10" width="30" height="10" fill="#DC143C"/>',
    georgia: `<rect width="30" height="20" fill="#FFFFFF"/><rect x="13" width="4" height="20" fill="#E8112D"/><rect y="8" width="30" height="4" fill="#E8112D"/>${cross(6.5, 4)}${cross(23.5, 4)}${cross(6.5, 16)}${cross(23.5, 16)}`,
    jordan: `<rect width="30" height="6.7" fill="#000000"/><rect y="6.7" width="30" height="6.7" fill="#FFFFFF"/><rect y="13.4" width="30" height="6.6" fill="#007A3D"/><polygon points="0,0 14,10 0,20" fill="#CE1126"/><polygon points="${star(4.2, 10, 1.7, 0.75, 7)}" fill="#FFFFFF"/>`
  };
  const flag = (id) => {
    const c = (D.countries || []).find((x) => x.id === id);
    const span = h('span', { class: 'flag', role: 'img', 'aria-label': `Flag of ${c ? c.name : id}` });
    if (FLAGS[id]) span.innerHTML = `<svg viewBox="0 0 30 20" preserveAspectRatio="none" aria-hidden="true" focusable="false">${FLAGS[id]}</svg>`;
    else span.textContent = c ? c.flag : '';
    return span;
  };

  const youtubeId = (value) => {
    if (!value) return '';
    const s = String(value).trim();
    if (/^[\w-]{11}$/.test(s)) return s;
    const m = s.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/);
    return m ? m[1] : '';
  };

  const resolveLink = (link) => {
    if (link === 'brochure') return D.links.brochure;
    if (link === 'infopack') return D.links.infopack;
    return link;
  };

  /* ========== 2. SCROLL REVEAL ========== */
  const revealObserver = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) { e.target.classList.add('is-visible'); revealObserver.unobserve(e.target); }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' })
    : null;

  const observeReveal = (root = document) => {
    $$('.reveal:not(.is-visible)', root).forEach((el) => {
      if (revealObserver) revealObserver.observe(el); else el.classList.add('is-visible');
    });
  };

  /* Окремий, надійний показ (партнери / контакти): низький поріг + страховка по таймеру */
  const showOnScroll = (els, fallbackMs = 2500) => {
    const show = (el) => el.classList.add('is-visible');
    if (!('IntersectionObserver' in window)) { els.forEach(show); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { show(e.target); io.unobserve(e.target); } });
    }, { threshold: 0.01, rootMargin: '0px 0px 80px 0px' });
    els.forEach((el) => io.observe(el));
    setTimeout(() => els.forEach(show), fallbackMs);
  };

  /* ========== 3. PHOTO LOADER ========== */
  const EXTS = ['.jpg', '.jpeg', '.png', '.webp'];
  const photoCache = new Map();
  const extMemory = new Map();

  const IS_HTTP = /^https?:$/.test(location.protocol);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const probe = async (src) => {
    if (IS_HTTP && window.fetch) {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const r = await fetch(src, { method: 'HEAD', cache: 'force-cache' });
          if (r.status === 429) {
            const retry = parseInt(r.headers.get('Retry-After') || '0', 10) * 1000;
            await sleep(retry || 1000 * (attempt + 1));
            continue;
          }
          return r.ok && /^image\//i.test(r.headers.get('content-type') || 'image/');
        } catch (e) { return false; }
      }
      return false;
    }
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = src;
    });
  };

  const tryExts = async (folder, n, exts) => {
    for (const ext of exts) {
      const src = `${folder}photo-${n}${ext}`;
      if (await probe(src)) { extMemory.set(folder, ext); return src; }
    }
    return null;
  };

  const BATCH = 10;
  const loadPhotos = (folder, max = 30, manual = null) => {
    if (Array.isArray(manual) && manual.length) {
      return Promise.resolve(manual.map((p) => (p.includes('/') ? p : folder + p)));
    }
    if (!folder || max === 0) return Promise.resolve([]);
    if (photoCache.has(folder)) return photoCache.get(folder);
    const job = (async () => {
      const byNum = new Map();
      const first = await Promise.all([1, 2].filter((n) => n <= max).map(async (n) => [n, await tryExts(folder, n, EXTS)]));
      first.forEach(([n, src]) => { if (src) byNum.set(n, src); });
      if (!byNum.size) return [];
      const main = extMemory.get(folder);
      const others = EXTS.filter((e) => e !== main);
      for (let start = 3; start <= max; start += BATCH) {
        const nums = [];
        for (let n = start; n < start + BATCH && n <= max; n += 1) nums.push(n);
        let res = await Promise.all(nums.map((n) => tryExts(folder, n, [main])));
        if (!res.some(Boolean)) break;
        res = await Promise.all(res.map((src, i) => src || tryExts(folder, nums[i], others)));
        nums.forEach((n, i) => { if (res[i]) byNum.set(n, res[i]); });
        if (start + BATCH <= max) await sleep(150);
      }
      return [...byNum.entries()].sort((x, y) => x[0] - y[0]).map((e) => e[1]);
    })();
    photoCache.set(folder, job);
    return job;
  };

  const imgFallback = () => h('div', { class: 'img-fallback', role: 'img', 'aria-label': 'Photo unavailable' });

  const safeImg = (src, alt, lazy = true) => {
    const img = h('img', { src, alt, decoding: 'async', loading: lazy ? 'lazy' : 'eager', class: 'is-loading' });
    img.addEventListener('load', () => img.classList.remove('is-loading'), { once: true });
    img.addEventListener('error', () => img.replaceWith(imgFallback()), { once: true });
    if (img.complete && img.naturalWidth) img.classList.remove('is-loading');
    return img;
  };

  /* ========== 4. DIALOG MANAGER ========== */
  const dialogStack = [];
  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, iframe, [tabindex]:not([tabindex="-1"])';
  const focusables = (root) => $$(FOCUSABLE, root).filter((el) => !el.hidden && el.offsetParent !== null);

  const openDialog = (dlg, opener) => {
    dlg.hidden = false;
    dialogStack.push({ dlg, opener: opener || document.activeElement });
    document.body.classList.add('no-scroll');
    requestAnimationFrame(() => dlg.classList.add('is-open'));
    const first = $('[data-autofocus]', dlg) || focusables(dlg)[0] || dlg;
    if (!first.hasAttribute('tabindex') && first === dlg) dlg.setAttribute('tabindex', '-1');
    first.focus({ preventScroll: true });
  };

  const closeDialog = (dlg) => {
    const idx = dialogStack.findIndex((d) => d.dlg === dlg);
    if (idx < 0) return;
    const { opener } = dialogStack.splice(idx, 1)[0];
    dlg.classList.remove('is-open');
    window.setTimeout(() => { if (!dlg.classList.contains('is-open')) { dlg.hidden = true; dlg.dispatchEvent(new CustomEvent('dialog:closed')); } }, reduceMotion ? 0 : 220);
    if (!dialogStack.length) document.body.classList.remove('no-scroll');
    if (opener && opener.isConnected) opener.focus({ preventScroll: true });
  };

  document.addEventListener('keydown', (e) => {
    const top = dialogStack[dialogStack.length - 1];
    if (!top) return;
    const { dlg } = top;
    if (e.key === 'Escape') { e.preventDefault(); closeDialog(dlg); return; }
    if (e.key === 'Tab') {
      const list = focusables(dlg);
      if (!list.length) { e.preventDefault(); return; }
      const first = list[0];
      const last = list[list.length - 1];
      if (!dlg.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      return;
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      if (dlg.id === 'lightbox') { e.preventDefault(); lightbox.step(e.key === 'ArrowRight' ? 1 : -1); return; }
      const car = $('.carousel', dlg);
      if (car && car._go && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) {
        e.preventDefault(); car._go(e.key === 'ArrowRight' ? 1 : -1);
      }
    }
  });

  [$('#modal'), $('#lightbox'), $('#video-dialog')].forEach((dlg) => {
    if (!dlg) return;
    dlg.addEventListener('click', (e) => {
      if (e.target === dlg || e.target.closest('[data-close]')) closeDialog(dlg);
    });
  });

  /* ========== 5. CAROUSEL ========== */
  const buildCarousel = (photos, label) => {
    const n = photos.length;
    const loop = n > 1;
    let pos = loop ? 1 : 0;
    let busy = false;
    const track = h('div', { class: 'carousel-track' });
    const root = h('div', { class: 'carousel', role: 'group', 'aria-roledescription': 'carousel', 'aria-label': `${label} photos` }, track);
    const ratios = new Array(n);
    const cur = () => (loop ? (pos - 1 + n) % n : 0);
    const applyRatio = () => { const r = ratios[cur()]; if (r) root.style.setProperty('--ar', r); };

    const makeSlide = (idx, real) => {
      const img = safeImg(photos[idx], real ? `${ALT_PREFIX} - ${label} - Photo ${idx + 1}` : '', real ? idx !== 0 : true);
      if (real) {
        const remember = () => { if (img.naturalWidth) { ratios[idx] = `${img.naturalWidth} / ${img.naturalHeight}`; if (idx === cur()) applyRatio(); } };
        img.addEventListener('load', remember);
        if (img.complete) remember();
      }
      const attrs = real
        ? { class: 'carousel-slide', role: 'group', 'aria-roledescription': 'slide', 'aria-label': `${idx + 1} of ${n}` }
        : { class: 'carousel-slide', 'aria-hidden': 'true' };
      return h('div', attrs, img);
    };

    if (loop) track.append(makeSlide(n - 1, false));
    photos.forEach((_, idx) => track.append(makeSlide(idx, true)));
    if (loop) track.append(makeSlide(0, false));

    const place = (animate) => {
      track.style.transition = animate ? '' : 'none';
      track.style.setProperty('--i', pos);
      if (!animate) { void track.offsetWidth; track.style.transition = ''; }
      applyRatio();
    };
    place(false);

    const settle = () => {
      busy = false;
      if (!loop) return;
      if (pos === 0) { pos = n; place(false); }
      else if (pos === n + 1) { pos = 1; place(false); }
    };
    track.addEventListener('transitionend', (e) => { if (e.target === track && e.propertyName === 'transform') settle(); });

    const go = (dir) => {
      if (!loop || busy) return;
      busy = true;
      pos += dir;
      place(true);
      if (reduceMotion) settle();
      else window.setTimeout(() => { if (busy) settle(); }, 520);
    };
    root._go = go;

    if (loop) {
      root.append(
        h('button', { class: 'car-btn car-prev', type: 'button', 'aria-label': 'Previous photo', onclick: () => go(-1) }, '‹'),
        h('button', { class: 'car-btn car-next', type: 'button', 'aria-label': 'Next photo', onclick: () => go(1) }, '›')
      );
      let x0 = null;
      root.addEventListener('pointerdown', (e) => { x0 = e.clientX; });
      root.addEventListener('pointerup', (e) => {
        if (x0 == null) return;
        const dx = e.clientX - x0; x0 = null;
        if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
      });
      root.addEventListener('pointercancel', () => { x0 = null; });
    }
    return root;
  };

  /* ========== 6. YOUTUBE ========== */
  const embedUrl = (id) => `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
  const makeIframe = (id, title) => h('iframe', {
    src: embedUrl(id), title, allow: 'accelerometer; autoplay; encrypted-media; fullscreen; picture-in-picture',
    allowfullscreen: true, referrerpolicy: 'strict-origin-when-cross-origin'
  });

  const videoDialog = $('#video-dialog');
  const openVideoDialog = (id, title, vertical, opener) => {
    const stage = $('#vd-stage');
    stage.className = `vd-stage is-loading${vertical ? ' is-vertical' : ''}`;
    const iframe = makeIframe(id, title);
    iframe.addEventListener('load', () => stage.classList.remove('is-loading'), { once: true });
    stage.replaceChildren(iframe);
    $('#vd-title').textContent = title;
    openDialog(videoDialog, opener);
  };
  if (videoDialog) videoDialog.addEventListener('dialog:closed', () => { $('#vd-stage').replaceChildren(); });

  const EXPAND_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/></svg>';

  const buildVideo = (id, title, vertical = false) => {
    const frame = h('div', { class: `video-frame is-loading${vertical ? ' is-vertical' : ''}` });
    const stage = h('div', { class: 'video-stage' });
    const thumb = h('img', { src: `https://img.youtube.com/vi/${id}/${vertical ? 'maxresdefault' : 'hqdefault'}.jpg`, alt: `Video preview: ${title}`, loading: 'lazy', decoding: 'async' });
    const ready = () => frame.classList.remove('is-loading');
    thumb.addEventListener('load', () => {
      if (vertical && thumb.naturalWidth <= 120 && !thumb.dataset.fallback) { thumb.dataset.fallback = '1'; thumb.src = `https://img.youtube.com/vi/${id}/hqdefault.jpg`; return; }
      ready();
    });
    thumb.addEventListener('error', () => {
      if (vertical && !thumb.dataset.fallback) { thumb.dataset.fallback = '1'; thumb.src = `https://img.youtube.com/vi/${id}/hqdefault.jpg`; return; }
      thumb.remove(); ready();
    });
    const poster = h('button', { class: 'video-poster', type: 'button', 'aria-label': `Play video: ${title}` },
      thumb, h('span', { class: 'play', 'aria-hidden': 'true' }, '▶'));
    poster.addEventListener('click', () => {
      const iframe = makeIframe(id, title);
      frame.classList.add('is-loading');
      iframe.addEventListener('load', () => frame.classList.remove('is-loading'), { once: true });
      stage.replaceChildren(iframe);
      iframe.focus();
    });
    const expand = h('button', { class: 'video-expand', type: 'button', 'aria-label': `Expand video: ${title}`, title: 'Expand', html: EXPAND_ICON });
    expand.addEventListener('click', () => {
      stage.replaceChildren(poster);
      ready();
      openVideoDialog(id, title, vertical, expand);
    });
    stage.append(poster);
    frame.append(stage, expand);
    return frame;
  };

  /* ========== 7. THEME TOGGLE ========== */
  const initTheme = () => {
    const btn = $('#theme-toggle');
    if (!btn) return;
    const apply = (t) => {
      document.documentElement.setAttribute('data-theme', t);
      btn.setAttribute('aria-pressed', String(t === 'dark'));
      btn.setAttribute('aria-label', t === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    };
    apply(document.documentElement.getAttribute('data-theme') || 'light');
    btn.addEventListener('click', () => {
      const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      apply(next); safeStorage.set('theme', next);
    });
  };

  /* ========== 8. NAVIGATION ========== */
  const initNav = () => {
    const nav = $('#site-nav');
    const burger = $('#burger');
    if (!nav || !burger) return;
    const setOpen = (open) => {
      nav.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    };
    burger.addEventListener('click', () => setOpen(!nav.classList.contains('is-open')));
    nav.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && nav.classList.contains('is-open') && !dialogStack.length) { setOpen(false); burger.focus(); }
    });

    $$('main section[id]').forEach((s) => { s.style.scrollMarginTop = 'var(--header-h)'; });

    const links = new Map($$('[data-spy]', nav).map((a) => [a.dataset.spy, a]));
    const alias = { planned: 'about' };
    const setActive = (id) => {
      const key = alias[id] || id;
      links.forEach((a, k) => (k === key ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current')));
    };
    if ('IntersectionObserver' in window) {
      const spy = new IntersectionObserver((entries) => {
        entries.forEach((e) => { if (e.isIntersecting) setActive(e.target.id); });
      }, { rootMargin: '-40% 0px -55% 0px' });
      $$('main section[id]').forEach((s) => spy.observe(s));
    }
  };

  /* ========== 9. HERO ========== */
  const renderHero = () => {
    const setText = (sel, text) => { const el = $(sel); if (el) el.textContent = text; };
    setText('#hero-eyebrow', D.event.subtitle);
    setText('#hero-title', D.event.title);
    setText('#hero-sub', `${D.event.subtitle} | ${D.event.place} | ${D.event.dates}`);
    setText('#hero-desc', D.event.description);
    setText('#hero-badge', 'Home of the AI & Youth Ambassadors Network');

    const list = $('#flag-list');
    if (list) {
      D.countries.forEach((c) => {
        list.append(h('li', { class: 'flag-item' }, flag(c.id), h('span', { class: 'flag-name' }, c.name)));
      });
    }

    const media = $('#hero-media');
    if (media) {
      probe('images/hero/hero.jpg').then((ok) => {
        if (!ok) return;
        media.insertBefore(h('img', { class: 'hero-bg-img', src: 'images/hero/hero.jpg', alt: '', decoding: 'async' }), media.firstChild);
        media.classList.add('has-image');
      });
    }

    initNetwork();
  };

  const initNetwork = () => {
    const canvas = $('#hero-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext && canvas.getContext('2d');
    if (!ctx) return;
    const hero = canvas.closest('.hero') || canvas;

    const GLYPHS = ['0', '1', '0', '1', '0', '1', '0', '1', '01', '10', '00', '11', '101', '010',
      '{ }', '</>', '=>', 'AI', '0x1F', '//', '[ ]'];
    const COLORS = [
      ['251,146,60', 0.55], ['251,146,60', 0.50],
      ['74,222,128', 0.42], ['74,222,128', 0.36],
      ['212,212,212', 0.38],
      ['128,128,128', 0.45]
    ];
    const FONT = '"JetBrains Mono", "Space Mono", ui-monospace, monospace';
    if (document.fonts && document.fonts.load) document.fonts.load(`500 16px ${FONT}`).catch(() => {});

    let w = 0; let ht = 0; let dots = []; let raf = 0; let visible = true;
    const ptr = { x: -999, y: -999 };
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rnd = (a, b) => a + Math.random() * (b - a);

    const make = (anywhere) => {
      const [rgb, a] = COLORS[Math.floor(Math.random() * COLORS.length)];
      const depth = Math.random();
      return {
        x: rnd(0, w), y: anywhere ? rnd(0, ht) : ht + rnd(10, 60),
        g: GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
        s: 11 + depth * 17,
        vy: -(0.10 + depth * 0.38),
        sw: rnd(0.4, 1.2), ph: rnd(0, 6.28),
        rgb, a: a * (0.45 + depth * 0.55)
      };
    };

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      w = r.width; ht = r.height;
      canvas.width = w * dpr; canvas.height = ht * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.max(28, Math.min(84, Math.round((w * ht) / 15000)));
      dots = Array.from({ length: count }, () => make(true));
    };

    const draw = (t = 0) => {
      ctx.clearRect(0, 0, w, ht);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (const p of dots) {
        if (!reduceMotion) {
          p.y += p.vy;
          p.x += Math.sin(t / 1000 * p.sw + p.ph) * 0.18;
          if (p.y < -30) Object.assign(p, make(false));
          if ((p.g === '0' || p.g === '1') && Math.random() < 0.002) p.g = p.g === '0' ? '1' : '0';
        }
        const edge = Math.max(0, Math.min(1, Math.min(p.y, ht - p.y) / (ht * 0.16)));
        const dx = p.x - ptr.x; const dy = p.y - ptr.y;
        const d = Math.hypot(dx, dy);
        const near = d < 150 ? 1 - d / 150 : 0;
        const ox = near ? (dx / (d || 1)) * near * 18 : 0;
        const oy = near ? (dy / (d || 1)) * near * 18 : 0;
        const alpha = Math.min(1, (p.a + near * 0.45) * edge);
        if (alpha < 0.02) continue;
        ctx.font = `500 ${p.s}px ${FONT}`;
        ctx.fillStyle = `rgba(${p.rgb},${alpha.toFixed(3)})`;
        ctx.fillText(p.g, p.x + ox, p.y + oy);
      }
    };

    const loop = (t) => { draw(t); if (visible && !reduceMotion) raf = requestAnimationFrame(loop); };

    hero.addEventListener('pointermove', (e) => {
      const r = canvas.getBoundingClientRect();
      ptr.x = e.clientX - r.left; ptr.y = e.clientY - r.top;
    });
    hero.addEventListener('pointerleave', () => { ptr.x = -999; ptr.y = -999; });

    resize(); draw();
    if (reduceMotion) { window.addEventListener('resize', () => { resize(); draw(); }); return; }
    raf = requestAnimationFrame(loop);
    let rt = 0;
    window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(resize, 200); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => {
        visible = e.isIntersecting;
        cancelAnimationFrame(raf);
        if (visible) raf = requestAnimationFrame(loop);
      }).observe(canvas);
    }
  };

  /* ========== 10. ABOUT & PROGRESS ========== */
  const renderAbout = () => {
    const A = D.about;
    $('#about-lead').textContent = A.lead;
    $('#about-text').append(...A.paragraphs.map((t) => h('p', { text: t })));
    $('#erasmus-card').append(h('h3', { text: A.erasmusTitle }), h('p', { text: A.erasmusText }));
    $('#about-facts').append(...A.facts.map((f) => h('li', { class: 'fact reveal' },
      h('span', { class: 'fact-icon', 'aria-hidden': 'true' }, f.icon),
      h('div', {}, h('span', { class: 'fact-label', text: f.label }), h('span', { class: 'fact-value', text: f.value })))));
    $('#goals').append(...D.goals.map((g) => h('li', { class: 'goal reveal' },
      h('span', { class: 'tick', 'aria-hidden': 'true' }, '✓'),
      h('div', {}, h('h4', {}, g.title, g.done ? h('span', { class: 'sr-only', text: ' (achieved)' }) : null), h('p', { text: g.text })))));
  };

  const renderProgress = () => {
    const wrap = $('#progress-list');
    D.progress.forEach((p) => {
      const pct = p.done ? 100 : Math.min(100, Math.round((p.value / p.target) * 100));
      const fill = h('div', { class: `bar-fill${p.done ? ' is-done' : ''}` });
      fill.style.setProperty('--w', `${pct}%`);
      wrap.append(h('div', { class: 'prog' },
        h('div', { class: 'prog-top' }, h('span', { class: 'prog-label' }, h('span', { class: 'tick', 'aria-hidden': 'true' }, '✓'), p.label), h('span', { class: 'prog-val', text: p.text })),
        h('div', { class: 'bar', role: 'progressbar', 'aria-label': p.label, 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(pct), 'aria-valuetext': p.text }, fill)));
    });
  };

  /* ========== 11. PROGRAMME ========== */
  const modal = $('#modal');
  const modalBody = $('#modal-body');
  let renderToken = 0;

  const DAYS_CSS = `
.days-carousel { position: relative; }
.days-carousel .days {
  display: flex !important; grid-template-columns: none !important; gap: 16px; align-items: center !important; position: relative;
  overflow: hidden !important; padding: 10px 14px 28px;
}
.days-carousel .days > .day { flex: 0 0 100%; min-width: 0; }
@media (min-width: 700px)  { .days-carousel .days > .day { flex-basis: calc((100% - 16px) / 2); } }
@media (min-width: 1100px) { .days-carousel .days > .day { flex-basis: calc((100% - 32px) / 3); } }
.days-carousel .day { align-content: start; height: auto; }
.days-carousel .day-media { width: 100%; max-width: none; margin: 8px 0 0; }
.days-carousel .day-media .carousel { width: 100%; max-width: none; margin: 0; border-radius: 12px; max-height: 460px; }
.days-carousel .day-media .carousel { aspect-ratio: var(--ar, 3 / 2); transition: aspect-ratio .35s ease; }
.days-carousel .day-media .carousel-track { height: 100%; }
.days-carousel .day-media .carousel-slide { aspect-ratio: auto; height: 100%; display: block; }
.days-carousel .day-media .carousel-slide img { display: block; width: 100%; height: 100%; object-fit: cover; object-position: center; }
.days-carousel .day-media .media-skel { max-width: none; }
.days-nav { display: flex; align-items: center; justify-content: center; gap: 18px; }
.days-btn {
  flex: none; display: grid; place-items: center; width: 46px; height: 46px; padding: 0; border-radius: 50%;
  border: 1px solid var(--border); background: var(--surface-solid); color: var(--text);
  font-size: 1.7rem; line-height: 1; box-shadow: var(--shadow); cursor: pointer; transition: background .2s, color .2s, transform .2s;
}
.days-btn:hover:not(:disabled) { background: var(--blue); color: #fff; border-color: var(--blue); transform: translateY(-2px); }
.days-btn:disabled { opacity: .35; cursor: default; box-shadow: none; }
.days-dots { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; }
.days-dot { width: 10px; height: 10px; padding: 0; border: 0; border-radius: 999px; background: var(--grey-block); cursor: pointer; transition: width .25s, background .25s; }
.days-dot.is-active { width: 24px; background: var(--blue); }
`;

  const initDaysCarousel = () => {
    const list = $('#days');
    if (!list || list.parentElement.classList.contains('days-carousel')) return;
    const cards = $$('.day', list);
    if (!cards.length) return;

    if (!$('#days-carousel-style')) document.head.append(h('style', { id: 'days-carousel-style' }, DAYS_CSS));
    const box = h('div', { class: 'days-carousel', role: 'region', 'aria-roledescription': 'carousel', 'aria-label': 'Programme days' });
    list.before(box);
    box.append(list);

    const prev = h('button', { class: 'days-btn days-prev', type: 'button', 'aria-label': 'Previous day' }, '‹');
    const next = h('button', { class: 'days-btn days-next', type: 'button', 'aria-label': 'Next day' }, '›');
    const dots = h('div', { class: 'days-dots', role: 'group', 'aria-label': 'Choose a day' },
      cards.map((_, i) => h('button', { class: 'days-dot', type: 'button', 'aria-label': `Day ${i + 1}`, onclick: () => goTo(i) })));
    box.append(h('div', { class: 'days-nav' }, prev, dots, next));

    let idx = 0;
    const step = () => (cards[1] ? cards[1].offsetLeft - cards[0].offsetLeft : cards[0].offsetWidth);
    const perView = () => Math.max(1, Math.round((list.clientWidth + 16) / step()));
    const maxIdx = () => Math.max(0, cards.length - perView());

    const update = () => {
      idx = Math.min(Math.max(idx, 0), maxIdx());
      prev.disabled = idx <= 0;
      next.disabled = idx >= maxIdx();
      $$('.days-dot', dots).forEach((d, k) => d.classList.toggle('is-active', k >= idx && k < idx + perView()));
    };
    const goTo = (i, animate = true) => {
      idx = Math.min(Math.max(i, 0), maxIdx());
      list.scrollTo({ left: idx * step(), behavior: animate && !reduceMotion ? 'smooth' : 'auto' });
      update();
    };
    prev.addEventListener('click', () => goTo(idx - 1));
    next.addEventListener('click', () => goTo(idx + 1));
    box.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(idx - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); goTo(idx + 1); }
    });
    list.addEventListener('focusin', (e) => {
      const c = e.target.closest('.day');
      const i = cards.indexOf(c);
      if (i >= 0 && (i < idx || i >= idx + perView())) goTo(i, false);
    });
    window.addEventListener('resize', () => goTo(idx, false));
    update();
  };

  const renderDays = () => {
    const wrap = $('#days');
    D.days.forEach((d) => {
      const media = h('div', { class: 'day-media' });
      const li = h('li', { class: 'card day' },
        h('div', { class: 'day-top' },
          h('span', { class: 'day-n' }, `Day ${d.id} · ${d.date}`),
          h('span', { class: 'day-icon', 'aria-hidden': 'true' }, d.icon)),
        h('h3', { text: d.title }),
        h('p', { class: 'day-desc', text: d.description }),
        d.aim ? h('p', { class: 'day-aim' }, h('strong', { text: 'Aim: ' }), d.aim) : null,
        h('ul', { class: 'day-chips', 'aria-label': 'Activities' }, d.activities.map((a) => h('li', { text: a }))),
        media);
      wrap.append(li);
      const skel = h('div', { class: 'media-skel', 'aria-hidden': 'true' });
      media.append(skel);
      loadPhotos(d.photoFolder, d.photoMax, d.photos).then((photos) => {
        skel.remove();
        if (photos.length) media.append(buildCarousel(photos, `Day ${d.id}`));
      });
    });
    initDaysCarousel();
  };

  const modalHead = (metaText, title, meta2) => h('header', { class: 'modal-head' },
    h('p', { class: 'modal-meta' }, metaText),
    h('h2', { id: 'modal-title', tabindex: '-1', text: title }),
    meta2 ? h('p', { class: 'modal-meta', text: meta2 }) : null);

  const fillMedia = async (host, item, label, token) => {
    const skel = h('div', { class: 'media-skel', 'aria-hidden': 'true' });
    host.append(skel);
    const photos = await loadPhotos(item.photoFolder, item.photoMax, item.photos);
    skel.remove();
    if (token !== renderToken) return;
    if (photos.length) {
      host.append(h('section', { class: 'modal-section', 'aria-label': `${label} photos` }, h('h3', { text: 'Photos' }), buildCarousel(photos, label)));
    }
    const id = youtubeId(item.youtube);
    if (id) {
      host.append(h('section', { class: 'modal-section', 'aria-label': `${label} video` }, h('h3', { text: 'Video' }), buildVideo(id, `${label} video`)));
    }
  };

  /* ========== 12. PARTICIPANTS ========== */
  const renderParticipants = () => {
    const P = D.participants;
    const r = 15.9155;

    $('#donut-card').append(
      h('h3', { text: 'Inclusion' }),
      h('div', { class: 'donut', role: 'img', 'aria-label': `At least ${P.fewerOpportunities.percent}% of participants (${P.fewerOpportunities.people} of ${P.total}) are young people with fewer opportunities` },
        h('div', { html: `<svg viewBox="0 0 42 42" aria-hidden="true" focusable="false"><circle class="donut-track" cx="21" cy="21" r="${r}"/><circle class="donut-seg seg-a" cx="21" cy="21" r="${r}" pathLength="100"/></svg>` }),
        h('div', { class: 'donut-center' }, h('strong', { text: `${P.fewerOpportunities.percent}%+` }), h('span', { text: `${P.fewerOpportunities.people} of ${P.total}` }))),
      h('p', { class: 'donut-text', text: P.fewerOpportunities.text }));
    const wrapper = $('#donut-card .donut > div:first-child');
    if (wrapper) wrapper.replaceWith(...wrapper.childNodes);

    $('#people-card').append(
      h('h3', { text: 'Who took part' }),
      h('div', { class: 'people-stats' },
        h('div', { class: 'people-stat' }, h('strong', { text: String(P.total) }), h('span', { text: 'in total' })),
        h('div', { class: 'people-stat' }, h('strong', { text: String(P.youth) }), h('span', { text: `participants, aged ${P.ageRange}` })),
        h('div', { class: 'people-stat' }, h('strong', { text: String(P.leaders) }), h('span', { text: 'group leaders' }))),
      h('p', { class: 'note', text: `${P.countries.length} countries, with ${P.perCountry} from each:` }),
      h('ul', { class: 'chips' }, P.countries.map((n) => {
        const c = D.countries.find((x) => x.name === n);
        return h('li', { class: 'chip' }, c ? flag(c.id) : null, ` ${n}`);
      })));

    $('#competences').append(
      h('h3', { text: 'Key competences & Youthpass' }),
      h('ul', { class: 'comp-grid' }, D.competences.map((c) => h('li', { class: 'comp' }, h('span', { 'aria-hidden': 'true' }, c.icon), c.title))),
      h('p', { class: 'note', text: D.youthpassText }));
  };

  /* ========== 13. DOWNLOAD COUNTER ========== */
  const DL = {
    start: Number(D.downloads.startValue) || 0,
    url: (D.downloads.firebaseUrl || '').replace(/\/+$/, ''),
    value: 0,
    shown: 0,
    STAMP: 'brochure_last_count',
    LOCAL: 'brochure_local_clicks'
  };
  DL.endpoint = DL.url ? `${DL.url}/brochureDownloads.json` : '';
  DL.localClicks = () => parseInt(safeStorage.get(DL.LOCAL) || '0', 10) || 0;
  DL.fallbackValue = () => DL.start + DL.localClicks();
  DL.value = DL.fallbackValue();

  const counterEls = () => $$('[data-download-count]');
  const barEls = () => $$('[data-download-bar]');

  const paintDownloads = (n, { pulse = false, tween = false } = {}) => {
    DL.value = n;
    const els = counterEls();
    const apply = (val) => els.forEach((el) => { el.textContent = fmt(val); });
    if (tween && !reduceMotion && Math.abs(n - DL.shown) > 1) {
      const from = DL.shown; const t0 = performance.now(); const dur = 900;
      const step = (now) => {
        const p = Math.min(1, (now - t0) / dur);
        apply(Math.round(from + (n - from) * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    } else apply(n);
    DL.shown = n;
    const target = D.downloadsCard.target || 1200;
    barEls().forEach((b) => b.style.setProperty('--w', `${Math.min(100, (n / target) * 100)}%`));
    if (pulse && !reduceMotion) {
      els.forEach((el) => {
        el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse');
        el.addEventListener('animationend', () => el.classList.remove('pulse'), { once: true });
      });
    }
  };

  const initDownloads = async () => {
    paintDownloads(DL.value);
    if (!DL.endpoint) return;
    try {
      const res = await fetch(DL.endpoint, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const v = await res.json();
      paintDownloads(typeof v === 'number' ? v : DL.start, { tween: true });
    } catch (err) {
      console.error('[downloads] could not read the shared counter, using fallback value:', err);
      paintDownloads(DL.fallbackValue());
    }
  };

  const onBrochureClick = async () => {
    const last = parseInt(safeStorage.get(DL.STAMP) || '0', 10) || 0;
    if (Date.now() - last < 24 * 60 * 60 * 1000) return;
    const before = DL.value;
    safeStorage.set(DL.STAMP, String(Date.now()));
    paintDownloads(before + 1, { pulse: true });
    if (!DL.endpoint) {
      safeStorage.set(DL.LOCAL, String(DL.localClicks() + 1));
      return;
    }
    try {
      const res = await fetch(DL.endpoint, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ '.sv': { increment: 1 } })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const v = await res.json();
      if (typeof v === 'number') paintDownloads(v);
    } catch (err) {
      console.error('[downloads] increment failed, reverting counter:', err);
      safeStorage.remove(DL.STAMP);
      paintDownloads(before);
    }
  };

  const downloadBadge = () => h('span', { class: 'dl-count' }, '⬇ ',
    h('span', { class: 'count-badge', 'data-download-count': '' }, fmt(DL.value)), ' downloads');

  const brochureLink = (cls, text, withBadge) => {
    const a = h('a', { class: cls, href: D.links.brochure, target: '_blank', rel: 'noopener', 'data-brochure': '' }, text);
    a.addEventListener('click', onBrochureClick);
    return withBadge ? [a, downloadBadge()] : [a];
  };

  /* ========== 14. IMPACT DASHBOARD ========== */
  const animateCount = (el, to, suffix = '') => {
    if (reduceMotion) { el.textContent = fmt(to) + suffix; return; }
    const t0 = performance.now(); const dur = 1500;
    const step = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      el.textContent = fmt(Math.round(to * (1 - Math.pow(1 - p, 3)))) + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  const renderImpact = () => {
    const wrap = $('#stats');
    D.stats.forEach((s) => {
      const num = h('div', { class: 'stat-num', 'data-count': s.value, 'data-suffix': s.suffix || '', 'aria-label': `${fmt(s.value)}${s.suffix || ''}` }, `0${s.suffix || ''}`);
      wrap.append(h('article', { class: 'card stat reveal' }, num, h('p', { class: 'stat-label', text: s.label })));
    });

    const bar = h('div', { class: 'bar-fill', 'data-download-bar': '' });
    wrap.append(h('article', { class: 'card stat stat-dl reveal' },
      h('div', { class: 'stat-num' }, h('span', { class: 'count-badge', 'data-download-count': '' }, fmt(DL.value))),
      h('p', { class: 'stat-label', text: D.downloadsCard.label }),
      h('div', { class: 'dl-target' }, h('span', { text: D.downloadsCard.targetText }), h('span', { class: 'sr-only', text: 'Progress towards the target' })),
      h('div', { class: 'bar dl-bar', 'aria-hidden': 'true' }, bar)));

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          animateCount(e.target, Number(e.target.dataset.count), e.target.dataset.suffix);
          io.unobserve(e.target);
        });
      }, { threshold: 0.5 });
      $$('[data-count]', wrap).forEach((el) => io.observe(el));
    } else $$('[data-count]', wrap).forEach((el) => animateCount(el, Number(el.dataset.count), el.dataset.suffix));
  };

  /* ========== 15. LOCAL IMPACT ========== */
  const renderCountries = () => {
    D.countries.forEach((c) => {
      const sum = c.events.reduce((s, e) => s + (e.people || 0), 0);
      if (sum !== c.people) console.warn(`[content] ${c.name}: events add up to ${sum}, but people is ${c.people}`);
    });
    $('#local-intro').textContent = D.localIntro;

    const sw = $('#country-switch');
    const wrap = $('#countries');
    D.countries.forEach((c) => {
      sw.append(h('button', { class: 'switch-btn', type: 'button', 'aria-label': `Go to ${c.name}`, onclick: () => {
        const card = $(`#country-${c.id}`);
        card.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
        card.classList.add('is-flash'); setTimeout(() => card.classList.remove('is-flash'), 1600);
        $('.card-btn', card).focus({ preventScroll: true });
      } }, flag(c.id), c.name));

      const btn = h('button', { class: 'card-btn', type: 'button', 'aria-haspopup': 'dialog', 'aria-label': `Open details for ${c.name}`, text: 'View details' });
      const postLink = c.postUrl
        ? h('a', { class: 'btn btn-outline btn-sm', href: c.postUrl, target: '_blank', rel: 'noopener noreferrer', 'aria-label': `View ${c.name} post (opens in a new tab)`, text: 'View post ↗' })
        : null;
      const places = c.events.map((e) => e.place).join(' · ');
      const card = h('article', { class: 'card card-hover country reveal', id: `country-${c.id}` },
        h('div', { class: 'country-top' },
          h('span', { class: 'country-flag' }, flag(c.id)),
          h('h3', { text: c.name }),
          h('div', { class: 'country-people' }, String(c.people), h('small', { text: 'people reached' }))),
        h('p', { class: 'country-place', text: places }),
        h('p', { class: 'country-text', text: c.summary || c.events[0].text }),
        h('div', { class: 'country-actions', style: 'display:flex;flex-wrap:wrap;gap:10px;align-items:center' }, btn, postLink));
      card.addEventListener('click', (e) => { if (e.target !== btn && !e.target.closest('a')) btn.click(); });
      btn.addEventListener('click', (e) => { e.stopPropagation(); openCountry(c.id, btn); });
      wrap.append(card);
    });
  };

  const openCountry = (id, opener) => {
    const c = D.countries.find((x) => x.id === id);
    if (!c) return;
    renderToken += 1;
    const token = renderToken;
    const media = h('div', { class: 'modal-media' });
    const postBlock = c.postUrl
      ? [h('section', { class: 'modal-section' },
          h('a', { class: 'btn btn-outline', href: c.postUrl, target: '_blank', rel: 'noopener noreferrer', text: 'View post ↗' }))]
      : [];
    modalBody.replaceChildren(
      modalHead([flag(c.id), ' Local impact'], c.name, `${c.people} people reached`),
      h('section', { class: 'modal-section' }, h('h3', { text: 'Local events' }),
        h('div', { class: 'event-list' }, c.events.map((e) => h('div', { class: 'event' },
          h('h4', { text: e.place }),
          e.people ? h('p', { class: 'ev-people', text: `${e.people} people` }) : null,
          h('p', { text: e.text }))))),
      ...postBlock,
      media);
    openDialog(modal, opener);
    $('.dialog-panel', modal).scrollTop = 0;
    fillMedia(media, c, c.name, token);
  };

  /* ========== 16. GALLERY + LIGHTBOX ========== */
  const lightbox = (() => {
    const el = $('#lightbox');
    const img = $('#lb-img');
    const count = $('#lb-count');
    let list = []; let idx = 0;

    const show = (animateFrom) => {
      const src = list[idx];
      count.textContent = `${idx + 1} / ${list.length}`;
      img.alt = `${ALT_PREFIX} - Gallery - Photo ${idx + 1}`;
      img.classList.add('is-fading');
      el.classList.add('is-loading');
      const done = () => {
        el.classList.remove('is-loading');
        img.classList.remove('is-fading');
        if (animateFrom && !reduceMotion) {
          const to = img.getBoundingClientRect();
          const from = animateFrom.getBoundingClientRect();
          if (to.width && from.width) {
            const dx = from.left + from.width / 2 - (to.left + to.width / 2);
            const dy = from.top + from.height / 2 - (to.top + to.height / 2);
            img.style.transition = 'none';
            img.style.transform = `translate(${dx}px, ${dy}px) scale(${from.width / to.width})`;
            void img.offsetWidth;
            img.style.transition = '';
            img.style.transform = '';
          }
        }
      };
      const next = new Image();
      next.onload = () => { img.src = src; done(); };
      next.onerror = () => { img.removeAttribute('src'); done(); };
      next.src = src;
      [list[(idx + 1) % list.length], list[(idx - 1 + list.length) % list.length]].forEach((s) => { const p = new Image(); p.src = s; });
    };

    const step = (dir) => { if (list.length < 2) return; idx = (idx + dir + list.length) % list.length; show(null); };
    $('#lb-prev').addEventListener('click', () => step(-1));
    $('#lb-next').addEventListener('click', () => step(1));

    let x0 = null;
    el.addEventListener('pointerdown', (e) => { x0 = e.clientX; });
    el.addEventListener('pointerup', (e) => {
      if (x0 == null) return;
      const dx = e.clientX - x0; x0 = null;
      if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
    });

    el.addEventListener('dialog:closed', () => { img.removeAttribute('src'); });

    const open = (photos, start, thumbEl) => {
      list = photos; idx = start;
      const single = list.length < 2;
      $('#lb-prev').hidden = single; $('#lb-next').hidden = single;
      openDialog(el, thumbEl);
      show(thumbEl);
    };
    return { open, step };
  })();

  const renderGallery = () => {
    const grid = $('#gallery-grid');
    const more = $('#gallery-more');
    const toggleBtn = $('#gallery-toggle');
    const toggleText = $('#gallery-toggle-text');
    const countEl = $('#gallery-count');
    const photos = [];
    let searching = true;
    let expanded = false;

    const BENTO_DESKTOP = 7;
    const BENTO_MOBILE = 5;
    const mqMobile = window.matchMedia('(max-width: 640px)');
    const bentoCount = () => (mqMobile.matches ? BENTO_MOBILE : BENTO_DESKTOP);

    const canVT = typeof document.startViewTransition === 'function' && !reduceMotion;

    const placeholder = () => h('div', { class: 'placeholder' }, h('span', { 'aria-hidden': 'true' }, '📷'), h('strong', { text: 'Photos coming soon' }), h('span', { class: 'note', text: 'The exchange photos will appear here.' }));

    let setExpanded = () => {};

    const draw = (animateFrom = -1) => {
      grid.replaceChildren();
      more.hidden = true;

      if (!photos.length) {
        grid.classList.remove('has-photos', 'is-bento');
        if (searching) grid.append(...[1.5, 0.75, 1.5, 1.5, 0.75, 1.5, 1.5, 0.75].map((r) => h('div', { class: 'gallery-skel', 'aria-hidden': 'true', style: `aspect-ratio:${r}` })));
        else grid.append(placeholder());
        return;
      }

      const count = bentoCount();
      const collapsible = photos.length > count;
      const bento = collapsible && !expanded;
      const visible = bento ? photos.slice(0, count) : photos;

      grid.classList.add('has-photos');
      grid.classList.toggle('is-bento', bento);

      visible.forEach((src, i) => {
        const isLast = bento && i === count - 1;
        const btn = h('button', {
          class: 'gallery-item',
          type: 'button',
          'aria-label': isLast ? `Show all ${photos.length} photos` : `Open photo ${i + 1} of ${photos.length}`
        }, safeImg(src, `${ALT_PREFIX} - Gallery - Photo ${i + 1}`, true));

        if (canVT) btn.style.viewTransitionName = `gal-${i}`;
        if (!canVT && animateFrom >= 0 && i >= animateFrom) {
          btn.classList.add('is-new');
          btn.style.setProperty('--d', `${Math.min((i - animateFrom) * 45, 700)}ms`);
        }

        if (isLast) {
          btn.classList.add('has-more');
          btn.append(h('span', { class: 'gallery-overlay', 'aria-hidden': 'true' },
            h('strong', { text: `+${photos.length - count}` }),
            h('span', { text: 'more photos' })));
          btn.addEventListener('click', () => setExpanded(true, true));
        } else {
          btn.addEventListener('click', () => lightbox.open(photos, i, btn));
        }
        grid.append(btn);
      });

      if (collapsible) {
        more.hidden = false;
        more.classList.toggle('is-expanded', expanded);
        toggleBtn.setAttribute('aria-expanded', String(expanded));
        toggleText.textContent = expanded ? 'Show fewer' : `View all ${photos.length} photos`;
        if (countEl) countEl.textContent = `Showing ${visible.length} of ${photos.length}`;
      }
    };

    setExpanded = (value, fromTile = false) => {
      expanded = value;
      const apply = () => draw(!canVT && expanded ? bentoCount() : -1);
      const t = canVT ? document.startViewTransition(apply) : (apply(), null);
      if (fromTile) toggleBtn.focus({ preventScroll: true });
      if (!expanded) {
        const go = () => $('#gallery').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
        if (t) t.updateCallbackDone.then(go); else go();
      }
    };

    draw();

    toggleBtn.addEventListener('click', () => setExpanded(!expanded));

    const onBreakpoint = () => { if (!expanded && photos.length) draw(); };
    if (mqMobile.addEventListener) mqMobile.addEventListener('change', onBreakpoint);
    else if (mqMobile.addListener) mqMobile.addListener(onBreakpoint);

    const start = async () => {
      const found = await loadPhotos(D.gallery.folder, D.gallery.photoMax, D.gallery.photos);
      searching = false;
      photos.unshift(...found);
      draw();
    };

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); start(); } }, { rootMargin: '500px 0px' });
      io.observe(grid);
    } else start();
  };

  /* ========== 17. VIDEOS ========== */
  const renderVideos = () => {
    const wrap = $('#videos-grid');
    const shorts = $('#shorts-grid');
    D.videos.forEach((v, i) => {
      const id = youtubeId(v.youtube);
      const vertical = v.format === 'short';
      const frame = id
        ? buildVideo(id, v.title, vertical)
        : h('div', { class: `video-frame${vertical ? ' is-vertical' : ''}` }, h('div', { class: 'video-soon' }, h('div', {}, h('span', { 'aria-hidden': 'true' }, '🎬'), 'Coming soon')));
      (vertical ? shorts : wrap).append(h('article', { class: `card video reveal${vertical ? ' video-short' : ''}`, 'aria-label': `${v.title} (${i + 1} of ${D.videos.length})` },
        frame, h('p', { class: 'video-title', text: v.title })));
    });
    shorts.hidden = !shorts.children.length;
  };

  /* ========== 18. NETWORK ========== */
  const renderNetwork = () => {
    const N = D.network;
    $('#network-title').textContent = N.title;
    $('#network-lead').textContent = N.lead;
    $('#help-title').textContent = N.helpTitle;
    const list = $('#help-list');
    N.help.forEach((it) => {
      let actions;
      if (it.link === 'brochure') actions = brochureLink('btn btn-outline btn-sm', it.buttonText, true);
      else {
        const internal = it.link.startsWith('#');
        actions = [h('a', { class: 'btn btn-outline btn-sm', href: resolveLink(it.link), target: internal ? null : '_blank', rel: internal ? null : 'noopener', text: it.buttonText })];
      }
      list.append(h('li', { class: 'help-item' },
        h('div', { class: 'help-main' },
          h('span', { class: 'help-icon', 'aria-hidden': 'true' }, it.icon),
          h('div', {}, h('h4', { text: it.title }), h('p', { text: it.text }))),
        h('div', { class: 'help-actions' }, actions)));
    });
    $('#next-card').append(h('h3', { text: N.nextTitle }), h('ul', { class: 'next-list' }, N.next.map((t) => h('li', { text: t }))));
  };

  /* ========== 19. CONTACTS & FOOTER ========== */
  const renderContacts = () => {
    $('#contacts-lead').textContent = D.contactsLead || '';

    /* --- PARTNERS (без .reveal: окремий показ) --- */
    const list = $('#partners');
    (D.partners || []).forEach((p, i) => {
      const li = h('li', { class: 'partner' + (p.url ? ' partner-link' : '') });
      li.style.setProperty('--i', String(i));
      const inner = p.url
        ? h('a', { href: p.url, target: '_blank', rel: 'noopener noreferrer', 'aria-label': `${p.name} (opens in a new tab)`, title: p.name })
        : li;
      if (p.logo) {
        if (!p.url) { li.setAttribute('aria-label', p.name); li.title = p.name; }
        inner.append(safeImg(p.logo, `${p.name} logo`, false));
      } else inner.textContent = p.name;
      if (p.url) li.append(inner);
      list.append(li);
    });

    /* --- CONTACTS (terminal) --- */
    const sp = (cls, t) => h('span', { class: cls, text: t });
    const line = (n, ...parts) => h('div', { class: 'code-line', style: `--i:${n}` },
      h('span', { class: 'ln', text: String(n) }), h('span', { class: 'code' }, ...parts));

    $('#contacts-grid').append(...(D.contacts || []).map((c, i) => {
      let n = 0;
      const rows = [line(++n, sp('tok-p', '{')),
        line(++n, '  ', sp('tok-k', '"name"'), sp('tok-p', ': '), sp('tok-s', `"${c.name}"`), sp('tok-p', ','))];
      if (c.email) {
        rows.push(line(++n, '  ', sp('tok-k', '"email"'), sp('tok-p', ': '),
          h('span', { class: 'tok-s' }, '"', h('a', { href: `mailto:${c.email}`, text: c.email }), '"'),
          ...(c.phone ? [sp('tok-p', ',')] : [])));
      }
      if (c.phone) {
        const telHref = `tel:${String(c.phone).replace(/[^\d+]/g, '')}`;
        rows.push(line(++n, '  ', sp('tok-k', '"phone"'), sp('tok-p', ': '),
          h('span', { class: 'tok-s' }, '"', h('a', { href: telHref, text: c.phoneText || c.phone }), '"')));
      }
      rows.push(line(++n, sp('tok-p', '}'), h('span', { class: 'cursor' })));
      const card = h('article', { class: 'card contact term' },
        h('div', { class: 'term-bar' },
          h('span', { class: 'term-dots', 'aria-hidden': 'true' }, h('i'), h('i'), h('i')),
          h('span', { class: 'term-title', text: 'contact.json' })),
        h('div', { class: 'term-body' }, rows));
      card.style.setProperty('--i', String(i));
      return card;
    }));

    /* показ партнерів і контактів — не залежить від загального .reveal */
    showOnScroll($$('#contacts .partner, #contacts .contact'));
  };

  const renderFooter = () => {
    $('#disclaimer').textContent = D.footer.disclaimer;
    const logo = $('#erasmus-logo');
    const fallback = $('#erasmus-fallback');
    const swap = () => { logo.hidden = true; fallback.hidden = false; };
    logo.addEventListener('error', swap, { once: true });
    if (logo.complete && logo.naturalWidth === 0) swap();
  };

  /* ========== 20. INIT ========== */
  const init = () => {
    [initTheme, initNav, renderHero, renderAbout, renderProgress, renderDays,
      renderParticipants, renderImpact, renderCountries, renderGallery, renderVideos,
      renderNetwork, renderContacts, renderFooter, observeReveal, initDownloads
    ].forEach((fn) => {
      try { fn(); } catch (err) { console.error('[site] ' + (fn.name || 'block') + ' failed:', err); }
    });
    setTimeout(() => $$('.reveal:not(.is-visible)').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight) el.classList.add('is-visible');
    }), 1500);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
