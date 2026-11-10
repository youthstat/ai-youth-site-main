/* =====================================================================
   feedback.js — sends the Contacts form to Formspree without leaving the page
   - Endpoint is taken from the form's action attribute.
   - Also animates the "flying digits" canvas inside the form window.
   ===================================================================== */
(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ==========================================================
     1) FLYING DIGITS INSIDE THE FORM WINDOW
     ========================================================== */
  const initFeedbackCanvas = () => {
    const canvas = document.getElementById('fb-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext && canvas.getContext('2d');
    if (!ctx) return;
    const host = canvas.closest('.fb-side') || canvas;

    const GLYPHS = ['0', '1', '0', '1', '0', '1', '0', '1', '01', '10', '00', '11', '101', '010',
      '{ }', '</>', '=>', 'AI', '0x1F', '//', '[ ]'];
    const COLORS = [
      ['197,134,192', 0.60], ['197,134,192', 0.60], ['197,134,192', 0.50],
      ['206,145,120', 0.45],
      ['220,220,170', 0.42],
      ['74,222,128', 0.32],
      ['128,128,128', 0.45]
    ];
    const FONT = '"JetBrains Mono", "Space Mono", ui-monospace, monospace';
    if (document.fonts && document.fonts.load) document.fonts.load(`500 16px ${FONT}`).catch(() => {});

    let w = 0, ht = 0, dots = [], raf = 0, visible = true;
    const ptr = { x: -999, y: -999 };
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rnd = (a, b) => a + Math.random() * (b - a);

    const make = (anywhere) => {
      const [rgb, a] = COLORS[Math.floor(Math.random() * COLORS.length)];
      const depth = Math.random();
      return {
        x: rnd(0, w), y: anywhere ? rnd(0, ht) : ht + rnd(10, 60),
        g: GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
        s: 9 + depth * 13,
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
      const count = Math.max(14, Math.min(46, Math.round((w * ht) / 11000)));
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
        const edge = Math.max(0, Math.min(1, Math.min(p.y, ht - p.y) / (ht * 0.20)));
        const dx = p.x - ptr.x; const dy = p.y - ptr.y;
        const d = Math.hypot(dx, dy);
        const near = d < 100 ? 1 - d / 100 : 0;
        const ox = near ? (dx / (d || 1)) * near * 14 : 0;
        const oy = near ? (dy / (d || 1)) * near * 14 : 0;
        const alpha = Math.min(1, (p.a + near * 0.45) * edge);
        if (alpha < 0.02) continue;
        ctx.font = `500 ${p.s}px ${FONT}`;
        ctx.fillStyle = `rgba(${p.rgb},${alpha.toFixed(3)})`;
        ctx.fillText(p.g, p.x + ox, p.y + oy);
      }
    };

    const loop = (t) => { draw(t); if (visible && !reduceMotion) raf = requestAnimationFrame(loop); };

    host.addEventListener('pointermove', (e) => {
      const r = canvas.getBoundingClientRect();
      ptr.x = e.clientX - r.left; ptr.y = e.clientY - r.top;
    });
    host.addEventListener('pointerleave', () => { ptr.x = -999; ptr.y = -999; });

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

  /* ==========================================================
     2) FORM SUBMIT (Formspree, no page reload)
     ========================================================== */
  const form = document.getElementById('feedback-form');
  if (!form) { initFeedbackCanvas(); return; }

  const btn = document.getElementById('fb-submit');
  const status = document.getElementById('fb-status');
  const label = btn.textContent;

  const say = (text, kind) => {
    status.textContent = text;
    status.className = 'fb-status' + (kind ? ` is-${kind}` : '');
  };
  const clearErrors = () => {
    form.querySelectorAll('[data-err]').forEach((el) => { el.textContent = ''; });
    form.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
  };
  const fieldError = (name, text) => {
    const box = form.querySelector(`[data-err="${name}"]`);
    const input = form.elements[name];
    if (box) box.textContent = text;
    if (input) input.setAttribute('aria-invalid', 'true');
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();
    say('');

    // simple client-side check (safe even if a field is missing)
    const emailEl   = form.elements.email;
    const messageEl = form.elements.message;
    const email     = emailEl   ? emailEl.value.trim()   : '';
    const message   = messageEl ? messageEl.value.trim() : '';

    let bad = false;
    if (emailEl && !/^\S+@\S+\.\S+$/.test(email)) {
      fieldError('email', 'Please enter a valid email.');
      bad = true;
    }
    if (!message) {
      fieldError('message', 'Please write a message.');
      bad = true;
    }
    if (bad) {
      const firstBad = form.querySelector('[aria-invalid="true"]');
      if (firstBad) firstBad.focus();
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Sending...';
    try {
      const res = await fetch(form.action, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: new FormData(form)
      });
      if (res.ok) {
        form.reset();
        say('Thank you for filling the form. Your message was sent.', 'ok');
      } else {
        const data = await res.json().catch(() => ({}));
        if (Array.isArray(data.errors) && data.errors.length) {
          data.errors.forEach((er) => {
            if (er.field) fieldError(er.field, er.message);
          });
          say(data.errors.map((er) => er.message).join(' '), 'error');
        } else {
          say('Something went wrong. Please try again later.', 'error');
        }
      }
    } catch (err) {
      console.error('[feedback] send failed:', err);
      say('No connection. Please check your internet and try again.', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = label;
    }
  });

  /* ==========================================================
     3) START THE CANVAS
     ========================================================== */
  initFeedbackCanvas();
})();
