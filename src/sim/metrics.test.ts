import { describe, expect, it } from 'vitest';
import { PREFILL_TIME } from './constants';
import { createInitialState } from './engine';
import { computeMetrics } from './metrics';
import type { SimState } from './types';

/** State at time 100 with `n` TTFT entries and 5 s of samples at 1 s spacing. */
function stateWith(opts: { queueDepths: number[]; transferSec?: number; ttftCount?: number }): SimState {
  const s = createInitialState();
  s.time = 100;
  opts.queueDepths.forEach((queueDepth, i) => {
    s.history.samples.push({ t: 96 + i, queueDepth, slotsBusy: 3, linkBusy: i % 2 === 0 });
  });
  for (let i = 0; i < (opts.ttftCount ?? 10); i++) {
    const transferSec = opts.transferSec ?? 0.1;
    s.history.ttft.push({ t: 90 + i, ttft: 1 + i, prefillSec: PREFILL_TIME, transferSec });
  }
  return s;
}

describe('computeMetrics', () => {
  it('reports nulls and zeros for a fresh state', () => {
    const m = computeMetrics(createInitialState());
    expect(m).toEqual({
      ttftLast: null, ttftAvg10: null, queueDepth: 0, rejectedTotal: 0, rejectedLast60s: 0,
      completedTotal: 0, prefillSlotUtil: 0, linkUtil: 0, bottleneck: 'none',
    });
  });

  it('averages only the last 10 TTFT entries', () => {
    const s = stateWith({ queueDepths: [0], ttftCount: 15 }); // ttft values 1..15
    const m = computeMetrics(s);
    expect(m.ttftLast).toBe(15);
    expect(m.ttftAvg10).toBeCloseTo(10.5); // mean of 6..15
  });

  it('counts queue depth from live requests and rejections within 60 s', () => {
    const s = stateWith({ queueDepths: [0] });
    s.requests.push({ id: 1, stage: 'queued', stageEnteredAt: 99, queuedAt: 99 });
    s.requests.push({ id: 2, stage: 'arriving', stageEnteredAt: 99.9 });
    s.totals.rejected = 3;
    s.rejectedAt = [39, 40, 70];
    const m = computeMetrics(s);
    expect(m.queueDepth).toBe(1);
    expect(m.rejectedTotal).toBe(3);
    expect(m.rejectedLast60s).toBe(2);
  });

  it('computes utilizations over the last 5 s of samples only', () => {
    const s = stateWith({ queueDepths: [0, 0, 0, 0, 0] });
    s.history.samples.unshift({ t: 50, queueDepth: 0, slotsBusy: 0, linkBusy: true });
    s.history.samples[3].slotsBusy = 0;
    const m = computeMetrics(s);
    expect(m.prefillSlotUtil).toBeCloseTo(0.8); // 4 of 5 samples fully busy
    expect(m.linkUtil).toBeCloseTo(0.6);        // samples at i = 0, 2, 4
  });

  it('bottleneck is none when the queue is empty in most samples', () => {
    expect(computeMetrics(stateWith({ queueDepths: [1, 1, 0, 0, 0], transferSec: 3 })).bottleneck).toBe('none');
  });

  it('bottleneck is none with fewer than 3 TTFT entries', () => {
    expect(computeMetrics(stateWith({ queueDepths: [5, 5, 5, 5, 5], ttftCount: 2 })).bottleneck).toBe('none');
  });

  it('bottleneck is link when transfers outlast prefill, prefill otherwise', () => {
    const saturated = [5, 5, 5, 0, 0];
    expect(computeMetrics(stateWith({ queueDepths: saturated, transferSec: PREFILL_TIME + 0.1 })).bottleneck).toBe('link');
    expect(computeMetrics(stateWith({ queueDepths: saturated, transferSec: PREFILL_TIME - 0.1 })).bottleneck).toBe('prefill');
  });
});
