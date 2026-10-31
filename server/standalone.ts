/**
 * Production entry point for the SchemeSaathi API (e.g. on Render).
 *
 * The website itself is hosted separately (Vercel) and forwards /api/* and /db-viewer here, so the browser
 * only ever talks to one origin. Configuration comes from environment variables:
 *   DATABASE_URL      PostgreSQL connection string (required)
 *   GEMINI_API_KEY    Gemini key for the voice assistant, AI chat and translation (optional; rules fallback without it)
 *   GEMINI_MODEL, GEMINI_TTS_MODEL   optional model overrides
 *   CORS_ORIGINS      optional comma-separated origins allowed to call the API directly
 *   PORT              provided by the host
 */
import { createServer } from 'node:http';
import { createApiHandler } from './demoApi';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

const handler = createApiHandler(
  { apiKey: process.env.GEMINI_API_KEY, model: process.env.GEMINI_MODEL, ttsModel: process.env.GEMINI_TTS_MODEL },
  { port: 5432, superPassword: '', appPassword: '', viewerUser: '', viewerPassword: '', databaseUrl },
);
const allowed = (process.env.CORS_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean);

createServer((req, res) => {
  const origin = req.headers.origin;
  if (origin && allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  }
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }
  if (req.url === '/' || req.url === '') {
    res.setHeader('Content-Type', 'text/plain');
    return res.end('SchemeSaathi API is running. Health: /api/health');
  }
  handler(req, res, () => {
    res.statusCode = 404;
    res.end('Not found');
  });
}).listen(Number(process.env.PORT ?? 8080), () => {
  console.log(`SchemeSaathi API listening on port ${process.env.PORT ?? 8080}`);
  // warm up: connect to the database and create tables right away
  void fetch(`http://localhost:${process.env.PORT ?? 8080}/api/health`).catch(() => undefined);
});
