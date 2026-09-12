import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_TIER, DT, MAX_FRAME_SEC, RENDER_INTERVAL_MS, RPM_DEFAULT } from '../sim/constants';
import { createInitialState, step } from '../sim/engine';
import { computeMetrics, type Metrics } from '../sim/metrics';
import type { Params, SimState, TierId } from '../sim/types';

/** Copy of the mutable engine state that React can safely hold and compare. */
function snapshot(s: SimState): SimState {
  return {
    ...s,
    requests: s.requests.map((r) => ({ ...r })),
    totals: { ...s.totals },
    rejectedAt: s.rejectedAt.slice(),
    history: { ttft: s.history.ttft.slice(), samples: s.history.samples.slice() },
  };
}

export function useSimulation(): {
  state: SimState; params: Params; metrics: Metrics;
  setTier(id: TierId): void; setRpm(rpm: number): void; reset(): void;
} {
  const stateRef = useRef<SimState>(createInitialState());
  const [params, setParams] = useState<Params>({ tierId: DEFAULT_TIER, rpm: RPM_DEFAULT });
  const paramsRef = useRef(params);
  const [state, setState] = useState<SimState>(() => snapshot(stateRef.current));

  useEffect(() => {
    let raf = 0;
    let last: number | null = null;
    let lastRender = -Infinity;
    let accumulator = 0;
    const frame = (now: number) => {
      if (last !== null) accumulator += Math.min((now - last) / 1000, MAX_FRAME_SEC);
      last = now;
      while (accumulator >= DT) {
        step(stateRef.current, paramsRef.current, DT);
        accumulator -= DT;
      }
      if (now - lastRender >= RENDER_INTERVAL_MS) {
        lastRender = now;
        setState(snapshot(stateRef.current));
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  const updateParams = useCallback((next: Params) => {
    paramsRef.current = next;
    setParams(next);
  }, []);

  const setTier = useCallback((tierId: TierId) => {
    updateParams({ ...paramsRef.current, tierId });
  }, [updateParams]);

  const setRpm = useCallback((rpm: number) => {
    // A rate increase takes effect immediately instead of waiting out the old interval.
    const s = stateRef.current;
    s.nextArrivalAt = Math.min(s.nextArrivalAt, s.time + 60 / rpm);
    updateParams({ ...paramsRef.current, rpm });
  }, [updateParams]);

  const reset = useCallback(() => {
    stateRef.current = createInitialState();
    setState(snapshot(stateRef.current));
  }, []);

  const metrics = useMemo(() => computeMetrics(state), [state]);
  return { state, params, metrics, setTier, setRpm, reset };
}
