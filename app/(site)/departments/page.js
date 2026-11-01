import Link from 'next/link';
import content from '@/lib/content';
import { srcset } from '@/lib/text';
import { Icon } from '@/components/Icons';
import PageHero from '@/components/PageHero';
import SmartImage from '@/components/SmartImage';

export const metadata = { title: 'Departments & services', description: 'Specialist care across eight departments, supported by on-site laboratory, radiology and pharmacy.' };

export default function DepartmentsPage() {
  return (
    <>
      <PageHero heading="Departments & services" lead="Specialist care across eight departments, supported by on-site laboratory, radiology and pharmacy." image={content.site().images.departments} />
      <section className="section">
        <div className="container grid grid-2">
          {content.departments().map((d) => (
            <Link key={d.slug} className="dept-card" href={`/departments/${d.slug}`}>
              <SmartImage src={d.image} srcSet={srcset(d.image, [400, 800])} sizes="(max-width: 800px) 90vw, 45vw" alt="" loading="lazy" width="600" height="300" />
              <div className="dept-body">
                <span className="service-icon"><Icon name={d.icon} /></span>
                <h2>{d.name}</h2>
                <p>{d.summary}</p>
                <span className="link-arrow">Learn more<Icon name="arrow" /></span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
