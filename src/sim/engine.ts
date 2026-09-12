import {
  ARRIVAL_ANIM, DECODE_TIME, KV_SIZE_GB, PREFILL_SLOTS, PREFILL_TIME, QUEUE_CAPACITY,
  REJECT_ANIM, REJECT_WINDOW_SEC, RETURN_ANIM, SAMPLE_WINDOW_SEC, TTFT_HISTORY_MAX, getTier,
} from './constants';
import type { Params, Request, SimState, Stage } from './types';

export function createInitialState(): SimState {
  return {
    time: 0,
    // SPEC: first arrival spawns on the first step so the scene is never empty for a full interval.
    nextArrivalAt: 0,
    nextId: 1,
    requests: [],
    totals: { arrived: 0, rejected: 0, completed: 0 },
    rejectedAt: [],
    history: { ttft: [], samples: [] },
  };
}

function enter(req: Request, stage: Stage, time: number): void {
  req.stage = stage;
  req.stageEnteredAt = time;
}

/** Advances the simulation by `dt` seconds. Mutates and returns `state`. */
export function step(state: SimState, params: Params, dt: number): SimState {
  const { requests } = state;

  // 1. Advance time.
  state.time += dt;
  const time = state.time;

  // 2. Spawn arrivals. Rejection is decided at spawn from reserved capacity.
  const interval = 60 / params.rpm;
  while (state.nextArrivalAt <= time) {
    state.totals.arrived++;
    const reserved = requests.filter((r) => r.stage === 'arriving' || r.stage === 'queued').length;
    if (reserved >= QUEUE_CAPACITY) {
      requests.push({ id: state.nextId++, stage: 'rejected', stageEnteredAt: time });
      state.totals.rejected++;
      state.rejectedAt.push(time);
    } else {
      requests.push({ id: state.nextId++, stage: 'arriving', stageEnteredAt: time });
    }
    state.nextArrivalAt += interval;
  }

  // 3. Land arrivals.
  for (const r of requests) {
    if (r.stage === 'arriving' && time - r.stageEnteredAt >= ARRIVAL_ANIM) {
      enter(r, 'queued', time);
      r.queuedAt = time;
    }
  }

  // 4. Finish prefill. The request keeps its slot through the transfer.
  const tier = getTier(params.tierId);
  for (const r of requests) {
    if (r.stage === 'prefill' && time - r.stageEnteredAt >= PREFILL_TIME) {
      enter(r, 'transfer', time);
      r.tier = tier;
      r.latencyRemaining = tier.latencySec;
      r.bytesRemaining = KV_SIZE_GB;
      r.transferStartedAt = time;
    }
  }

  // 5. Advance transfers. Bandwidth is shared equally among transfers in the bytes phase,
  // each using the tier captured at its own start.
  const n = requests.filter((r) => r.stage === 'transfer' && r.latencyRemaining! <= 0).length;
  for (const r of requests) {
    if (r.stage !== 'transfer') continue;
    if (r.latencyRemaining! > 0) {
      r.latencyRemaining! -= dt;
    } else {
      r.bytesRemaining! -= (r.tier!.bandwidthGBps / Math.max(n, 1)) * dt;
    }
    if (r.bytesRemaining! <= 0) {
      enter(r, 'decode', time);
      r.ttft = time - r.queuedAt!;
      state.history.ttft.push({
        t: time, ttft: r.ttft, prefillSec: PREFILL_TIME, transferSec: time - r.transferStartedAt!,
      });
      r.slot = undefined;
    }
  }

  // 6. Assign prefill slots, FIFO by queuedAt, lowest free slot first.
  const busy = new Set(requests.filter((r) => r.slot !== undefined).map((r) => r.slot));
  for (let slot = 0; slot < PREFILL_SLOTS; slot++) {
    if (busy.has(slot)) continue;
    let next: Request | undefined;
    for (const r of requests) {
      if (r.stage === 'queued' && (!next || r.queuedAt! < next.queuedAt!)) next = r;
    }
    if (!next) break;
    enter(next, 'prefill', time);
    next.slot = slot;
  }

  // 7. Finish decode.
  for (const r of requests) {
    if (r.stage === 'decode' && time - r.stageEnteredAt >= DECODE_TIME) enter(r, 'returning', time);
  }

  // 8. Remove finished.
  state.requests = requests.filter((r) => {
    const age = time - r.stageEnteredAt;
    if (r.stage === 'returning' && age >= RETURN_ANIM) {
      state.totals.completed++;
      return false;
    }
    return !(r.stage === 'rejected' && age >= REJECT_ANIM);
  });

  // 9. Sample and prune history.
  const { samples, ttft } = state.history;
  samples.push({
    t: time,
    queueDepth: state.requests.filter((r) => r.stage === 'queued').length,
    slotsBusy: state.requests.filter((r) => r.stage === 'prefill' || r.stage === 'transfer').length,
    linkBusy: n > 0,
  });
  while (samples.length && samples[0].t < time - SAMPLE_WINDOW_SEC) samples.shift();
  if (ttft.length > TTFT_HISTORY_MAX) ttft.splice(0, ttft.length - TTFT_HISTORY_MAX);
  while (state.rejectedAt.length && state.rejectedAt[0] < time - REJECT_WINDOW_SEC) state.rejectedAt.shift();

  return state;
}
