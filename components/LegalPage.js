import fs from 'fs';
import path from 'path';
import content from '@/lib/content';
import { fmtDate } from '@/lib/text';
import { Icon } from './Icons';
import PageHero from './PageHero';

// Legal text lives in content/legal/*.html (trusted, staff-edited) with {{clinic}} placeholders.
export default function LegalPage({ file, title }) {
  const site = content.site();
  const html = fs.readFileSync(path.join(process.cwd(), 'content', 'legal', `${file}.html`), 'utf8').replaceAll('{{clinic}}', site.name);
  return (
    <>
      <PageHero heading={title} image={site.images.legal} />
      <section className="section">
        <div className="container narrow prose legal">
          <p className="muted">Last updated: {fmtDate('2026-10-01')}</p>
          <div dangerouslySetInnerHTML={{ __html: html }} />
          <p className="notice"><Icon name="shield" />Template text. Have it reviewed by your legal counsel and DPO before publishing.</p>
        </div>
      </section>
    </>
  );
}
