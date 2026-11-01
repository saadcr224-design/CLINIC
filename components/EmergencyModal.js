'use client';
import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icons';
import AjaxForm, { Honeypot } from './AjaxForm';

export default function EmergencyModal({ site }) {
  const [open, setOpen] = useState(false);
  const [geo, setGeo] = useState(null);
  const [locating, setLocating] = useState(false);
  const boxRef = useRef(null);
  const lastFocus = useRef(null);

  useEffect(() => {
    const onOpen = (e) => { if (e.detail === 'emergency') { lastFocus.current = document.activeElement; setOpen(true); } };
    window.addEventListener('ui:open', onOpen);
    return () => window.removeEventListener('ui:open', onOpen);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    document.body.style.overflow = 'hidden';
    boxRef.current?.querySelector('a, button, input')?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') close();
      if (e.key !== 'Tab' || !boxRef.current) return;
      const items = [...boxRef.current.querySelectorAll('a[href], button, input:not([type=hidden]):not(.hp)')].filter((x) => !x.disabled);
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open]);

  function close() {
    setOpen(false);
    lastFocus.current?.focus?.();
  }

  function shareLocation() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setGeo({ lat: pos.coords.latitude.toFixed(6), lng: pos.coords.longitude.toFixed(6) }); setLocating(false); },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  if (!open) return null;
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="em-title" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="modal-box" ref={boxRef}>
        <button type="button" className="icon-btn modal-close" aria-label="Close" onClick={close}><Icon name="close" /></button>
        <h2 id="em-title"><Icon name="ambulance" />Emergency help</h2>
        <p>Life-threatening emergency? Call the Saudi Red Crescent now:</p>
        <a className="btn btn-emergency btn-block btn-xl" href={`tel:${site.nationalEmergency}`}><Icon name="phone" />{site.nationalEmergency}</a>
        <a className="btn btn-outline btn-block" href={`tel:${site.emergencyPhone}`}>Call our 24/7 emergency department · {site.emergencyPhoneDisplay}</a>
        <hr />
        <h3>Request our ambulance</h3>
        <p className="muted">Share your phone and location and our dispatch team will call you back within 2 minutes.</p>
        <AjaxForm action="/api/ambulance" className="ambulance-form">
          <div className="field"><label htmlFor="am-phone">Mobile number *</label><input id="am-phone" name="phone" type="tel" required autoComplete="tel" inputMode="tel" /></div>
          <div className="field"><label htmlFor="am-name">Full name <small>(optional)</small></label><input id="am-name" name="name" autoComplete="name" /></div>
          <input type="hidden" name="lat" value={geo ? geo.lat : ''} readOnly />
          <input type="hidden" name="lng" value={geo ? geo.lng : ''} readOnly />
          <Honeypot />
          <button type="button" className="btn btn-outline btn-block" onClick={shareLocation} disabled={locating || !!geo}>
            <Icon name="pin" />{geo ? '✓ Location attached' : locating ? 'Locating…' : 'Share my current location'}
          </button>
          <button type="submit" className="btn btn-emergency btn-block">Send ambulance request</button>
        </AjaxForm>
      </div>
    </div>
  );
}
