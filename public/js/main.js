/* Site-wide behaviour: navigation, modals, chat assistant, AJAX forms, image fallbacks. */
(function () {
  'use strict';
  const cfg = JSON.parse(document.getElementById('app-config').textContent);
  window.APP = cfg;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));

  // ---------- Image fallback (if a remote photo fails to load) ----------
  const FALLBACK = '/img/fallback.svg';
  function guard(img) {
    const swap = () => { if (!img.src.endsWith(FALLBACK)) { img.srcset = ''; img.src = FALLBACK; img.classList.add('img-fallback'); } };
    if (img.complete && img.naturalWidth === 0 && img.src) swap();
    img.addEventListener('error', swap, { once: true });
  }
  $$('img').forEach(guard);
  window.guardImage = guard;

  // ---------- Mobile nav ----------
  const navToggle = $('.nav-toggle');
  const nav = $('#main-nav');
  if (navToggle && nav) {
    navToggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', String(open));
    });
  }
  $$('.sub-toggle').forEach((btn) =>
    btn.addEventListener('click', () => {
      const sub = btn.nextElementSibling;
      const open = sub.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(open));
    })
  );

  // ---------- Dialogs (emergency modal, chat panel) ----------
  let lastFocus = null;
  function openPanel(id) {
    const el = document.getElementById(id);
    if (!el) return;
    lastFocus = document.activeElement;
    el.hidden = false;
    $$(`[data-open="${id}"]`).forEach((b) => b.setAttribute('aria-expanded', 'true'));
    const focusable = el.querySelector('input:not([type=hidden]):not(.hp), button, a[href]');
    if (focusable) setTimeout(() => focusable.focus(), 30);
    if (el.classList.contains('modal')) document.body.style.overflow = 'hidden';
  }
  function closePanel(el) {
    el.hidden = true;
    $$(`[data-open="${el.id}"]`).forEach((b) => b.setAttribute('aria-expanded', 'false'));
    document.body.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  }
  document.addEventListener('click', (e) => {
    const opener = e.target.closest('[data-open]');
    if (opener) {
      e.preventDefault();
      const target = document.getElementById(opener.dataset.open);
      if (target && !target.hidden && !target.classList.contains('modal')) closePanel(target);
      else openPanel(opener.dataset.open);
      return;
    }
    const closer = e.target.closest('[data-close]');
    if (closer) closePanel(closer.closest('.modal, .chat-panel'));
    if (e.target.classList && e.target.classList.contains('modal')) closePanel(e.target);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    $$('.modal:not([hidden]), .chat-panel:not([hidden])').forEach(closePanel);
  });
  // Keep keyboard focus inside the open modal.
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const modal = $('.modal:not([hidden])');
    if (!modal) return;
    const items = $$('a[href], button, input:not([type=hidden]):not(.hp), select, textarea', modal).filter((x) => !x.disabled);
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  // ---------- JSON POST helper (CSRF header + language) ----------
  async function postJSON(url, data) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': cfg.csrf },
      credentials: 'same-origin',
      body: JSON.stringify({ ...data, lang: cfg.lang }),
    });
    let body = {};
    try { body = await res.json(); } catch (_) { /* non-JSON error */ }
    return { status: res.status, body };
  }
  window.postJSON = postJSON;

  function formData(form) {
    const out = {};
    new FormData(form).forEach((v, k) => { out[k] = v; });
    $$('input[type=checkbox]', form).forEach((c) => { out[c.name] = c.checked; });
    return out;
  }

  function showErrors(form, errors) {
    $$('[aria-invalid]', form).forEach((el) => el.removeAttribute('aria-invalid'));
    Object.keys(errors || {}).forEach((name) => {
      const el = form.elements[name];
      if (!el) return;
      const target = el.type === 'checkbox' ? el.closest('.check') : el;
      (target || el).setAttribute('aria-invalid', 'true');
    });
    const first = $('[aria-invalid="true"]', form);
    if (first && first.focus) first.focus();
  }

  function refreshCaptcha(form, q) {
    if (!q) return;
    $$('.js-captcha-q').forEach((el) => { el.textContent = q; }); // one challenge per session
    $$('input[name=captcha]').forEach((el) => { el.value = ''; });
  }
  window.formKit = { formData, showErrors, refreshCaptcha };

  $$('form.js-form').forEach((form) => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const status = $('.form-status', form);
      const btn = $('button[type=submit]', form);
      const label = btn.innerHTML;
      btn.disabled = true;
      btn.textContent = cfg.i18n.sending;
      status.className = 'form-status';
      status.textContent = '';
      try {
        const { body } = await postJSON(form.action, formData(form));
        refreshCaptcha(form, body.captcha);
        if (body.ok) {
          status.classList.add('ok');
          status.textContent = body.message;
          showErrors(form, {});
          form.reset();
          if (window.gtag) window.gtag('event', 'generate_lead', { form: form.getAttribute('action') });
        } else {
          status.classList.add('err');
          status.textContent = body.error || cfg.i18n.error;
          showErrors(form, body.errors || (body.field ? { [body.field]: 'invalid' } : {}));
        }
      } catch (_) {
        status.classList.add('err');
        status.textContent = cfg.i18n.error;
      } finally {
        btn.disabled = false;
        btn.innerHTML = label;
      }
    });
  });

  // ---------- Ambulance: attach geolocation ----------
  const geoBtn = $('.js-geo');
  if (geoBtn) {
    geoBtn.addEventListener('click', () => {
      if (!navigator.geolocation) return;
      geoBtn.disabled = true;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const f = geoBtn.form;
          f.elements.lat.value = pos.coords.latitude.toFixed(6);
          f.elements.lng.value = pos.coords.longitude.toFixed(6);
          geoBtn.textContent = '✓ ' + geoBtn.dataset.done;
        },
        () => { geoBtn.disabled = false; },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }

  // ---------- Auto-submit filters ----------
  $$('.js-autosubmit').forEach((el) => el.addEventListener('change', () => el.form.submit()));

  // ---------- Careers: pre-select role ----------
  $$('.js-apply').forEach((a) =>
    a.addEventListener('click', () => {
      const sel = document.getElementById('j-job');
      if (sel) sel.value = a.dataset.job;
    })
  );

  // ---------- Chat assistant ----------
  const chat = $('#chat-panel');
  if (chat) {
    const log = $('.chat-log', chat);
    const form = $('.chat-form', chat);
    const input = $('#chat-input');
    const add = (text, cls) => {
      const div = document.createElement('div');
      div.className = 'msg ' + cls;
      div.textContent = text;
      log.appendChild(div);
      log.scrollTop = log.scrollHeight;
      return div;
    };
    async function ask(q) {
      add(q, 'user');
      const typing = add('…', 'bot typing');
      try {
        const { body } = await postJSON('/api/chat', { message: q });
        typing.remove();
        if (!body.ok) return add(body.error || cfg.i18n.error, 'bot');
        add(body.reply, body.urgent ? 'bot urgent' : 'bot');
        if (body.actions && body.actions.length) {
          const chips = document.createElement('div');
          chips.className = 'chips';
          body.actions.forEach((a) => {
            const link = document.createElement('a');
            link.textContent = a.label;
            link.href = a.url;
            if (/^https?:/.test(a.url)) { link.target = '_blank'; link.rel = 'noopener'; }
            chips.appendChild(link);
          });
          log.appendChild(chips);
          log.scrollTop = log.scrollHeight;
        }
      } catch (_) {
        typing.remove();
        add(cfg.i18n.error, 'bot');
      }
    }
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = input.value.trim();
      if (!q) return;
      input.value = '';
      ask(q);
    });
    chat.addEventListener('click', (e) => {
      const chip = e.target.closest('button[data-q]');
      if (chip) ask(chip.dataset.q);
    });
  }
})();
