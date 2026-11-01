'use client';
// Opens a site-wide panel ("chat" or "emergency") from anywhere on the page.
export const openPanel = (name) => window.dispatchEvent(new CustomEvent('ui:open', { detail: name }));

export default function OpenButton({ panel, children, ...props }) {
  return (
    <button type="button" {...props} onClick={() => openPanel(panel)}>
      {children}
    </button>
  );
}
