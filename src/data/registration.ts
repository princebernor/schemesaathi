import type { StringKey } from '../i18n/strings';
import type { CategoryId, Details, LText, Profile } from '../types';

/**
 * Category-specific registration fields. Rendered by components/DynamicField.tsx.
 * Labels are either a shared string key (translated centrally) or bilingual LText like the scheme data.
 * `show` hides a field until it is relevant; hidden fields are never required or validated.
 */
export type Label = StringKey | LText;
export interface FieldCtx {
  state: string;
}
export interface FieldDef {
  key: string;
  label: Label;
  type: 'text' | 'number' | 'select' | 'date' | 'yesno' | 'textarea';
  options?: { v: string; label: Label }[];
  required?: boolean | ((v: Details) => boolean);
  help?: Label;
  show?: (v: Details, ctx: FieldCtx) => boolean;
  min?: number;
  max?: number;
  pattern?: RegExp;
  placeholder?: string;
  suffix?: string;
}

const L = (en: string, ta: string): LText => ({ en, ta });

const INCOME: FieldDef = {
  key: 'income',
  label: 'annualIncome',
  type: 'select',
  required: true,
  help: L('Total yearly income of everyone in your family. Many schemes have income limits.', 'உங்கள் குடும்பத்தின் மொத்த ஆண்டு வருமானம். பல திட்டங்களுக்கு வருமான வரம்பு உண்டு.'),
  options: (['lt1', '1to2.5', '2.5to4.5', '4.5to8', 'gt8'] as const).map((v) => ({ v, label: `inc_${v}` as StringKey })),
};
const DOB: FieldDef = { key: 'dob', label: L('Date of birth', 'பிறந்த தேதி'), type: 'date', required: true, help: L('Used to calculate your age for age-based schemes.', 'வயது அடிப்படையிலான திட்டங்களுக்கு உங்கள் வயதைக் கணக்கிடப் பயன்படும்.') };
const SOCIAL: FieldDef = {
  key: 'socialCategory',
  label: 'socialCategory',
  type: 'select',
  help: L('Some scholarships are only for specific communities.', 'சில உதவித்தொகைகள் குறிப்பிட்ட சமூகத்தினருக்கு மட்டும்.'),
  options: [
    { v: 'general', label: 'scGeneral' },
    { v: 'obc', label: 'scObc' },
    { v: 'sc', label: 'scSc' },
    { v: 'st', label: 'scSt' },
    { v: 'na', label: 'scNa' },
  ],
};
const EMPLOYMENT: FieldDef = {
  key: 'employment',
  label: L('Employment status', 'வேலை நிலை'),
  type: 'select',
  required: true,
  options: [
    { v: 'employed', label: L('Employed (salaried)', 'சம்பள வேலை') },
    { v: 'self', label: L('Self-employed', 'சுயதொழில்') },
    { v: 'unemployed', label: L('Not employed', 'வேலை இல்லை') },
    { v: 'homemaker', label: L('Homemaker', 'இல்லத்தரசி') },
    { v: 'student', label: L('Student', 'மாணவர்') },
  ],
};
const EDUCATION = (key: string, label: Label): FieldDef => ({
  key,
  label,
  type: 'select',
  required: true,
  options: [
    { v: 'school', label: 'eduSchool' },
    { v: 'hsc', label: 'eduHsc' },
    { v: 'iti', label: 'eduIti' },
    { v: 'diploma', label: 'eduDiploma' },
    { v: 'ug', label: 'eduUg' },
    { v: 'pg', label: 'eduPg' },
  ],
});
const yesno = (key: string, label: Label, extra: Partial<FieldDef> = {}): FieldDef => ({ key, label, type: 'yesno', ...extra });
const afterSchool = (v: Details) => !!v.education && v.education !== 'school';
const higherEd = (v: Details) => ['ug', 'pg'].includes(String(v.education));

export const CATEGORY_FIELDS: Record<CategoryId, FieldDef[]> = {
  student: [
    EDUCATION('education', L('Current educational qualification', 'தற்போதைய கல்வி நிலை')),
    { key: 'institutionName', label: L('School / college name', 'பள்ளி / கல்லூரி பெயர்'), type: 'text', required: true },
    { key: 'institutionType', label: 'institutionType', type: 'select', required: true, options: [{ v: 'govt', label: 'govt' }, { v: 'aided', label: 'aided' }, { v: 'private', label: 'private' }] },
    { key: 'marks10', label: L('Class 10 marks (%)', '10ஆம் வகுப்பு மதிப்பெண் (%)'), type: 'number', min: 0, max: 100, suffix: '%', required: afterSchool, show: afterSchool, help: L('Merit scholarships use your board exam percentage.', 'தகுதி உதவித்தொகைகளுக்கு பொதுத்தேர்வு சதவீதம் பயன்படும்.') },
    { key: 'marks12', label: L('Class 12 marks (%)', '12ஆம் வகுப்பு மதிப்பெண் (%)'), type: 'number', min: 0, max: 100, suffix: '%', required: higherEd, show: higherEd, help: L('Only needed if you have completed Class 12.', '12ஆம் வகுப்பு முடித்திருந்தால் மட்டும்.') },
    { key: 'course', label: L('Current course / degree', 'தற்போதைய படிப்பு / பட்டம்'), type: 'text', placeholder: 'B.Sc. Physics', required: higherEd, show: (v) => ['ug', 'pg', 'diploma', 'iti'].includes(String(v.education)) },
    { key: 'umis', label: L('UMIS ID', 'UMIS எண்'), type: 'text', show: (v, c) => c.state === 'Tamil Nadu' && afterSchool(v), help: L('Tamil Nadu higher-education student ID. Optional unless a scheme asks for it.', 'தமிழ்நாடு உயர்கல்வி மாணவர் அடையாள எண். திட்டம் கேட்டால் மட்டும் தேவை.') },
    INCOME,
    yesno('govtSchool', 'govtSchool'),
    SOCIAL,
  ],
  farmer: [
    { key: 'farmingType', label: 'farmingType', type: 'select', required: true, options: [{ v: 'crops', label: 'crops' }, { v: 'horticulture', label: 'horticulture' }, { v: 'dairy', label: 'dairy' }, { v: 'fisheries', label: 'fisheries' }] },
    { key: 'landOwnership', label: 'landOwnership', type: 'select', required: true, options: [{ v: 'owner', label: 'owner' }, { v: 'tenant', label: 'tenant' }, { v: 'labourer', label: 'labourer' }] },
    { key: 'landAcres', label: 'landAcres', type: 'number', min: 0, max: 500, suffix: L('acres', 'ஏக்கர்').en, required: (v) => v.landOwnership !== 'labourer', show: (v) => !!v.landOwnership && v.landOwnership !== 'labourer', help: L('Land you cultivate, owned or leased.', 'நீங்கள் பயிரிடும் நிலம் (சொந்தம் அல்லது குத்தகை).') },
    yesno('leaseAgreement', L('Do you have a written lease / tenancy agreement?', 'எழுத்துப்பூர்வ குத்தகை ஒப்பந்தம் உள்ளதா?'), { required: true, show: (v) => v.landOwnership === 'tenant', help: L('Some schemes (like crop insurance) accept tenant farmers with a lease record.', 'பயிர்க் காப்பீடு போன்ற சில திட்டங்கள் குத்தகை ஆவணத்துடன் குத்தகை விவசாயிகளை ஏற்கின்றன.') }),
    { key: 'landOwnerName', label: L('Land owner’s name', 'நில உரிமையாளர் பெயர்'), type: 'text', show: (v) => v.landOwnership === 'tenant' },
    { key: 'village', label: L('Village / block', 'கிராமம் / வட்டாரம்'), type: 'text', required: true },
    { key: 'mainCrops', label: L('Main crops cultivated', 'முக்கியப் பயிர்கள்'), type: 'text', placeholder: 'Paddy, Banana', show: (v) => v.farmingType === 'crops' || v.farmingType === 'horticulture' },
    {
      key: 'irrigation',
      label: L('Irrigation availability', 'பாசன வசதி'),
      type: 'select',
      required: true,
      options: [
        { v: 'rainfed', label: L('Rain-fed only', 'மழையை நம்பி') },
        { v: 'borewell', label: L('Borewell / well', 'ஆழ்துளை / கிணறு') },
        { v: 'canal', label: L('Canal / tank', 'கால்வாய் / ஏரி') },
        { v: 'drip', label: L('Drip / sprinkler', 'சொட்டு / தெளிப்பு நீர்') },
      ],
    },
    INCOME,
    { key: 'farmerId', label: L('Farmer registration ID', 'விவசாயி பதிவு எண்'), type: 'text', help: L('If you have one (e.g. state farmer ID / Agri Stack).', 'இருந்தால் மட்டும் (மாநில விவசாயி அடையாள எண் போன்றவை).') },
    {
      key: 'pmKisan',
      label: L('PM-KISAN registration status', 'PM-KISAN பதிவு நிலை'),
      type: 'select',
      show: (v) => v.landOwnership === 'owner',
      options: [
        { v: 'registered', label: L('Registered', 'பதிவு செய்துள்ளேன்') },
        { v: 'not', label: L('Not registered', 'பதிவு செய்யவில்லை') },
        { v: 'unsure', label: L('Not sure', 'தெரியவில்லை') },
      ],
    },
  ],
  senior: [
    DOB,
    { key: 'address', label: L('Residential address', 'வீட்டு முகவரி'), type: 'textarea', required: true },
    INCOME,
    yesno('receivesPension', 'receivesPension', { required: true }),
    { key: 'pensionType', label: L('Which pension?', 'எந்த ஓய்வூதியம்?'), type: 'text', placeholder: 'e.g. State old age pension', show: (v) => v.receivesPension === 'yes' },
    yesno('hasDisability', L('Do you have a disability?', 'உங்களுக்கு மாற்றுத்திறன் உள்ளதா?')),
    { key: 'disabilityPercent', label: 'disabilityPercent', type: 'number', min: 0, max: 100, suffix: '%', show: (v) => v.hasDisability === 'yes' },
    yesno('bplCard', 'bplCard'),
  ],
  business: [
    { key: 'businessName', label: L('Business name', 'தொழில் பெயர்'), type: 'text', required: true },
    { key: 'businessType', label: 'businessType', type: 'select', required: true, options: [{ v: 'manufacturing', label: 'manufacturing' }, { v: 'services', label: 'services' }, { v: 'trading', label: 'trading' }, { v: 'artisan', label: 'artisan' }, { v: 'vendor', label: 'streetVendor' }] },
    {
      key: 'sector',
      label: L('Business sector', 'தொழில் துறை'),
      type: 'select',
      required: true,
      options: [
        { v: 'food', label: L('Food & agriculture', 'உணவு & வேளாண்') },
        { v: 'textile', label: L('Textiles & garments', 'ஜவுளி & ஆடை') },
        { v: 'retail', label: L('Retail & trade', 'சில்லறை வணிகம்') },
        { v: 'tech', label: L('IT & digital services', 'தகவல் தொழில்நுட்பம்') },
        { v: 'craft', label: L('Handicrafts', 'கைவினை') },
        { v: 'other', label: 'other' },
      ],
    },
    { key: 'businessStage', label: 'businessStage', type: 'select', required: true, options: [{ v: 'idea', label: 'stageIdea' }, { v: 'new', label: 'stageNew' }, { v: 'existing', label: 'stageExisting' }] },
    yesno('registered', L('Is the business registered?', 'தொழில் பதிவு செய்யப்பட்டுள்ளதா?'), { required: true, show: (v) => v.businessStage !== 'idea' }),
    { key: 'udyam', label: L('Udyam registration number', 'உத்யம் பதிவு எண்'), type: 'text', placeholder: 'UDYAM-TN-00-0000000', pattern: /^UDYAM-[A-Z]{2}-\d{2}-\d{7}$/i, show: (v) => v.registered === 'yes', help: L('Optional. Format: UDYAM-XX-00-0000000', 'விருப்பம். வடிவம்: UDYAM-XX-00-0000000') },
    yesno('gst', L('Do you have GST registration?', 'GST பதிவு உள்ளதா?'), { required: true, show: (v) => v.businessStage !== 'idea' }),
    { key: 'gstin', label: L('GSTIN', 'GSTIN எண்'), type: 'text', placeholder: '33ABCDE1234F1Z5', pattern: /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/i, required: true, show: (v) => v.gst === 'yes' },
    { key: 'employees', label: L('Number of employees', 'பணியாளர் எண்ணிக்கை'), type: 'number', min: 0, max: 100000, required: true },
    {
      key: 'turnover',
      label: L('Annual business turnover', 'ஆண்டு வர்த்தக அளவு'),
      type: 'select',
      required: true,
      options: [
        { v: 'lt5l', label: L('Below ₹5 lakh', '₹5 லட்சத்திற்குக் கீழ்') },
        { v: '5to25l', label: L('₹5 – 25 lakh', '₹5 – 25 லட்சம்') },
        { v: '25lto1cr', label: L('₹25 lakh – 1 crore', '₹25 லட்சம் – 1 கோடி') },
        { v: '1to5cr', label: L('₹1 – 5 crore', '₹1 – 5 கோடி') },
        { v: 'gt5cr', label: L('Above ₹5 crore', '₹5 கோடிக்கு மேல்') },
      ],
    },
  ],
  women: [
    DOB,
    { key: 'occupation', label: L('Occupation', 'தொழில்'), type: 'text', required: true },
    EMPLOYMENT,
    INCOME,
    yesno('shgMember', 'shgMember', { required: true }),
    { key: 'shgName', label: L('Self-help group name', 'சுய உதவிக் குழு பெயர்'), type: 'text', show: (v) => v.shgMember === 'yes' },
    {
      key: 'entrepreneur',
      label: L('Entrepreneurship', 'தொழில்முனைவு'),
      type: 'select',
      required: true,
      options: [
        { v: 'none', label: L('No business plans', 'தொழில் திட்டம் இல்லை') },
        { v: 'planning', label: 'stageIdea' },
        { v: 'running', label: L('Running a business', 'தொழில் நடத்துகிறேன்') },
      ],
    },
    yesno('headOfFamily', 'headOfFamily'),
    { key: 'welfareId', label: L('Welfare registration details', 'நலவாரியப் பதிவு விவரம்'), type: 'text', help: L('Optional, e.g. ration card or welfare board number.', 'விருப்பம் — உதா: குடும்ப அட்டை அல்லது நலவாரிய எண்.') },
  ],
  pwd: [
    DOB,
    {
      key: 'disabilityType',
      label: L('Disability category', 'மாற்றுத்திறன் வகை'),
      type: 'select',
      required: true,
      options: [
        { v: 'locomotor', label: L('Locomotor', 'இயக்கக் குறைபாடு') },
        { v: 'visual', label: L('Visual', 'பார்வைக் குறைபாடு') },
        { v: 'hearing', label: L('Hearing / speech', 'செவி / பேச்சுக் குறைபாடு') },
        { v: 'intellectual', label: L('Intellectual / developmental', 'அறிவுசார் குறைபாடு') },
        { v: 'multiple', label: L('Multiple disabilities', 'பல குறைபாடுகள்') },
        { v: 'other', label: 'other' },
      ],
    },
    yesno('certificate', L('Do you have a disability certificate?', 'மாற்றுத்திறன் சான்றிதழ் உள்ளதா?'), { required: true }),
    { key: 'disabilityPercent', label: 'disabilityPercent', type: 'number', min: 0, max: 100, suffix: '%', required: true, show: (v) => v.certificate === 'yes' },
    yesno('udid', L('Do you have a UDID card?', 'UDID அட்டை உள்ளதா?'), { required: true, help: L('Unique Disability ID card issued by the Government of India.', 'இந்திய அரசு வழங்கும் தனித்துவ மாற்றுத்திறன் அடையாள அட்டை.') }),
    EMPLOYMENT,
    INCOME,
  ],
  jobseeker: [
    DOB,
    EDUCATION('education', L('Highest educational qualification', 'உயர்ந்த கல்வித் தகுதி')),
    { key: 'skills', label: L('Technical skills', 'தொழில்நுட்பத் திறன்கள்'), type: 'text', placeholder: 'Tally, welding, driving…' },
    {
      key: 'employment',
      label: L('Employment status', 'வேலை நிலை'),
      type: 'select',
      required: true,
      options: [
        { v: 'unemployed', label: L('Unemployed', 'வேலை இல்லை') },
        { v: 'parttime', label: L('Part-time / temporary work', 'பகுதி நேர / தற்காலிக வேலை') },
        { v: 'finalyear', label: L('Final-year student', 'இறுதியாண்டு மாணவர்') },
      ],
    },
    { key: 'experience', label: L('Previous work experience', 'முன் பணி அனுபவம்'), type: 'number', min: 0, max: 50, suffix: L('years', 'ஆண்டுகள்').en, required: true },
    yesno('employmentRegistered', 'employmentRegistered', { required: true }),
    { key: 'empRegNo', label: L('Employment registration number', 'வேலைவாய்ப்பு பதிவு எண்'), type: 'text', show: (v) => v.employmentRegistered === 'yes' },
    {
      key: 'preferredSector',
      label: L('Preferred employment sector', 'விரும்பும் வேலைத் துறை'),
      type: 'select',
      required: true,
      options: [
        { v: 'govt', label: 'govt' },
        { v: 'private', label: 'private' },
        { v: 'self', label: 'wantSelf' },
        { v: 'any', label: 'any' },
      ],
    },
    { key: 'jobInterest', label: 'jobInterest', type: 'select', required: true, options: [{ v: 'job', label: 'wantJob' }, { v: 'training', label: 'wantTraining' }, { v: 'self', label: 'wantSelf' }] },
  ],
  general: [
    DOB,
    { key: 'occupation', label: L('Occupation', 'தொழில்'), type: 'text', required: true },
    {
      key: 'residence',
      label: L('Residential category', 'வசிப்பிட வகை'),
      type: 'select',
      required: true,
      options: [
        { v: 'rural', label: L('Rural (village)', 'கிராமப்புறம்') },
        { v: 'semi', label: L('Semi-urban (town)', 'சிறு நகரம்') },
        { v: 'urban', label: L('Urban (city)', 'நகர்ப்புறம்') },
      ],
    },
    INCOME,
    { key: 'rationCard', label: 'rationCard', type: 'select', options: [{ v: 'phh', label: 'rcPhh' }, { v: 'aay', label: 'rcAay' }, { v: 'nphh', label: 'rcNphh' }, { v: 'none', label: 'rcNone' }] },
    yesno('ownsHouse', 'ownsHouse'),
    SOCIAL,
  ],
};

export const visibleFields = (cat: CategoryId, v: Details, ctx: FieldCtx) => CATEGORY_FIELDS[cat].filter((f) => !f.show || f.show(v, ctx));
export const isRequired = (f: FieldDef, v: Details) => (typeof f.required === 'function' ? f.required(v) : !!f.required);

/** Returns an error key for a single field, or null. */
export function fieldError(f: FieldDef, v: Details): StringKey | null {
  const raw = v[f.key];
  const empty = raw === undefined || raw === '';
  if (empty) return isRequired(f, v) ? 'errRequired' : null;
  if (f.type === 'number') {
    const n = Number(raw);
    if (Number.isNaN(n)) return 'errPattern';
    if (f.min !== undefined && n < f.min) return 'errMin';
    if (f.max !== undefined && n > f.max) return 'errMax';
  }
  if (f.type === 'date') {
    const d = new Date(String(raw));
    if (Number.isNaN(d.getTime()) || d > new Date() || d.getFullYear() < 1900) return 'errDate';
  }
  if (f.pattern && !f.pattern.test(String(raw).trim())) return 'errPattern';
  return null;
}

export function ageFromDob(dob?: string | number) {
  if (!dob) return undefined;
  const d = new Date(String(dob));
  if (Number.isNaN(d.getTime())) return undefined;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) age--;
  return age;
}

/** Maps registration details onto the eligibility Profile used by the matching engine. */
export function profileFromAccount(a: { category: CategoryId; state: string; district: string; gender?: string; details: Details }): Profile {
  const d = a.details;
  const s = (k: string) => (d[k] === undefined || d[k] === '' ? undefined : String(d[k]));
  const n = (k: string) => (d[k] === undefined || d[k] === '' ? undefined : Number(d[k]));
  const yn = (k: string) => s(k) as 'yes' | 'no' | undefined;
  const p: Profile = {
    category: a.category,
    state: a.state,
    district: a.district,
    gender: (a.category === 'women' ? 'female' : a.gender) as Profile['gender'],
    age: ageFromDob(s('dob')),
    income: s('income') as Profile['income'],
    socialCategory: s('socialCategory') as Profile['socialCategory'],
    education: s('education'),
    institutionType: s('institutionType'),
    govtSchool: yn('govtSchool'),
    landOwnership: s('landOwnership'),
    landAcres: n('landAcres'),
    farmingType: s('farmingType'),
    businessType: s('businessType'),
    businessStage: s('businessStage'),
    shgMember: yn('shgMember'),
    headOfFamily: yn('headOfFamily'),
    receivesPension: yn('receivesPension'),
    bplCard: yn('bplCard'),
    disabilityPercent: n('disabilityPercent'),
    employmentRegistered: yn('employmentRegistered'),
    jobInterest: s('jobInterest'),
    rationCard: s('rationCard'),
    ownsHouse: yn('ownsHouse'),
    completed: true,
  };
  if (a.category === 'student' && p.age === undefined) delete p.age;
  return Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined)) as Profile;
}

/** Share of visible fields (required and optional) that have a value. */
export function profileCompletion(cat: CategoryId, v: Details, ctx: FieldCtx) {
  const fields = visibleFields(cat, v, ctx);
  if (!fields.length) return 100;
  const filled = fields.filter((f) => v[f.key] !== undefined && v[f.key] !== '').length;
  return Math.round((filled / fields.length) * 100);
}
