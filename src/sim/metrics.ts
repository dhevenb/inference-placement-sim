import {
  BOTTLENECK_MIN_TTFT, PREFILL_SLOTS, PREFILL_TIME, REJECT_WINDOW_SEC, SATURATED_FRAC,
  TTFT_AVG_COUNT, UTIL_WINDOW_SEC,
} from './constants';
import type { SimState } from './types';

export type Bottleneck = 'none' | 'prefill' | 'link';

export interface Metrics {
  ttftLast: number | null;
  ttftAvg10: number | null;          // mean of last 10 history.ttft entries
  queueDepth: number;
  rejectedTotal: number;
  rejectedLast60s: number;           // count of rejections with spawn time in [time-60, time]
  completedTotal: number;
  prefillSlotUtil: number;           // 0–1, mean slotsBusy/PREFILL_SLOTS over last 5 s of samples
  linkUtil: number;                  // 0–1, fraction of last-5s samples with linkBusy
  bottleneck: Bottleneck;
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export function computeMetrics(state: SimState): Metrics {
  const { time, history, totals } = state;
  const recentTtft = history.ttft.slice(-TTFT_AVG_COUNT);
  const recentSamples = history.samples.filter((s) => s.t >= time - UTIL_WINDOW_SEC);

  return {
    ttftLast: history.ttft.length ? history.ttft[history.ttft.length - 1].ttft : null,
    ttftAvg10: recentTtft.length ? mean(recentTtft.map((e) => e.ttft)) : null,
    queueDepth: state.requests.filter((r) => r.stage === 'queued').length,
    rejectedTotal: totals.rejected,
    rejectedLast60s: state.rejectedAt.filter((t) => t >= time - REJECT_WINDOW_SEC).length,
    completedTotal: totals.completed,
    prefillSlotUtil: mean(recentSamples.map((s) => s.slotsBusy / PREFILL_SLOTS)),
    linkUtil: mean(recentSamples.map((s) => (s.linkBusy ? 1 : 0))),
    bottleneck: bottleneck(recentSamples, recentTtft),
  };
}

// A prefill slot is held through the KV transfer, so slot utilization is ~100% under either
// bottleneck and cannot tell them apart. The discriminator is where a slot spends its time:
// if the average transfer outlasts prefill itself, the network link is the limiting stage.
function bottleneck(
  recentSamples: SimState['history']['samples'],
  recentTtft: SimState['history']['ttft'],
): Bottleneck {
  const saturatedFrac = mean(recentSamples.map((s) => (s.queueDepth > 0 ? 1 : 0)));
  if (saturatedFrac < SATURATED_FRAC) return 'none';
  if (recentTtft.length < BOTTLENECK_MIN_TTFT) return 'none';
  return mean(recentTtft.map((e) => e.transferSec)) > PREFILL_TIME ? 'link' : 'prefill';
}
