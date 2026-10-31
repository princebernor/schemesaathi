import type { LText } from '../types';

const L = (en: string, ta: string): LText => ({ en, ta });

/** Documents commonly asked for by schemes (shared by the central and state datasets). */
export const DOC = {
  aadhaar: L('Aadhaar card', 'ஆதார் அட்டை'),
  bank: L('Bank passbook (Aadhaar-seeded account)', 'வங்கிக் கணக்குப் புத்தகம் (ஆதார் இணைந்தது)'),
  income: L('Income certificate', 'வருமானச் சான்றிதழ்'),
  community: L('Community certificate (if applicable)', 'சாதிச் சான்றிதழ் (பொருந்தினால்)'),
  ration: L('Ration card', 'குடும்ப அட்டை'),
  residence: L('Residence / nativity proof', 'இருப்பிடச் சான்று'),
  photo: L('Passport-size photograph', 'பாஸ்போர்ட் அளவு புகைப்படம்'),
  age: L('Age proof (birth certificate / school record)', 'வயதுச் சான்று'),
  land: L('Land records (Patta / Chitta / Adangal)', 'நில ஆவணங்கள் (பட்டா / சிட்டா / அடங்கல்)'),
  udid: L('Disability certificate / UDID card', 'மாற்றுத்திறனாளி சான்றிதழ் / UDID அட்டை'),
  marks: L('Previous mark sheets', 'முந்தைய மதிப்பெண் சான்றிதழ்கள்'),
  bonafide: L('Bonafide certificate from institution', 'கல்வி நிறுவன உண்மைச் சான்றிதழ்'),
  project: L('Project report / business plan', 'திட்ட அறிக்கை'),
};
