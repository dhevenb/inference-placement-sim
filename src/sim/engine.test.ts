import { describe, expect, it } from 'vitest';
import { DT, KV_SIZE_GB, PREFILL_SLOTS, PREFILL_TIME, QUEUE_CAPACITY, TIERS, getTier } from './constants';
import { createInitialState, step } from './engine';
import { computeMetrics } from './metrics';
import type { Request, SimState, TierId } from './types';

const count = (s: SimState, ...stages: Request['stage'][]) =>
  s.requests.filter((r) => stages.includes(r.stage)).length;

// SPEC: onStep is an optional per-step observer, used by the "at every step" invariants (T3–T5).
function run(tierId: TierId, rpm: number, seconds: number, onStep?: (s: SimState) => void) {
  const state = createInitialState();
  const steps = Math.round(seconds / DT);
  for (let i = 0; i < steps; i++) {
    step(state, { tierId, rpm }, DT);
    onStep?.(state);
  }
  return { state, metrics: computeMetrics(state) };
}

describe('engine', () => {
  it('T1 determinism: identical inputs give identical totals and TTFT history', () => {
    const a = run('xrack', 120, 60).state;
    const b = run('xrack', 120, 60).state;
    expect(a.totals).toEqual(b.totals);
    expect(a.history.ttft).toEqual(b.history.ttft);
  });

  it('T2 arrival rate: 60 RPM for 30 s yields 30 ± 1 arrivals', () => {
    const { state } = run('rack', 60, 30);
    expect(Math.abs(state.totals.arrived - 30)).toBeLessThanOrEqual(1);
  });

  it('T3 rejection: xaz at 60 RPM rejects and never overfills the queue', () => {
    let maxQueue = 0;
    const { state } = run('xaz', 60, 60, (s) => { maxQueue = Math.max(maxQueue, count(s, 'queued')); });
    expect(state.totals.rejected).toBeGreaterThan(0);
    expect(maxQueue).toBeLessThanOrEqual(QUEUE_CAPACITY);
  });

  it('T4 no rejection when healthy: rack at 60 RPM for 90 s', () => {
    let maxQueue = 0;
    const { state } = run('rack', 60, 90, (s) => { maxQueue = Math.max(maxQueue, count(s, 'queued')); });
    expect(state.totals.rejected).toBe(0);
    expect(maxQueue).toBeLessThanOrEqual(1);
  });

  it('T5 slot invariant: prefill + transfer never exceeds PREFILL_SLOTS', () => {
    for (const tier of TIERS) {
      for (const rpm of [10, 60, 150, 240]) {
        let max = 0;
        run(tier.id, rpm, 60, (s) => { max = Math.max(max, count(s, 'prefill', 'transfer')); });
        expect(max, `${tier.id} @ ${rpm} RPM`).toBeLessThanOrEqual(PREFILL_SLOTS);
      }
    }
  });

  it('T6 bandwidth sharing: two bytes-phase transfers on xaz split the link', () => {
    const state = createInitialState();
    const tier = getTier('xaz');
    state.nextArrivalAt = Infinity; // isolate the transfers from arrivals
    for (const slot of [0, 1]) {
      state.requests.push({
        id: state.nextId++, stage: 'transfer', stageEnteredAt: 0, queuedAt: 0, slot, tier,
        latencyRemaining: 0, bytesRemaining: KV_SIZE_GB, transferStartedAt: 0,
      });
    }
    step(state, { tierId: 'xaz', rpm: 60 }, DT);
    for (const r of state.requests) {
      expect(KV_SIZE_GB - r.bytesRemaining!).toBeCloseTo((0.8 / 2) * DT, 12);
    }
  });

  it('T7 TTFT composition: a lone request is prefill + latency + transfer', () => {
    const { state } = run('node', 10, 3);
    const tier = getTier('node');
    const expected = PREFILL_TIME + tier.latencySec + KV_SIZE_GB / tier.bandwidthGBps;
    expect(state.history.ttft.length).toBe(1);
    expect(Math.abs(state.history.ttft[0].ttft - expected)).toBeLessThanOrEqual(2 * DT);
  });

  it('T8 throughput ceilings at 240 RPM over 120 s', () => {
    const bands: Record<TierId, [number, number]> = {
      node: [170, 200], rack: [140, 170], xrack: [65, 95], xaz: [25, 45],
    };
    for (const tier of TIERS) {
      const { state } = run(tier.id, 240, 120);
      const achieved = (state.totals.completed / 120) * 60;
      const [lo, hi] = bands[tier.id];
      expect(achieved, `${tier.id} achieved ${achieved} RPM`).toBeGreaterThanOrEqual(lo);
      expect(achieved, `${tier.id} achieved ${achieved} RPM`).toBeLessThanOrEqual(hi);
    }
  });

  it('T9 bottleneck labels after 90 s', () => {
    expect(run('rack', 60, 90).metrics.bottleneck).toBe('none');
    expect(run('xaz', 60, 90).metrics.bottleneck).toBe('link');
    expect(run('node', 240, 90).metrics.bottleneck).toBe('prefill');
  });
});
