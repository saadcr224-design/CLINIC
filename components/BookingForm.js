'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Icon } from './Icons';
import SmartImage from './SmartImage';
import AjaxForm, { Captcha } from './AjaxForm';

// Riyadh "today" (UTC+3); bookings open up to 60 days ahead.
const riyadhDate = (offsetDays = 0) => new Date(Date.now() + 3 * 3600e3 + offsetDays * 86400e3).toISOString().slice(0, 10);
const prettyDate = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

export default function BookingForm({ departments, providers, preDoctor, preDept, bookingImage, whatsapp }) {
  const [allDoctors, setAllDoctors] = useState([]);
  const [dept, setDept] = useState(preDept || '');
  const [doctor, setDoctor] = useState(preDoctor || '');
  const [date, setDate] = useState(riyadhDate(1));
  const [slots, setSlots] = useState({ state: 'idle', doctors: [] });
  const [choice, setChoice] = useState(null); // { doctor, name, time }
  const [done, setDone] = useState(null);
  const [slotError, setSlotError] = useState(false);
  const slotsRef = useRef(null);

  useEffect(() => {
    fetch('/api/doctors').then((r) => r.json()).then((list) => {
      setAllDoctors(list);
      const pre = list.find((d) => d.slug === preDoctor);
      if (pre) setDept(pre.department);
    });
  }, [preDoctor]);

  const doctors = useMemo(() => allDoctors.filter((d) => !dept || d.department === dept), [allDoctors, dept]);
  const deptName = departments.find((d) => d.slug === dept)?.name;

  useEffect(() => {
    setChoice(null);
    if (!date || (!dept && !doctor)) { setSlots({ state: 'idle', doctors: [] }); return undefined; }
    const ctrl = new AbortController();
    setSlots({ state: 'loading', doctors: [] });
    const q = new URLSearchParams({ date, ...(doctor ? { doctor } : { dept }) });
    fetch(`/api/slots?${q}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((data) => setSlots({ state: data.ok && data.doctors.length ? 'ready' : 'empty', doctors: data.doctors || [] }))
      .catch((e) => { if (e.name !== 'AbortError') setSlots({ state: 'error', doctors: [] }); });
    return () => ctrl.abort();
  }, [dept, doctor, date]);

  function transform(data) {
    if (!choice) {
      setSlotError(true);
      slotsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return { __error: 'Please choose an available time.' };
    }
    return { ...data, doctor: choice.doctor, time: choice.time };
  }

  if (done) {
    return (
      <div className="card success-card" tabIndex={-1} ref={(el) => el?.focus()}>
        <span className="success-icon"><Icon name="check" /></span>
        <h2>Your appointment is booked</h2>
        <p>We have sent the details to your phone and email. Your reference number is <strong>{done.ref}</strong></p>
        <p>{done.doctor} · {prettyDate(done.date)} · {done.time}</p>
        <p className="muted">Consultation fee: <strong>SAR {done.fee}</strong> · Pay at the clinic or online after confirmation. Insured patients pay their co-pay only.</p>
        <div className="btn-row"><Link className="btn btn-primary" href="/">Home</Link><Link className="btn btn-outline" href="/portal">Patient Portal</Link></div>
      </div>
    );
  }

  return (
    <div className="book-grid">
      <AjaxForm
        action="/api/appointments"
        captcha
        className="card booking-form"
        transform={transform}
        onSuccess={(body) => { setDone(body); window.scrollTo({ top: 0, behavior: 'smooth' }); if (window.gtag) window.gtag('event', 'book_appointment', { department: dept }); }}
      >
        <fieldset>
          <legend><span className="step">1</span>Department &amp; doctor</legend>
          <div className="row-2">
            <div className="field">
              <label htmlFor="b-dept">Department *</label>
              <select id="b-dept" name="department" required value={dept} onChange={(e) => { setDept(e.target.value); setDoctor(''); }}>
                <option value="">Choose a department</option>
                {departments.map((d) => <option key={d.slug} value={d.slug}>{d.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="b-doctor">Doctor</label>
              <select id="b-doctor" name="doctorChoice" value={doctor} onChange={(e) => setDoctor(e.target.value)}>
                <option value="">First available doctor</option>
                {doctors.map((d) => <option key={d.slug} value={d.slug}>{d.name} · {d.title}</option>)}
              </select>
            </div>
          </div>
          <div className="field">
            <span className="label">Visit type</span>
            <div className="segmented">
              <label><input type="radio" name="visitType" value="clinic" defaultChecked /><span><Icon name="pin" />In-clinic visit</span></label>
              <label><input type="radio" name="visitType" value="video" /><span><Icon name="video" />Video consultation</span></label>
            </div>
          </div>
        </fieldset>

        <fieldset>
          <legend><span className="step">2</span>Date &amp; time</legend>
          <div className="field">
            <label htmlFor="b-date">Preferred date *</label>
            <input id="b-date" type="date" name="date" required min={riyadhDate(0)} max={riyadhDate(60)} value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="field">
            <span className="label" id="slots-label">Available times *</span>
            <div className="slots" ref={slotsRef} role="radiogroup" aria-labelledby="slots-label" aria-invalid={slotError || undefined}>
              {slots.state === 'idle' && <p className="muted">Select a department or doctor and a date to see available times.</p>}
              {slots.state === 'loading' && <p className="muted">Loading available times…</p>}
              {slots.state === 'empty' && <p className="muted">No times available on this day. Please choose another date.</p>}
              {slots.state === 'error' && <p className="muted">Could not load times. Please try again.</p>}
              {slots.state === 'ready' && slots.doctors.map((d) => {
                const info = allDoctors.find((x) => x.slug === d.doctor);
                return [
                  <div className="slot-group" key={`h-${d.doctor}`}>
                    {info && <SmartImage portrait src={info.photo.replace(/w=\d+&h=\d+/, 'w=80&h=80')} alt="" width="34" height="34" />}
                    {d.name}
                  </div>,
                  ...d.slots.map((time) => {
                    const on = choice && choice.doctor === d.doctor && choice.time === time;
                    return (
                      <button key={`${d.doctor}-${time}`} type="button" className="slot" role="radio" aria-checked={!!on}
                        onClick={() => { setChoice({ doctor: d.doctor, name: d.name, time }); setSlotError(false); }}>
                        {time}
                      </button>
                    );
                  }),
                ];
              })}
            </div>
          </div>
        </fieldset>

        <fieldset>
          <legend><span className="step">3</span>Your details</legend>
          <div className="row-2">
            <div className="field"><label htmlFor="b-name">Full name *</label><input id="b-name" name="name" required autoComplete="name" maxLength={80} /></div>
            <div className="field"><label htmlFor="b-phone">Mobile number *</label><input id="b-phone" name="phone" type="tel" required autoComplete="tel" inputMode="tel" placeholder="05XXXXXXXX" maxLength={20} /></div>
            <div className="field"><label htmlFor="b-email">Email</label><input id="b-email" name="email" type="email" autoComplete="email" maxLength={254} /></div>
            <div className="field"><label htmlFor="b-nid">National ID / Iqama *</label><input id="b-nid" name="nationalId" required inputMode="numeric" pattern="[12][0-9]{9}" maxLength={10} autoComplete="off" /></div>
            <div className="field"><label htmlFor="b-dob">Date of birth</label><input id="b-dob" name="dob" type="date" autoComplete="bday" /></div>
            <div className="field">
              <label htmlFor="b-ins">Insurance provider</label>
              <select id="b-ins" name="insurance" defaultValue="self-pay">
                <option value="self-pay">Self-pay (no insurance)</option>
                {providers.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className="field"><label htmlFor="b-reason">Reason for visit <small>(optional)</small></label><textarea id="b-reason" name="reason" rows={3} maxLength={500} /></div>
          <label className="check"><input type="checkbox" name="reminders" defaultChecked /><span>Send me appointment reminders on WhatsApp</span></label>
          <label className="check"><input type="checkbox" name="consent" required /><span>I agree to the Privacy Policy and consent to the processing of my health data to manage my appointment. <Link href="/privacy" target="_blank">Privacy Policy</Link></span></label>
          <Captcha id="b" />
        </fieldset>
        <button className="btn btn-primary btn-lg btn-block" type="submit"><Icon name="check" />Confirm appointment</button>
      </AjaxForm>

      <aside className="book-side">
        <div className="card summary-card" aria-live="polite">
          <h2>Summary</h2>
          <dl>
            <div><dt>Department</dt><dd>{deptName || '—'}</dd></div>
            <div><dt>Doctor</dt><dd>{choice ? choice.name : (allDoctors.find((d) => d.slug === doctor)?.name || 'First available')}</dd></div>
            <div><dt>Date</dt><dd>{date ? prettyDate(date) : '—'}</dd></div>
            <div><dt>Time</dt><dd>{choice ? choice.time : '—'}</dd></div>
          </dl>
          <p className="muted small">Pay at the clinic or online after confirmation. Insured patients pay their co-pay only.</p>
        </div>
        <div className="card side-help">
          <SmartImage src={bookingImage} alt="" loading="lazy" width="360" height="200" />
          <p><Icon name="lock" />Protected by encryption, session timeout and audit logging.</p>
          <a className="btn btn-outline btn-block" href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener"><Icon name="whatsapp" />Book on WhatsApp</a>
        </div>
      </aside>
    </div>
  );
}
