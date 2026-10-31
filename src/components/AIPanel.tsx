import { useEffect, useRef, useState } from 'react';
import { ClipboardList, Lightbulb, MessageCircle, SendHorizontal, ShieldCheck, Sparkles, Wand2 } from 'lucide-react';
import { ai, requirementsText } from '../lib/ai';
import { useStore } from '../state/store';
import type { AIStatement, ChatMessage, Scheme } from '../types';
import { AIThinking, CertaintyLegend, Statements } from './ui';

function Block({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white border border-violet-100 p-4">
      <h4 className="flex items-center gap-2 text-sm font-bold text-violet-900 mb-2.5">
        {icon} {title}
      </h4>
      {children}
    </div>
  );
}

/** Right-hand AI assistant. All content comes from `ai` (mock today, swappable for a real API). */
export default function AIPanel({ scheme, visibleIds }: { scheme: Scheme | null; visibleIds: string[] }) {
  const { t, tx, tr, lang, profile, setLocationModal } = useStore();
  const [rec, setRec] = useState<AIStatement[] | null>(null);
  const [elig, setElig] = useState<AIStatement[] | null>(null);
  const [sugg, setSugg] = useState<{ scheme: Scheme; reason: string }[] | null>(null);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const chatEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let live = true;
    setRec(null);
    setElig(null);
    if (scheme) {
      ai.recommend(scheme, profile, lang).then((r) => live && setRec(r));
      ai.eligibility(scheme, profile, lang).then((r) => live && setElig(r));
    }
    return () => {
      live = false;
    };
  }, [scheme, profile, lang]);

  const visibleKey = visibleIds.slice(0, 6).join(',');
  useEffect(() => {
    let live = true;
    setSugg(null);
    ai.suggest(profile, [...visibleIds.slice(0, 6), scheme?.id ?? ''], lang).then((r) => live && setSugg(r));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleKey, scheme, profile, lang]);

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [chat, busy]);

  const ask = async (q: string) => {
    if (!q.trim() || busy) return;
    setChat((c) => [...c, { role: 'user', text: q }]);
    setInput('');
    setBusy(true);
    const statements = await ai.chat(q, scheme, profile, lang);
    setChat((c) => [...c, { role: 'ai', text: '', statements }]);
    setBusy(false);
  };

  const req = scheme ? requirementsText(scheme, lang) : null;

  return (
    <div className="rounded-3xl bg-gradient-to-b from-violet-50 to-white border border-violet-100 p-4 space-y-3">
      <div className="flex items-start gap-3 px-1">
        <span className="grid place-items-center w-10 h-10 rounded-xl bg-violet-600 text-white shrink-0">
          <Sparkles size={20} />
        </span>
        <div>
          <h3 className="font-semibold text-violet-950">{t('aiTitle')}</h3>
          <p className="text-xs text-violet-700/80">{t('aiSub')}</p>
        </div>
      </div>
      <div className="px-1">
        <CertaintyLegend />
      </div>

      {scheme ? (
        <div className="rounded-xl bg-violet-100/60 px-3 py-2 text-sm">
          <span className="text-violet-700">{t('aiFocus')}: </span>
          <span className="font-semibold text-violet-950">{tx(scheme.name)}</span>
        </div>
      ) : (
        <p className="text-sm text-slate-600 px-1">{t('aiPick')}</p>
      )}

      {scheme && (
        <>
          <Block icon={<Wand2 size={16} />} title={t('aiRecommendation')}>
            {rec ? <Statements items={rec} compact /> : <AIThinking />}
          </Block>
          <Block icon={<ShieldCheck size={16} />} title={t('aiEligibility')}>
            {elig ? <Statements items={elig} compact /> : <AIThinking />}
            {!profile.completed && (
              <a href="#/profile-setup" className="inline-block mt-2 text-sm text-violet-700 font-semibold hover:underline">
                {t('editProfile')} →
              </a>
            )}
          </Block>
          {req && (
            <Block icon={<ClipboardList size={16} />} title={t('aiRequirements')}>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
                <dt className="text-slate-500">{t('reqAge')}</dt>
                <dd>{req.age ?? <span className="text-slate-400">{t('noLimit')}</span>}</dd>
                <dt className="text-slate-500">{t('reqIncome')}</dt>
                <dd>{req.income ?? <span className="text-slate-400">{t('noLimit')}</span>}</dd>
                <dt className="text-slate-500">{t('reqResidency')}</dt>
                <dd>
                  {req.residency}
                  {scheme.level !== 'central' && (
                    <button onClick={() => setLocationModal(true)} className="ml-1 text-violet-700 text-xs hover:underline">
                      ({t('changeLocation')})
                    </button>
                  )}
                </dd>
                {req.education && (
                  <>
                    <dt className="text-slate-500">{t('reqEducation')}</dt>
                    <dd>{req.education}</dd>
                  </>
                )}
                <dt className="text-slate-500">{t('reqDocuments')}</dt>
                <dd>{scheme.documents.map((d) => tx(d)).join(', ')}</dd>
              </dl>
            </Block>
          )}
        </>
      )}

      <Block icon={<Lightbulb size={16} />} title={t('aiSuggestions')}>
        {sugg ? (
          <ul className="space-y-2">
            {sugg.map(({ scheme: s, reason }) => (
              <li key={s.id}>
                <a href={`#/scheme/${s.id}`} className="block rounded-xl border border-slate-100 px-3 py-2 hover:border-violet-300 hover:bg-violet-50/50">
                  <div className="text-sm font-semibold text-navy-800 leading-snug">{tx(s.name)}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{tr(reason)}</div>
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <AIThinking />
        )}
      </Block>

      <Block icon={<MessageCircle size={16} />} title={t('aiAsk')}>
        <div className="max-h-[320px] overflow-y-auto scrollbar-thin space-y-2.5 mb-3" aria-live="polite">
          {chat.map((m, i) =>
            m.role === 'user' ? (
              <div key={i} className="ml-8 rounded-2xl rounded-br-md bg-navy-600 text-white px-3 py-2 text-sm">
                {m.text}
              </div>
            ) : (
              <div key={i} className="mr-4 rounded-2xl rounded-bl-md bg-violet-50 border border-violet-100 px-3 py-2">
                <Statements items={m.statements ?? []} compact />
              </div>
            ),
          )}
          {busy && <AIThinking />}
          <div ref={chatEnd} />
        </div>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {(['q1', 'q2', 'q3', 'q4', 'q5'] as const).map((k) => (
            <button key={k} onClick={() => ask(t(k))} disabled={busy} className="rounded-full border border-violet-200 bg-white px-2.5 py-1 text-xs text-violet-800 hover:bg-violet-50 text-left">
              {t(k)}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(input);
          }}
          className="flex gap-2"
        >
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={t('aiAskPlaceholder')} className="field py-2 text-sm" aria-label={t('aiAsk')} />
          <button className="btn bg-violet-600 text-white hover:bg-violet-700 px-3" disabled={busy || !input.trim()} aria-label={t('send')}>
            <SendHorizontal size={18} />
          </button>
        </form>
      </Block>

      <p className="text-[11px] text-slate-500 px-1 leading-relaxed">{t('aiDisclaimer')}</p>
    </div>
  );
}
