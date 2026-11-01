import Link from 'next/link';
import content from '@/lib/content';
import { Icon } from '@/components/Icons';
import PageHero from '@/components/PageHero';
import AjaxForm, { Captcha } from '@/components/AjaxForm';

export const metadata = { title: 'Careers', description: 'Join a team that puts patients first. See open positions and apply online.' };

const PERKS = [['award', 'SCFHS CME support'], ['shield', 'Medical insurance for family'], ['globe', 'Annual tickets & housing allowance'], ['user', 'Saudization & career pathways']];

export default async function CareersPage({ searchParams }) {
  const job = String((await searchParams).job || '');
  const jobs = content.jobs();
  const depts = content.departmentMap();
  return (
    <>
      <PageHero heading="Careers" lead="Join a team that puts patients first. We invest in training, wellbeing and career growth." image={content.site().images.careers} />
      <section className="section">
        <div className="container">
          <ul className="perks">{PERKS.map(([ic, text]) => <li key={text}><span className="feature-icon"><Icon name={ic} /></span>{text}</li>)}</ul>
          <h2>Open positions</h2>
          {!jobs.length && <p className="empty">No open positions right now. Send us your CV for future roles.</p>}
          <div className="jobs">
            {jobs.map((j) => (
              <article className="job-card" key={j.id}>
                <div>
                  <h3>{j.title}</h3>
                  <p className="job-meta"><span className="tag">{depts[j.department]?.name || 'Administration'}</span><span>{j.type}</span><span><Icon name="pin" />Riyadh</span></p>
                  <p>{j.summary}</p>
                </div>
                <Link className="btn btn-outline" href={`/careers?job=${j.id}#apply`} scroll={false}>Apply now</Link>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="section section-alt" id="apply">
        <div className="container narrow">
          <AjaxForm action="/api/careers" captcha className="card" key={job}>
            <h2>Apply for this role</h2>
            <div className="field">
              <label htmlFor="j-job">Position *</label>
              <select id="j-job" name="job" required defaultValue={jobs.some((x) => x.id === job) ? job : (jobs[0]?.id || 'general')}>
                {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
                <option value="general">General application</option>
              </select>
            </div>
            <div className="row-2">
              <div className="field"><label htmlFor="j-name">Full name *</label><input id="j-name" name="name" required autoComplete="name" maxLength={80} /></div>
              <div className="field"><label htmlFor="j-email">Email *</label><input id="j-email" name="email" type="email" required autoComplete="email" /></div>
              <div className="field"><label htmlFor="j-phone">Mobile number *</label><input id="j-phone" name="phone" type="tel" required autoComplete="tel" /></div>
              <div className="field"><label htmlFor="j-cv">Link to your CV (LinkedIn, Google Drive, etc.) *</label><input id="j-cv" name="cv" type="url" required placeholder="https://" /></div>
            </div>
            <div className="field"><label htmlFor="j-msg">Message <small>(optional)</small></label><textarea id="j-msg" name="message" rows={3} maxLength={1000} /></div>
            <Captcha id="j" />
            <button className="btn btn-primary" type="submit">Submit</button>
          </AjaxForm>
        </div>
      </section>
    </>
  );
}
