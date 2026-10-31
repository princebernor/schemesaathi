import { DISTRICTS } from '../data/locations';
import type { BenefitType, CategoryId, Lang } from '../types';

/**
 * Rule-based multilingual understanding for the voice assistant (prototype).
 * One sentence can yield language, location, category, age, land, study level, benefits and intent together.
 * Swap `understand` for a call to a multilingual AI service later; keep the returned shape.
 */
export interface Understanding {
  lang: Lang;
  intent: 'change_lang' | 'find' | 'yes' | 'no' | 'greet' | 'navigate' | 'unknown';
  targetLang?: Lang;
  category?: CategoryId;
  state?: string;
  district?: string;
  age?: number;
  landAcres?: number;
  study?: 'school' | 'college';
  benefits: BenefitType[];
  page?: 'saved' | 'checklist' | 'compare' | 'account' | 'auth' | 'schemes';
}

/* ---------- 1. spoken/typed language from script and marker words ---------- */
const SCRIPTS: [RegExp, Lang][] = [
  [/[஀-௿]/, 'ta'],
  [/[ಀ-೿]/, 'kn'],
  [/[ఀ-౿]/, 'te'],
  [/[ഀ-ൿ]/, 'ml'],
  [/[઀-૿]/, 'gu'],
  [/[਀-੿]/, 'pa'],
  [/[଀-୿]/, 'or'],
  [/[؀-ۿ]/, 'ur'],
  [/[ঀ-৿]/, 'bn'],
  [/[ऀ-ॿ]/, 'hi'],
];

export function detectLang(text: string): Lang {
  const counts = new Map<Lang, number>();
  for (const ch of text) for (const [re, l] of SCRIPTS) if (re.test(ch)) counts.set(l, (counts.get(l) ?? 0) + 1);
  if (!counts.size) return 'en';
  let lang = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  // Devanagari is shared by Hindi and Marathi; Bengali script by Bengali and Assamese
  if (lang === 'hi' && /(आहे|मला|माझ|पाहिजे|आम्ही|तुम्ही|मध्ये|नाही|करायच)/.test(text)) lang = 'mr';
  if (lang === 'bn' && /[ৰৱ]|মই|মোৰ|আপোনাৰ/.test(text)) lang = 'as';
  return lang;
}

/* ---------- 2. language names (for "change the website to X") ---------- */
const LANG_NAMES: [Lang, RegExp][] = [
  ['ta', /\btamil\b(?!\s*nadu)|தமிழ்(?!நா|\s*நா)|तमिल(?!\s*नाडु|नाडु)|ತಮಿಳು(?!ನಾಡು)|ತಮಿಳ|తమిళ(?!నాడు)|തമിഴ്(?!നാട്)|তামিল|તમિલ|ਤਮਿਲ|ତାମିଲ|تامل/i],
  ['hi', /\bhindi\b|இந்தி|ஹிந்தி|हिंदी|हिन्दी|ಹಿಂದಿ|హిందీ|ഹിന്ദി|হিন্দি|હિન્દી|ਹਿੰਦੀ|ହିନ୍ଦୀ|ہندی/i],
  ['te', /\btelugu\b|தெலுங்கு|तेलुगु|ತೆಲುಗು|తెలుగు|തെലുങ്ക്|তেলুগু|તેલુગુ|ਤੇਲਗੂ|ତେଲୁଗୁ|تیلگو/i],
  ['kn', /\bkannada\b|கன்னட|कन्नड़|कन्नड|ಕನ್ನಡ|కన్నడ|കന്നഡ|কন্নড়|કન્નડ|ਕੰਨੜ|କନ୍ନଡ|کنڑ/i],
  ['ml', /\bmalayalam\b|மலையாள|मलयालम|ಮಲಯಾಳ|మలయాళ|മലയാള|মালয়ালম|મલયાલમ|ਮਲਿਆਲਮ|ମାଲାୟାଲମ|ملیالم/i],
  ['bn', /\bbengali\b|\bbangla\b|வங்காள|बंगाली|बांग्ला|ಬಂಗಾಳಿ|బెంగాలీ|ബംഗാളി|বাংলা|બંગાળી|ਬੰਗਾਲੀ|ବଙ୍ଗଳା|بنگالی/i],
  ['mr', /\bmarathi\b|மராத்தி|मराठी|ಮರಾಠಿ|మరాఠీ|മറാത്തി|মারাঠি|મરાઠી|ਮਰਾਠੀ|ମରାଠୀ|مراٹھی/i],
  ['gu', /\bgujarati\b|குஜராத்தி|गुजराती|ಗುಜರಾತಿ|గుజరాతీ|ഗുജറാത്തി|গুজরাটি|ગુજરાતી|ਗੁਜਰਾਤੀ|ଗୁଜୁରାଟୀ|گجراتی/i],
  ['pa', /\bpunjabi\b|பஞ்சாபி|पंजाबी|ಪಂಜಾಬಿ|పంజాబీ|പഞ്ചാബി|পাঞ্জাবি|પંજાબી|ਪੰਜਾਬੀ|ପଞ୍ଜାବୀ|پنجابی/i],
  ['or', /\bodia\b|\boriya\b|ஒடியா|ओड़िया|ओडिया|उड़िया|ಒಡಿಯಾ|ఒడియా|ഒഡിയ|ওড়িয়া|ઓડિયા|ਉੜੀਆ|ଓଡ଼ିଆ|اوڑیہ/i],
  ['as', /\bassamese\b|அஸ்ஸாமி|असमिया|ಅಸ್ಸಾಮಿ|అస్సామీ|ആസാമീസ്|অসমীয়া|অসমিয়া|આસામી|ਅਸਾਮੀ|ଅସମୀୟା|آسامی/i],
  ['ur', /\burdu\b|உருது|उर्दू|ಉರ್ದು|ఉర్దూ|ഉറുദു|উর্দু|ઉર્દૂ|ਉਰਦੂ|ଉର୍ଦ୍ଦୁ|اردو/i],
  ['en', /\benglish\b|ஆங்கில|இங்கிலீஷ்|अंग्रेज़ी|अंग्रेजी|इंग्लिश|ಇಂಗ್ಲಿಷ್|ಆಂಗ್ಲ|ఇంగ్లీష్|ఆంగ్ల|ഇംഗ്ലീഷ്|ইংরেজি|इंग्रजी|અંગ્રેજી|ਅੰਗਰੇਜ਼ੀ|ଇଂରାଜୀ|ইংৰাজী|انگریزی/i],
];
// "language", "website", "change", "switch" in every supported language (and common transliterations of "website")
const LANG_CHANGE =
  /language|website|\bsite\b|change|switch|translate|convert|चेंज|कन्वर्ट|में\s*(?:कर\s*दो|करो|करें|कीजिए|दिखाओ|दिखाइए)|மாத்து|\bbadlo\b|\bbadal\b|mozhi|bhasha|மொழி|இணையதள|வெப்சைட்|மாற்ற|பதல|भाषा|वेबसाइट|बदल|ಭಾಷೆ|ವೆಬ್|ಬದಲ|భాష|వెబ్‌సైట్|మార్చ|ഭാഷ|വെബ്സൈറ്റ്|മാറ്റ|ভাষা|ওয়েবসাইট|পরিবর্তন|বদল|সলনি|भाषेत|बदला|ભાષા|વેબસાઇટ|બદલ|ਭਾਸ਼ਾ|ਵੈੱਬਸਾਈਟ|ਬਦਲ|ଭାଷା|ୱେବସାଇଟ|ବଦଳ|زبان|ویب سائٹ|بدل/i;

/* ---------- 3. places ---------- */
const STATE_WORDS: [string, RegExp][] = [
  ['Tamil Nadu', /tamil\s*nadu|தமிழ்\s*நா|तमिल\s*नाडु|ತಮಿಳು\s*ನಾಡ|తమిళ\s*నాడు|തമിഴ്\s*നാട്/i],
  ['Karnataka', /karnataka|கர்நாடக|कर्नाटक|ಕರ್ನಾಟಕ|కర్ణాటక|കർണാടക/i],
  ['Kerala', /kerala|கேரள|केरल|ಕೇರಳ|కేరళ|കേരള/i],
  ['Andhra Pradesh', /andhra|ஆந்திர|आंध्र|ಆಂಧ್ರ|ఆంధ్ర/i],
  ['Telangana', /telangana|தெலங்கான|तेलंगाना|ತೆಲಂಗಾಣ|తెలంగాణ/i],
  ['Maharashtra', /maharashtra|மகாராஷ்டிர|महाराष्ट्र/i],
  ['Gujarat', /\bgujarat\b|ગુજરાત(?!ી)|गुजरात(?!ी)/i],
  ['Punjab', /\bpunjab\b|ਪੰਜਾਬ(?!ੀ)|पंजाब(?!ी)/i],
  ['West Bengal', /\bbengal\b|পশ্চিমবঙ্গ|पश्चिम बंगाल/i],
  ['Odisha', /odisha|ଓଡ଼ିଶା|ओडिशा/i],
  ['Assam', /\bassam\b|অসম(?!ীয়া)|असम(?!िया)/i],
  ['Delhi', /delhi|டெல்லி|दिल्ली/i],
  ['Uttar Pradesh', /uttar pradesh|उत्तर प्रदेश/i],
  ['Bihar', /bihar|बिहार/i],
  ['Rajasthan', /rajasthan|राजस्थान/i],
  ['Puducherry', /puducherry|pondicherry|புதுச்சேரி/i],
];
const CITY_WORDS: [string, string, RegExp][] = [
  ['Tamil Nadu', 'Chennai', /chennai|சென்னை|चेन्नई/i],
  ['Tamil Nadu', 'Madurai', /madurai|மதுரை/i],
  ['Tamil Nadu', 'Coimbatore', /coimbatore|கோயம்புத்தூர்|கோவை/i],
  ['Tamil Nadu', 'Tiruchirappalli', /trichy|திருச்சி/i],
  ['Karnataka', 'Bengaluru Urban', /bengaluru|bangalore|ಬೆಂಗಳೂರ|बेंगलुरु|बंगलौर|பெங்களூர/i],
  ['Karnataka', 'Mysuru', /mysuru|mysore|ಮೈಸೂರ/i],
  ['Telangana', 'Hyderabad', /hyderabad|హైదరాబాద్|हैदराबाद/i],
  ['Maharashtra', 'Mumbai', /mumbai|मुंबई/i],
  ['Maharashtra', 'Pune', /\bpune\b|पुणे/i],
  ['West Bengal', 'Kolkata', /kolkata|কলকাতা|कोलकाता/i],
  ['Kerala', 'Ernakulam', /kochi|cochin|കൊച്ചി/i],
  ['Kerala', 'Thiruvananthapuram', /trivandrum|thiruvananthapuram|തിരുവനന്തപുരം/i],
];

/* ---------- 4. categories, benefits, other intents ---------- */
const CATEGORY_WORDS: [CategoryId, RegExp][] = [
  ['student', /student|college|school|studying|\bstudy\b|degree|scholarship|மாணவ|கல்லூரி|பள்ளி|படிக்கிற|படிக்கிறேன்|छात्र|विद्यार्थी|कॉलेज|स्कूल|पढ़|ವಿದ್ಯಾರ್ಥಿ|ಕಾಲೇಜ|ಶಾಲೆ|విద్యార్థి|కాలేజ|కళాశాల|വിദ്യാർത്ഥി|കോളേജ്|ছাত্র|विद्यार्थी/i],
  ['farmer', /farmer|farming|agricultur|\bcrops?\b|\bacres?\b|விவசாய|உழவ|किसान|खेती|कृषि|ರೈತ|ಕೃಷಿ|రైతు|వ్యవసాయ|കർഷക|കൃഷി|কৃষক|शेतकरी|ખેડૂત|ਕਿਸਾਨ/i],
  ['senior', /senior|old age|elderly|retired|முதியோர்|மூத்த|वृद्ध|बुज़ुर्ग|बुजुर्ग|वरिष्ठ|ಹಿರಿಯ|వృద్ధ|వయోవృద్ధ|വയോജന|മുതിർന്ന/i],
  ['business', /business|shop|enterprise|msme|startup|entrepreneur|வியாபார|தொழில் நடத்து|கடை|व्यापार|व्यवसाय|दुकान|ವ್ಯಾಪಾರ|ಉದ್ಯಮ|ಅಂಗಡಿ|వ్యాపార|ബിസിനസ്|വ്യാപാര|ব্যবসা/i],
  ['women', /\bwom[ae]n\b|widow|pregnan|mother|பெண்|விதவை|கர்ப்ப|महिला|विधवा|गर्भवती|ಮಹಿಳೆ|ಮಹಿಳಾ|మహిళ|സ്ത്രീ|വനിത|মহিলা/i],
  ['pwd', /disab|handicap|divyang|மாற்றுத்திறன்|ஊனமு|विकलांग|दिव्यांग|ಅಂಗವಿಕಲ|ವಿಕಲಚೇತನ|వికలాంగ|ഭിന്നശേഷി/i],
  ['jobseeker', /unemploy|job ?seeker|\bjobs?\b|employment|வேலையில்லா|வேலை|बेरोजगार|नौकरी|रोज़गार|रोजगार|ನಿರುದ್ಯೋಗ|ಉದ್ಯೋಗ|నిరుద్యోగ|ఉద్యోగ|തൊഴിൽ|চাকরি/i],
];
const BENEFIT_WORDS: [BenefitType, RegExp][] = [
  ['scholarship', /scholarship|stipend|உதவித்தொகை|கல்வி உதவி|छात्रवृत्ति|स्कॉलरशिप|ವಿದ್ಯಾರ್ಥಿ ವೇತನ|ವಿದ್ಯಾರ್ಥಿವೇತನ|స్కాలర్‌షిప్|ఉపకార వేతన|സ്കോളർഷിപ്പ്|বৃত্তি|शिष्यवृत्ती/i],
  ['insurance', /insurance|காப்பீடு|बीमा|ವಿಮೆ|బీమా|ഇൻഷുറൻസ്|বিমা/i],
  ['subsidy', /subsid|மானியம்|सब्सिडी|अनुदान|ಸಬ್ಸಿಡಿ|ಸಹಾಯಧನ|సబ్సిడీ|రాయితీ|സബ്സിഡി/i],
  ['loan', /\bloans?\b|credit|கடன்|ऋण|लोन|कर्ज|ಸಾಲ|రుణ|వాయిదా|വായ്പ|ঋণ/i],
  ['pension', /pension|ஓய்வூதிய|पेंशन|ಪಿಂಚಣಿ|పింఛన్|పెన్షన్|പെൻഷൻ|পেনশন/i],
  ['housing', /hous|\bhome\b|வீடு|आवास|मकान|ಮನೆ|ఇల్లు|വീട്/i],
  ['health', /health|hospital|medical|treatment|மருத்துவ|சிகிச்சை|स्वास्थ्य|इलाज|ಆರೋಗ್ಯ|ఆరోగ్య|ആരോഗ്യ/i],
  ['training', /training|skill|course|பயிற்சி|திறன்|प्रशिक्षण|कौशल|ತರಬೇತಿ|శిక్షణ|പരിശീലന/i],
  ['food', /ration|food grain|உணவு|ரேஷன்|राशन|ಪಡಿತರ|రేషన్|റേഷൻ/i],
  ['cash', /cash|financial (help|support|assistance)|நிதியுதவி|आर्थिक सहायता|ಆರ್ಥಿಕ ನೆರವು/i],
];
const YES = /^\s*(yes|yeah|yep|sure|ok(ay)?|please do|go ahead|show( me)?|ஆம்|ஆமாம்|சரி|காட்டு|हाँ|हां|जी|ठीक|दिखाओ|ಹೌದು|ಸರಿ|అవును|సరే|അതെ|ശരി|হ্যাঁ|होय|હા|ਹਾਂ|ହଁ|হয়|جی|ہاں)\b/i;
const NO = /^\s*(no|nope|not now|cancel|later|இல்லை|வேண்டாம்|नहीं|ना|ಇಲ್ಲ|ಬೇಡ|వద్దు|లేదు|വേണ്ട|ഇല്ല|না|नाही|ના|ਨਹੀਂ|ନା|নহয়|نہیں)\b/i;
const GREET = /^\s*(hi|hello|hey|namaste|vanakkam|வணக்கம்|नमस्ते|नमस्कार|ನಮಸ್ಕಾರ|నమస్కారం|നമസ്കാരം|নমস্কার)\b/i;
const SCHEME_WORDS = /scheme|benefit|yojana|திட்ட|நலத்திட்ட|योजना|ಯೋಜನೆ|పథక|പദ്ധതി|প্রকল্প|ਯੋਜਨਾ|યોજના|ଯୋଜନା|اسکیم/i;
const PAGES: [NonNullable<Understanding['page']>, RegExp][] = [
  ['saved', /\bsaved\b|bookmark|சேமித்த|सहेजी/i],
  ['checklist', /checklist|my applications|application status|விண்ணப்ப நிலை|आवेदन की स्थिति/i],
  ['compare', /\bcompare\b|ஒப்பிடு|तुलना/i],
  ['account', /dashboard|my profile|my account|என் கணக்கு|मेरा खाता/i],
  ['auth', /\blog ?in\b|sign ?in|register|உள்நுழை|लॉगिन/i],
];

const DIGITS: Record<string, string> = {};
// native digits (Devanagari, Bengali, Tamil, Telugu, Kannada, Malayalam, Gujarati, Gurmukhi, Odia, Arabic-Indic) → ASCII
['०', '০', '௦', '౦', '೦', '൦', '૦', '੦', '୦', '٠', '۰'].forEach((zero) => {
  const base = zero.charCodeAt(0);
  for (let i = 0; i < 10; i++) DIGITS[String.fromCharCode(base + i)] = String(i);
});
const asciiDigits = (s: string) => s.replace(/./gu, (c) => DIGITS[c] ?? c);

export function understand(raw: string): Understanding {
  const text = asciiDigits(raw.normalize('NFC')).toLowerCase();
  const u: Understanding = { lang: detectLang(raw), intent: 'unknown', benefits: [] };

  // places first, then remove them so "Tamil Nadu" is not read as the language "Tamil"
  let rest = text;
  for (const [state, district, re] of CITY_WORDS)
    if (re.test(rest)) {
      u.state = state;
      u.district = district;
      rest = rest.replace(re, ' ');
      break;
    }
  for (const [state, re] of STATE_WORDS)
    if (re.test(rest)) {
      u.state ??= state;
      rest = rest.replace(re, ' ');
      break;
    }
  if (!u.district)
    for (const [state, list] of Object.entries(DISTRICTS))
      for (const [d] of list) {
        const name = d.toLowerCase().split(' (')[0];
        if (name.length > 3 && new RegExp(`\\b${name}\\b`).test(rest)) {
          u.state ??= state;
          if (u.state === state) u.district = d;
        }
      }

  const target = targetLanguage(rest);
  if (target && (LANG_CHANGE.test(rest) || rest.trim().split(/\s+/).length <= 4)) {
    u.intent = 'change_lang';
    u.targetLang = target;
    return u;
  }

  // age: "65 years", "age 65", "உம்ர 65", "above 60"
  const ageM =
    /(\d{2,3})\s*(?:years?|yrs?|வயது|ஆண்டு|साल|वर्ष|ವರ್ಷ|సంవత్సర|വയസ്സ്|বছর)/i.exec(text) ??
    /(?:age|aged|வயது|उम्र|आयु|ವಯಸ್ಸು|వయసు|പ്രായം)\D{0,12}(\d{2,3})/i.exec(text) ??
    /(?:above|over|more than)\s*(\d{2})/i.exec(text);
  if (ageM) {
    const n = Number(ageM[1]);
    if (n > 0 && n < 120) u.age = n;
  }
  const landM = /(\d+(?:\.\d+)?)\s*(?:acres?|ஏக்கர்|एकड़|एकर|ಎಕರೆ|ఎకరా|ഏക്കർ)/i.exec(text);
  if (landM) u.landAcres = Number(landM[1]);

  if (/college|degree|university|கல்லூரி|பல்கலை|कॉलेज|विश्वविद्यालय|ಕಾಲೇಜ|కాలేజ|కళాశాల|കോളേജ്|কলেজ/i.test(text)) u.study = 'college';
  else if (/school|பள்ளி|स्कूल|विद्यालय|ಶಾಲೆ|పాఠశాల|സ്കൂൾ|স্কুল/i.test(text)) u.study = 'school';

  for (const [cat, re] of CATEGORY_WORDS)
    if (re.test(text)) {
      u.category = cat;
      break;
    }
  // "small business ... loan" is a business owner, not a job seeker; old age implies senior
  if (u.category === 'jobseeker' && /business|வியாபார|व्यापार|ವ್ಯಾಪಾರ/i.test(text)) u.category = 'business';
  if (!u.category && u.age !== undefined && u.age >= 60) u.category = 'senior';
  if (u.study && !u.category) u.category = 'student';

  for (const [b, re] of BENEFIT_WORDS) if (re.test(text)) u.benefits.push(b);
  if (!u.category) {
    if (u.benefits.includes('scholarship')) u.category = 'student';
    else if (u.benefits.includes('pension') && (u.age ?? 60) >= 60) u.category = 'senior';
  }

  if (u.category || u.benefits.length || SCHEME_WORDS.test(text)) u.intent = 'find';
  else if (YES.test(text)) u.intent = 'yes';
  else if (NO.test(text)) u.intent = 'no';
  else {
    const page = PAGES.find(([, re]) => re.test(text));
    if (page) {
      u.intent = 'navigate';
      u.page = page[0];
    } else if (GREET.test(text)) u.intent = 'greet';
  }
  return u;
}

/** A request to change the website language anywhere in the sentence (e.g. "…and change the website to Kannada"), or undefined. */
export function requestedLanguage(raw: string): Lang | undefined {
  let text = raw.normalize('NFC').toLowerCase();
  for (const [, re] of STATE_WORDS) text = text.replace(re, ' '); // "Tamil Nadu" is a place, not a language
  // short requests like "इंग्लिश में करो" / "English please" count even without a "change" word
  if (!LANG_CHANGE.test(text) && text.trim().split(/\s+/).length > 4) return undefined;
  return targetLanguage(text);
}

/** A "from" word right after a language name marks it as the CURRENT language, not the one wanted. */
const FROM_MARKER = /^\S{0,10}?\s*(?:से|from|இலிருந்து|இருந்து|ನಿಂದ|నుండి|నుంచి|നിന്ന്|থেকে|পৰা|पासून|मधून|થી|માંથી|ਤੋਂ|ରୁ|سے)/iu;

/**
 * The language the user wants. When several are named ("from Hindi to English", "हिंदी से इंग्लिश में",
 * "இந்தியிலிருந்து ஆங்கிலத்திற்கு") it is the last one that is not marked as the source language.
 */
function targetLanguage(text: string): Lang | undefined {
  let best: { lang: Lang; at: number } | undefined;
  for (const [lang, re] of LANG_NAMES) {
    for (const m of text.matchAll(new RegExp(re.source, `${re.flags}g`))) {
      const at = m.index ?? 0;
      if (FROM_MARKER.test(text.slice(at + m[0].length))) continue;
      if (!best || at > best.at) best = { lang, at };
    }
  }
  return best?.lang;
}

/** Suggested greeting language for a state (used only for the assistant, never for the website). */
export function stateLanguage(state?: string): Lang {
  const map: Record<string, Lang> = {
    'Tamil Nadu': 'ta', Puducherry: 'ta', Karnataka: 'kn', Kerala: 'ml', Lakshadweep: 'ml', 'Andhra Pradesh': 'te', Telangana: 'te',
    'West Bengal': 'bn', Tripura: 'bn', Maharashtra: 'mr', Goa: 'mr', Gujarat: 'gu', Punjab: 'pa', Odisha: 'or', Assam: 'as',
    'Uttar Pradesh': 'hi', Bihar: 'hi', 'Madhya Pradesh': 'hi', Rajasthan: 'hi', Haryana: 'hi', Delhi: 'hi', Jharkhand: 'hi',
    Chhattisgarh: 'hi', Uttarakhand: 'hi', 'Himachal Pradesh': 'hi', Chandigarh: 'hi', 'Jammu and Kashmir': 'ur',
  };
  return (state && map[state]) || 'en';
}
