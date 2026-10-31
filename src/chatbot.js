'use strict';
// Rule-based assistant: answers common questions from CMS content and routes everything
// else to a human on WhatsApp. It never gives medical advice. Swap for an LLM-backed
// service later by keeping the same { reply, actions } response shape.
const content = require('./content');

const norm = (s) => s.toLowerCase().normalize('NFKD').replace(/[ً-ْ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه');

const EMERGENCY = ['chest pain', 'can\'t breathe', 'cannot breathe', 'unconscious', 'bleeding', 'stroke', 'heart attack', 'emergency', 'ambulance', 'طوارئ', 'اسعاف', 'نزيف', 'الم في الصدر', 'ضيق تنفس', 'جلطه', 'اغماء'];

const INTENTS = [
  { id: 'book', words: ['book', 'appointment', 'reserve', 'schedule', 'slot', 'حجز', 'موعد', 'احجز'] },
  { id: 'hours', words: ['hour', 'open', 'close', 'timing', 'time', 'friday', 'ساعات', 'دوام', 'مفتوح', 'متى', 'الجمعه', 'وقت'] },
  { id: 'location', words: ['where', 'location', 'address', 'map', 'direction', 'parking', 'وين', 'موقع', 'عنوان', 'خريطه', 'مواقف', 'اين'] },
  { id: 'insurance', words: ['insurance', 'bupa', 'tawuniya', 'medgulf', 'cover', 'pay', 'price', 'cost', 'fee', 'تامين', 'بوبا', 'التعاونيه', 'سعر', 'رسوم', 'دفع', 'تكلفه'] },
  { id: 'portal', words: ['report', 'result', 'lab', 'prescription', 'portal', 'login', 'تقرير', 'نتيجه', 'نتائج', 'مختبر', 'وصفه', 'بوابه'] },
  { id: 'careers', words: ['job', 'career', 'hiring', 'vacancy', 'وظيفه', 'وظائف', 'توظيف'] },
  { id: 'human', words: ['human', 'agent', 'person', 'staff', 'call', 'phone', 'whatsapp', 'موظف', 'شخص', 'اتصال', 'رقم', 'واتساب', 'تواصل'] },
  { id: 'greeting', words: ['hello', 'hi', 'hey', 'salam', 'مرحبا', 'السلام', 'اهلا', 'هلا'] },
  { id: 'thanks', words: ['thank', 'thanks', 'شكرا', 'يعطيك العافيه'] },
];

function reply(message, lang) {
  const text = norm(message);
  const site = content.site();
  const ar = lang === 'ar';
  const p = ar ? '/ar' : '';
  const L = (f) => f[lang] || f.en;
  const wa = { label: ar ? 'واتساب' : 'WhatsApp us', url: `https://wa.me/${site.whatsapp}` };

  if (EMERGENCY.some((w) => text.includes(norm(w)))) {
    return {
      urgent: true,
      reply: ar
        ? `إذا كانت حالة طارئة تهدد الحياة، اتصل فوراً بالرقم ${site.nationalEmergency}. قسم الطوارئ لدينا يعمل 24/7 على ${site.emergencyPhoneDisplay}.`
        : `If this is a life-threatening emergency, call ${site.nationalEmergency} now. Our 24/7 emergency department is on ${site.emergencyPhoneDisplay}.`,
      actions: [
        { label: ar ? `اتصل ${site.nationalEmergency}` : `Call ${site.nationalEmergency}`, url: `tel:${site.nationalEmergency}` },
        { label: ar ? 'طوارئ المركز' : 'Our ER line', url: `tel:${site.emergencyPhone}` },
      ],
    };
  }

  // Department / specialty mentioned → point to doctors and booking.
  for (const d of content.departments()) {
    const names = [d.slug.replace(/-/g, ' '), d.name.en, d.name.ar].map(norm);
    if (names.some((n) => n.split(/[ &]+/).some((w) => w.length > 3 && text.includes(w)))) {
      const docs = content.doctors().filter((x) => x.department === d.slug);
      return {
        reply: ar
          ? `قسم ${d.name.ar}: ${d.summary.ar} لدينا ${docs.length} من الأطباء: ${docs.map((x) => x.name.ar).join('، ')}.`
          : `${d.name.en}: ${d.summary.en} Our doctors: ${docs.map((x) => x.name.en).join(', ')}.`,
        actions: [
          { label: ar ? 'احجز في هذا القسم' : 'Book in this department', url: `${p}/book?dept=${d.slug}` },
          { label: ar ? 'تفاصيل القسم' : 'Department details', url: `${p}/departments/${d.slug}` },
        ],
      };
    }
  }

  const scores = INTENTS.map((i) => ({ id: i.id, n: i.words.filter((w) => text.includes(norm(w))).length })).sort((a, b) => b.n - a.n);
  const intent = scores[0].n ? scores[0].id : null;

  switch (intent) {
    case 'book':
      return {
        reply: ar ? 'يمكنك الحجز إلكترونياً خلال دقيقة، وسيصلك التأكيد فوراً.' : 'You can book online in under a minute and get instant confirmation.',
        actions: [{ label: ar ? 'احجز موعداً' : 'Book appointment', url: `${p}/book` }, { label: ar ? 'ابحث عن طبيب' : 'Find a doctor', url: `${p}/doctors` }],
      };
    case 'hours':
      return {
        reply: site.hours.map((h) => `${L(h.days)}: ${L(h.time)}`).join('\n'),
        actions: [{ label: ar ? 'اتصل بنا' : 'Contact us', url: `${p}/contact` }],
      };
    case 'location':
      return {
        reply: (ar ? 'عنواننا: ' : 'We are at: ') + L(site.address) + (ar ? '. تتوفر مواقف مجانية وخدمة صف السيارات.' : '. Free parking and valet available.'),
        actions: [{ label: ar ? 'الاتجاهات' : 'Get directions', url: site.mapDirections }],
      };
    case 'insurance':
      return {
        reply:
          (ar ? 'نتعامل مع: ' : 'We accept: ') +
          content.insurance().providers.slice(0, 6).join(ar ? '، ' : ', ') +
          (ar ? ' وغيرها. رسوم الاستشارة تبدأ من 250 ريال.' : ' and more. Consultations start from SAR 250.'),
        actions: [{ label: ar ? 'التأمين والدفع' : 'Insurance & payment', url: `${p}/insurance` }],
      };
    case 'portal':
      return {
        reply: ar ? 'تقارير المختبر والوصفات متاحة في بوابة المرضى الآمنة.' : 'Lab reports and prescriptions are available in the secure patient portal.',
        actions: [{ label: ar ? 'بوابة المرضى' : 'Patient portal', url: `${p}/portal` }],
      };
    case 'careers':
      return { reply: ar ? 'اطلع على الوظائف المتاحة وقدّم إلكترونياً.' : 'See our open positions and apply online.', actions: [{ label: ar ? 'الوظائف' : 'Careers', url: `${p}/careers` }] };
    case 'greeting':
      return { reply: ar ? 'أهلاً وسهلاً! كيف يمكنني مساعدتك اليوم؟' : 'Hello! How can I help you today?', actions: [] };
    case 'thanks':
      return { reply: ar ? 'العفو! نتمنى لك دوام الصحة.' : "You're welcome! Wishing you good health.", actions: [] };
    case 'human':
    default:
      return {
        reply: ar
          ? 'سأحولك إلى فريقنا. يمكنك مراسلتنا على الواتساب أو الاتصال بنا مباشرة.'
          : "Let me connect you with our team. Message us on WhatsApp or call us directly.",
        actions: [wa, { label: ar ? 'اتصال' : 'Call us', url: `tel:${site.phone}` }],
      };
  }
}

module.exports = { reply };
