import type { Tier, TierId } from './types';

export const DT = 1 / 60;               // fixed sim timestep, seconds
export const QUEUE_CAPACITY = 5;
export const PREFILL_SLOTS = 3;
export const PREFILL_TIME = 0.9;        // seconds per request
export const DECODE_TIME = 1.0;         // seconds, cosmetic only
export const KV_SIZE_GB = 1.3;          // per request, fixed
export const ARRIVAL_ANIM = 0.4;        // seconds, cosmetic
export const REJECT_ANIM = 0.6;         // seconds, cosmetic
export const RETURN_ANIM = 0.5;         // seconds, cosmetic
export const RPM_MIN = 10, RPM_MAX = 240, RPM_DEFAULT = 60;
export const DEFAULT_TIER: TierId = 'rack';

export const SAMPLE_WINDOW_SEC = 120;   // history.samples retention
export const TTFT_HISTORY_MAX = 200;    // history.ttft retention (entries)
export const REJECT_WINDOW_SEC = 60;    // rejectedAt retention
export const UTIL_WINDOW_SEC = 5;       // utilization + bottleneck lookback
export const TTFT_AVG_COUNT = 10;       // entries in ttftAvg10 and the bottleneck transfer mean
export const BOTTLENECK_MIN_TTFT = 3;   // fewer TTFT entries than this → 'none'
export const SATURATED_FRAC = 0.5;      // share of samples with a non-empty queue
export const MAX_FRAME_SEC = 0.25;      // clamp on real elapsed time per frame (inactive tabs)
export const RENDER_INTERVAL_MS = 50;   // minimum spacing between React re-renders
export const RPM_STEP = 5;

// Illustrative values: ordered like real hardware, scaled so effects show at 60 RPM.
export const TIERS: Tier[] = [
  { id: 'node', label: 'Same node', latencySec: 0.01, bandwidthGBps: 26, gapPx: 60,
    description: "GPUs share one machine's internal interconnect" },
  { id: 'rack', label: 'Same rack', latencySec: 0.02, bandwidthGBps: 6.5, gapPx: 140,
    description: 'Machines in one cabinet, short high-speed cables' },
  { id: 'xrack', label: 'Cross-rack', latencySec: 0.05, bandwidthGBps: 1.6, gapPx: 240,
    description: 'Traffic crosses one or more network switches' },
  { id: 'xaz', label: 'Cross-AZ', latencySec: 0.15, bandwidthGBps: 0.8, gapPx: 360,
    description: 'Traffic leaves the building over standard networking' },
];

export function getTier(id: TierId): Tier {
  return TIERS.find((t) => t.id === id)!;
}
