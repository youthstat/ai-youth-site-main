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

  /** Tiny DOM builder: h('div', {class:'x', text:'..', onclick:fn}, child, child) */
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

  /** Inline SVG flags (emoji flags do not render on Windows). Simplified national flags, 3:2. */
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
  /** Returns a <span class="flag"> with the SVG flag of a country id (falls back to the emoji) */
  const flag = (id) => {
    const c = (D.countries || []).find((x) => x.id === id);
    const span = h('span', { class: 'flag', role: 'img', 'aria-label': `Flag of ${c ? c.name : id}` });
    if (FLAGS[id]) span.innerHTML = `<svg viewBox="0 0 30 20" preserveAspectRatio="none" aria-hidden="true" focusable="false">${FLAGS[id]}</svg>`;
    else span.textContent = c ? c.flag : '';
    return span;
  };

  /** Accepts an 11-char ID or a pasted YouTube URL; returns a clean ID or '' */
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

  /* ========== 3. PHOTO LOADER (auto-detect photo-1.jpg, photo-2.jpg ...) ========== */
  const EXTS = ['.jpg', '.jpeg', '.png', '.webp'];
  const GAP_TOLERANCE = 3;          // stop after this many consecutive missing numbers (once photos were found)
  const photoCache = new Map();     // folder -> Promise<string[]>
  const extMemory = new Map();      // folder -> extension that worked last

  const probe = (src) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = src;
  });

  /** Tries extensions one after another (remembered extension first) to avoid extra 404s */
  const findPhoto = async (folder, n) => {
    const pref = extMemory.get(folder);
    const order = pref ? [pref, ...EXTS.filter((e) => e !== pref)] : EXTS;
    for (const ext of order) {
      const src = `${folder}photo-${n}${ext}`;
      if (await probe(src)) { extMemory.set(folder, ext); return src; }
    }
    return null;
  };

  /**
   * loadPhotos(folder, max, manual)
   * - manual: optional array of file names/paths; if present, auto-search is skipped
   * - a missing number in the middle is skipped; the search stops after GAP_TOLERANCE misses in a row
   *   (or after 2 misses if nothing was found yet) or when N > max
   */
  const loadPhotos = (folder, max = 30, manual = null) => {
    if (Array.isArray(manual) && manual.length) {
      return Promise.resolve(manual.map((p) => (p.includes('/') ? p : folder + p)));
    }
    if (photoCache.has(folder)) return photoCache.get(folder);
    const job = (async () => {
      const found = [];
      let misses = 0;
      for (let n = 1; n <= max; n += 1) {
        const src = await findPhoto(folder, n);
        if (src) { found.push(src); misses = 0; }
        else {
          misses += 1;
          if (misses >= (found.length ? GAP_TOLERANCE : 2)) break;
        }
      }
      return found;
    })();
    photoCache.set(folder, job);
    return job;
  };

  const imgFallback = () => h('div', { class: 'img-fallback', role: 'img', 'aria-label': 'Photo unavailable' });

  /** Builds an <img> that swaps itself for a grey block if it fails to render */
  const safeImg = (src, alt, lazy = true) => {
    const img = h('img', { src, alt, decoding: 'async', loading: lazy ? 'lazy' : 'eager', class: 'is-loading' });
    img.addEventListener('load', () => img.classList.remove('is-loading'), { once: true });
    img.addEventListener('error', () => img.replaceWith(imgFallback()), { once: true });
    if (img.complete && img.naturalWidth) img.classList.remove('is-loading');
    return img;
  };

  /* ========== 4. DIALOG MANAGER (focus trap, Esc, focus return) ========== */
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

  // close on backdrop click / [data-close]
  [$('#modal'), $('#lightbox'), $('#video-dialog')].forEach((dlg) => {
    dlg.addEventListener('click', (e) => {
      if (e.target === dlg || e.target.closest('[data-close]')) closeDialog(dlg);
    });
  });

  /* ========== 5. CAROUSEL ========== */
  const buildCarousel = (photos, label) => {
    const n = photos.length;
    const loop = n > 1;
    let pos = loop ? 1 : 0;            // track position (with clones: 0 = copy of last, n+1 = copy of first)
    let busy = false;
    const track = h('div', { class: 'carousel-track' });
    const root = h('div', { class: 'carousel', role: 'group', 'aria-roledescription': 'carousel', 'aria-label': `${label} photos` }, track);
    const ratios = new Array(n);
    const cur = () => (loop ? (pos - 1 + n) % n : 0);
    // the frame takes the aspect ratio of the photo on screen: no cropping, no empty bars
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

    // endless: after sliding onto a clone, silently jump to the real photo
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
      else window.setTimeout(() => { if (busy) settle(); }, 520); // safety net if transitionend never fires
    };
    root._go = go;

    if (loop) {
      root.append(
        h('button', { class: 'car-btn car-prev', type: 'button', 'aria-label': 'Previous photo', onclick: () => go(-1) }, '‹'),
        h('button', { class: 'car-btn car-next', type: 'button', 'aria-label': 'Next photo', onclick: () => go(1) }, '›')
      );
      // swipe
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

  /* ========== 6. YOUTUBE (iframe only after click) ========== */
  const embedUrl = (id) => `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
  const makeIframe = (id, title) => h('iframe', {
    src: embedUrl(id), title, allow: 'accelerometer; autoplay; encrypted-media; fullscreen; picture-in-picture',
    allowfullscreen: true, referrerpolicy: 'strict-origin-when-cross-origin'
  });

  /** Big player in a dialog (landscape or vertical). The YouTube player inside also has its own fullscreen button. */
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
  videoDialog.addEventListener('dialog:closed', () => { $('#vd-stage').replaceChildren(); });   // stops playback

  const EXPAND_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/></svg>';

  const buildVideo = (id, title, vertical = false) => {
    const frame = h('div', { class: `video-frame is-loading${vertical ? ' is-vertical' : ''}` });
    const stage = h('div', { class: 'video-stage' });
    // maxres thumbnails have no black bars; if one does not exist, fall back to the standard one
    const thumb = h('img', { src: `https://img.youtube.com/vi/${id}/${vertical ? 'maxresdefault' : 'hqdefault'}.jpg`, alt: `Video preview: ${title}`, loading: 'lazy', decoding: 'async' });
    const ready = () => frame.classList.remove('is-loading');
    thumb.addEventListener('load', () => {
      // YouTube answers a missing maxres image with a tiny 120x90 placeholder, so treat that as "missing"
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
      frame.classList.add('is-loading');                 // spinner until the player has loaded
      iframe.addEventListener('load', () => frame.classList.remove('is-loading'), { once: true });
      stage.replaceChildren(iframe);
      iframe.focus();
    });
    const expand = h('button', { class: 'video-expand', type: 'button', 'aria-label': `Expand video: ${title}`, title: 'Expand', html: EXPAND_ICON });
    expand.addEventListener('click', () => {
      stage.replaceChildren(poster);                     // stop the small player so two videos never play at once
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

  /* ========== 8. NAVIGATION (burger + scroll-spy) ========== */
  const initNav = () => {
    const nav = $('#site-nav');
    const burger = $('#burger');
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

    // Anchor offset for the sticky header
    $$('main section[id]').forEach((s) => { s.style.scrollMarginTop = 'var(--header-h)'; });

    const links = new Map($$('[data-spy]', nav).map((a) => [a.dataset.spy, a]));
    const alias = { planned: 'about' }; // "Planned vs Achieved" belongs to About in the menu
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
    $('#hero-eyebrow').textContent = D.event.subtitle;
    $('#hero-title').textContent = D.event.title;
    $('#hero-sub').textContent = `${D.event.subtitle} | ${D.event.place} | ${D.event.dates}`;
    $('#hero-desc').textContent = D.event.description;
    $('#hero-badge').textContent = 'Home of the AI & Youth Ambassadors Network';
    const list = $('#flag-list');
    D.countries.forEach((c) => {
      list.append(h('li', { class: 'flag-item' }, flag(c.id), h('span', { class: 'flag-name' }, c.name)));
    });

    // optional hero photo: only added when the file really exists
    const media = $('#hero-media');
    probe('images/hero/hero.jpg').then((ok) => {
      if (!ok) return;
      media.insertBefore(h('img', { class: 'hero-bg-img', src: 'images/hero/hero.jpg', alt: '', decoding: 'async' }), media.firstChild);
      media.classList.add('has-image');
    });

    initNetwork();
  };

  /** Light "neural network" canvas animation */
  const initNetwork = () => {
    const canvas = $('#hero-canvas');
    const ctx = canvas.getContext && canvas.getContext('2d');
    if (!ctx) return;
    let w = 0; let ht = 0; let dots = []; let raf = 0; let visible = true;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      w = r.width; ht = r.height;
      canvas.width = w * dpr; canvas.height = ht * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.max(22, Math.min(70, Math.round((w * ht) / 22000)));
      dots = Array.from({ length: count }, () => ({
        x: Math.random() * w, y: Math.random() * ht,
        vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35
      }));
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, ht);
      for (const d of dots) {
        if (!reduceMotion) {
          d.x += d.vx; d.y += d.vy;
          if (d.x < 0 || d.x > w) d.vx *= -1;
          if (d.y < 0 || d.y > ht) d.vy *= -1;
        }
        ctx.beginPath(); ctx.arc(d.x, d.y, 1.8, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(34,211,238,.8)'; ctx.fill();
      }
      for (let a = 0; a < dots.length; a += 1) {
        for (let b = a + 1; b < dots.length; b += 1) {
          const dx = dots[a].x - dots[b].x; const dy = dots[a].y - dots[b].y;
          const dist = Math.hypot(dx, dy);
          if (dist < 130) {
            ctx.strokeStyle = `rgba(120,170,255,${(1 - dist / 130) * 0.35})`;
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(dots[a].x, dots[a].y); ctx.lineTo(dots[b].x, dots[b].y); ctx.stroke();
          }
        }
      }
    };

    const loop = () => { draw(); if (visible && !reduceMotion) raf = requestAnimationFrame(loop); };
    resize(); draw();                       // reduced motion: one static frame only
    if (reduceMotion) { window.addEventListener('resize', () => { resize(); draw(); }); return; }
    loop();
    let t = 0;
    window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(resize, 200); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => {
        visible = e.isIntersecting;
        if (visible) { cancelAnimationFrame(raf); loop(); } else cancelAnimationFrame(raf);
      }).observe(canvas);
    }
  };

  /* ========== 10. ABOUT & PLANNED vs ACHIEVED ========== */
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

  /* ========== 11. PROGRAMME (7 days + modal) ========== */
  const modal = $('#modal');
  const modalBody = $('#modal-body');
  let renderToken = 0;

  /** Programme: one small card per day = date, title, short description, aim, activities and a small photo slider */
  const renderDays = () => {
    const wrap = $('#days');
    D.days.forEach((d) => {
      const media = h('div', { class: 'day-media' });
      const li = h('li', { class: 'card day reveal' },
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
  };

  const modalHead = (metaText, title, meta2) => h('header', { class: 'modal-head' },
    h('p', { class: 'modal-meta' }, metaText),
    h('h2', { id: 'modal-title', tabindex: '-1', text: title }),
    meta2 ? h('p', { class: 'modal-meta', text: meta2 }) : null);

  /** Fills a modal with photo carousel (if any) + video (if any); async-safe via token */
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
    const r = 15.9155; // circumference = 100 so dasharray values are percentages

    $('#donut-card').append(
      h('h3', { text: 'Inclusion' }),
      h('div', { class: 'donut', role: 'img', 'aria-label': `At least ${P.fewerOpportunities.percent}% of participants (${P.fewerOpportunities.people} of ${P.total}) are young people with fewer opportunities` },
        h('div', { html: `<svg viewBox="0 0 42 42" aria-hidden="true" focusable="false"><circle class="donut-track" cx="21" cy="21" r="${r}"/><circle class="donut-seg seg-a" cx="21" cy="21" r="${r}" pathLength="100"/></svg>` }),
        h('div', { class: 'donut-center' }, h('strong', { text: `${P.fewerOpportunities.percent}%+` }), h('span', { text: `${P.fewerOpportunities.people} of ${P.total}` }))),
      h('p', { class: 'donut-text', text: P.fewerOpportunities.text }));
    // flatten the wrapper div so the svg sits directly in .donut
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

  /* ========== 13. DOWNLOAD COUNTER (Firebase REST / localStorage fallback) ========== */
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
  // Fallback mode: start value + clicks from THIS browser only (the number is not shared between visitors).
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

  /** Called on every click of a brochure link. Never blocks or cancels the link itself. */
  const onBrochureClick = async () => {
    const last = parseInt(safeStorage.get(DL.STAMP) || '0', 10) || 0;
    if (Date.now() - last < 24 * 60 * 60 * 1000) return;   // already counted in the last 24h

    const before = DL.value;
    safeStorage.set(DL.STAMP, String(Date.now()));
    paintDownloads(before + 1, { pulse: true });            // optimistic UI: instant +1

    if (!DL.endpoint) {                                      // fallback mode: this browser only
      safeStorage.set(DL.LOCAL, String(DL.localClicks() + 1));
      return;
    }
    try {
      const res = await fetch(DL.endpoint, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ '.sv': { increment: 1 } })    // atomic server-side increment
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const v = await res.json();
      if (typeof v === 'number') paintDownloads(v);
    } catch (err) {
      console.error('[downloads] increment failed, reverting counter:', err);
      safeStorage.remove(DL.STAMP);                          // allow a retry later
      paintDownloads(before);                                // revert silently; the download still opens
    }
  };

  const downloadBadge = () => h('span', { class: 'dl-count' }, '⬇ ',
    h('span', { class: 'count-badge', 'data-download-count': '' }, fmt(DL.value)), ' downloads');

  const brochureLink = (cls, text, withBadge) => {
    const a = h('a', { class: cls, href: D.links.brochure, target: '_blank', rel: 'noopener', 'data-brochure': '' }, text);
    a.addEventListener('click', onBrochureClick);   // no preventDefault: the link always opens
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

    // counters run once when they enter the viewport
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
    const total = D.countries.reduce((sum, c) => sum + c.people, 0);
    if (total !== 211) console.warn(`Country totals add up to ${total}, expected 211`);
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
      const places = c.events.map((e) => e.place).join(' · ');
      const card = h('article', { class: 'card card-hover country reveal', id: `country-${c.id}` },
        h('div', { class: 'country-top' },
          h('span', { class: 'country-flag' }, flag(c.id)),
          h('h3', { text: c.name }),
          h('div', { class: 'country-people' }, String(c.people), h('small', { text: 'people reached' }))),
        h('p', { class: 'country-place', text: places }),
        h('p', { class: 'country-text', text: c.events[0].text }),
        btn);
      card.addEventListener('click', (e) => { if (e.target !== btn) btn.click(); });
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
    modalBody.replaceChildren(
      modalHead([flag(c.id), ' Local impact'], c.name, `${c.people} people reached`),
      h('section', { class: 'modal-section' }, h('h3', { text: 'Local events' }),
        h('div', { class: 'event-list' }, c.events.map((e) => h('div', { class: 'event' },
          h('h4', { text: e.place }),
          e.people ? h('p', { class: 'ev-people', text: `${e.people} people` }) : null,
          h('p', { text: e.text }))))),
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
    let list = []; let idx = 0; let thumbs = [];

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
          // smooth scale-up from the thumbnail position (FLIP)
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
      // preload neighbours
      [list[(idx + 1) % list.length], list[(idx - 1 + list.length) % list.length]].forEach((s) => { const p = new Image(); p.src = s; });
    };

    const step = (dir) => { if (list.length < 2) return; idx = (idx + dir + list.length) % list.length; show(null); };
    $('#lb-prev').addEventListener('click', () => step(-1));
    $('#lb-next').addEventListener('click', () => step(1));

    // swipe
    let x0 = null;
    el.addEventListener('pointerdown', (e) => { x0 = e.clientX; });
    el.addEventListener('pointerup', (e) => {
      if (x0 == null) return;
      const dx = e.clientX - x0; x0 = null;
      if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
    });

    el.addEventListener('dialog:closed', () => { img.removeAttribute('src'); });

    const open = (photos, start, thumbEl) => {
      list = photos; idx = start; thumbs = [thumbEl];
      const single = list.length < 2;
      $('#lb-prev').hidden = single; $('#lb-next').hidden = single;
      openDialog(el, thumbEl);
      show(thumbEl);
    };
    return { open, step };
  })();

  const renderGallery = () => {
    const grid = $('#gallery-grid');
    const photos = [];   // the gallery array: site photos first, then photos added with the button
    let searching = true;  // while true, empty grid shows loading tiles instead of text

    const placeholder = () => h('div', { class: 'placeholder' }, h('span', { 'aria-hidden': 'true' }, '📷'), h('strong', { text: 'Photos coming soon' }), h('span', { class: 'note', text: 'The exchange photos will appear here.' }));

    const draw = () => {
      grid.replaceChildren();
      if (!photos.length) {
        grid.classList.remove('has-photos');
        if (searching) grid.append(...[1.5, 0.75, 1.5, 1.5, 0.75, 1.5, 1.5, 0.75].map((r) => h('div', { class: 'gallery-skel', 'aria-hidden': 'true', style: `aspect-ratio:${r}` })));
        else grid.append(placeholder());
        return;
      }
      grid.classList.add('has-photos');
      photos.forEach((src, i) => {
        const btn = h('button', { class: 'gallery-item', type: 'button', 'aria-label': `Open photo ${i + 1} of ${photos.length}` },
          safeImg(src, `${ALT_PREFIX} - Gallery - Photo ${i + 1}`, true));
        btn.addEventListener('click', () => lightbox.open(photos, i, btn));
        grid.append(btn);
      });
    };
    draw();

    const start = async () => {
      const found = await loadPhotos(D.gallery.folder, D.gallery.photoMax, D.gallery.photos);
      searching = false;
      photos.unshift(...found);
      draw();
    };

    // search for photos only when the section is about to be seen (saves requests)
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

  /* ========== 18. OUTPUTS ========== */
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

  /* ========== 19. SUSTAINABILITY, PARTNERS, RESOURCES, FOOTER ========== */
  const renderContacts = () => {
    $('#contacts-lead').textContent = D.contactsLead;
    const list = $('#partners');
    D.partners.forEach((p) => {
      const li = h('li', { class: 'partner' + (p.url ? ' partner-link' : '') });
      const inner = p.url
        ? h('a', { href: p.url, target: '_blank', rel: 'noopener noreferrer', 'aria-label': `${p.name} — Instagram`, title: p.name })
        : li;
      if (p.logo) {
        if (!p.url) { li.setAttribute('aria-label', p.name); li.title = p.name; }
        inner.append(safeImg(p.logo, `${p.name} logo`, true));
      } else inner.textContent = p.name;
      if (p.url) li.append(inner);
      list.append(li);
    });
    $('#contacts-grid').append(...D.contacts.map((c) => h('article', { class: 'card contact reveal' },
      h('h4', { text: c.name }),
      h('a', { href: `mailto:${c.email}` }, `✉ ${c.email}`),
      h('a', { href: `tel:${c.phone}` }, `☎ ${c.phoneText || c.phone}`))));
  };

  const renderFooter = () => {
    $('#disclaimer').textContent = D.footer.disclaimer;

    // Erasmus+ logo: if the file is missing, show a text placeholder
    const logo = $('#erasmus-logo');
    const fallback = $('#erasmus-fallback');
    const swap = () => { logo.hidden = true; fallback.hidden = false; };
    logo.addEventListener('error', swap, { once: true });
    if (logo.complete && logo.naturalWidth === 0) swap();
  };

  /* ========== 20. INIT ========== */
  const init = () => {
    initTheme();
    initNav();
    renderHero();
    renderAbout();
    renderProgress();
    renderDays();
    renderParticipants();
    renderImpact();
    renderCountries();
    renderGallery();
    renderVideos();
    renderNetwork();
    renderContacts();
    renderFooter();
    observeReveal();
    initDownloads();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
