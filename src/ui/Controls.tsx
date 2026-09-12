import { PRESETS, RPM_MAX, RPM_MIN, RPM_STEP, TIERS } from '../sim/constants';
import type { Params, Preset, TierId } from '../sim/types';

interface Props {
  params: Params;
  setTier(id: TierId): void;
  setRpm(rpm: number): void;
  applyPreset(p: Preset): void;
  reset(): void;
}

export function Controls({ params, setTier, setRpm, applyPreset, reset }: Props) {
  return (
    <div className="controls">
      <div className="presets">
        {PRESETS.map((p) => {
          const active = p.tierId === params.tierId && p.rpm === params.rpm;
          return (
            <div key={p.id} className="preset">
              <button className={active ? 'active' : ''} aria-pressed={active} onClick={() => applyPreset(p)}>
                {p.label}
              </button>
              <p>{p.caption}</p>
            </div>
          );
        })}
      </div>
      <div className="row">
        <div className="control">
          <span className="control-label">Placement of decode relative to prefill</span>
          <div className="segmented">
            {TIERS.map((t) => (
              <button key={t.id} className={t.id === params.tierId ? 'active' : ''}
                aria-pressed={t.id === params.tierId} onClick={() => setTier(t.id)}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <label className="control rpm">
          <span className="control-label">
            Request rate <strong>{params.rpm} RPM</strong> · one request every {(60 / params.rpm).toFixed(params.rpm > 60 ? 2 : 1)} s
          </span>
          <input type="range" min={RPM_MIN} max={RPM_MAX} step={RPM_STEP} value={params.rpm}
            onChange={(e) => setRpm(Number(e.target.value))} />
        </label>
        <button className="reset" onClick={reset}>Reset</button>
      </div>
    </div>
  );
}
