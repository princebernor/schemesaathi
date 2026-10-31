# SchemeSaathi – Personalized Government Benefits Assistant (prototype)

React + TypeScript + Tailwind CSS + Framer Motion + Lucide icons, with a small Node backend that runs inside the
Vite dev/preview server (`server/`). No extra npm dependencies are needed for the backend.

## Run

```bash
npm install
cp .env.example .env.local   # then put your Gemini API key in .env.local (optional — see below)
npm run dev                  # http://localhost:5173 (website + /api backend)
npm run build                # production build of the website in dist/
npm run preview              # serves dist/ together with the /api backend
```

The database starts empty; create an account with Register.

## User journey

1. Onboarding: allow location (browser geolocation → offline nearest-district lookup) or pick state/district by hand
2. Language: **English is always the default**. Location never changes the website language; only the language
   selector, the account's preferred language, or a spoken/typed request to the voice assistant does
3. Dashboard: the SVG guide points at the hovered category card. Choosing a category opens that category's
   **Login / Register** page (guests can still continue without an account)
4. Registration: a 4-step form (account → location & language → category-specific details → review) with
   conditional fields, Required/Optional markers, help text and validation. Each of the 8 categories has its own fields
5. Personalized dashboard after login: welcome, category, location, language, profile completion, schemes for you,
   applications, saved schemes, notifications, Edit Profile, Logout
6. Scheme discovery, details, comparison and the AI Scheme Assistant (Ask AI uses Gemini when a key is configured)
7. Saved ≠ applied: **Save** bookmarks a scheme; **I have applied / Apply Now** records an application in the
   Checklist with date, reference number, status, approval, documents and status history
8. Status updates create notifications (bell with unread count, mark all as read, links to the application).
   In the prototype, government updates are **simulated** with clearly labelled demo buttons
9. Voice assistant (bottom-centre mic): greets immediately in the preferred language, else the location's language,
   else English; listens with browser speech recognition; replies with speech synthesis where a voice is installed;
   understands language, category, location, age, land, study level and requested benefit from one sentence

## Backend (`server/`)

| Route | Purpose |
| --- | --- |
| `POST /api/register`, `POST /api/login`, `GET/PATCH /api/me`, `POST /api/me/logout`, `POST /api/reset-password` | Accounts. Passwords are salted PBKDF2-SHA256 hashes; session tokens are stored only as SHA-256 hashes. Every login, failed login, registration, logout and password reset is written to `login_events` |
| `GET /db-viewer` | Read-only page (this computer only) showing login details, login events and applications. Sign in with a PostgreSQL role, e.g. `schemesaathi_viewer` |
| `GET /api/ai/status`, `POST /api/ai/understand`, `POST /api/ai/chat` | Gemini: one-sentence understanding for the voice assistant and grounded scheme Q&A with certainty tags |

### Database: PostgreSQL

`npm run dev` / `npm run preview` start a portable PostgreSQL 18 server (official binaries from the
`embedded-postgres` package, no admin install) with its data in `server-data/postgres` (git-ignored), listening on
`localhost:5433` only. Passwords for the three roles come from `.env.local`:

| Role | Use |
| --- | --- |
| `postgres` (`PG_SUPERUSER_PASSWORD`) | Administration |
| `schemesaathi_app` (`PG_APP_PASSWORD`) | Owner of the `schemesaathi` database, used by the backend |
| `schemesaathi_viewer` (`PG_VIEWER_PASSWORD`) | Read-only: can see users (without password hashes), `login_details`, `login_events`, saved schemes, applications, notifications; cannot see sessions or change anything |

Tables: `users`, `sessions`, `login_events`, `saved_schemes`, `applications`, `notifications`, `document_checklists`,
plus the `login_details` view. Any PostgreSQL client (pgAdmin, DBeaver, the VS Code PostgreSQL extension) can connect
with host `localhost`, port `5433`, database `schemesaathi`. Set `DATABASE_URL` to use a hosted PostgreSQL instead.

The Gemini key is read on the server from `.env.local` (`GEMINI_API_KEY`, optional `GEMINI_MODEL`) and is never sent
to the browser. Without a key, or if Gemini fails, the app falls back to the local rule-based logic.

This backend is a prototype stand-in. For production, use HTTPS, a real database, OTP-based password recovery,
rate limiting at the edge, and official application-status integrations instead of simulated updates.

## Structure

```
server/        demoApi.ts (accounts API + /db-viewer, Vite plugin), db.ts (PostgreSQL), aiService.ts (Gemini)
src/
  data/        schemes.ts (demo dataset), categories.ts, locations.ts, registration.ts (category fields)
  i18n/        strings.ts + accountStrings.ts (en, ta full; 11 other Indian languages partial), assistant.ts (voice replies)
  lib/         matching.ts, ai.ts (AIProvider), remoteAI.ts (Gemini client), nlu.ts (rule-based fallback), accounts.ts
  state/       store.tsx (context, hash router, accounts, applications, notifications)
  components/  Character, Navbar, SchemeCard, AIPanel, CompareTray, LocationPicker, ui,
               DynamicField, Applications, VoiceAssistant
  pages/       Onboarding, Dashboard, ProfileWizard, Discover, SchemeDetails, Compare, Account, Auth, AccountHome
```

## Notes and limits

- English and Tamil are fully translated; Hindi, Telugu, Kannada, Malayalam, Bengali, Marathi, Gujarati, Punjabi,
  Odia, Assamese and Urdu are partial demo translations (untranslated text falls back to English). Add a language by
  adding a dictionary in `src/i18n/strings.ts` and replies in `src/i18n/assistant.ts`.
- Browser speech recognition listens in one language at a time (chosen in the assistant panel); typed text is detected
  automatically. Spoken replies need an installed voice for that language (on Windows: Settings → Time & language → Speech).
- Voice recognition works best in Chrome or Edge.

## Data disclaimer

The scheme names refer to real programmes. Amounts, limits, deadlines and links are summarised as
**demonstration data and have not been verified**, and the UI labels them that way. Official links point only to
portal home pages and open behind a confirmation dialog. Application statuses in the prototype are simulated.
