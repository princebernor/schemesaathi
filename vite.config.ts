import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import demoApi from './server/demoApi';

export default defineConfig(({ mode }) => {
  // '' prefix = also read non-VITE_ variables; they are used only by the server plugin, never bundled
  const env = loadEnv(mode, process.cwd(), '');
  const ai = { apiKey: env.GEMINI_API_KEY, model: env.GEMINI_MODEL, ttsModel: env.GEMINI_TTS_MODEL };
  const db = {
    port: Number(env.PG_PORT || 5433),
    superPassword: env.PG_SUPERUSER_PASSWORD,
    appPassword: env.PG_APP_PASSWORD,
    viewerUser: env.PG_VIEWER_USER || 'schemesaathi_viewer',
    viewerPassword: env.PG_VIEWER_PASSWORD,
    databaseUrl: env.DATABASE_URL || undefined,
  };
  if (!db.databaseUrl && (!db.superPassword || !db.appPassword || !db.viewerPassword))
    throw new Error('Missing PostgreSQL passwords. Copy .env.example to .env.local and fill in the PG_* values.');
  return {
    // demoApi mounts the account + AI server (/api/*, /db-viewer) and starts PostgreSQL with the dev/preview server
    plugins: [react(), demoApi(ai, db)],
    server: { port: 5173, watch: { ignored: ['**/server-data/**'] } },
  };
});
