import content from '@/lib/content';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ChatWidget from '@/components/ChatWidget';
import EmergencyModal from '@/components/EmergencyModal';

export default function SiteLayout({ children }) {
  const site = content.site();
  const departments = content.departments();
  const { phone, phoneDisplay, name } = site;
  return (
    <>
      <Header site={{ phone, phoneDisplay, name }} />
      <main id="main" tabIndex={-1}>{children}</main>
      <Footer site={site} departments={departments} />
      <ChatWidget />
      <EmergencyModal site={{ nationalEmergency: site.nationalEmergency, emergencyPhone: site.emergencyPhone, emergencyPhoneDisplay: site.emergencyPhoneDisplay }} />
    </>
  );
}
