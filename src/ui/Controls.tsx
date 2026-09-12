import { RPM_MAX, RPM_MIN, RPM_STEP, TIERS } from '../sim/constants';
import type { Params, TierId } from '../sim/types';

interface Props {
  params: Params;
  setTier(id: TierId): void;
  setRpm(rpm: number): void;
  reset(): void;
}

export function Controls({ params, setTier, setRpm, reset }: Props) {
  return (
    <div className="controls">
      <div className="control">
        <span className="control-label">Placement</span>
        <div className="segmented">
          {TIERS.map((t) => (
            <button key={t.id} className={t.id === params.tierId ? 'active' : ''}
              aria-pressed={t.id === params.tierId} onClick={() => setTier(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <label className="control">
        <span className="control-label">
          Request rate <strong>{params.rpm} RPM</strong> · one request every {(60 / params.rpm).toFixed(params.rpm > 60 ? 2 : 1)} s
        </span>
        <input type="range" min={RPM_MIN} max={RPM_MAX} step={RPM_STEP} value={params.rpm}
          onChange={(e) => setRpm(Number(e.target.value))} />
      </label>
      <button className="reset" onClick={reset}>Reset</button>
    </div>
  );
}
