'use client';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { getCaptcha, postJSON } from './formToken';
import t from '@/lib/text';

const CaptchaContext = createContext(null);

function formToObject(form) {
  const out = {};
  new FormData(form).forEach((v, k) => { out[k] = v; });
  form.querySelectorAll('input[type=checkbox]').forEach((c) => { out[c.name] = c.checked; });
  return out;
}

export function markErrors(form, errors) {
  form.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
  for (const name of Object.keys(errors || {})) {
    const el = form.elements[name];
    if (!el || !el.setAttribute) continue;
    (el.type === 'checkbox' ? el.closest('.check') : el).setAttribute('aria-invalid', 'true');
  }
  const first = form.querySelector('[aria-invalid="true"]');
  if (first && first.focus) first.focus();
}

// Submits the form as JSON to `action`, with CSRF token, CAPTCHA and inline status messages.
export default function AjaxForm({ action, captcha = false, className = '', children, onSuccess, transform, ...props }) {
  const ref = useRef(null);
  const [question, setQuestion] = useState('');
  const [status, setStatus] = useState({ kind: '', text: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (captcha) getCaptcha().then(setQuestion).catch(() => {});
  }, [captcha]);

  async function submit(e) {
    e.preventDefault();
    const form = ref.current;
    setBusy(true);
    setStatus({ kind: '', text: '' });
    try {
      let data = formToObject(form);
      if (transform) {
        data = transform(data);
        if (data.__error) { setStatus({ kind: 'err', text: data.__error }); return; }
      }
      const { body } = await postJSON(action, data);
      if (body.captcha) setQuestion(body.captcha);
      if (form.elements.captcha) form.elements.captcha.value = '';
      if (body.ok) {
        markErrors(form, {});
        if (onSuccess) onSuccess(body, form);
        else { setStatus({ kind: 'ok', text: body.message }); form.reset(); }
        if (window.gtag) window.gtag('event', 'generate_lead', { form: action });
      } else {
        setStatus({ kind: 'err', text: body.error || t.t('common.error') });
        markErrors(form, body.errors || (body.field ? { [body.field]: 'invalid' } : {}));
      }
    } catch {
      setStatus({ kind: 'err', text: t.t('common.error') });
    } finally {
      setBusy(false);
    }
  }

  return (
    <CaptchaContext.Provider value={question}>
      <form ref={ref} className={className} onSubmit={submit} noValidate {...props} data-busy={busy ? 'true' : undefined}>
        {children}
        <p className={`form-status ${status.kind}`} role="status" aria-live="polite">{status.text}</p>
      </form>
    </CaptchaContext.Provider>
  );
}

export function Captcha({ id }) {
  const question = useContext(CaptchaContext);
  return (
    <>
      <div className="field field-captcha">
        <label htmlFor={`${id}-captcha`}>{t.t('book.captcha')} <span>{question || '…'}</span>?</label>
        <input id={`${id}-captcha`} name="captcha" inputMode="numeric" required autoComplete="off" maxLength={3} />
      </div>
      <Honeypot />
    </>
  );
}

export function Honeypot() {
  return <input type="text" name="website" className="hp" tabIndex={-1} autoComplete="off" aria-hidden="true" />;
}

export function SubmitButton({ children, className = 'btn btn-primary' }) {
  return <button className={className} type="submit">{children}</button>;
}
