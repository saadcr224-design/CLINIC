'use client';
import Link from 'next/link';

// Shown if a page fails to render. Details stay in the server logs, never on screen.
export default function Error({ reset }) {
  return (
    <section className="section error-page">
      <div className="container narrow center">
        <p className="error-code">500</p>
        <h1>Something went wrong</h1>
        <p className="lead-dark">Please try again, or call us if you need help right away.</p>
        <div className="btn-row center">
          <button type="button" className="btn btn-primary" onClick={() => reset()}>Try again</button>
          <Link className="btn btn-outline" href="/">Home</Link>
        </div>
      </div>
    </section>
  );
}
