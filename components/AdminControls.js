'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { postJSON } from './formToken';
import { APPOINTMENT_STATUSES as STATUSES } from '@/lib/constants';

export function StatusSelect({ id, value, label }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <select className="inline-select" aria-label={label} defaultValue={value} disabled={busy}
      onChange={async (e) => {
        setBusy(true);
        const { body } = await postJSON(`/api/admin/appointments/${id}/status`, { status: e.target.value });
        setBusy(false);
        if (!body.ok) alert(body.error || 'Could not update status');
        router.refresh();
      }}>
      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
    </select>
  );
}

// National IDs are masked on screen (shoulder-surfing) until a staff member clicks to reveal.
export function Reveal({ value }) {
  const [shown, setShown] = useState(false);
  return shown ? <span>{value}</span> : (
    <button type="button" className="reveal" onClick={() => setShown(true)} aria-label="Reveal ID number">••••••{value.slice(-4)}</button>
  );
}

export function PhotoGrid({ photos }) {
  const [broken, setBroken] = useState({});
  const grid = useRef(null);
  useEffect(() => {
    // Catch images that failed before React attached its handlers.
    grid.current?.querySelectorAll('img').forEach((img, i) => {
      if (img.complete && img.naturalWidth === 0) setBroken((b) => ({ ...b, [i]: true }));
    });
  }, []);
  const count = Object.keys(broken).length;
  return (
    <>
      <p className={`integrity ${count ? 'bad' : 'ok'}`}>{photos.length} photos · {count} failed to load</p>
      <div className="photo-grid" ref={grid}>
        {photos.map((p, i) => (
          <figure key={p.where}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.src.replace(/w=\d+/, 'w=500')} alt="" loading="lazy" className={broken[i] ? 'broken' : undefined}
              onError={() => setBroken((b) => ({ ...b, [i]: true }))} />
            <figcaption><strong>{p.where}</strong> {broken[i] && <span className="bad-text">✖ Failed to load</span>}<code>{p.src}</code></figcaption>
          </figure>
        ))}
      </div>
    </>
  );
}
