import { useState, type ReactNode } from 'react';
import { Eye, EyeOff, Info } from 'lucide-react';
import { useStore } from '../state/store';
import { isRequired, type FieldDef, type Label } from '../data/registration';
import type { StringKey } from '../i18n/strings';
import type { Details } from '../types';
import { today } from './Applications';

export function useLabel() {
  const { t, tx } = useStore();
  return (l: Label) => (typeof l === 'string' ? t(l) : tx(l));
}

/** Label row with a clear Required / Optional marker, help text and error message. */
export function FieldShell({ id, label, required, help, error, children }: { id: string; label: string; required?: boolean; help?: string; error?: string | null; children: ReactNode }) {
  const { t } = useStore();
  return (
    <div>
      <label htmlFor={id} className="label flex items-center gap-2">
        {label}
        {required ? <span className="text-red-600 text-xs font-bold" aria-hidden="true">* {t('required')}</span> : <span className="text-slate-400 text-xs font-medium">({t('optional')})</span>}
      </label>
      {children}
      {help && !error && (
        <p id={`${id}-help`} className="mt-1 text-xs text-slate-500 flex gap-1">
          <Info size={13} className="shrink-0 mt-px" /> {help}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} role="alert" className="mt-1 text-sm text-red-600 font-medium">
          {error}
        </p>
      )}
    </div>
  );
}

const aria = (id: string, error?: string | null, help?: string) => ({
  'aria-invalid': !!error || undefined,
  'aria-describedby': error ? `${id}-err` : help ? `${id}-help` : undefined,
});

export function TextInput({ id, label, value, onChange, error, help, required, type = 'text', autoComplete, inputMode, placeholder }: { id: string; label: string; value: string; onChange: (v: string) => void; error?: string | null; help?: string; required?: boolean; type?: string; autoComplete?: string; inputMode?: 'numeric' | 'email' | 'tel' | 'text'; placeholder?: string }) {
  return (
    <FieldShell id={id} label={label} required={required} help={help} error={error}>
      <input id={id} className={`field ${error ? 'border-red-400' : ''}`} type={type} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} inputMode={inputMode} placeholder={placeholder} {...aria(id, error, help)} />
    </FieldShell>
  );
}

export function PasswordInput({ id, label, value, onChange, error, help, autoComplete }: { id: string; label: string; value: string; onChange: (v: string) => void; error?: string | null; help?: string; autoComplete: string }) {
  const { t } = useStore();
  const [show, setShow] = useState(false);
  return (
    <FieldShell id={id} label={label} required help={help} error={error}>
      <div className="relative">
        <input id={id} className={`field pr-12 ${error ? 'border-red-400' : ''}`} type={show ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} {...aria(id, error, help)} />
        <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 rounded-lg text-slate-500 hover:bg-slate-100" aria-label={show ? t('hidePassword') : t('showPassword')} aria-pressed={show}>
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </FieldShell>
  );
}

/** Renders one category-specific registration field from its definition. */
export function DynamicField({ f, values, onChange, error }: { f: FieldDef; values: Details; onChange: (key: string, v: string | number | undefined) => void; error?: StringKey | null }) {
  const { t } = useStore();
  const lbl = useLabel();
  const id = `f-${f.key}`;
  const value = values[f.key];
  const err = error ? t(error) : null;
  const help = f.help ? lbl(f.help) : undefined;
  const req = isRequired(f, values);
  const cls = `field ${err ? 'border-red-400' : ''}`;

  let input: ReactNode;
  if (f.type === 'select')
    input = (
      <select id={id} className={cls} value={value ?? ''} onChange={(e) => onChange(f.key, e.target.value || undefined)} {...aria(id, err, help)}>
        <option value="">—</option>
        {f.options!.map((o) => (
          <option key={o.v} value={o.v}>
            {lbl(o.label)}
          </option>
        ))}
      </select>
    );
  else if (f.type === 'yesno')
    input = (
      <div id={id} role="radiogroup" className="grid grid-cols-2 gap-2 max-w-xs" {...aria(id, err, help)}>
        {(['yes', 'no'] as const).map((v) => (
          <button type="button" key={v} role="radio" aria-checked={value === v} onClick={() => onChange(f.key, v)} className={`rounded-xl border px-4 py-2.5 font-medium transition ${value === v ? 'border-navy-600 bg-navy-50 text-navy-800 ring-2 ring-navy-600/20' : 'border-slate-200 bg-white hover:border-navy-600/40'} ${err ? 'border-red-300' : ''}`}>
            {t(v)}
          </button>
        ))}
      </div>
    );
  else if (f.type === 'textarea') input = <textarea id={id} rows={3} className={cls} value={value ?? ''} onChange={(e) => onChange(f.key, e.target.value)} {...aria(id, err, help)} />;
  else
    input = (
      <div className="relative">
        <input
          id={id}
          className={`${cls} ${f.suffix ? 'pr-16' : ''}`}
          type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
          inputMode={f.type === 'number' ? 'decimal' : undefined}
          min={f.min}
          max={f.type === 'date' ? today() : f.max}
          placeholder={f.placeholder}
          value={value ?? ''}
          onChange={(e) => onChange(f.key, f.type === 'number' ? (e.target.value === '' ? undefined : Number(e.target.value)) : e.target.value)}
          {...aria(id, err, help)}
        />
        {f.suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 pointer-events-none">{f.suffix}</span>}
      </div>
    );

  return (
    <FieldShell id={id} label={lbl(f.label)} required={req} help={help} error={err}>
      {input}
    </FieldShell>
  );
}
