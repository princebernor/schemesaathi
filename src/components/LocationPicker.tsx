import { useState } from 'react';
import { Loader2, LocateFixed, MapPin } from 'lucide-react';
import { STATES, districtsFor, nearestDistrict } from '../data/locations';
import { useStore } from '../state/store';
import type { Location } from '../types';

/** State + district selectors. A free-text district is used for states without a district list. */
export function LocationFields({ state, district, onChange }: { state: string; district: string; onChange: (s: string, d: string) => void }) {
  const { t } = useStore();
  const districts = districtsFor(state);
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className="label" htmlFor="loc-state">{t('state')}</label>
        <select id="loc-state" className="field" value={state} onChange={(e) => onChange(e.target.value, '')}>
          <option value="">{t('selectState')}</option>
          {STATES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="loc-district">{t('district')}</label>
        {districts.length ? (
          <select id="loc-district" className="field" value={district} disabled={!state} onChange={(e) => onChange(state, e.target.value)}>
            <option value="">{t('selectDistrict')}</option>
            {districts.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        ) : (
          <input id="loc-district" className="field" value={district} disabled={!state} placeholder={t('typeDistrict')} onChange={(e) => onChange(state, e.target.value)} />
        )}
      </div>
    </div>
  );
}

type GeoState = 'idle' | 'asking' | 'found' | 'denied' | 'unknown';

/**
 * Location step: browser geolocation (only on button press) with an offline nearest-district lookup,
 * or manual selection. Never re-prompts on its own.
 */
export function LocationStep({ initial, onDone, submitLabel }: { initial?: Location | null; onDone: (l: Location) => void; submitLabel: string }) {
  const { t } = useStore();
  const [geo, setGeo] = useState<GeoState>('idle');
  const [manual, setManual] = useState(!!initial);
  const [state, setState] = useState(initial?.state ?? '');
  const [district, setDistrict] = useState(initial?.district ?? '');
  const [source, setSource] = useState<Location['source']>(initial?.source ?? 'manual');

  const detect = () => {
    if (!('geolocation' in navigator)) {
      setGeo('denied');
      setManual(true);
      return;
    }
    setGeo('asking');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const hit = nearestDistrict(pos.coords.latitude, pos.coords.longitude);
        if (hit) {
          setState(hit.state);
          setDistrict(hit.district);
          setSource('gps');
          setGeo('found');
        } else setGeo('unknown');
        setManual(true);
      },
      () => {
        setGeo('denied');
        setManual(true);
      },
      { timeout: 10000, maximumAge: 600000 },
    );
  };

  return (
    <div className="space-y-5">
      {!manual && (
        <div className="grid gap-3 sm:grid-cols-2">
          <button className="btn-primary py-4 text-base" onClick={detect} disabled={geo === 'asking'}>
            {geo === 'asking' ? <Loader2 className="animate-spin" size={20} /> : <LocateFixed size={20} />}
            {geo === 'asking' ? t('detecting') : t('allowLocation')}
          </button>
          <button className="btn-ghost py-4 text-base" onClick={() => setManual(true)}>
            <MapPin size={20} /> {t('selectManually')}
          </button>
        </div>
      )}
      {geo === 'denied' && <p className="rounded-xl bg-amber-50 text-amber-900 px-4 py-3 text-sm">{t('locationDenied')}</p>}
      {geo === 'unknown' && <p className="rounded-xl bg-amber-50 text-amber-900 px-4 py-3 text-sm">{t('locationUnknown')}</p>}
      {geo === 'found' && (
        <p className="rounded-xl bg-leaf-50 text-leaf-700 px-4 py-3 text-sm font-medium flex items-center gap-2">
          <LocateFixed size={16} /> {t('locationFound')}: {[district, state].filter(Boolean).join(', ')}
        </p>
      )}
      {manual && (
        <>
          <LocationFields
            state={state}
            district={district}
            onChange={(s, d) => {
              setState(s);
              setDistrict(d);
              setSource((prev) => (geo === 'found' && s === state ? prev : 'manual'));
            }}
          />
          <div className="flex flex-wrap gap-3 justify-between">
            {!initial && (
              <button className="btn-ghost" onClick={detect} disabled={geo === 'asking'}>
                <LocateFixed size={18} /> {t('allowLocation')}
              </button>
            )}
            <button className="btn-green ml-auto" disabled={!state || !district.trim()} onClick={() => onDone({ state, district: district.trim(), source })}>
              {submitLabel}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
