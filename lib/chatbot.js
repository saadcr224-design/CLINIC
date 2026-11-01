'use strict';
// Rule-based assistant: answers common questions from CMS content and routes everything
// else to a human on WhatsApp. It never gives medical advice. Swap for an LLM-backed
// service later by keeping the same { reply, actions } response shape.
const content = require('./content');

const EMERGENCY = ['chest pain', "can't breathe", 'cannot breathe', 'not breathing', 'unconscious', 'bleeding', 'stroke', 'heart attack', 'seizure', 'emergency', 'ambulance', 'overdose'];

const INTENTS = [
  { id: 'book', words: ['book', 'appointment', 'reserve', 'schedule', 'slot', 'available', 'see a doctor'] },
  { id: 'cancel', words: ['cancel', 'reschedule', 'change my appointment', 'postpone'] },
  { id: 'hours', words: ['hour', 'open', 'close', 'timing', 'friday', 'weekend', 'when'] },
  { id: 'location', words: ['where', 'location', 'address', 'map', 'direction', 'parking'] },
  { id: 'insurance', words: ['insurance', 'bupa', 'tawuniya', 'medgulf', 'cover', 'pay', 'price', 'cost', 'fee', 'mada', 'cash'] },
  { id: 'portal', words: ['report', 'result', 'lab', 'prescription', 'portal', 'login'] },
  { id: 'careers', words: ['job', 'career', 'hiring', 'vacancy', 'work with you'] },
  { id: 'human', words: ['human', 'agent', 'person', 'staff', 'call', 'phone', 'whatsapp', 'talk'] },
  { id: 'greeting', words: ['hello', 'hi', 'hey', 'salam', 'good morning', 'good evening'] },
  { id: 'thanks', words: ['thank', 'thanks'] },
];

const hasWord = (text, w) => new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i').test(text);

function reply(message) {
  const text = String(message).toLowerCase();
  const site = content.site();
  const wa = { label: 'WhatsApp us', url: `https://wa.me/${site.whatsapp}` };

  if (EMERGENCY.some((w) => text.includes(w))) {
    return {
      urgent: true,
      reply: `If this is a life-threatening emergency, call ${site.nationalEmergency} now. Our 24/7 emergency department is on ${site.emergencyPhoneDisplay}.`,
      actions: [
        { label: `Call ${site.nationalEmergency}`, url: `tel:${site.nationalEmergency}` },
        { label: 'Our ER line', url: `tel:${site.emergencyPhone}` },
      ],
    };
  }

  // Department or specialty mentioned → point to its doctors and booking.
  const aliases = { dental: ['dentist', 'teeth', 'tooth'], pediatrics: ['child', 'kid', 'baby', 'pediatric'], cardiology: ['heart', 'cardio'],
    orthopedics: ['bone', 'knee', 'back pain', 'joint'], dermatology: ['skin', 'acne', 'derma'], 'obstetrics-gynecology': ['pregnan', 'gyn', 'obstetric'],
    'internal-medicine': ['diabetes', 'thyroid', 'internal'], ophthalmology: ['eye', 'vision', 'lasik'] };
  for (const d of content.departments()) {
    const words = [d.name.toLowerCase(), ...(aliases[d.slug] || [])];
    if (words.some((w) => text.includes(w))) {
      const docs = content.doctors().filter((x) => x.department === d.slug);
      return {
        reply: `${d.name}: ${d.summary} Our doctors: ${docs.map((x) => x.name).join(', ')}.`,
        actions: [
          { label: 'Book in this department', url: `/book?dept=${d.slug}` },
          { label: 'Department details', url: `/departments/${d.slug}` },
        ],
      };
    }
  }

  const scores = INTENTS.map((i) => ({ id: i.id, n: i.words.filter((w) => hasWord(text, w)).length })).sort((a, b) => b.n - a.n);
  const intent = scores[0].n ? scores[0].id : null;

  switch (intent) {
    case 'book':
      return {
        reply: 'You can book online in under a minute and get instant confirmation by SMS and WhatsApp.',
        actions: [{ label: 'Book appointment', url: '/book' }, { label: 'Find a doctor', url: '/doctors' }],
      };
    case 'cancel':
      return {
        reply: 'To cancel or reschedule, use the link in your confirmation message, sign in to the patient portal, or call reception at least 4 hours before.',
        actions: [{ label: 'Patient portal', url: '/portal' }, { label: 'Call us', url: `tel:${site.phone}` }],
      };
    case 'hours':
      return { reply: site.hours.map((h) => `${h.days}: ${h.time}`).join('\n'), actions: [{ label: 'Contact us', url: '/contact' }] };
    case 'location':
      return { reply: `We are at ${site.address}. Free parking and valet are available.`, actions: [{ label: 'Get directions', url: site.mapDirections }] };
    case 'insurance':
      return {
        reply: `We accept ${content.insurance().providers.slice(0, 6).join(', ')} and more. Consultations start from SAR 250.`,
        actions: [{ label: 'Insurance & payment', url: '/insurance' }],
      };
    case 'portal':
      return { reply: 'Lab reports and prescriptions are available in the secure patient portal.', actions: [{ label: 'Patient portal', url: '/portal' }] };
    case 'careers':
      return { reply: 'See our open positions and apply online.', actions: [{ label: 'Careers', url: '/careers' }] };
    case 'greeting':
      return { reply: 'Hello! How can I help you today?', actions: [] };
    case 'thanks':
      return { reply: "You're welcome! Wishing you good health.", actions: [] };
    default:
      return { reply: 'Let me connect you with our team. Message us on WhatsApp or call us directly.', actions: [wa, { label: 'Call us', url: `tel:${site.phone}` }] };
  }
}

module.exports = { reply };
