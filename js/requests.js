// Service request forms (build a project, ask for a consultation, showcase a project).
// A filled form becomes a prefilled WhatsApp message, exactly like a cart order: nothing is
// stored or sent from this site, the visitor presses send in WhatsApp. Pure functions, unit-tested in Node.

import { normalizeNumber, whatsAppUrl } from './order.js';

export const COURSES_TOPIC = 'الدورات التدريبية والمدربون';

export const FORMS = {
  build: {
    title: 'اطلب بناء مشروعك',
    lead: 'للطلاب والمهندسين: نبني مشروعك معك من الفكرة حتى النموذج الأولي، ونوفّر الأدوات والقطع التي يحتاجها.',
    intro: 'مرحباً صانع، أرغب في طلب بناء مشروع:',
    submit: 'إرسال طلب المشروع عبر واتساب',
    fields: [
      { name: 'name', label: 'الاسم', type: 'text', required: true, autocomplete: 'name', max: 80 },
      { name: 'role', label: 'أنت', type: 'select', required: true, options: ['طالب', 'مهندس', 'هاوٍ', 'جهة تعليمية أو شركة'] },
      { name: 'title', label: 'عنوان المشروع أو فكرته', type: 'text', required: true, max: 120 },
      {
        name: 'details', label: 'وصف المشروع', type: 'textarea', required: true, max: 600,
        hint: 'ما الذي يفترض أن يفعله المشروع؟ اذكر الحساسات أو المتطلبات إن وُجدت.',
      },
      {
        name: 'help', label: 'نوع المساعدة المطلوبة', type: 'select', required: true,
        options: ['بناء المشروع كاملاً', 'مساعدة في جزء من المشروع', 'توفير الأدوات والقطع فقط'],
      },
      { name: 'deadline', label: 'موعد التسليم المطلوب', type: 'text', required: false, max: 80, hint: 'مثال: نهاية الفصل الدراسي' },
    ],
  },
  consult: {
    title: 'اطلب استشارة',
    lead: 'محتار في اختيار القطع أو طريقة التنفيذ؟ اكتب سؤالك ونرد عليك عبر واتساب.',
    intro: 'مرحباً صانع، أرغب في استشارة:',
    submit: 'إرسال طلب الاستشارة عبر واتساب',
    fields: [
      { name: 'name', label: 'الاسم', type: 'text', required: true, autocomplete: 'name', max: 80 },
      {
        name: 'topic', label: 'موضوع الاستشارة', type: 'select', required: true,
        options: [
          'اختيار القطع والأدوات المناسبة',
          'تصميم الدوائر والتوصيل',
          'البرمجة',
          'مشروع تخرج أو مشروع طلابي',
          COURSES_TOPIC,
          'موضوع آخر',
        ],
      },
      { name: 'question', label: 'سؤالك أو تفاصيل طلبك', type: 'textarea', required: true, max: 600 },
    ],
  },
  showcase: {
    title: 'اعرض مشروعك التقني',
    lead: 'أنجزت مشروعاً؟ أرسل بياناته لنعرضه للمبتكرين الآخرين ضمن مشاريع المشاركين.',
    intro: 'مرحباً صانع، أرغب في عرض مشروعي التقني:',
    submit: 'إرسال المشروع عبر واتساب',
    after: 'أرسل صور المشروع أو مقطع الفيديو في نفس محادثة واتساب بعد الرسالة.',
    fields: [
      { name: 'name', label: 'اسمك أو اسم الفريق', type: 'text', required: true, autocomplete: 'name', max: 80 },
      { name: 'project', label: 'اسم المشروع', type: 'text', required: true, max: 120 },
      { name: 'field', label: 'مجال المشروع', type: 'select', required: true, options: ['إنترنت الأشياء IoT', 'روبوتات', 'STEAM وتعليم', 'مجال آخر'] },
      { name: 'summary', label: 'نبذة عن المشروع', type: 'textarea', required: true, max: 600, hint: 'ما المشكلة التي يحلها وكيف يعمل؟' },
      { name: 'tools', label: 'الأدوات والقطع المستخدمة', type: 'text', required: false, max: 200 },
      { name: 'link', label: 'رابط صور أو فيديو أو مستودع', type: 'url', required: false, max: 300, hint: 'يبدأ بـ https://' },
      { name: 'consent', label: 'أوافق على عرض مشروعي واسمي في منصات صانع', type: 'checkbox', required: true, summary: 'الموافقة على النشر' },
    ],
  },
};

const clean = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

/** Trimmed, length-limited copies of the submitted values, keyed by field name. */
export function readValues(kind, raw) {
  const out = {};
  for (const field of FORMS[kind].fields) {
    if (field.type === 'checkbox') {
      out[field.name] = raw[field.name] === true || raw[field.name] === 'on';
    } else {
      const text = field.type === 'textarea' ? String(raw[field.name] ?? '').trim() : clean(raw[field.name]);
      out[field.name] = text.slice(0, field.max ?? 300);
    }
  }
  return out;
}

/** { fieldName: message } for every field that still needs attention. Empty object = valid. */
export function validate(kind, values) {
  const errors = {};
  for (const field of FORMS[kind].fields) {
    const value = values[field.name];
    if (field.type === 'checkbox') {
      if (field.required && !value) errors[field.name] = 'نحتاج موافقتك لنتمكن من عرض المشروع';
    } else if (!value) {
      if (field.required) errors[field.name] = field.type === 'select' ? 'اختر أحد الخيارات' : 'هذا الحقل مطلوب';
    } else if (field.type === 'select' && !field.options.includes(value)) {
      errors[field.name] = 'اختر أحد الخيارات';
    } else if (field.type === 'url' && !isHttpUrl(value)) {
      errors[field.name] = 'اكتب رابطاً كاملاً يبدأ بـ https://';
    }
  }
  return errors;
}

export function buildRequestMessage(kind, values) {
  const form = FORMS[kind];
  const lines = [];
  for (const field of form.fields) {
    const value = values[field.name];
    if (field.type === 'checkbox') {
      if (value) lines.push(`${field.summary ?? field.label}: نعم`);
    } else if (value) {
      lines.push(field.type === 'textarea' ? `${field.label}:\n${value}` : `${field.label}: ${value}`);
    }
  }
  return [form.intro, '', ...lines].join('\n');
}

/** The WhatsApp link for a valid form, or null when the form is incomplete or no number is configured. */
export function requestUrl(rawNumber, kind, rawValues) {
  const number = normalizeNumber(rawNumber);
  if (!number || !FORMS[kind]) return null;
  const values = readValues(kind, rawValues);
  if (Object.keys(validate(kind, values)).length) return null;
  return whatsAppUrl(number, buildRequestMessage(kind, values));
}

/** A plain "hello" link for the contact section. */
export function contactUrl(rawNumber) {
  const number = normalizeNumber(rawNumber);
  return number ? whatsAppUrl(number, 'مرحباً صانع، لدي استفسار:') : null;
}
