import type { BenefitType, CategoryId, Lang } from '../types';

/**
 * Voice-assistant replies per language. Every language has a greeting; languages without a full
 * reply set fall back to English for the remaining replies (the UI then speaks them with an English voice).
 */
export const SPEECH_CODE: Record<Lang, string> = {
  en: 'en-IN', ta: 'ta-IN', hi: 'hi-IN', te: 'te-IN', kn: 'kn-IN', ml: 'ml-IN', bn: 'bn-IN',
  mr: 'mr-IN', gu: 'gu-IN', pa: 'pa-IN', or: 'or-IN', as: 'as-IN', ur: 'ur-IN',
};

export interface Facts {
  category?: CategoryId;
  study?: 'school' | 'college';
  place?: string;
  state?: string;
  age?: number;
  landAcres?: number;
  benefits: BenefitType[];
}

interface ReplySet {
  greet: string;
  langChanged?: string;
  askCategory?: string;
  askStudy?: string;
  understood?: (f: Facts) => string;
  offer?: (f: Facts) => string;
  confirm?: string;
  navigating?: string;
  cancelled?: string;
  notUnderstood?: string;
  verify?: string;
  refine?: (missing: ('age' | 'income' | 'land')[]) => string;
  opening?: string;
  /** scheme state vs. where the user is now */
  clarifyState?: (wanted: string, here: string) => string;
  noSpeech?: string;
  audioFailed?: string;
}

const join = (xs: string[], and: string) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} ${and} ${xs[xs.length - 1]}`);

/* ---------------- English ---------------- */
const EN_CAT: Record<CategoryId, string> = {
  student: 'a student', farmer: 'a farmer', senior: 'a senior citizen', business: 'a small business owner',
  women: 'a woman looking for women’s welfare schemes', pwd: 'a person with a disability', jobseeker: 'looking for a job', general: 'a citizen',
};
const EN_BEN: Record<BenefitType, string> = {
  scholarship: 'scholarships', insurance: 'insurance', subsidy: 'subsidies', loan: 'low-interest government loans', pension: 'pension schemes',
  housing: 'housing support', health: 'health cover', training: 'skill training', food: 'food security', cash: 'financial assistance',
};
const en: ReplySet = {
  greet: 'Hello! Welcome to SchemeSaathi. How can I help you discover government schemes and benefits today?',
  langChanged: 'Done! The website is now in English.',
  askCategory: 'Certainly! Which of these describes you best: student, farmer, senior citizen, small business owner, woman, person with disability, job seeker or general citizen?',
  askStudy: 'Certainly! Are you currently studying in school or college?',
  understood: (f) => {
    const who = f.category === 'student' && f.study ? `a ${f.study} student` : f.category ? EN_CAT[f.category] : 'looking for schemes';
    const bits = [f.place ? ` in ${f.place}` : '', f.age ? `, aged ${f.age}` : '', f.landAcres !== undefined ? `, with ${f.landAcres} acres of land` : ''];
    return `I understand you are ${who}${bits.join('')}.`;
  },
  offer: (f) => `I can help you discover ${f.benefits.length ? join(f.benefits.map((b) => EN_BEN[b]), 'and') : 'relevant government schemes'}${f.benefits.length ? ' and related welfare schemes' : ''}.`,
  confirm: 'Shall I open these schemes and use these details to personalise your results?',
  navigating: 'Great! Opening the matching schemes now.',
  cancelled: 'Okay, I have not changed anything. Ask me anything else.',
  notUnderstood: 'Sorry, I didn’t catch that. You can say, for example, “I am a farmer, show me subsidies”, or “Change the website to Tamil”.',
  verify: 'These are possible matches — final eligibility is decided by the government department.',
  refine: (m) => `To check eligibility more accurately, you can also tell me your ${join(m.map((x) => ({ age: 'age', income: 'annual family income', land: 'land size' })[x]), 'and')}.`,
  opening: 'Opening it for you.',
  clarifyState: (a, b) => `Do you want schemes for ${a}, or for ${b} where you are now?`,
  noSpeech: 'I could not hear anything. Please tap the microphone and speak again, a little closer to it.',
  audioFailed: 'I could not process the recording. I have switched to the browser’s speech recognition — tap the microphone again, or type your question.',
};

/* ---------------- Tamil ---------------- */
const TA_CAT: Record<CategoryId, string> = {
  student: 'மாணவர்', farmer: 'விவசாயி', senior: 'மூத்த குடிமகன்', business: 'சிறு தொழில் உரிமையாளர்', women: 'பெண்', pwd: 'மாற்றுத்திறனாளி', jobseeker: 'வேலை தேடுபவர்', general: 'குடிமகன்',
};
const TA_BEN: Record<BenefitType, string> = {
  scholarship: 'கல்வி உதவித்தொகை', insurance: 'காப்பீடு', subsidy: 'மானியங்கள்', loan: 'குறைந்த வட்டி அரசுக் கடன்', pension: 'ஓய்வூதியத் திட்டங்கள்',
  housing: 'வீட்டு வசதி', health: 'மருத்துவக் காப்பீடு', training: 'திறன் பயிற்சி', food: 'உணவுப் பாதுகாப்பு', cash: 'நிதியுதவி',
};
const TA_LOC: Record<string, string> = { 'Tamil Nadu': 'தமிழ்நாட்டில்', Karnataka: 'கர்நாடகாவில்', Kerala: 'கேரளாவில்', Chennai: 'சென்னையில்', Madurai: 'மதுரையில்', Coimbatore: 'கோயம்புத்தூரில்', 'Bengaluru Urban': 'பெங்களூருவில்' };
const ta: ReplySet = {
  greet: 'வணக்கம்! SchemeSaathi-க்கு உங்களை அன்புடன் வரவேற்கிறோம். உங்களுக்கு என்ன உதவி தேவை?',
  langChanged: 'சரி! இணையதளம் இப்போது தமிழில் உள்ளது. இனி நான் தமிழில் பேசுகிறேன்.',
  askCategory: 'நிச்சயமாக! நீங்கள் மாணவரா, விவசாயியா, மூத்த குடிமகனா, சிறு தொழில் உரிமையாளரா, பெண்கள் நலத்திட்டம் தேடுபவரா, மாற்றுத்திறனாளியா அல்லது வேலை தேடுபவரா?',
  askStudy: 'நிச்சயமாக! நீங்கள் தற்போது பள்ளியில் படிக்கிறீர்களா அல்லது கல்லூரியில் படிக்கிறீர்களா?',
  understood: (f) => {
    const loc = f.place ? `${TA_LOC[f.place] ?? `${f.place}-இல்`} ` : '';
    const who = f.category === 'student' && f.study ? `${f.study === 'college' ? 'கல்லூரியில்' : 'பள்ளியில்'} படிக்கும் மாணவர்` : f.category ? TA_CAT[f.category] : 'திட்டங்களைத் தேடுபவர்';
    const extra = [f.age ? `, வயது ${f.age}` : '', f.landAcres !== undefined ? `, ${f.landAcres} ஏக்கர் நிலம் உள்ளவர்` : ''].join('');
    return `நீங்கள் ${loc}${who}${extra} என்பதைப் புரிந்துகொண்டேன்.`;
  },
  offer: (f) => `உங்களுக்கு பொருத்தமான ${f.benefits.length ? `${f.benefits.map((b) => TA_BEN[b]).join(', ')} மற்றும் ` : ''}அரசு நலத்திட்டங்களைக் கண்டறிய உதவுகிறேன்.`,
  confirm: 'இந்தத் திட்டங்களைத் திறந்து, இந்த விவரங்களுடன் முடிவுகளைத் தனிப்பயனாக்கட்டுமா?',
  navigating: 'சரி! பொருத்தமான திட்டங்களை இப்போது திறக்கிறேன்.',
  cancelled: 'சரி, எதையும் மாற்றவில்லை. வேறு ஏதாவது கேளுங்கள்.',
  notUnderstood: 'மன்னிக்கவும், புரியவில்லை. உதாரணமாக “நான் விவசாயி, மானியங்களைக் காட்டு” என்று சொல்லலாம்.',
  verify: 'இவை சாத்தியமான பொருத்தங்கள் மட்டுமே — இறுதித் தகுதியை அரசுத் துறையே முடிவு செய்யும்.',
  refine: (m) => `தகுதியைத் துல்லியமாகச் சரிபார்க்க உங்கள் ${m.map((x) => ({ age: 'வயது', income: 'குடும்ப ஆண்டு வருமானம்', land: 'நில அளவு' })[x]).join(', ')} ஆகியவற்றையும் சொல்லலாம்.`,
  opening: 'திறக்கிறேன்.',
  clarifyState: (a, b) => `${a} மாநிலத் திட்டங்கள் வேண்டுமா, அல்லது நீங்கள் இப்போது இருக்கும் ${b} மாநிலத் திட்டங்களா?`,
  noSpeech: 'எதுவும் கேட்கவில்லை. மைக்கைத் தட்டி, சற்று அருகில் மீண்டும் பேசுங்கள்.',
  audioFailed: 'பதிவைச் செயலாக்க முடியவில்லை. உலாவியின் பேச்சு அறிதலுக்கு மாற்றியுள்ளேன் — மீண்டும் மைக்கைத் தட்டுங்கள் அல்லது தட்டச்சு செய்யுங்கள்.',
};

/* ---------------- Hindi ---------------- */
const HI_CAT: Record<CategoryId, string> = {
  student: 'छात्र', farmer: 'किसान', senior: 'वरिष्ठ नागरिक', business: 'छोटे व्यवसाय के मालिक', women: 'महिला', pwd: 'दिव्यांग व्यक्ति', jobseeker: 'नौकरी की तलाश में', general: 'नागरिक',
};
const HI_BEN: Record<BenefitType, string> = {
  scholarship: 'छात्रवृत्ति', insurance: 'बीमा', subsidy: 'सब्सिडी', loan: 'कम ब्याज वाले सरकारी ऋण', pension: 'पेंशन योजनाओं',
  housing: 'आवास सहायता', health: 'स्वास्थ्य बीमा', training: 'कौशल प्रशिक्षण', food: 'खाद्य सुरक्षा', cash: 'आर्थिक सहायता',
};
const HI_PLACE: Record<string, string> = { 'Tamil Nadu': 'तमिलनाडु', Karnataka: 'कर्नाटक', Kerala: 'केरल', Maharashtra: 'महाराष्ट्र', Delhi: 'दिल्ली', 'Bengaluru Urban': 'बेंगलुरु', Chennai: 'चेन्नई' };
const hi: ReplySet = {
  greet: 'नमस्ते! SchemeSaathi में आपका स्वागत है। मैं आपकी क्या सहायता कर सकता हूँ?',
  langChanged: 'हो गया! वेबसाइट अब हिंदी में है। अब मैं हिंदी में बात करूँगा।',
  askCategory: 'ज़रूर! आप इनमें से कौन हैं: छात्र, किसान, वरिष्ठ नागरिक, छोटे व्यवसाय के मालिक, महिला, दिव्यांग व्यक्ति या नौकरी की तलाश में?',
  askStudy: 'ज़रूर! क्या आप अभी स्कूल में पढ़ रहे हैं या कॉलेज में?',
  understood: (f) => {
    const place = f.place ? `${HI_PLACE[f.place] ?? f.place} में रहने वाले ` : '';
    const who = f.category === 'student' && f.study ? `${f.study === 'college' ? 'कॉलेज' : 'स्कूल'} के छात्र` : f.category ? HI_CAT[f.category] : 'योजनाएँ खोज रहे व्यक्ति';
    const age = f.age ? ` और आपकी उम्र ${f.age} साल है` : '';
    const land = f.landAcres !== undefined ? `, आपके पास ${f.landAcres} एकड़ ज़मीन है` : '';
    return `मैं समझ गया कि आप ${place}${who} हैं${age}${land}।`;
  },
  offer: (f) => `मैं आपके लिए ${f.benefits.length ? `${f.benefits.map((b) => HI_BEN[b]).join(', ')} से जुड़ी ` : ''}उपयुक्त सरकारी योजनाएँ खोजने में मदद करूँगा।`,
  confirm: 'क्या मैं ये योजनाएँ खोलूँ और इन जानकारियों से परिणाम व्यक्तिगत करूँ?',
  navigating: 'ठीक है! मिलती-जुलती योजनाएँ अभी खोल रहा हूँ।',
  cancelled: 'ठीक है, मैंने कुछ नहीं बदला। कुछ और पूछिए।',
  notUnderstood: 'माफ़ कीजिए, मैं समझ नहीं पाया। आप कह सकते हैं, “मैं किसान हूँ, सब्सिडी दिखाइए”।',
  verify: 'ये संभावित योजनाएँ हैं — अंतिम पात्रता सरकारी विभाग तय करेगा।',
  refine: (m) => `पात्रता बेहतर जाँचने के लिए आप अपनी ${m.map((x) => ({ age: 'उम्र', income: 'वार्षिक पारिवारिक आय', land: 'ज़मीन का आकार' })[x]).join(', ')} भी बता सकते हैं।`,
  opening: 'खोल रहा हूँ।',
  clarifyState: (a, b) => `क्या आपको ${a} की योजनाएँ चाहिए, या ${b} की, जहाँ आप अभी हैं?`,
  noSpeech: 'मुझे कुछ सुनाई नहीं दिया। माइक दबाकर थोड़ा पास से फिर बोलिए।',
  audioFailed: 'रिकॉर्डिंग प्रोसेस नहीं हो सकी। मैंने ब्राउज़र की आवाज़ पहचान चालू कर दी है — माइक फिर दबाइए या लिखिए।',
};

/* ---------------- Kannada ---------------- */
const KN_CAT: Record<CategoryId, string> = {
  student: 'ವಿದ್ಯಾರ್ಥಿ', farmer: 'ರೈತ', senior: 'ಹಿರಿಯ ನಾಗರಿಕ', business: 'ಸಣ್ಣ ವ್ಯಾಪಾರಿ', women: 'ಮಹಿಳೆ', pwd: 'ವಿಕಲಚೇತನ ವ್ಯಕ್ತಿ', jobseeker: 'ಉದ್ಯೋಗಾಕಾಂಕ್ಷಿ', general: 'ನಾಗರಿಕ',
};
const KN_BEN: Record<BenefitType, string> = {
  scholarship: 'ವಿದ್ಯಾರ್ಥಿ ವೇತನ', insurance: 'ವಿಮೆ', subsidy: 'ಸಬ್ಸಿಡಿ', loan: 'ಕಡಿಮೆ ಬಡ್ಡಿಯ ಸರ್ಕಾರಿ ಸಾಲ', pension: 'ಪಿಂಚಣಿ',
  housing: 'ವಸತಿ ನೆರವು', health: 'ಆರೋಗ್ಯ ವಿಮೆ', training: 'ಕೌಶಲ್ಯ ತರಬೇತಿ', food: 'ಆಹಾರ ಭದ್ರತೆ', cash: 'ಆರ್ಥಿಕ ನೆರವು',
};
const KN_LOC: Record<string, string> = { 'Bengaluru Urban': 'ಬೆಂಗಳೂರಿನಲ್ಲಿರುವ', Karnataka: 'ಕರ್ನಾಟಕದಲ್ಲಿರುವ', 'Tamil Nadu': 'ತಮಿಳುನಾಡಿನಲ್ಲಿರುವ', Mysuru: 'ಮೈಸೂರಿನಲ್ಲಿರುವ' };
const kn: ReplySet = {
  greet: 'ನಮಸ್ಕಾರ! SchemeSaathi ಗೆ ನಿಮಗೆ ಸ್ವಾಗತ. ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?',
  langChanged: 'ಆಯಿತು! ವೆಬ್‌ಸೈಟ್ ಈಗ ಕನ್ನಡದಲ್ಲಿದೆ.',
  askCategory: 'ಖಂಡಿತ! ನೀವು ವಿದ್ಯಾರ್ಥಿ, ರೈತ, ಹಿರಿಯ ನಾಗರಿಕ, ಸಣ್ಣ ವ್ಯಾಪಾರಿ, ಮಹಿಳೆ, ವಿಕಲಚೇತನ ವ್ಯಕ್ತಿ ಅಥವಾ ಉದ್ಯೋಗಾಕಾಂಕ್ಷಿ — ಯಾರು?',
  askStudy: 'ಖಂಡಿತ! ನೀವು ಈಗ ಶಾಲೆಯಲ್ಲಿ ಓದುತ್ತಿದ್ದೀರಾ ಅಥವಾ ಕಾಲೇಜಿನಲ್ಲಿ?',
  understood: (f) => {
    const loc = f.place ? `${KN_LOC[f.place] ?? `${f.place}ನಲ್ಲಿರುವ`} ` : '';
    const who = f.category === 'student' && f.study ? `${f.study === 'college' ? 'ಕಾಲೇಜು' : 'ಶಾಲಾ'} ವಿದ್ಯಾರ್ಥಿ` : f.category ? KN_CAT[f.category] : 'ಯೋಜನೆ ಹುಡುಕುತ್ತಿರುವವರು';
    const age = f.age ? ` (ವಯಸ್ಸು ${f.age})` : '';
    return `ನೀವು ${loc}${who}${age} ಎಂದು ನಾನು ಅರ್ಥಮಾಡಿಕೊಂಡೆ.`;
  },
  offer: (f) => `ನಿಮಗೆ ಸೂಕ್ತವಾದ ${f.benefits.length ? `${f.benefits.map((b) => KN_BEN[b]).join(', ')} ಸಂಬಂಧಿತ ` : ''}ಸರ್ಕಾರಿ ಯೋಜನೆಗಳನ್ನು ಹುಡುಕಲು ಸಹಾಯ ಮಾಡುತ್ತೇನೆ.`,
  confirm: 'ಈ ಯೋಜನೆಗಳನ್ನು ತೆರೆಯಲೇ?',
  navigating: 'ಸರಿ! ಹೊಂದುವ ಯೋಜನೆಗಳನ್ನು ಈಗ ತೆರೆಯುತ್ತಿದ್ದೇನೆ.',
  cancelled: 'ಸರಿ, ನಾನು ಏನನ್ನೂ ಬದಲಾಯಿಸಿಲ್ಲ.',
  notUnderstood: 'ಕ್ಷಮಿಸಿ, ಅರ್ಥವಾಗಲಿಲ್ಲ. ಉದಾಹರಣೆಗೆ “ನಾನು ರೈತ, ಸಬ್ಸಿಡಿ ತೋರಿಸಿ” ಎಂದು ಹೇಳಿ.',
  verify: 'ಇವು ಸಾಧ್ಯವಿರುವ ಯೋಜನೆಗಳು — ಅಂತಿಮ ಅರ್ಹತೆಯನ್ನು ಸರ್ಕಾರಿ ಇಲಾಖೆ ನಿರ್ಧರಿಸುತ್ತದೆ.',
  refine: (m) => `ಅರ್ಹತೆಯನ್ನು ಉತ್ತಮವಾಗಿ ಪರಿಶೀಲಿಸಲು ನಿಮ್ಮ ${m.map((x) => ({ age: 'ವಯಸ್ಸು', income: 'ಕುಟುಂಬದ ವಾರ್ಷಿಕ ಆದಾಯ', land: 'ಜಮೀನಿನ ಗಾತ್ರ' })[x]).join(', ')} ತಿಳಿಸಬಹುದು.`,
  opening: 'ತೆರೆಯುತ್ತಿದ್ದೇನೆ.',
  clarifyState: (a, b) => `ನಿಮಗೆ ${a} ರಾಜ್ಯದ ಯೋಜನೆಗಳು ಬೇಕೇ, ಅಥವಾ ನೀವು ಈಗ ಇರುವ ${b} ರಾಜ್ಯದ ಯೋಜನೆಗಳೇ?`,
  noSpeech: 'ನನಗೆ ಏನೂ ಕೇಳಿಸಲಿಲ್ಲ. ಮೈಕ್ ಒತ್ತಿ ಸ್ವಲ್ಪ ಹತ್ತಿರದಿಂದ ಮತ್ತೆ ಮಾತನಾಡಿ.',
  audioFailed: 'ರೆಕಾರ್ಡಿಂಗ್ ಪ್ರಕ್ರಿಯೆಗೊಳಿಸಲು ಆಗಲಿಲ್ಲ. ಬ್ರೌಸರ್ ಧ್ವನಿ ಗುರುತಿಸುವಿಕೆಗೆ ಬದಲಾಯಿಸಿದ್ದೇನೆ — ಮತ್ತೆ ಮೈಕ್ ಒತ್ತಿ ಅಥವಾ ಟೈಪ್ ಮಾಡಿ.',
};

/* ---------------- Telugu ---------------- */
const TE_CAT: Record<CategoryId, string> = {
  student: 'విద్యార్థి', farmer: 'రైతు', senior: 'వృద్ధ పౌరులు', business: 'చిన్న వ్యాపార యజమాని', women: 'మహిళ', pwd: 'దివ్యాంగులు', jobseeker: 'ఉద్యోగార్థి', general: 'పౌరులు',
};
const te: ReplySet = {
  greet: 'నమస్కారం! SchemeSaathi కి స్వాగతం. నేను మీకు ఎలా సహాయం చేయగలను?',
  langChanged: 'అయింది! వెబ్‌సైట్ ఇప్పుడు తెలుగులో ఉంది.',
  askCategory: 'తప్పకుండా! మీరు విద్యార్థి, రైతు, వృద్ధ పౌరులు, చిన్న వ్యాపార యజమాని, మహిళ, దివ్యాంగులు లేదా ఉద్యోగార్థి — ఎవరు?',
  askStudy: 'తప్పకుండా! మీరు ఇప్పుడు పాఠశాలలో చదువుతున్నారా లేదా కళాశాలలోనా?',
  understood: (f) => `మీరు ${f.place ? `${f.place}లోని ` : ''}${f.category ? TE_CAT[f.category] : 'పథకాలు వెతుకుతున్నవారు'}${f.age ? ` (వయసు ${f.age})` : ''} అని అర్థమైంది.`,
  offer: () => 'మీకు సరిపోయే ప్రభుత్వ పథకాలను కనుగొనడంలో సహాయం చేస్తాను.',
  confirm: 'ఈ పథకాలను తెరవమంటారా?',
  navigating: 'సరే! సరిపోయే పథకాలను ఇప్పుడు తెరుస్తున్నాను.',
  cancelled: 'సరే, ఏమీ మార్చలేదు.',
  notUnderstood: 'క్షమించండి, అర్థం కాలేదు. ఉదా: “నేను రైతును, సబ్సిడీలు చూపించు” అని చెప్పండి.',
  verify: 'ఇవి సాధ్యమైన పథకాలు మాత్రమే — తుది అర్హతను ప్రభుత్వ శాఖ నిర్ణయిస్తుంది.',
  clarifyState: (a, b) => `మీకు ${a} పథకాలు కావాలా, లేక మీరు ఇప్పుడు ఉన్న ${b} పథకాలా?`,
  noSpeech: 'నాకు ఏమీ వినిపించలేదు. మైక్ నొక్కి కొంచెం దగ్గరగా మళ్ళీ మాట్లాడండి.',
};

/* ---------------- Malayalam ---------------- */
const ML_CAT: Record<CategoryId, string> = {
  student: 'വിദ്യാർത്ഥി', farmer: 'കർഷകൻ', senior: 'മുതിർന്ന പൗരൻ', business: 'ചെറുകിട സംരംഭകൻ', women: 'വനിത', pwd: 'ഭിന്നശേഷിക്കാരൻ', jobseeker: 'തൊഴിൽ അന്വേഷകൻ', general: 'പൗരൻ',
};
const ml: ReplySet = {
  greet: 'നമസ്കാരം! SchemeSaathi-ലേക്ക് സ്വാഗതം. ഞാൻ നിങ്ങളെ എങ്ങനെ സഹായിക്കണം?',
  langChanged: 'ശരി! വെബ്സൈറ്റ് ഇപ്പോൾ മലയാളത്തിലാണ്.',
  askCategory: 'തീർച്ചയായും! നിങ്ങൾ വിദ്യാർത്ഥി, കർഷകൻ, മുതിർന്ന പൗരൻ, ചെറുകിട സംരംഭകൻ, വനിത, ഭിന്നശേഷിക്കാരൻ അല്ലെങ്കിൽ തൊഴിൽ അന്വേഷകൻ — ആരാണ്?',
  askStudy: 'തീർച്ചയായും! നിങ്ങൾ ഇപ്പോൾ സ്കൂളിലാണോ കോളേജിലാണോ പഠിക്കുന്നത്?',
  understood: (f) => `നിങ്ങൾ ${f.category ? ML_CAT[f.category] : 'പദ്ധതികൾ തിരയുന്ന ആൾ'} ആണെന്ന് മനസ്സിലായി${f.place ? ` (${f.place})` : ''}.`,
  offer: () => 'നിങ്ങൾക്ക് അനുയോജ്യമായ സർക്കാർ പദ്ധതികൾ കണ്ടെത്താൻ ഞാൻ സഹായിക്കാം.',
  confirm: 'ഈ പദ്ധതികൾ തുറക്കട്ടെ?',
  navigating: 'ശരി! അനുയോജ്യമായ പദ്ധതികൾ ഇപ്പോൾ തുറക്കുന്നു.',
  cancelled: 'ശരി, ഒന്നും മാറ്റിയിട്ടില്ല.',
  notUnderstood: 'ക്ഷമിക്കണം, മനസ്സിലായില്ല. ഉദാ: “ഞാൻ കർഷകനാണ്, സബ്സിഡി കാണിക്കൂ” എന്ന് പറയൂ.',
  verify: 'ഇവ സാധ്യമായ പദ്ധതികൾ മാത്രം — അന്തിമ യോഗ്യത സർക്കാർ വകുപ്പ് തീരുമാനിക്കും.',
  clarifyState: (a, b) => `നിങ്ങൾക്ക് ${a} പദ്ധതികളാണോ വേണ്ടത്, അതോ ഇപ്പോൾ നിങ്ങൾ ഉള്ള ${b} പദ്ധതികളോ?`,
  noSpeech: 'ഒന്നും കേട്ടില്ല. മൈക്ക് അമർത്തി കുറച്ചുകൂടി അടുത്ത് വീണ്ടും സംസാരിക്കൂ.',
};

/* ---------------- Greeting-level languages ---------------- */
const bn: ReplySet = { greet: 'নমস্কার! SchemeSaathi-তে আপনাকে স্বাগতম। আমি আপনাকে কীভাবে সাহায্য করতে পারি?', langChanged: 'হয়ে গেছে! ওয়েবসাইট এখন বাংলায়।', offer: () => 'আমি আপনার জন্য উপযুক্ত সরকারি প্রকল্প খুঁজে দিতে সাহায্য করব।' };
const mr: ReplySet = { greet: 'नमस्कार! SchemeSaathi मध्ये आपले स्वागत आहे. मी आपली कशी मदत करू शकतो?', langChanged: 'झाले! वेबसाइट आता मराठीत आहे.', offer: () => 'मी तुमच्यासाठी योग्य सरकारी योजना शोधण्यात मदत करेन.' };
const gu: ReplySet = { greet: 'નમસ્તે! SchemeSaathi માં આપનું સ્વાગત છે. હું આપની કેવી રીતે મદદ કરી શકું?', langChanged: 'થઈ ગયું! વેબસાઇટ હવે ગુજરાતીમાં છે.', offer: () => 'હું તમારા માટે યોગ્ય સરકારી યોજનાઓ શોધવામાં મદદ કરીશ.' };
const pa: ReplySet = { greet: 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ! SchemeSaathi ਵਿੱਚ ਤੁਹਾਡਾ ਸਵਾਗਤ ਹੈ। ਮੈਂ ਤੁਹਾਡੀ ਕੀ ਮਦਦ ਕਰ ਸਕਦਾ ਹਾਂ?', langChanged: 'ਹੋ ਗਿਆ! ਵੈੱਬਸਾਈਟ ਹੁਣ ਪੰਜਾਬੀ ਵਿੱਚ ਹੈ।', offer: () => 'ਮੈਂ ਤੁਹਾਡੇ ਲਈ ਢੁਕਵੀਆਂ ਸਰਕਾਰੀ ਯੋਜਨਾਵਾਂ ਲੱਭਣ ਵਿੱਚ ਮਦਦ ਕਰਾਂਗਾ।' };
const or: ReplySet = { greet: 'ନମସ୍କାର! SchemeSaathi କୁ ଆପଣଙ୍କୁ ସ୍ୱାଗତ। ମୁଁ ଆପଣଙ୍କୁ କିପରି ସାହାଯ୍ୟ କରିପାରିବି?', langChanged: 'ହୋଇଗଲା! ୱେବସାଇଟ ଏବେ ଓଡ଼ିଆରେ ଅଛି।', offer: () => 'ମୁଁ ଆପଣଙ୍କ ପାଇଁ ଉପଯୁକ୍ତ ସରକାରୀ ଯୋଜନା ଖୋଜିବାରେ ସାହାଯ୍ୟ କରିବି।' };
const as: ReplySet = { greet: 'নমস্কাৰ! SchemeSaathi লৈ আপোনাক স্বাগতম। মই আপোনাক কেনেকৈ সহায় কৰিব পাৰোঁ?', langChanged: 'হ’ল! ৱেবছাইট এতিয়া অসমীয়াত।', offer: () => 'মই আপোনাৰ বাবে উপযুক্ত চৰকাৰী আঁচনি বিচাৰি দিয়াত সহায় কৰিম।' };
const ur: ReplySet = { greet: 'السلام علیکم! SchemeSaathi میں آپ کا خیر مقدم ہے۔ میں آپ کی کیا مدد کر سکتا ہوں؟', langChanged: 'ہو گیا! ویب سائٹ اب اردو میں ہے۔', offer: () => 'میں آپ کے لیے مناسب سرکاری اسکیمیں تلاش کرنے میں مدد کروں گا۔' };

const REPLIES: Record<Lang, ReplySet> = { en, ta, hi, kn, te, ml, bn, mr, gu, pa, or, as, ur };

export interface Spoken {
  text: string;
  lang: Lang;
}
type Key = Exclude<keyof ReplySet, 'understood' | 'offer' | 'refine' | 'clarifyState'>;

/** Text for `key` in `lang`, falling back to English (and reporting the language actually used). */
export function reply(lang: Lang, key: Key): Spoken {
  const s = REPLIES[lang][key];
  return s ? { text: s, lang } : { text: en[key] as string, lang: 'en' };
}
export function replyFn<K extends 'understood' | 'offer' | 'refine' | 'clarifyState'>(lang: Lang, key: K, ...args: Parameters<NonNullable<ReplySet[K]>>): Spoken {
  const fn = (REPLIES[lang][key] ?? en[key]) as (...a: unknown[]) => string;
  return { text: fn(...args), lang: REPLIES[lang][key] ? lang : 'en' };
}
