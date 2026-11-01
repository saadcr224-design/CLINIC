'use client';
// One CSRF token request per page load, shared by every form, so parallel requests never
// race to create different sessions. CAPTCHA challenges are fetched after it, one at a time.
let csrfPromise = null;
let queue = Promise.resolve();

export function getCsrf() {
  if (!csrfPromise) {
    csrfPromise = fetch('/api/form-token', { cache: 'no-store', credentials: 'same-origin' })
      .then((r) => r.json())
      .then((d) => d.csrf)
      .catch((err) => { csrfPromise = null; throw err; });
  }
  return csrfPromise;
}

export function getCaptcha() {
  const next = queue.then(async () => {
    await getCsrf();
    const r = await fetch('/api/form-token?captcha=1', { cache: 'no-store', credentials: 'same-origin' });
    return (await r.json()).captcha;
  });
  queue = next.catch(() => {});
  return next;
}

export async function postJSON(url, data) {
  const csrf = await getCsrf();
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
    credentials: 'same-origin',
    body: JSON.stringify(data),
  });
  let body = {};
  try { body = await res.json(); } catch { /* non-JSON error */ }
  return { status: res.status, body };
}
