/* Appointment booking: department → doctor → date → live slots → patient details. */
(function () {
  'use strict';
  const form = document.getElementById('booking-form');
  if (!form) return;
  const cfg = window.APP;
  const L = (f) => (f && typeof f === 'object' ? f[cfg.lang] || f.en : f);
  const dept = form.elements.department;
  const doctorSel = form.elements.doctorChoice;
  const date = form.elements.date;
  const slotsEl = document.getElementById('slots');
  const status = form.querySelector('.form-status');
  let doctors = [];

  // Riyadh "today" (UTC+3) as min date; allow booking up to 60 days ahead.
  const riyadh = new Date(Date.now() + 3 * 3600e3);
  const iso = (d) => d.toISOString().slice(0, 10);
  date.min = iso(riyadh);
  date.max = iso(new Date(riyadh.getTime() + 60 * 86400e3));

  const sum = (k, v) => { const el = document.querySelector(`[data-sum="${k}"]`); if (el) el.textContent = v || '—'; };

  async function loadDoctors() {
    const res = await fetch('/api/doctors' + (dept.value ? '?dept=' + encodeURIComponent(dept.value) : ''));
    doctors = await res.json();
    const pre = doctorSel.dataset.pre;
    doctorSel.innerHTML = '';
    doctorSel.add(new Option(cfg.i18n.anyDoctor, ''));
    doctors.forEach((d) => doctorSel.add(new Option(`${L(d.name)} · ${L(d.title)}`, d.slug)));
    if (pre && doctors.some((d) => d.slug === pre)) {
      doctorSel.value = pre;
      doctorSel.dataset.pre = '';
    }
    sum('department', dept.selectedIndex > 0 ? dept.options[dept.selectedIndex].text : '');
    sum('doctor', doctorSel.value ? L(doctors.find((d) => d.slug === doctorSel.value).name) : cfg.i18n.anyDoctor);
  }

  function clearSelection() {
    form.elements.doctor.value = '';
    form.elements.time.value = '';
    sum('time', '');
  }

  async function loadSlots() {
    clearSelection();
    if (!date.value || (!dept.value && !doctorSel.value)) {
      slotsEl.innerHTML = `<p class="muted">${cfg.i18n.pickDate}</p>`;
      return;
    }
    sum('date', new Date(date.value + 'T12:00:00').toLocaleDateString(cfg.lang === 'ar' ? 'ar-SA-u-ca-gregory' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' }));
    slotsEl.innerHTML = `<p class="muted">${cfg.i18n.loadingSlots}</p>`;
    const q = new URLSearchParams({ date: date.value });
    if (doctorSel.value) q.set('doctor', doctorSel.value);
    else q.set('dept', dept.value);
    try {
      const res = await fetch('/api/slots?' + q);
      const data = await res.json();
      slotsEl.innerHTML = '';
      if (!data.ok || !data.doctors.length) {
        slotsEl.innerHTML = `<p class="muted">${cfg.i18n.noSlots}</p>`;
        return;
      }
      data.doctors.forEach((d) => {
        const info = doctors.find((x) => x.slug === d.doctor);
        const head = document.createElement('div');
        head.className = 'slot-group';
        if (info) {
          const img = document.createElement('img');
          img.src = info.photo.replace(/w=\d+&h=\d+/, 'w=80&h=80');
          img.alt = '';
          window.guardImage(img);
          head.appendChild(img);
        }
        head.appendChild(document.createTextNode(L(d.name)));
        slotsEl.appendChild(head);
        d.slots.forEach((t) => {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'slot';
          b.setAttribute('role', 'radio');
          b.setAttribute('aria-checked', 'false');
          b.textContent = t;
          b.dataset.doctor = d.doctor;
          b.dataset.name = L(d.name);
          slotsEl.appendChild(b);
        });
      });
    } catch (_) {
      slotsEl.innerHTML = `<p class="muted">${cfg.i18n.error}</p>`;
    }
  }

  slotsEl.addEventListener('click', (e) => {
    const b = e.target.closest('.slot');
    if (!b) return;
    slotsEl.querySelectorAll('.slot').forEach((x) => x.setAttribute('aria-checked', 'false'));
    b.setAttribute('aria-checked', 'true');
    form.elements.doctor.value = b.dataset.doctor;
    form.elements.time.value = b.textContent;
    sum('doctor', b.dataset.name);
    sum('time', b.textContent);
    slotsEl.removeAttribute('aria-invalid');
  });

  dept.addEventListener('change', async () => { await loadDoctors(); loadSlots(); });
  doctorSel.addEventListener('change', () => {
    sum('doctor', doctorSel.value ? doctorSel.options[doctorSel.selectedIndex].text.split(' · ')[0] : cfg.i18n.anyDoctor);
    loadSlots();
  });
  date.addEventListener('change', loadSlots);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const { formData, showErrors, refreshCaptcha } = window.formKit;
    status.className = 'form-status';
    status.textContent = '';
    if (!form.elements.time.value) {
      slotsEl.setAttribute('aria-invalid', 'true');
      status.className = 'form-status err';
      status.textContent = cfg.i18n.pickDate;
      slotsEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    const btn = form.querySelector('button[type=submit]');
    const label = btn.innerHTML;
    btn.disabled = true;
    btn.textContent = cfg.i18n.sending;
    try {
      const { body } = await window.postJSON(form.action, formData(form));
      refreshCaptcha(form, body.captcha);
      if (body.ok) {
        form.hidden = true;
        document.querySelector('.book-side').hidden = true;
        const ok = document.getElementById('booking-success');
        ok.querySelector('.js-ref').textContent = body.ref;
        ok.querySelector('.js-details').textContent = `${body.doctor} · ${body.date} · ${body.time}`;
        ok.querySelector('.js-fee').textContent = (cfg.lang === 'ar' ? body.fee + ' ريال' : 'SAR ' + body.fee);
        ok.hidden = false;
        ok.focus();
        window.scrollTo({ top: ok.offsetTop - 120, behavior: 'smooth' });
        if (window.gtag) window.gtag('event', 'book_appointment', { department: dept.value });
      } else {
        status.className = 'form-status err';
        status.textContent = body.error || cfg.i18n.error;
        showErrors(form, body.errors || (body.field ? { [body.field]: 'invalid' } : {}));
        if (body.field === 'time') loadSlots();
      }
    } catch (_) {
      status.className = 'form-status err';
      status.textContent = cfg.i18n.error;
    } finally {
      btn.disabled = false;
      btn.innerHTML = label;
    }
  });

  // Initialise: if a doctor was preselected (e.g. from a profile page) set its department first.
  (async function init() {
    const pre = doctorSel.dataset.pre;
    if (pre && !dept.value) {
      const all = await (await fetch('/api/doctors')).json();
      const d = all.find((x) => x.slug === pre);
      if (d) dept.value = d.department;
    }
    await loadDoctors();
    const nextDay = new Date(riyadh.getTime() + 86400e3);
    date.value = iso(nextDay);
    loadSlots();
  })();
})();
