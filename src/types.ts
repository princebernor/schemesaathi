export type Lang = 'en' | 'ta' | 'hi' | 'te' | 'kn' | 'ml' | 'bn' | 'mr' | 'gu' | 'pa' | 'or' | 'as' | 'ur';

export type CategoryId =
  | 'farmer'
  | 'student'
  | 'senior'
  | 'business'
  | 'women'
  | 'pwd'
  | 'jobseeker'
  | 'general';

/** central = all India; state; ut = Union Territory administration; district = only in listed districts. */
export type GovLevel = 'central' | 'state' | 'ut' | 'district';

export type BenefitType =
  | 'cash'
  | 'pension'
  | 'loan'
  | 'subsidy'
  | 'insurance'
  | 'scholarship'
  | 'training'
  | 'housing'
  | 'food'
  | 'health';

export type AppStatus = 'open' | 'seasonal' | 'check';

export type IncomeRange = 'lt1' | '1to2.5' | '2.5to4.5' | '4.5to8' | 'gt8';

export interface Location {
  state: string;
  district: string;
  source: 'gps' | 'manual';
}

/** Bilingual text. Other languages fall back to English. */
export interface LText {
  en: string;
  ta: string;
}

/** Structured rules used by the local matching engine. Undefined = no restriction. */
export interface EligibilityRules {
  minAge?: number;
  maxAge?: number;
  /** Upper bound of annual family income in rupees. */
  maxIncome?: number;
  gender?: 'female' | 'male';
  /** Applicable states. Undefined = all of India. */
  states?: string[];
  minDisability?: number;
  requiresLand?: boolean;
  educationLevels?: string[];
  govtSchool?: boolean;
  businessTypes?: string[];
  socialCategories?: string[];
}

export interface Scheme {
  id: string;
  name: LText;
  department: LText;
  level: GovLevel;
  /** 'All India' for central schemes. */
  state: string;
  /** For district-level schemes: the districts where it applies. */
  districts?: string[];
  categories: CategoryId[];
  benefitTypes: BenefitType[];
  description: LText;
  benefits: LText[];
  /** Short headline of the monetary benefit, if any. */
  financial: LText;
  eligibility: LText[];
  rules: EligibilityRules;
  /** Conditions the matching engine cannot check from the profile; always shown as "verify". */
  manualChecks?: LText[];
  documents: LText[];
  process: LText[];
  applyMode: 'online' | 'offline' | 'both';
  status: AppStatus;
  deadline?: string;
  officialUrl: string;
  sourceRef: string;
  lastVerified: string;
  updatedAt: string;
}

export interface Profile {
  category?: CategoryId;
  age?: number;
  gender?: 'male' | 'female' | 'other';
  state?: string;
  district?: string;
  income?: IncomeRange;
  socialCategory?: 'general' | 'obc' | 'sc' | 'st' | 'na';
  education?: string;
  institutionType?: string;
  govtSchool?: 'yes' | 'no';
  disabilityPercent?: number;
  landAcres?: number;
  farmingType?: string;
  landOwnership?: string;
  businessType?: string;
  businessStage?: string;
  shgMember?: 'yes' | 'no';
  headOfFamily?: 'yes' | 'no';
  receivesPension?: 'yes' | 'no';
  bplCard?: 'yes' | 'no';
  employmentRegistered?: 'yes' | 'no';
  jobInterest?: string;
  rationCard?: string;
  ownsHouse?: 'yes' | 'no';
  completed?: boolean;
}

export type CheckStatus = 'met' | 'unmet' | 'unknown';

export interface RuleCheck {
  label: LText;
  status: CheckStatus;
}

export interface MatchResult {
  score: number; // 0-100
  verdict: 'likely' | 'check' | 'unlikely';
  checks: RuleCheck[];
}

/** Every AI statement is tagged so the UI can separate fact from estimate. */
export type Certainty = 'confirmed' | 'estimated' | 'verify';

export interface AIStatement {
  text: string;
  certainty: Certainty;
}

export interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
  statements?: AIStatement[];
}

/* ---------- accounts & application tracking ---------- */

/** Saving a scheme is a bookmark; an application is only recorded when the user applies. */
export type ApplicationStatus =
  | 'in_progress'
  | 'submitted'
  | 'under_verification'
  | 'docs_required'
  | 'approved'
  | 'rejected'
  | 'disbursed';

export interface StatusEvent {
  status: ApplicationStatus;
  at: string;
  /** 'user' = the citizen updated it; 'demo' = simulated government update (not real). */
  source: 'user' | 'demo';
}

export interface Application {
  schemeId: string;
  appliedOn: string;
  reference?: string;
  status: ApplicationStatus;
  updatedAt: string;
  history: StatusEvent[];
}

export interface Notice {
  id: string;
  schemeId: string;
  status: ApplicationStatus;
  at: string;
  read: boolean;
}

export type Details = Record<string, string | number | undefined>;

/** Account as returned by the account server (never contains the password hash). */
export interface Account {
  id: string;
  fullName: string;
  username: string;
  email: string;
  mobile: string;
  category: CategoryId;
  state: string;
  district: string;
  preferredLang: Lang;
  gender?: 'male' | 'female' | 'other';
  details: Details;
  registeredAt: string;
  updatedAt: string;
  data: AccountData;
}

export interface AccountData {
  saved?: string[];
  checklist?: Record<string, string[]>;
  applications?: Record<string, Application>;
  notices?: Notice[];
}
