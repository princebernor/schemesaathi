/**
 * STATE AND UNION TERRITORY SCHEMES.
 *
 * Compiled from public information (myScheme.gov.in, india.gov.in and official state portals) for the prototype.
 * Each entry names a real programme, but amounts and conditions change often and have NOT been checked against
 * the latest government orders: every entry is labelled "needs verification", and amounts that are known to have
 * been revised recently say so. Links point to official portal home pages only.
 *
 * English is the source text; other languages come from the cached translation service (src/lib/translator.ts).
 * To add a scheme or a state, append an entry below — no other code changes are needed.
 */
import type { AppStatus, BenefitType, CategoryId, EligibilityRules, LText, Scheme } from '../types';
import { DOC } from './documents';

const E = (en: string): LText => ({ en, ta: '' });
const NEEDS_VERIFICATION = 'Compiled from public sources – needs verification';

type DocKey = keyof typeof DOC;
interface Def {
  id: string;
  name: string;
  dept: string;
  /** 'state' (default) or 'ut' for Union Territory administrations. */
  level?: 'state' | 'ut' | 'district';
  state: string;
  districts?: string[];
  cats: CategoryId[];
  bt: BenefitType[];
  desc: string;
  financial: string;
  benefits: string[];
  elig: string[];
  rules?: EligibilityRules;
  checks?: string[];
  docs: DocKey[];
  process?: string[];
  mode?: Scheme['applyMode'];
  status?: AppStatus;
  url: string;
}

const ONLINE = [
  'Check the eligibility conditions and latest guidelines on the official portal',
  'Apply online with the required documents, or get help at a nearby e-Seva / Common Service Centre',
  'Note the application number and track the status on the portal',
];
const OFFLINE = [
  'Get the application form from the local government office (panchayat / municipality / taluk office)',
  'Submit it with copies of the required documents',
  'Keep the acknowledgement slip and follow up with the office for the status',
];

const make = (d: Def): Scheme => ({
  id: d.id,
  name: E(d.name),
  department: E(d.dept),
  level: d.level ?? 'state',
  state: d.state,
  districts: d.districts,
  categories: d.cats,
  benefitTypes: d.bt,
  description: E(d.desc),
  financial: E(d.financial),
  benefits: d.benefits.map(E),
  eligibility: d.elig.map(E),
  rules: { states: [d.state], ...d.rules },
  manualChecks: d.checks?.map(E),
  documents: d.docs.map((k) => DOC[k]),
  process: (d.process ?? (d.mode === 'offline' ? OFFLINE : ONLINE)).map(E),
  applyMode: d.mode ?? 'online',
  status: d.status ?? 'open',
  officialUrl: d.url,
  sourceRef: `${new URL(d.url).hostname} (official portal) · myScheme.gov.in`,
  lastVerified: NEEDS_VERIFICATION,
  updatedAt: '2026-10-31',
});

const DEFS: Def[] = [
  /* ================= Karnataka ================= */
  {
    id: 'ka-gruha-lakshmi', state: 'Karnataka', name: 'Gruha Lakshmi Scheme', dept: 'Women and Child Development Department, Government of Karnataka',
    cats: ['women'], bt: ['cash'],
    desc: 'Monthly financial assistance paid directly to the woman head of the family as named on the ration card.',
    financial: '₹2,000 per month (direct benefit transfer)',
    benefits: ['₹2,000 every month to the woman head of the family', 'Paid directly into her Aadhaar-linked bank account'],
    elig: ['Woman head of the family as per the ration card (BPL / APL / Antyodaya)', 'Resident of Karnataka', 'She or her husband must not be an income tax payer or GST filer'],
    rules: { gender: 'female', minAge: 18 }, checks: ['Named as head of the family on the ration card', 'Neither she nor her husband pays income tax or files GST'],
    docs: ['aadhaar', 'ration', 'bank'], url: 'https://sevasindhu.karnataka.gov.in',
  },
  {
    id: 'ka-shakti', state: 'Karnataka', name: 'Shakti Scheme (free bus travel for women)', dept: 'Transport Department, Government of Karnataka',
    cats: ['women'], bt: ['subsidy'],
    desc: 'Free travel for women in ordinary and express buses of the state transport corporations within Karnataka.',
    financial: 'Free travel in non-premium KSRTC, BMTC, KKRTC and NWKRTC buses',
    benefits: ['Free bus travel within Karnataka', 'Valid in ordinary and express (non-premium) state buses'],
    elig: ['Women and transgender persons who are residents of Karnataka'], rules: { gender: 'female' },
    checks: ['Carry a government photo ID with a Karnataka address (or the Shakti smart card)'],
    docs: ['aadhaar', 'residence'], url: 'https://sevasindhu.karnataka.gov.in',
  },
  {
    id: 'ka-yuva-nidhi', state: 'Karnataka', name: 'Yuva Nidhi (unemployment allowance)', dept: 'Department of Skill Development, Entrepreneurship and Livelihood, Government of Karnataka',
    cats: ['jobseeker'], bt: ['cash'],
    desc: 'Monthly allowance for unemployed graduates and diploma holders of Karnataka for up to two years while they look for work.',
    financial: '₹3,000 per month for graduates, ₹1,500 per month for diploma holders (up to 2 years)',
    benefits: ['Monthly allowance for up to 2 years or until employed', 'Linked to skill training and job support'],
    elig: ['Graduate or diploma holder who passed in or after 2022–23', 'Unemployed for at least 6 months after the result', 'Studied in Karnataka for at least 6 years (domicile)', 'Not in higher studies, government or private employment, or self-employment'],
    rules: { educationLevels: ['ug', 'pg', 'diploma'] }, checks: ['Passed in or after 2022–23', 'Not employed and not pursuing higher studies'],
    docs: ['aadhaar', 'marks', 'residence', 'bank'], url: 'https://sevasindhu.karnataka.gov.in',
  },
  {
    id: 'ka-raitha-vidya-nidhi', state: 'Karnataka', name: 'Raitha Vidya Nidhi (scholarship for farmers’ children)', dept: 'Department of Agriculture, Government of Karnataka',
    cats: ['student', 'farmer'], bt: ['scholarship'],
    desc: 'Scholarship for children of farmers in Karnataka who study after SSLC (Class 10), paid once a year.',
    financial: 'Yearly scholarship that depends on the course (higher for girls) — verify the current amounts',
    benefits: ['Annual scholarship from PUC up to degree and professional courses', 'Paid by direct benefit transfer'],
    elig: ['Son or daughter of a farmer registered in the FRUITS farmer database', 'Studying PUC / ITI / diploma / degree or professional course in Karnataka'],
    rules: { educationLevels: ['hsc', 'iti', 'diploma', 'ug', 'pg'] }, checks: ['Parent registered as a farmer in the FRUITS database'],
    docs: ['aadhaar', 'marks', 'bonafide', 'land', 'bank'], url: 'https://ssp.postmatric.karnataka.gov.in',
  },
  {
    id: 'ka-vidyasiri', state: 'Karnataka', name: 'Vidyasiri (food and accommodation assistance)', dept: 'Backward Classes Welfare Department, Government of Karnataka',
    cats: ['student'], bt: ['scholarship'],
    desc: 'Monthly food and accommodation help for backward class post-matric students who could not get a government hostel seat.',
    financial: '₹1,500 per month for 10 months a year (verify)',
    benefits: ['Help with food and lodging costs during post-matric studies'],
    elig: ['Backward class (Category-1, 2A, 3A, 3B) student in a post-matric course in Karnataka', 'Not staying in a government hostel', 'Family income within the department limit'],
    rules: { socialCategories: ['obc'], educationLevels: ['hsc', 'iti', 'diploma', 'ug', 'pg'] }, checks: ['Not admitted to a government hostel'],
    docs: ['aadhaar', 'community', 'income', 'bonafide', 'bank'], url: 'https://ssp.postmatric.karnataka.gov.in',
  },
  {
    id: 'ka-sandhya-suraksha', state: 'Karnataka', name: 'Sandhya Suraksha Yojane (old age pension)', dept: 'Directorate of Social Security and Pensions, Government of Karnataka',
    cats: ['senior', 'farmer'], bt: ['pension'],
    desc: 'Monthly pension for elderly small farmers, agricultural labourers, weavers, fishermen and unorganised workers.',
    financial: 'Monthly pension (₹1,200 per month at last revision — verify)',
    benefits: ['Monthly pension paid to the bank or post office account'],
    elig: ['Aged 65 years or above', 'From one of the listed groups (small farmer, agricultural labourer, weaver, fisherman, unorganised worker)', 'Family income and savings within the limit'],
    rules: { minAge: 65 }, docs: ['aadhaar', 'age', 'income', 'bank'], mode: 'offline', url: 'https://nadakacheri.karnataka.gov.in',
  },
  {
    id: 'ka-krishi-bhagya', state: 'Karnataka', name: 'Krishi Bhagya (farm ponds and protective irrigation)', dept: 'Department of Agriculture, Government of Karnataka',
    cats: ['farmer'], bt: ['subsidy'],
    desc: 'Subsidy for rain-fed farmers to build farm ponds (krishi honda) with lining, and for pump sets and micro-irrigation to save water.',
    financial: 'Subsidy for farm pond, lining, pump set and sprinkler / drip (share depends on component and caste — verify)',
    benefits: ['Farm pond construction support', 'Polythene lining, diesel / solar pump set', 'Sprinkler or drip irrigation set'],
    elig: ['Farmer owning cultivable land in a rain-fed area of Karnataka', 'Registered in the FRUITS farmer database'],
    rules: { requiresLand: true }, docs: ['aadhaar', 'land', 'bank', 'photo'], mode: 'offline', url: 'https://raitamitra.karnataka.gov.in',
  },
  {
    id: 'ka-udyogini', state: 'Karnataka', name: 'Udyogini (loans for women entrepreneurs)', dept: 'Karnataka State Women’s Development Corporation',
    cats: ['women', 'business'], bt: ['loan', 'subsidy'],
    desc: 'Bank loans with a government subsidy for women starting small businesses and trades.',
    financial: 'Bank loan with a subsidy on part of the loan (higher subsidy for SC / ST women — verify limits)',
    benefits: ['Bank loan for a small business or trade', 'Part of the loan paid as subsidy', 'Entrepreneurship training'],
    elig: ['Woman aged 18 to 55 years', 'Resident of Karnataka', 'Family income within the corporation’s limit'],
    rules: { gender: 'female', minAge: 18, maxAge: 55 }, docs: ['aadhaar', 'income', 'community', 'project', 'bank'], mode: 'offline', url: 'https://karnataka.gov.in',
  },
  {
    id: 'ka-ab-ark', state: 'Karnataka', name: 'Ayushman Bharat – Arogya Karnataka', dept: 'Suvarna Arogya Suraksha Trust, Government of Karnataka',
    cats: ['general', 'senior'], bt: ['health'],
    desc: 'Combined state and central health scheme giving cashless treatment in empanelled hospitals in Karnataka.',
    financial: 'Up to ₹5 lakh per family per year for eligible (priority) households; co-payment cover for others',
    benefits: ['Cashless treatment for listed procedures', 'Government and empanelled private hospitals'],
    elig: ['Resident of Karnataka', 'Eligible households as per ration card / PM-JAY list'],
    docs: ['aadhaar', 'ration'], mode: 'offline', url: 'https://arogya.karnataka.gov.in',
  },

  /* ================= Kerala ================= */
  {
    id: 'kl-welfare-pension', state: 'Kerala', name: 'Kerala Social Security Pensions (welfare pensions)', dept: 'Local Self Government Department, Government of Kerala',
    cats: ['senior', 'women', 'pwd', 'farmer'], bt: ['pension'],
    desc: 'Monthly welfare pensions for the elderly, widows, persons with disabilities, agricultural labourers and unmarried women above 50.',
    financial: 'Monthly pension (amount revised recently — verify the current rate)',
    benefits: ['Old age, widow, disability, agricultural labour and unmarried women pensions', 'Paid through bank or home delivery'],
    elig: ['Resident of Kerala in one of the pension groups', 'Family income within the limit', 'Not receiving another government pension'],
    docs: ['aadhaar', 'age', 'income', 'bank'], mode: 'offline', url: 'https://welfarepension.lsgkerala.gov.in',
  },
  {
    id: 'kl-state-crop-insurance', state: 'Kerala', name: 'Kerala State Crop Insurance Scheme', dept: 'Department of Agriculture Development and Farmers’ Welfare, Government of Kerala',
    cats: ['farmer'], bt: ['insurance'],
    desc: 'State crop insurance that compensates farmers for crop loss caused by natural calamities, for a small premium.',
    financial: 'Compensation for notified crops damaged by natural calamities (rates per crop — verify)',
    benefits: ['Covers loss from flood, drought, wind, landslide and similar calamities', 'Low premium for farmers'],
    elig: ['Farmer cultivating notified crops in Kerala (owner or lessee)', 'Registered on the AIMS portal before the loss'],
    docs: ['aadhaar', 'land', 'bank'], url: 'https://www.aims.kerala.gov.in',
  },
  {
    id: 'kl-subhiksha-keralam', state: 'Kerala', name: 'Subhiksha Keralam (support for cultivating fallow land)', dept: 'Department of Agriculture Development and Farmers’ Welfare, Government of Kerala',
    cats: ['farmer'], bt: ['subsidy'],
    desc: 'Food self-sufficiency programme that supports farmers and groups to bring fallow land under cultivation.',
    financial: 'Area-based support for cultivating fallow land (rates by crop — verify)',
    benefits: ['Financial support per hectare for fallow land cultivation', 'Help with seeds and planting material'],
    elig: ['Farmers, groups or Kudumbashree units cultivating fallow land in Kerala'],
    docs: ['aadhaar', 'land', 'bank'], mode: 'offline', url: 'https://keralaagriculture.gov.in',
  },
  {
    id: 'kl-kasp', state: 'Kerala', name: 'Karunya Arogya Suraksha Padhathi (KASP)', dept: 'State Health Agency, Government of Kerala',
    cats: ['general', 'senior'], bt: ['health'],
    desc: 'Kerala’s cashless health cover, run together with Ayushman Bharat PM-JAY, for eligible families.',
    financial: 'Up to ₹5 lakh per family per year',
    benefits: ['Cashless hospital treatment in empanelled hospitals'],
    elig: ['Families in the KASP / PM-JAY beneficiary list in Kerala'],
    docs: ['aadhaar', 'ration'], mode: 'offline', url: 'https://sha.kerala.gov.in',
  },
  {
    id: 'kl-egrantz', state: 'Kerala', name: 'e-Grantz Post-Matric Scholarship', dept: 'Scheduled Castes Development Department, Government of Kerala',
    cats: ['student'], bt: ['scholarship'],
    desc: 'Post-matric educational grants (fees and allowances) for SC, ST, OEC and eligible OBC students in Kerala.',
    financial: 'Tuition / exam fees plus lump sum and monthly allowances (vary by course)',
    benefits: ['Fees paid to the institution', 'Lump sum grant and stipend / hostel allowance'],
    elig: ['SC / ST / OEC / eligible OBC student in a post-matric course in Kerala', 'Admission through the merit or reservation quota as per rules'],
    rules: { socialCategories: ['sc', 'st', 'obc'], educationLevels: ['hsc', 'iti', 'diploma', 'ug', 'pg'] },
    docs: ['aadhaar', 'community', 'income', 'bonafide', 'bank'], url: 'https://egrantz.kerala.gov.in',
  },
  {
    id: 'kl-kudumbashree', state: 'Kerala', name: 'Kudumbashree (women’s neighbourhood groups and micro-enterprises)', dept: 'Kudumbashree State Poverty Eradication Mission, Government of Kerala',
    cats: ['women', 'business'], bt: ['loan', 'training'],
    desc: 'Women’s self-help network that gives thrift and credit, bank-linked loans and support to start micro-enterprises.',
    financial: 'Bank linkage loans, interest subsidy and enterprise support (amounts vary)',
    benefits: ['Membership in a neighbourhood group (NHG)', 'Loans through bank linkage', 'Micro-enterprise training and marketing help'],
    elig: ['Women residents of Kerala (one member per family in an NHG)'], rules: { gender: 'female' },
    docs: ['aadhaar', 'ration', 'photo'], mode: 'offline', url: 'https://www.kudumbashree.org',
  },
  {
    id: 'kl-ksum-grants', state: 'Kerala', name: 'Kerala Startup Mission – Innovation Grants', dept: 'Kerala Startup Mission, Government of Kerala',
    cats: ['business'], bt: ['cash'],
    desc: 'Grants for early-stage startups in Kerala at the idea, product and scale-up stages.',
    financial: 'Stage-wise grants (idea, productisation, scale-up) — verify current limits',
    benefits: ['Idea grant for prototypes', 'Productisation and scale-up grants', 'Mentoring and incubation'],
    elig: ['Startup registered with Kerala Startup Mission (and DPIIT)', 'Selected through the KSUM evaluation process'],
    docs: ['aadhaar', 'project', 'bank'], status: 'seasonal', url: 'https://startupmission.kerala.gov.in',
  },

  /* ================= Maharashtra ================= */
  {
    id: 'mh-ladki-bahin', state: 'Maharashtra', name: 'Mukhyamantri Majhi Ladki Bahin Yojana', dept: 'Women and Child Development Department, Government of Maharashtra',
    cats: ['women'], bt: ['cash'],
    desc: 'Monthly financial assistance for women of Maharashtra from lower-income families.',
    financial: '₹1,500 per month (direct benefit transfer)',
    benefits: ['₹1,500 every month into the woman’s Aadhaar-linked bank account'],
    elig: ['Woman resident of Maharashtra aged 21 to 65 years', 'Family annual income up to ₹2.5 lakh', 'No family member is an income tax payer or government employee'],
    rules: { gender: 'female', minAge: 21, maxAge: 65, maxIncome: 250000 }, docs: ['aadhaar', 'residence', 'income', 'bank', 'ration'], url: 'https://ladakibahin.maharashtra.gov.in',
  },
  {
    id: 'mh-namo-shetkari', state: 'Maharashtra', name: 'Namo Shetkari Mahasanman Nidhi', dept: 'Agriculture Department, Government of Maharashtra',
    cats: ['farmer'], bt: ['cash'],
    desc: 'State top-up for farmers who receive PM-KISAN, paid in instalments like PM-KISAN.',
    financial: '₹6,000 per year from the state, in addition to PM-KISAN',
    benefits: ['Additional ₹6,000 a year in instalments'],
    elig: ['Farmer in Maharashtra who is an eligible PM-KISAN beneficiary'], rules: { requiresLand: true },
    checks: ['Already receiving PM-KISAN with completed e-KYC'], docs: ['aadhaar', 'land', 'bank'], url: 'https://krishi.maharashtra.gov.in',
  },
  {
    id: 'mh-shahu-fee-scholarship', state: 'Maharashtra', name: 'Rajarshi Chhatrapati Shahu Maharaj Shikshan Shulkh Shishyavrutti Yojana', dept: 'Higher and Technical Education Department, Government of Maharashtra',
    cats: ['student'], bt: ['scholarship'],
    desc: 'Tuition and exam fee reimbursement for economically weaker students in professional and non-professional courses, applied through MahaDBT.',
    financial: 'Part or full reimbursement of tuition and exam fees (share depends on income and course)',
    benefits: ['Fee reimbursement for degree, diploma and professional courses'],
    elig: ['Domicile of Maharashtra', 'Family income up to ₹8 lakh per year', 'Admission through the centralised admission process (CAP) where applicable'],
    rules: { maxIncome: 800000, educationLevels: ['diploma', 'ug', 'pg'] }, docs: ['aadhaar', 'income', 'residence', 'marks', 'bonafide', 'bank'], url: 'https://mahadbt.maharashtra.gov.in',
  },
  {
    id: 'mh-mjpjay', state: 'Maharashtra', name: 'Mahatma Jyotirao Phule Jan Arogya Yojana', dept: 'State Health Assurance Society, Government of Maharashtra',
    cats: ['general', 'senior'], bt: ['health'],
    desc: 'Cashless health cover in empanelled hospitals for families in Maharashtra, integrated with Ayushman Bharat PM-JAY.',
    financial: 'Up to ₹5 lakh per family per year',
    benefits: ['Cashless treatment for listed surgeries and therapies'],
    elig: ['Families resident in Maharashtra with a ration card / Ayushman card'],
    docs: ['aadhaar', 'ration'], mode: 'offline', url: 'https://www.jeevandayee.gov.in',
  },
  {
    id: 'mh-shravan-bal', state: 'Maharashtra', name: 'Shravan Bal Seva Rajya Nivruttivetan Yojana', dept: 'Social Justice and Special Assistance Department, Government of Maharashtra',
    cats: ['senior'], bt: ['pension'],
    desc: 'Monthly pension for elderly persons of Maharashtra from very low-income families.',
    financial: 'Monthly pension (revised recently — verify the current amount)',
    benefits: ['Monthly pension through the bank account'],
    elig: ['Aged 65 years or above', 'Resident of Maharashtra for at least 15 years', 'Very low family income as per the scheme limit'],
    rules: { minAge: 65 }, docs: ['aadhaar', 'age', 'income', 'residence', 'bank'], mode: 'offline', url: 'https://sjsa.maharashtra.gov.in',
  },
  {
    id: 'mh-cmegp', state: 'Maharashtra', name: 'Chief Minister’s Employment Generation Programme (CMEGP)', dept: 'Directorate of Industries, Government of Maharashtra',
    cats: ['business', 'jobseeker'], bt: ['loan', 'subsidy'],
    desc: 'Bank loans with a capital subsidy for young people of Maharashtra starting new manufacturing, service or trading units.',
    financial: 'Bank loan with 15–35% subsidy on the project cost (manufacturing up to ₹50 lakh, services up to ₹20 lakh)',
    benefits: ['Project loan through banks', 'Margin money subsidy', 'Entrepreneurship training'],
    elig: ['Resident of Maharashtra aged 18 to 45 (relaxation for SC / ST / women / ex-servicemen)', 'Class 7 pass for projects above ₹10 lakh, Class 10 pass above ₹25 lakh', 'New unit only'],
    rules: { minAge: 18, maxAge: 45 }, docs: ['aadhaar', 'residence', 'project', 'photo', 'bank'], url: 'https://maha-cmegp.gov.in',
  },

  /* ================= Andhra Pradesh ================= */
  {
    id: 'ap-annadata-sukhibhava', state: 'Andhra Pradesh', name: 'Annadata Sukhibhava – PM-KISAN', dept: 'Agriculture Department, Government of Andhra Pradesh',
    cats: ['farmer'], bt: ['cash'],
    desc: 'Yearly investment support for farmer families in Andhra Pradesh, paid together with PM-KISAN.',
    financial: '₹20,000 per year per farmer family including ₹6,000 from PM-KISAN (verify)',
    benefits: ['Investment support in instalments for each crop season'],
    elig: ['Farmer family in Andhra Pradesh, including eligible tenant farmers as per state rules', 'e-KYC completed'],
    docs: ['aadhaar', 'land', 'bank'], url: 'https://www.ap.gov.in',
  },
  {
    id: 'ap-thalliki-vandanam', state: 'Andhra Pradesh', name: 'Thalliki Vandanam', dept: 'School Education Department, Government of Andhra Pradesh',
    cats: ['student', 'women'], bt: ['cash'],
    desc: 'Yearly support paid to the mother (or guardian) for every child studying in Classes 1 to 12, to keep children in school.',
    financial: '₹15,000 per school-going child per year (part retained for school maintenance — verify)',
    benefits: ['Yearly payment to the mother’s bank account for each eligible child'],
    elig: ['Child studying in Classes 1 to 12 in a recognised school in Andhra Pradesh', 'At least 75% attendance', 'Family meets the income and asset conditions'],
    rules: { educationLevels: ['school', 'hsc'] }, docs: ['aadhaar', 'ration', 'bonafide', 'bank'], url: 'https://www.ap.gov.in',
  },
  {
    id: 'ap-ntr-bharosa', state: 'Andhra Pradesh', name: 'NTR Bharosa Pension Scheme', dept: 'Society for Elimination of Rural Poverty (SERP), Government of Andhra Pradesh',
    cats: ['senior', 'women', 'pwd'], bt: ['pension'],
    desc: 'Monthly social security pensions for the elderly, widows, persons with disabilities and other vulnerable groups, delivered at home.',
    financial: '₹4,000 per month for the elderly and widows; higher amounts for persons with disabilities and the seriously ill',
    benefits: ['Monthly pension handed over at the doorstep'],
    elig: ['Resident of Andhra Pradesh in a pension category (e.g. aged 60+, widow, person with disability)', 'Household income and asset limits apply'],
    rules: { minAge: 18 }, docs: ['aadhaar', 'age', 'ration', 'udid', 'bank'], mode: 'offline', url: 'https://sspensions.ap.gov.in',
  },

  /* ================= Telangana ================= */
  {
    id: 'ts-rythu-bharosa', state: 'Telangana', name: 'Rythu Bharosa', dept: 'Agriculture Department, Government of Telangana',
    cats: ['farmer'], bt: ['cash'],
    desc: 'Investment support per acre of cultivable land for farmers in Telangana, paid each crop season.',
    financial: '₹12,000 per acre per year, in two seasonal instalments (verify)',
    benefits: ['Per-acre support for each cultivation season'],
    elig: ['Farmer owning cultivable agricultural land in Telangana (Dharani / Bhu Bharati records)'],
    rules: { requiresLand: true }, docs: ['aadhaar', 'land', 'bank'], url: 'https://www.telangana.gov.in',
  },
  {
    id: 'ts-kalyana-lakshmi', state: 'Telangana', name: 'Kalyana Lakshmi / Shaadi Mubarak', dept: 'Welfare Departments, Government of Telangana',
    cats: ['women'], bt: ['cash'],
    desc: 'One-time financial help at the time of marriage for girls from SC, ST, BC, EBC and minority families with low income.',
    financial: '₹1,00,116 one-time assistance',
    benefits: ['One-time grant paid to the bride’s mother'],
    elig: ['Bride is a resident of Telangana and at least 18 years old', 'SC / ST / BC / EBC (Kalyana Lakshmi) or minority (Shaadi Mubarak) family', 'Family income within the scheme limit'],
    rules: { gender: 'female', minAge: 18 }, docs: ['aadhaar', 'community', 'income', 'age', 'bank'], url: 'https://telanganaepass.cgg.gov.in',
  },
  {
    id: 'ts-epass', state: 'Telangana', name: 'Telangana ePASS Post-Matric Scholarships', dept: 'Welfare Departments, Government of Telangana',
    cats: ['student'], bt: ['scholarship'],
    desc: 'Post-matric scholarships and fee reimbursement for SC, ST, BC, EBC, minority and disabled students, applied through ePASS.',
    financial: 'Tuition fee reimbursement and maintenance allowance (varies by course and category)',
    benefits: ['Fee reimbursement to the college', 'Maintenance charges to the student'],
    elig: ['Student of Telangana in a post-matric course', 'Eligible community and family income within the limit'],
    rules: { educationLevels: ['hsc', 'iti', 'diploma', 'ug', 'pg'] }, docs: ['aadhaar', 'community', 'income', 'bonafide', 'bank'], url: 'https://telanganaepass.cgg.gov.in',
  },
  {
    id: 'ts-aarogyasri', state: 'Telangana', name: 'Rajiv Aarogyasri Health Scheme', dept: 'Aarogyasri Health Care Trust, Government of Telangana',
    cats: ['general', 'senior'], bt: ['health'],
    desc: 'Cashless treatment for serious illnesses in empanelled hospitals for eligible families in Telangana.',
    financial: 'Up to ₹10 lakh per family per year',
    benefits: ['Cashless surgeries and therapies in network hospitals'],
    elig: ['Families in Telangana holding a white ration card / Aarogyasri card'],
    docs: ['aadhaar', 'ration'], mode: 'offline', url: 'https://www.aarogyasri.telangana.gov.in',
  },

  /* ================= Uttar Pradesh ================= */
  {
    id: 'up-kanya-sumangala', state: 'Uttar Pradesh', name: 'Mukhyamantri Kanya Sumangala Yojana', dept: 'Women Welfare Department, Government of Uttar Pradesh',
    cats: ['women', 'student'], bt: ['cash'],
    desc: 'Support for girls in instalments from birth until they join graduation, to encourage health and education.',
    financial: '₹25,000 in six instalments (verify)',
    benefits: ['Instalments at birth, vaccination, and admission to Classes 1, 6, 9 and graduation / diploma'],
    elig: ['Girl from a family resident in Uttar Pradesh', 'Family income up to ₹3 lakh per year', 'Up to two girls per family'],
    rules: { maxIncome: 300000 }, docs: ['aadhaar', 'income', 'residence', 'age', 'bank'], url: 'https://mksy.up.gov.in',
  },
  {
    id: 'up-scholarship', state: 'Uttar Pradesh', name: 'UP Post-Matric Scholarship and Fee Reimbursement', dept: 'Social Welfare / Backward Class Welfare / Minority Welfare Departments, Government of Uttar Pradesh',
    cats: ['student'], bt: ['scholarship'],
    desc: 'Scholarship and fee reimbursement for students of Uttar Pradesh in Class 11 and above, from families within the income limit.',
    financial: 'Fee reimbursement and maintenance allowance (varies by course and category)',
    benefits: ['Fees reimbursed', 'Maintenance allowance'],
    elig: ['Resident of Uttar Pradesh studying in Class 11 or above', 'Family income within the department limit (differs by category)'],
    rules: { educationLevels: ['hsc', 'iti', 'diploma', 'ug', 'pg'] }, docs: ['aadhaar', 'income', 'community', 'marks', 'bonafide', 'bank'], status: 'seasonal', url: 'https://scholarship.up.gov.in',
  },
  {
    id: 'up-old-age-pension', state: 'Uttar Pradesh', name: 'Uttar Pradesh Old Age Pension', dept: 'Social Welfare Department, Government of Uttar Pradesh',
    cats: ['senior'], bt: ['pension'],
    desc: 'Monthly pension for elderly persons of Uttar Pradesh from below-poverty-line families.',
    financial: '₹1,000 per month (verify)',
    benefits: ['Quarterly payment of the monthly pension to the bank account'],
    elig: ['Aged 60 years or above', 'Resident of Uttar Pradesh', 'Family income within the poverty limit'],
    rules: { minAge: 60 }, docs: ['aadhaar', 'age', 'income', 'bank', 'photo'], url: 'https://sspy-up.gov.in',
  },
  {
    id: 'up-cm-yuva', state: 'Uttar Pradesh', name: 'Mukhyamantri Yuva Udyami Vikas Abhiyan (CM-YUVA)', dept: 'MSME Department, Government of Uttar Pradesh',
    cats: ['business', 'jobseeker'], bt: ['loan'],
    desc: 'Interest-free and collateral-free loans for young people of Uttar Pradesh to start their own business.',
    financial: 'Interest-free loan up to ₹5 lakh for a first project (verify)',
    benefits: ['Interest-free, collateral-free bank loan', 'Training and handholding'],
    elig: ['Resident of Uttar Pradesh aged 21 to 40', 'At least Class 8 pass (skill certificate preferred)', 'First-time entrepreneur'],
    rules: { minAge: 21, maxAge: 40 }, docs: ['aadhaar', 'residence', 'marks', 'project', 'bank'], url: 'https://msme.up.gov.in',
  },
  {
    id: 'up-kisan-durghatna', state: 'Uttar Pradesh', name: 'Mukhyamantri Krishak Durghatna Kalyan Yojana', dept: 'Revenue Department, Government of Uttar Pradesh',
    cats: ['farmer'], bt: ['insurance'],
    desc: 'Financial help to the family of a farmer or sharecropper who dies or is disabled in an accident.',
    financial: 'Up to ₹5 lakh for death or permanent disability in an accident',
    benefits: ['Accident death or disability assistance for the family'],
    elig: ['Farmer, co-sharer or sharecropper in Uttar Pradesh aged 18 to 70', 'Accident occurred in Uttar Pradesh'],
    rules: { minAge: 18, maxAge: 70 }, docs: ['aadhaar', 'land', 'bank'], mode: 'offline', url: 'https://up.gov.in',
  },

  /* ================= West Bengal ================= */
  {
    id: 'wb-lakshmir-bhandar', state: 'West Bengal', name: 'Lakshmir Bhandar', dept: 'Women and Child Development and Social Welfare Department, Government of West Bengal',
    cats: ['women'], bt: ['cash'],
    desc: 'Monthly basic income support for women heads of families in West Bengal.',
    financial: 'Monthly assistance, higher for SC / ST women (revised recently — verify)',
    benefits: ['Monthly payment to the woman’s bank account'],
    elig: ['Woman aged 25 to 60 resident of West Bengal', 'Enrolled in Swasthya Sathi', 'Not a permanent government employee or pensioner'],
    rules: { gender: 'female', minAge: 25, maxAge: 60 }, docs: ['aadhaar', 'community', 'bank'], mode: 'offline', url: 'https://socialsecurity.wb.gov.in',
  },
  {
    id: 'wb-kanyashree', state: 'West Bengal', name: 'Kanyashree Prakalpa', dept: 'Women and Child Development and Social Welfare Department, Government of West Bengal',
    cats: ['student', 'women'], bt: ['scholarship', 'cash'],
    desc: 'Conditional cash transfer to keep adolescent girls in education and delay their marriage until 18.',
    financial: 'Annual scholarship (K1) for girls aged 13–18 and a one-time grant of ₹25,000 (K2) at 18–19',
    benefits: ['Yearly scholarship while studying', 'One-time grant if still studying and unmarried at 18'],
    elig: ['Unmarried girl aged 13 to 19 studying in a recognised institution in West Bengal', 'Family income within the limit (waived for some groups)'],
    rules: { gender: 'female', minAge: 13, maxAge: 19 }, docs: ['aadhaar', 'age', 'bonafide', 'income', 'bank'], url: 'https://wbkanyashree.gov.in',
  },
  {
    id: 'wb-krishak-bandhu', state: 'West Bengal', name: 'Krishak Bandhu (Notun)', dept: 'Agriculture Department, Government of West Bengal',
    cats: ['farmer'], bt: ['cash', 'insurance'],
    desc: 'Yearly financial help for farmers and sharecroppers of West Bengal, and a one-time grant to the family if a farmer dies.',
    financial: 'Up to ₹10,000 per year per acre-based slab (minimum ₹4,000) and ₹2 lakh death benefit',
    benefits: ['Assistance in two instalments every year', '₹2 lakh to the family on the death of a farmer aged 18–60'],
    elig: ['Farmer or registered sharecropper (bargadar) with recorded land in West Bengal'],
    docs: ['aadhaar', 'land', 'bank', 'photo'], url: 'https://krishakbandhu.net',
  },
  {
    id: 'wb-svmcm', state: 'West Bengal', name: 'Swami Vivekananda Merit-cum-Means Scholarship', dept: 'Higher Education Department, Government of West Bengal',
    cats: ['student'], bt: ['scholarship'],
    desc: 'Monthly scholarship for meritorious students from low-income families studying from Class 11 to post-graduation.',
    financial: 'Monthly scholarship that depends on the course level (verify current rates)',
    benefits: ['Scholarship paid monthly for the course duration'],
    elig: ['Resident of West Bengal', 'Family income up to ₹2.5 lakh per year', 'At least 60% marks in the last board / university exam'],
    rules: { maxIncome: 250000, educationLevels: ['hsc', 'diploma', 'ug', 'pg'] }, docs: ['aadhaar', 'income', 'marks', 'bonafide', 'bank'], status: 'seasonal', url: 'https://svmcm.wbhed.gov.in',
  },
  {
    id: 'wb-swasthya-sathi', state: 'West Bengal', name: 'Swasthya Sathi', dept: 'Department of Health and Family Welfare, Government of West Bengal',
    cats: ['general', 'senior'], bt: ['health'],
    desc: 'Basic health cover for families in West Bengal, with the card issued in the name of the senior woman of the family.',
    financial: 'Up to ₹5 lakh per family per year',
    benefits: ['Cashless treatment in empanelled hospitals'],
    elig: ['Families resident in West Bengal (not covered by other government health schemes)'],
    docs: ['aadhaar', 'ration'], mode: 'offline', url: 'https://swasthyasathi.gov.in',
  },

  /* ================= Gujarat ================= */
  {
    id: 'gj-namo-lakshmi', state: 'Gujarat', name: 'Namo Lakshmi Yojana', dept: 'Education Department, Government of Gujarat',
    cats: ['student', 'women'], bt: ['scholarship'],
    desc: 'Financial support for girls studying in Classes 9 to 12, to reduce drop-out and support nutrition.',
    financial: 'Up to ₹50,000 over Classes 9–12 (verify)',
    benefits: ['Yearly assistance in Classes 9 and 10', 'Higher assistance in Classes 11 and 12'],
    elig: ['Girl studying in Classes 9–12 in a government, grant-in-aid or eligible private school in Gujarat', 'Family income up to ₹6 lakh per year'],
    rules: { gender: 'female', maxIncome: 600000, educationLevels: ['school', 'hsc'] }, docs: ['aadhaar', 'income', 'bonafide', 'bank'], url: 'https://gujaratindia.gov.in',
  },
  {
    id: 'gj-vahli-dikri', state: 'Gujarat', name: 'Vahli Dikri Yojana', dept: 'Women and Child Development Department, Government of Gujarat',
    cats: ['women'], bt: ['cash'],
    desc: 'Support for the first two daughters of a family at school entry, at Class 9 and at age 18.',
    financial: '₹1,10,000 in three instalments (₹4,000 + ₹6,000 + ₹1,00,000)',
    benefits: ['Instalment on joining Class 1', 'Instalment on joining Class 9', '₹1,00,000 at age 18 for higher education or marriage'],
    elig: ['First two daughters born on or after 2 August 2019 in Gujarat', 'Family income up to ₹2 lakh per year'],
    rules: { gender: 'female', maxIncome: 200000 }, docs: ['aadhaar', 'age', 'income', 'bank'], mode: 'offline', url: 'https://wcd.gujarat.gov.in',
  },
  {
    id: 'gj-kisan-suryoday', state: 'Gujarat', name: 'Kisan Suryoday Yojana', dept: 'Energy and Petrochemicals Department, Government of Gujarat',
    cats: ['farmer'], bt: ['subsidy'],
    desc: 'Three-phase electricity for irrigation during the daytime so that farmers need not irrigate at night.',
    financial: 'Daytime power supply for irrigation (no direct cash)',
    benefits: ['Daytime electricity for farm pumps in covered areas'],
    elig: ['Farmer with an agricultural electricity connection in a covered area of Gujarat'],
    docs: ['aadhaar', 'land'], mode: 'offline', url: 'https://gujaratindia.gov.in',
  },

  /* ================= Rajasthan ================= */
  {
    id: 'rj-maa-yojana', state: 'Rajasthan', name: 'Mukhyamantri Ayushman Arogya (MAA) Yojana', dept: 'Rajasthan State Health Assurance Agency',
    cats: ['general', 'senior'], bt: ['health'],
    desc: 'Rajasthan’s cashless health insurance for eligible families, run with Ayushman Bharat PM-JAY.',
    financial: 'Cashless treatment up to the scheme limit per family per year (verify current cover)',
    benefits: ['Cashless treatment in empanelled hospitals'],
    elig: ['Families of Rajasthan registered with Jan Aadhaar and eligible under the scheme'],
    docs: ['aadhaar', 'ration'], url: 'https://rajasthan.gov.in',
  },
  {
    id: 'rj-social-security-pension', state: 'Rajasthan', name: 'Rajasthan Social Security Pension (old age, widow, disability)', dept: 'Social Justice and Empowerment Department, Government of Rajasthan',
    cats: ['senior', 'women', 'pwd'], bt: ['pension'],
    desc: 'Monthly pensions for elderly persons, widows / single women and persons with disabilities in Rajasthan.',
    financial: 'Monthly pension by age and category (verify current amounts)',
    benefits: ['Monthly pension through the bank account linked to Jan Aadhaar'],
    elig: ['Resident of Rajasthan in a pension category (e.g. women 55+, men 58+, widows, persons with disabilities)', 'Annual family income within the limit'],
    docs: ['aadhaar', 'age', 'income', 'bank'], url: 'https://ssp.rajasthan.gov.in',
  },

  /* ================= Bihar ================= */
  {
    id: 'br-student-credit-card', state: 'Bihar', name: 'Bihar Student Credit Card Yojana', dept: 'Education Department, Government of Bihar',
    cats: ['student'], bt: ['loan'],
    desc: 'Low-interest education loan for students of Bihar who passed Class 12 and want to study further.',
    financial: 'Education loan up to ₹4 lakh at low interest (lower for women, persons with disabilities and transgender students)',
    benefits: ['Covers tuition and other study costs', 'Repayment after the course'],
    elig: ['Resident of Bihar who passed Class 12', 'Aged up to 25 years (higher for post-graduation)', 'Admission in a recognised higher education course'],
    rules: { maxAge: 30, educationLevels: ['hsc', 'diploma', 'ug', 'pg'] }, docs: ['aadhaar', 'marks', 'residence', 'bonafide', 'bank'], url: 'https://www.7nishchay-yuvaupmission.bihar.gov.in',
  },
  {
    id: 'br-swayam-sahayata-bhatta', state: 'Bihar', name: 'Mukhyamantri Nishchay Swayam Sahayata Bhatta Yojana', dept: 'Labour Resources Department, Government of Bihar',
    cats: ['jobseeker'], bt: ['cash', 'training'],
    desc: 'Monthly allowance for unemployed youth of Bihar who are looking for work, together with skill training.',
    financial: '₹1,000 per month for up to 2 years',
    benefits: ['Monthly allowance while searching for a job', 'Linked to language and computer skill training'],
    elig: ['Resident of Bihar aged 20 to 25 years', 'Passed Class 12 and not studying further', 'Not employed and not receiving other government allowances'],
    rules: { minAge: 20, maxAge: 25 }, docs: ['aadhaar', 'marks', 'residence', 'bank'], url: 'https://www.7nishchay-yuvaupmission.bihar.gov.in',
  },
  {
    id: 'br-kanya-utthan', state: 'Bihar', name: 'Mukhyamantri Kanya Utthan Yojana', dept: 'Education Department, Government of Bihar',
    cats: ['student', 'women'], bt: ['scholarship'],
    desc: 'Incentive for girls of Bihar who complete intermediate (Class 12) and graduation.',
    financial: '₹25,000 after passing intermediate (unmarried) and ₹50,000 after graduation (verify)',
    benefits: ['One-time incentive after intermediate', 'One-time incentive after graduation'],
    elig: ['Girl resident of Bihar who passed intermediate or graduation from a recognised board / university'],
    rules: { gender: 'female' }, docs: ['aadhaar', 'marks', 'bank'], status: 'seasonal', url: 'https://medhasoft.bihar.gov.in',
  },
  {
    id: 'br-vridhjan-pension', state: 'Bihar', name: 'Mukhyamantri Vridhjan Pension Yojana', dept: 'Social Welfare Department, Government of Bihar',
    cats: ['senior'], bt: ['pension'],
    desc: 'Monthly pension for all elderly residents of Bihar who do not receive another government pension.',
    financial: 'Monthly pension (raised recently — verify the current amount)',
    benefits: ['Monthly pension through DBT'],
    elig: ['Resident of Bihar aged 60 years or above', 'Not receiving any other government pension'],
    rules: { minAge: 60 }, docs: ['aadhaar', 'age', 'bank'], url: 'https://sspmis.bihar.gov.in',
  },

  /* ================= Odisha ================= */
  {
    id: 'od-subhadra', state: 'Odisha', name: 'Subhadra Yojana', dept: 'Women and Child Development and Mission Shakti Department, Government of Odisha',
    cats: ['women'], bt: ['cash'],
    desc: 'Financial support for women of Odisha, paid in two instalments every year for five years.',
    financial: '₹10,000 per year (two instalments of ₹5,000) for 5 years',
    benefits: ['₹50,000 in total over five years', 'Paid to the woman’s own bank account'],
    elig: ['Woman resident of Odisha aged 21 to 60', 'Family not economically well-off (exclusion criteria apply)'],
    rules: { gender: 'female', minAge: 21, maxAge: 60 }, docs: ['aadhaar', 'ration', 'bank'], url: 'https://subhadra.odisha.gov.in',
  },
  {
    id: 'od-cm-kisan', state: 'Odisha', name: 'CM-KISAN Yojana', dept: 'Department of Agriculture and Farmers’ Empowerment, Government of Odisha',
    cats: ['farmer'], bt: ['cash'],
    desc: 'State livelihood support for small and marginal farmers and landless agricultural households of Odisha.',
    financial: 'Yearly support in instalments (verify the current amount)',
    benefits: ['Cash support for cultivation and livelihood'],
    elig: ['Small / marginal farmer or landless agricultural household in Odisha'],
    docs: ['aadhaar', 'land', 'bank'], url: 'https://odisha.gov.in',
  },
  {
    id: 'od-gjay', state: 'Odisha', name: 'Gopabandhu Jan Arogya Yojana', dept: 'Health and Family Welfare Department, Government of Odisha',
    cats: ['general', 'senior', 'women'], bt: ['health'],
    desc: 'Cashless health cover for families of Odisha, integrated with Ayushman Bharat PM-JAY.',
    financial: 'Up to ₹5 lakh per family per year, with higher cover for women members (verify)',
    benefits: ['Cashless treatment in empanelled hospitals in and outside Odisha'],
    elig: ['Eligible families of Odisha as per the scheme list'],
    docs: ['aadhaar', 'ration'], mode: 'offline', url: 'https://odisha.gov.in',
  },

  /* ================= Punjab ================= */
  {
    id: 'pb-ashirwad', state: 'Punjab', name: 'Ashirwad Scheme', dept: 'Department of Social Justice, Empowerment and Minorities, Government of Punjab',
    cats: ['women'], bt: ['cash'],
    desc: 'Financial help at the time of marriage of daughters from SC, BC and economically weaker families in Punjab.',
    financial: '₹51,000 one-time assistance',
    benefits: ['One-time grant for the marriage of a daughter (up to two daughters)'],
    elig: ['Permanent resident of Punjab from an SC / BC / economically weaker family', 'Very low annual family income as per the scheme limit', 'Bride aged 18 or above'],
    rules: { gender: 'female', minAge: 18 }, docs: ['aadhaar', 'community', 'income', 'residence', 'bank'], url: 'https://ashirwad.punjab.gov.in',
  },
  {
    id: 'pb-old-age-pension', state: 'Punjab', name: 'Punjab Old Age Pension', dept: 'Department of Social Security and Women & Child Development, Government of Punjab',
    cats: ['senior'], bt: ['pension'],
    desc: 'Monthly pension for elderly residents of Punjab from low-income families.',
    financial: '₹1,500 per month (verify)',
    benefits: ['Monthly pension to the bank account'],
    elig: ['Women aged 58+ and men aged 65+ resident in Punjab', 'Annual income within the scheme limit'],
    rules: { minAge: 58 }, docs: ['aadhaar', 'age', 'income', 'residence', 'bank'], mode: 'offline', url: 'https://sswcd.punjab.gov.in',
  },

  /* ================= Madhya Pradesh ================= */
  {
    id: 'mp-ladli-behna', state: 'Madhya Pradesh', name: 'Mukhyamantri Ladli Behna Yojana', dept: 'Women and Child Development Department, Government of Madhya Pradesh',
    cats: ['women'], bt: ['cash'],
    desc: 'Monthly financial assistance for women of Madhya Pradesh to improve their health, nutrition and independence.',
    financial: 'Monthly assistance (increased in stages — verify the current amount)',
    benefits: ['Monthly payment to the woman’s Aadhaar-linked account'],
    elig: ['Married, widowed, divorced or abandoned woman resident of Madhya Pradesh aged 21 to 60', 'Family income up to ₹2.5 lakh per year'],
    rules: { gender: 'female', minAge: 21, maxAge: 60, maxIncome: 250000 }, docs: ['aadhaar', 'residence', 'bank'], url: 'https://cmladlibahna.mp.gov.in',
  },
  {
    id: 'mp-ladli-laxmi', state: 'Madhya Pradesh', name: 'Ladli Laxmi Yojana', dept: 'Women and Child Development Department, Government of Madhya Pradesh',
    cats: ['women', 'student'], bt: ['scholarship', 'cash'],
    desc: 'Savings and education support for girls of Madhya Pradesh, paid at school milestones and on completing education.',
    financial: 'Instalments at Classes 6, 9, 11 and 12 plus a final payment at 21 (total about ₹1,43,000 — verify)',
    benefits: ['Education instalments', 'Final payment if not married before 18 and studied up to Class 12'],
    elig: ['Girl born in Madhya Pradesh to parents who are not income tax payers', 'Registered under the scheme'],
    rules: { gender: 'female' }, docs: ['aadhaar', 'age', 'residence', 'bank'], url: 'https://ladlilaxmi.mp.gov.in',
  },
  {
    id: 'mp-kisan-kalyan', state: 'Madhya Pradesh', name: 'Mukhyamantri Kisan Kalyan Yojana', dept: 'Farmer Welfare and Agriculture Development Department, Government of Madhya Pradesh',
    cats: ['farmer'], bt: ['cash'],
    desc: 'State top-up for PM-KISAN beneficiaries of Madhya Pradesh, paid in instalments.',
    financial: '₹6,000 per year from the state, in addition to PM-KISAN',
    benefits: ['Additional yearly support in instalments'],
    elig: ['Farmer of Madhya Pradesh who is an eligible PM-KISAN beneficiary'], rules: { requiresLand: true },
    checks: ['Already receiving PM-KISAN'], docs: ['aadhaar', 'land', 'bank'], url: 'https://mp.gov.in',
  },

  /* ================= Assam ================= */
  {
    id: 'as-orunodoi', state: 'Assam', name: 'Orunodoi Scheme', dept: 'Finance Department, Government of Assam',
    cats: ['women'], bt: ['cash'],
    desc: 'Monthly support paid to the woman of low-income families in Assam for essential needs like medicine and nutrition.',
    financial: 'Monthly assistance (revised recently — verify the current amount)',
    benefits: ['Monthly DBT to the woman member of the family'],
    elig: ['Woman of an economically weaker family resident in Assam', 'Family income within the scheme limit'],
    rules: { gender: 'female' }, docs: ['aadhaar', 'ration', 'bank'], url: 'https://assam.gov.in',
  },
  {
    id: 'as-nijut-moina', state: 'Assam', name: 'Nijut Moina', dept: 'Education Department, Government of Assam',
    cats: ['student', 'women'], bt: ['scholarship'],
    desc: 'Monthly stipend for girl students of Assam in higher secondary, degree and post-graduate courses, to discourage child marriage.',
    financial: 'Monthly stipend for 10 months a year, higher for degree and post-graduation (verify)',
    benefits: ['Monthly stipend during the academic year'],
    elig: ['Unmarried girl student of Assam in Class 11, degree or post-graduation', 'Family income within the limit'],
    rules: { gender: 'female', educationLevels: ['hsc', 'ug', 'pg'] }, docs: ['aadhaar', 'marks', 'bonafide', 'bank'], status: 'seasonal', url: 'https://assam.gov.in',
  },

  /* ================= Other states ================= */
  {
    id: 'cg-mahtari-vandan', state: 'Chhattisgarh', name: 'Mahtari Vandan Yojana', dept: 'Women and Child Development Department, Government of Chhattisgarh',
    cats: ['women'], bt: ['cash'],
    desc: 'Monthly financial assistance for married women of Chhattisgarh.',
    financial: '₹1,000 per month',
    benefits: ['Monthly DBT to the woman’s bank account'],
    elig: ['Married woman resident of Chhattisgarh aged 21 or above (including widows, divorced and abandoned women)', 'No family member is an income tax payer or government employee'],
    rules: { gender: 'female', minAge: 21 }, docs: ['aadhaar', 'residence', 'bank'], url: 'https://mahtarivandan.cgstate.gov.in',
  },
  {
    id: 'jh-maiyan-samman', state: 'Jharkhand', name: 'Mukhyamantri Maiyan Samman Yojana', dept: 'Women, Child Development and Social Security Department, Government of Jharkhand',
    cats: ['women'], bt: ['cash'],
    desc: 'Monthly financial assistance for women of Jharkhand.',
    financial: '₹2,500 per month (verify)',
    benefits: ['Monthly DBT to the woman’s bank account'],
    elig: ['Woman resident of Jharkhand aged 18 to 50', 'Not an income tax payer or government employee family'],
    rules: { gender: 'female', minAge: 18, maxAge: 50 }, docs: ['aadhaar', 'ration', 'bank'], url: 'https://jharkhand.gov.in',
  },
  {
    id: 'hr-lado-lakshmi', state: 'Haryana', name: 'Deen Dayal Lado Lakshmi Yojana', dept: 'Women and Child Development Department, Government of Haryana',
    cats: ['women'], bt: ['cash'],
    desc: 'Monthly financial assistance for women of Haryana from low-income families.',
    financial: '₹2,100 per month (verify)',
    benefits: ['Monthly DBT to the woman’s bank account'],
    elig: ['Woman aged 23 or above, resident of Haryana', 'Family income within the scheme limit (Family ID records)'],
    rules: { gender: 'female', minAge: 23 }, docs: ['aadhaar', 'income', 'bank'], url: 'https://haryana.gov.in',
  },
  {
    id: 'ga-griha-aadhar', state: 'Goa', name: 'Griha Aadhar', dept: 'Directorate of Women and Child Development, Government of Goa',
    cats: ['women'], bt: ['cash'],
    desc: 'Monthly financial support for homemakers of Goa from middle and low-income families.',
    financial: '₹1,500 per month (verify)',
    benefits: ['Monthly assistance to the homemaker'],
    elig: ['Married woman homemaker resident in Goa', 'Combined family income up to ₹3 lakh per year'],
    rules: { gender: 'female', maxIncome: 300000 }, docs: ['aadhaar', 'income', 'residence', 'bank'], mode: 'offline', url: 'https://www.goa.gov.in',
  },
  {
    id: 'tn-cm-breakfast', state: 'Tamil Nadu', name: 'Chief Minister’s Breakfast Scheme', dept: 'Social Welfare and Women Empowerment Department, Government of Tamil Nadu',
    cats: ['student'], bt: ['food'],
    desc: 'Free nutritious breakfast on school days for children in government and aided primary schools of Tamil Nadu.',
    financial: 'Free breakfast on all school working days',
    benefits: ['Daily breakfast at school'],
    elig: ['Student of Classes 1 to 5 in a government or government-aided school in Tamil Nadu'],
    rules: { educationLevels: ['school'] }, docs: ['bonafide'], mode: 'offline', process: ['Provided automatically at participating schools — contact the school headmaster'], url: 'https://www.tn.gov.in',
  },
  {
    id: 'tn-vidiyal-payanam', state: 'Tamil Nadu', name: 'Vidiyal Payanam (free bus travel for women)', dept: 'Transport Department, Government of Tamil Nadu',
    cats: ['women', 'pwd'], bt: ['subsidy'],
    desc: 'Free travel for women, transgender persons and persons with disabilities in government town buses in Tamil Nadu.',
    financial: 'Free travel in ordinary government town buses',
    benefits: ['Zero-fare ticket in TNSTC / MTC town buses'],
    elig: ['Women and transgender persons travelling in Tamil Nadu town buses', 'Persons with disabilities and one attendant'],
    docs: ['aadhaar'], mode: 'offline', process: ['Board an ordinary government town bus and collect the free (pink) ticket'], url: 'https://www.tn.gov.in',
  },

  /* ================= Union Territories ================= */
  {
    id: 'dl-ladli', level: 'ut', state: 'Delhi', name: 'Delhi Ladli Scheme', dept: 'Department of Women and Child Development, Government of NCT of Delhi',
    cats: ['women', 'student'], bt: ['scholarship', 'cash'],
    desc: 'Deposits in the name of a girl child at birth and at school milestones, paid out with interest after she turns 18.',
    financial: 'Deposits at birth and at Classes 1, 6, 9, 10 and 12 (verify amounts), paid with interest at 18',
    benefits: ['Savings that grow until the girl is 18', 'Encourages her to finish school'],
    elig: ['Girl born in Delhi to parents living in Delhi for at least 3 years', 'Family income up to ₹1 lakh per year', 'Up to two girls per family'],
    rules: { gender: 'female', maxIncome: 100000 }, docs: ['aadhaar', 'age', 'income', 'residence'], mode: 'offline', url: 'https://wcd.delhi.gov.in',
  },
  {
    id: 'dl-old-age-assistance', level: 'ut', state: 'Delhi', name: 'Delhi Old Age Assistance (Pension)', dept: 'Department of Social Welfare, Government of NCT of Delhi',
    cats: ['senior'], bt: ['pension'],
    desc: 'Monthly financial assistance for elderly residents of Delhi from lower-income families.',
    financial: 'Monthly pension, higher at 70+ and for SC / ST / minority beneficiaries (verify current amounts)',
    benefits: ['Monthly pension to the bank account'],
    elig: ['Aged 60 years or above and living in Delhi for at least 5 years', 'Family income within the department limit', 'Not receiving another government pension'],
    rules: { minAge: 60 }, docs: ['aadhaar', 'age', 'income', 'residence', 'bank'], url: 'https://edistrict.delhigovt.nic.in',
  },
];

export const STATE_SCHEMES: Scheme[] = DEFS.map(make);
