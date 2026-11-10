/* =====================================================================
   feedback.js — sends the Contacts form to Formspree without leaving the page
   Endpoint is taken from the form's action attribute.
   ===================================================================== */
(() => {
  'use strict';
  const form = document.getElementById('feedback-form');
  if (!form) return;

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
})();
