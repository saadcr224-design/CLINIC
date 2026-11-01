import Link from 'next/link';
import content from '@/lib/content';
import PageHero from '@/components/PageHero';
import AutoSubmit from '@/components/AutoSubmit';
import { DoctorCard, CLINIC_DAYS } from '@/components/Cards';

export const metadata = { title: 'Find a doctor', description: 'Search our consultants by name, specialty, day of availability or language.' };

const DAY_FULL = { sat: 'Saturday', sun: 'Sunday', mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday' };

export default async function DoctorsPage({ searchParams }) {
  const sp = await searchParams;
  const f = {
    q: String(sp.q || '').trim().slice(0, 60),
    dept: String(sp.dept || ''),
    day: String(sp.day || ''),
    gender: String(sp.gender || ''),
  };
  const depts = content.departmentMap();
  const q = f.q.toLowerCase();
  const doctors = content.doctors().filter((d) => {
    if (f.dept && d.department !== f.dept) return false;
    if (f.day && !d.days.includes(f.day)) return false;
    if (f.gender && d.gender !== f.gender) return false;
    if (q) {
      const hay = [d.name, d.title, depts[d.department]?.name, ...d.languages, d.bio].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  return (
    <>
      <PageHero heading="Find a doctor" lead="Search our consultants by name, specialty, day of availability or language." image={content.site().images.doctors} />
      <section className="section">
        <div className="container">
          <form className="filters" method="get" action="/doctors" role="search">
            <div className="field"><label htmlFor="f-q">Search</label><input id="f-q" name="q" defaultValue={f.q} placeholder="Doctor name or keyword" /></div>
            <div className="field">
              <label htmlFor="f-dept">Specialty</label>
              <AutoSubmit id="f-dept" name="dept" defaultValue={f.dept}>
                <option value="">Any</option>
                {Object.values(depts).map((d) => <option key={d.slug} value={d.slug}>{d.name}</option>)}
              </AutoSubmit>
            </div>
            <div className="field">
              <label htmlFor="f-day">Available on</label>
              <AutoSubmit id="f-day" name="day" defaultValue={f.day}>
                <option value="">Any</option>
                {CLINIC_DAYS.map((k) => <option key={k} value={k}>{DAY_FULL[k]}</option>)}
              </AutoSubmit>
            </div>
            <div className="field">
              <label htmlFor="f-gender">Doctor</label>
              <AutoSubmit id="f-gender" name="gender" defaultValue={f.gender}>
                <option value="">Any</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </AutoSubmit>
            </div>
            <div className="filter-actions">
              <button className="btn btn-primary" type="submit">Apply filters</button>
              <Link className="btn btn-outline" href="/doctors">Reset</Link>
            </div>
          </form>
          <p className="results-count" role="status"><strong>{doctors.length}</strong> doctors found</p>
          {doctors.length ? (
            <div className="grid grid-4">{doctors.map((d) => <DoctorCard key={d.slug} d={d} department={depts[d.department]} />)}</div>
          ) : (
            <p className="empty">No doctors match your filters.</p>
          )}
        </div>
      </section>
    </>
  );
}
