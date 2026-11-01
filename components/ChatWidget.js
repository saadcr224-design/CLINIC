'use client';
import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icons';
import { postJSON } from './formToken';

const QUICK = [['Book Appointment', 'Book an appointment'], ['Working hours', 'Opening hours'], ['Insurance', 'Which insurance do you accept?'], ['Location', 'Where are you located?']];

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([{ from: 'bot', text: 'Hello! 👋 I can help you book, find a doctor, check hours or insurance. What do you need?' }]);
  const [input, setInput] = useState('');
  const logRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const onOpen = (e) => { if (e.detail === 'chat') setOpen((v) => !v); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('ui:open', onOpen);
    document.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('ui:open', onOpen); document.removeEventListener('keydown', onKey); };
  }, []);
  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [messages]);

  async function ask(q) {
    setMessages((m) => [...m, { from: 'user', text: q }, { from: 'bot', text: '…', typing: true }]);
    let reply;
    try {
      const { body } = await postJSON('/api/chat', { message: q });
      reply = body.ok ? { from: 'bot', text: body.reply, urgent: body.urgent, actions: body.actions } : { from: 'bot', text: body.error || 'Something went wrong.' };
    } catch {
      reply = { from: 'bot', text: 'Something went wrong. Please try again or call us.' };
    }
    setMessages((m) => [...m.filter((x) => !x.typing), reply]);
  }

  if (!open) return null;
  return (
    <section className="chat-panel" id="chat-panel" role="dialog" aria-modal="false" aria-labelledby="chat-title">
      <header>
        <div className="chat-avatar"><img src="/img/logo.svg" alt="" width="32" height="32" /></div>
        <div><h2 id="chat-title">Wahat Assistant</h2><p>Typically replies instantly</p></div>
        <button type="button" className="icon-btn" aria-label="Close" onClick={() => setOpen(false)}><Icon name="close" /></button>
      </header>
      <div className="chat-log" aria-live="polite" ref={logRef}>
        {messages.map((m, i) => (
          <div key={i}>
            <div className={`msg ${m.from}${m.urgent ? ' urgent' : ''}${m.typing ? ' typing' : ''}`}>{m.text}</div>
            {m.actions && m.actions.length > 0 && (
              <div className="chips">
                {m.actions.map((a) => (
                  <a key={a.url} href={a.url} {...(/^https?:/.test(a.url) ? { target: '_blank', rel: 'noopener' } : {})}>{a.label}</a>
                ))}
              </div>
            )}
          </div>
        ))}
        {messages.length === 1 && (
          <div className="chips">{QUICK.map(([label, q]) => <button key={label} type="button" onClick={() => ask(q)}>{label}</button>)}</div>
        )}
      </div>
      <form className="chat-form" onSubmit={(e) => { e.preventDefault(); const q = input.trim(); if (q) { setInput(''); ask(q); } }}>
        <label className="sr-only" htmlFor="chat-input">Type your question…</label>
        <input id="chat-input" ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} maxLength={300} autoComplete="off" placeholder="Type your question…" />
        <button className="btn btn-primary" type="submit">Send</button>
      </form>
      <p className="chat-disclaimer">Automated assistant: not for medical advice. In an emergency call 997.</p>
    </section>
  );
}
