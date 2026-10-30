# SchemeSaathi – Personalized Government Benefits Assistant (prototype)

Frontend prototype built with React + TypeScript + Tailwind CSS + Framer Motion + Lucide icons.
No backend is needed: all data is mock data, and the AI behaviour runs locally.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
```

## User journey

1. Onboarding: allow location (browser geolocation → offline nearest-district lookup) or pick state/district by hand
2. Language: English and Tamil are fully translated; Hindi, Telugu, Kannada and Malayalam are partial demo translations
3. Dashboard: the SVG guide's arm rotates to point at the hovered category card (tap mode on touch devices)
4. Profile wizard: questions change with the category, with a progress bar, Previous/Next/Skip, and editing later
5. Scheme discovery: filters on the left, ranked scheme cards in the middle, the AI Scheme Assistant on the right
6. Scheme details: shows "How this scheme can help you" and an "Apply on Official Website" button that asks for confirmation first
7. Compare exactly two schemes: a 9-row table plus an AI comparison that is based on your profile
8. My Profile, Saved / Recently viewed, Application Checklist, and Notifications (bell)

## Structure

```
src/
  data/        schemes.ts (demo dataset), categories.ts, locations.ts
  i18n/        strings.ts (en, ta full; hi/te/kn/ml partial)
  lib/         matching.ts (eligibility rules engine), ai.ts (AIProvider interface + mock)
  state/       store.tsx (context, hash router, localStorage persistence)
  components/  Character (animated SVG), Navbar, SchemeCard, AIPanel, CompareTray, LocationPicker, ui
  pages/       Onboarding, Dashboard, ProfileWizard, Discover, SchemeDetails, Compare, Account
```

## Connecting real services later

- **AI**: implement the `AIProvider` interface in `src/lib/ai.ts` with calls to your backend/LLM, then point `ai` at it.
  Keep the `certainty` tag (`confirmed` / `estimated` / `verify`) on every statement.
- **Scheme data**: replace `SCHEMES` with an API fetch that returns the same `Scheme` shape (`src/types.ts`).
- **Location**: swap `nearestDistrict` for a reverse-geocoding service if needed.

## Data disclaimer

The scheme names refer to real programmes. Amounts, limits, deadlines and links are summarised as
**demonstration data and have not been verified**, and the UI labels them that way. Official links point only to
portal home pages and open behind a confirmation dialog.
