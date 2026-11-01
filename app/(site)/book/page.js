import content from '@/lib/content';
import PageHero from '@/components/PageHero';
import BookingForm from '@/components/BookingForm';

export const metadata = { title: 'Book an appointment', description: 'Choose a department, doctor and time online. Instant confirmation by SMS, WhatsApp and email.' };

export default async function BookPage({ searchParams }) {
  const sp = await searchParams;
  const site = content.site();
  return (
    <>
      <PageHero heading="Book an appointment" lead="Choose a department, doctor and time. You will receive confirmation by SMS, WhatsApp and email." image={site.images.book} />
      <section className="section">
        <div className="container">
          <BookingForm
            departments={content.departments().map(({ slug, name }) => ({ slug, name }))}
            providers={content.insurance().providers}
            preDoctor={String(sp.doctor || '')}
            preDept={String(sp.dept || '')}
            bookingImage={site.images.why}
            whatsapp={site.whatsapp}
          />
        </div>
      </section>
    </>
  );
}
