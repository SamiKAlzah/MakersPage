// Store settings.

// WhatsApp Business number that receives orders and service requests, in international format:
// country code first, digits only. (Saudi mobile 0579331776 -> 966579331776.)
// If this is emptied, the WhatsApp buttons and forms switch themselves off.
export const WHATSAPP_NUMBER = '966579331776';

// Shown in the contact section and the footer.
export const CONTACT_EMAIL = 'info@makers.org.sa';

// Social accounts, shown as icons in the contact section and the footer.
export const SOCIAL = [
  { id: 'instagram', label: 'إنستغرام', url: 'https://www.instagram.com/makers_org/' },
  { id: 'linkedin', label: 'لينكدإن', url: 'https://www.linkedin.com/company/suna-org/posts/' },
  { id: 'x', label: 'إكس (تويتر)', url: 'https://x.com/Suna_org' },
];

// Legal details shown in the footer (commercial registration and VAT registration).
export const BUSINESS = {
  name: 'مؤسسة الحل الخفي التجارية',
  cr: '7007948727',
  vat: '310284078100003',
};
