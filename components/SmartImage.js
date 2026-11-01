'use client';
import { useEffect, useRef } from 'react';
import photos from '@/content/photos.json';

const PLACEHOLDER = '/img/fallback.svg';

// <img> that falls back to backup real photos (portraits for people) and then a branded
// placeholder if a remote photo fails to load, including failures before hydration.
export default function SmartImage({ portrait = false, ...props }) {
  const ref = useRef(null);
  useEffect(() => {
    const img = ref.current;
    if (!img) return;
    const pool = portrait ? photos.fallbackPortraits : photos.fallbackImages;
    const tried = new Set([img.getAttribute('src')]);
    const next = () => {
      img.removeAttribute('srcset');
      const candidate = pool.find((u) => !tried.has(u));
      if (candidate && tried.size <= 3) {
        tried.add(candidate);
        img.src = candidate;
      } else if (!img.src.endsWith(PLACEHOLDER)) {
        img.src = PLACEHOLDER;
        img.classList.add('img-fallback');
      }
    };
    img.addEventListener('error', next);
    if (img.complete && img.naturalWidth === 0) next();
    return () => img.removeEventListener('error', next);
  }, [portrait]);
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
  return <img ref={ref} decoding="async" {...props} />;
}
