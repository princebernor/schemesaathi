import type { AIStatement, Lang, Profile } from '../types';
import type { Understanding } from './nlu';

/**
 * Browser client for the Gemini endpoints on the SchemeSaathi server (/api/ai/*).
 * Every call returns null on any failure so callers fall back to the local rule-based logic.
 */
async function post<T>(path: string, body: unknown, timeoutMs: number): Promise<T | null> {
  try {
    const res = await fetch(`/api/ai/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

export type RemoteUnderstanding = Omit<Understanding, 'intent' | 'targetLang'> & {
  intent: Understanding['intent'] | 'question';
  /** what was said (for voice input: Gemini's transcript) */
  transcript?: string;
  /** set when the user asks for the website language to change, even alongside another request */
  changeLanguageTo?: Lang;
  /** where the user lives, if different from the state they want schemes for */
  livesInState?: string;
  requirement?: string;
  answer?: string;
  /** a simple follow-up question when the request was unclear */
  clarification?: string;
};

const toBase64 = (b: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '');
    r.onerror = () => reject(r.error);
    r.readAsDataURL(b);
  });

export const remoteAI = {
  understand: (text: string, context: unknown) => post<RemoteUnderstanding>('understand', { text, context }, 15000),
  /** Voice turn: the clip is transcribed and understood on the server in one step and not stored anywhere. */
  understandAudio: async (audio: Blob, context: unknown) =>
    post<RemoteUnderstanding>('understand', { audio: await toBase64(audio), mime: audio.type, context }, 35000),
  chat: (question: string, schemeId: string | null, profile: Profile, lang: Lang) =>
    post<{ statements: AIStatement[] }>('chat', { question, schemeId, profile, lang }, 20000).then((r) => r?.statements ?? null),
};
