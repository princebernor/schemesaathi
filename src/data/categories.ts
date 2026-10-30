import {
  Sprout,
  GraduationCap,
  HeartHandshake,
  Store,
  UserRound,
  Accessibility,
  BriefcaseBusiness,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { CategoryId, LText } from '../types';

export interface Category {
  id: CategoryId;
  name: LText;
  tagline: LText;
  items: LText[];
  icon: LucideIcon;
  /** Tailwind-friendly accent colours (text / soft background / ring). */
  color: string;
  soft: string;
  ring: string;
  side: 'left' | 'right';
}

export const CATEGORIES: Category[] = [
  {
    id: 'farmer',
    name: { en: 'Farmer', ta: 'விவசாயி' },
    tagline: {
      en: 'Crop subsidies, farm loans, irrigation support and crop insurance.',
      ta: 'பயிர் மானியம், விவசாயக் கடன், பாசன உதவி மற்றும் பயிர் காப்பீடு.',
    },
    items: [
      { en: 'Crop subsidies', ta: 'பயிர் மானியம்' },
      { en: 'Agri loans', ta: 'விவசாயக் கடன்' },
      { en: 'Crop insurance', ta: 'பயிர் காப்பீடு' },
    ],
    icon: Sprout,
    color: '#15803d',
    soft: '#ecfdf3',
    ring: '#86efac',
    side: 'left',
  },
  {
    id: 'student',
    name: { en: 'Student', ta: 'மாணவர்' },
    tagline: {
      en: 'Scholarships, fee reimbursement, education loans and skill courses.',
      ta: 'உதவித்தொகை, கட்டணத் திரும்பப்பெறுதல், கல்விக் கடன் மற்றும் திறன் பயிற்சி.',
    },
    items: [
      { en: 'Scholarships', ta: 'உதவித்தொகை' },
      { en: 'Education loans', ta: 'கல்விக் கடன்' },
      { en: 'Skill courses', ta: 'திறன் பயிற்சி' },
    ],
    icon: GraduationCap,
    color: '#1d4ed8',
    soft: '#eff4ff',
    ring: '#93b4fd',
    side: 'left',
  },
  {
    id: 'senior',
    name: { en: 'Senior Citizen', ta: 'மூத்த குடிமக்கள்' },
    tagline: {
      en: 'Old-age pensions, healthcare cover and social security benefits.',
      ta: 'முதியோர் ஓய்வூதியம், மருத்துவக் காப்பீடு மற்றும் சமூகப் பாதுகாப்பு.',
    },
    items: [
      { en: 'Old-age pension', ta: 'முதியோர் ஓய்வூதியம்' },
      { en: 'Health cover', ta: 'மருத்துவக் காப்பீடு' },
      { en: 'Social security', ta: 'சமூகப் பாதுகாப்பு' },
    ],
    icon: HeartHandshake,
    color: '#b45309',
    soft: '#fff8eb',
    ring: '#fcd38d',
    side: 'left',
  },
  {
    id: 'business',
    name: { en: 'Small Business Owner', ta: 'சிறு தொழில் முனைவோர்' },
    tagline: {
      en: 'Business loans, MSME subsidies and startup support.',
      ta: 'தொழில் கடன், குறு-சிறு தொழில் மானியம் மற்றும் புதிய தொழில் உதவி.',
    },
    items: [
      { en: 'Business loans', ta: 'தொழில் கடன்' },
      { en: 'MSME subsidies', ta: 'MSME மானியம்' },
      { en: 'Startup help', ta: 'தொடக்க உதவி' },
    ],
    icon: Store,
    color: '#6d28d9',
    soft: '#f5f0ff',
    ring: '#c4b0fb',
    side: 'left',
  },
  {
    id: 'women',
    name: { en: 'Women', ta: 'பெண்கள்' },
    tagline: {
      en: 'Women empowerment, self-help groups, maternity and financial support.',
      ta: 'பெண்கள் மேம்பாடு, சுய உதவிக் குழுக்கள், மகப்பேறு மற்றும் நிதி உதவி.',
    },
    items: [
      { en: 'Monthly support', ta: 'மாதாந்திர உதவி' },
      { en: 'Self-help groups', ta: 'சுய உதவிக் குழு' },
      { en: 'Maternity benefit', ta: 'மகப்பேறு உதவி' },
    ],
    icon: UserRound,
    color: '#be185d',
    soft: '#fff0f6',
    ring: '#f9a8cf',
    side: 'right',
  },
  {
    id: 'pwd',
    name: { en: 'Person with Disabilities', ta: 'மாற்றுத்திறனாளிகள்' },
    tagline: {
      en: 'Disability pensions, assistive devices, education and job support.',
      ta: 'மாற்றுத்திறனாளி ஓய்வூதியம், உதவிக் கருவிகள், கல்வி மற்றும் வேலை உதவி.',
    },
    items: [
      { en: 'Disability pension', ta: 'ஓய்வூதியம்' },
      { en: 'Assistive devices', ta: 'உதவிக் கருவிகள்' },
      { en: 'Job support', ta: 'வேலை உதவி' },
    ],
    icon: Accessibility,
    color: '#0f766e',
    soft: '#edfcf9',
    ring: '#7fe0d0',
    side: 'right',
  },
  {
    id: 'jobseeker',
    name: { en: 'Unemployed / Job Seeker', ta: 'வேலை தேடுவோர்' },
    tagline: {
      en: 'Job portals, free skill training and self-employment support.',
      ta: 'வேலை வாய்ப்பு, இலவசத் திறன் பயிற்சி மற்றும் சுயதொழில் உதவி.',
    },
    items: [
      { en: 'Free training', ta: 'இலவசப் பயிற்சி' },
      { en: 'Job assistance', ta: 'வேலை உதவி' },
      { en: 'Self-employment', ta: 'சுயதொழில்' },
    ],
    icon: BriefcaseBusiness,
    color: '#c2410c',
    soft: '#fff4ed',
    ring: '#fdba8c',
    side: 'right',
  },
  {
    id: 'general',
    name: { en: 'General Citizen', ta: 'பொது மக்கள்' },
    tagline: {
      en: 'Housing, healthcare, food security and social welfare schemes.',
      ta: 'வீட்டு வசதி, மருத்துவம், உணவுப் பாதுகாப்பு மற்றும் சமூக நலத் திட்டங்கள்.',
    },
    items: [
      { en: 'Housing', ta: 'வீட்டு வசதி' },
      { en: 'Healthcare', ta: 'மருத்துவம்' },
      { en: 'Food security', ta: 'உணவுப் பாதுகாப்பு' },
    ],
    icon: Users,
    color: '#334155',
    soft: '#f2f5f9',
    ring: '#b6c2d3',
    side: 'right',
  },
];

export const categoryById = (id?: CategoryId) => CATEGORIES.find((c) => c.id === id);
