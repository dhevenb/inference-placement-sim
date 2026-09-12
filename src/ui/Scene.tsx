import {
  ARRIVAL_ANIM, KV_SIZE_GB, PREFILL_SLOTS, QUEUE_CAPACITY, REJECT_ANIM, RETURN_ANIM, getTier,
} from '../sim/constants';
import type { Request, SimState, Tier } from '../sim/types';

// Scene layout, in viewBox units.
const FLOW_Y = 235;
const USER = { x: 40, y: FLOW_Y };
const ARRIVAL_START_X = 58;
const QUEUE_X = 150, QUEUE_SPACING = 30, QUEUE_SLOT = 24;
const QUEUE_ENTRY_X = 118;
const BOX_H = 100, BOX_TOP = FLOW_Y - BOX_H / 2;
const PREFILL_X = 260, PREFILL_W = 90, PREFILL_SLOT_X = 305, PREFILL_SLOT_SPACING = 30;
const LINK_X0 = PREFILL_X + PREFILL_W;
const DECODE_W = 80;
const LINK_LATENCY_SHARE = 0.15;
const BALL_R = 9;
const YELLOW = '#F5C518', RED = '#E5484D';

const queueSlotY = (i: number) => FLOW_Y + 2 * QUEUE_SPACING - i * QUEUE_SPACING; // 0 = front, at bottom
const prefillSlotY = (slot: number) => FLOW_Y + (slot - 1) * PREFILL_SLOT_SPACING;
const lerp = (a: number, b: number, p: number) => a + (b - a) * Math.min(Math.max(p, 0), 1);

interface Layout { time: number; decodeX: number; queueIndex: Map<number, number>; decodeIndex: Map<number, number> }

function returnArc(decodeX: number) {
  const from = { x: decodeX + DECODE_W - 12, y: BOX_TOP };
  const to = { x: USER.x, y: USER.y - 30 };
  return { from, to, ctrl: { x: (from.x + to.x) / 2, y: -80 } };
}

function position(r: Request, L: Layout): { x: number; y: number; opacity?: number } {
  const age = L.time - r.stageEnteredAt;
  switch (r.stage) {
    case 'arriving':
      return { x: lerp(ARRIVAL_START_X, QUEUE_ENTRY_X, age / ARRIVAL_ANIM), y: FLOW_Y };
    case 'queued':
      return { x: QUEUE_X, y: queueSlotY(L.queueIndex.get(r.id) ?? 0) };
    case 'prefill':
      return { x: PREFILL_SLOT_X, y: prefillSlotY(r.slot ?? 0) };
    case 'transfer': {
      const tier = r.tier!;
      const frac = r.latencyRemaining! > 0
        ? LINK_LATENCY_SHARE * (1 - r.latencyRemaining! / tier.latencySec)
        : LINK_LATENCY_SHARE + (1 - LINK_LATENCY_SHARE) * (1 - r.bytesRemaining! / KV_SIZE_GB);
      // SPEC: balls use a small per-slot vertical offset so concurrent transfers stay distinguishable.
      return { x: lerp(LINK_X0, L.decodeX, frac), y: FLOW_Y + ((r.slot ?? 1) - 1) * 10 };
    }
    case 'decode': {
      const i = (L.decodeIndex.get(r.id) ?? 0) % 6;
      return { x: L.decodeX + 20 + (i % 3) * 20, y: FLOW_Y - 12 + Math.floor(i / 3) * 24 };
    }
    case 'returning': {
      const { from, to, ctrl } = returnArc(L.decodeX);
      const p = Math.min(age / RETURN_ANIM, 1), q = 1 - p;
      return {
        x: q * q * from.x + 2 * p * q * ctrl.x + p * p * to.x,
        y: q * q * from.y + 2 * p * q * ctrl.y + p * p * to.y,
      };
    }
    case 'rejected': {
      const p = Math.min(age / REJECT_ANIM, 1);
      const out = p < 0.5 ? p * 2 : (1 - p) * 2; // toward the queue, then back
      return { x: lerp(ARRIVAL_START_X, QUEUE_ENTRY_X, out), y: FLOW_Y, opacity: 1 - p };
    }
  }
}

const indexBy = (rs: Request[], key: (r: Request) => number) =>
  new Map(rs.slice().sort((a, b) => key(a) - key(b) || a.id - b.id).map((r, i) => [r.id, i]));

export function Scene({ state, tierId, linkUtil }: { state: SimState; tierId: Tier['id']; linkUtil: number }) {
  const tier = getTier(tierId);
  const decodeX = LINK_X0 + tier.gapPx;
  const layout: Layout = {
    time: state.time,
    decodeX,
    queueIndex: indexBy(state.requests.filter((r) => r.stage === 'queued'), (r) => r.queuedAt!),
    decodeIndex: indexBy(state.requests.filter((r) => r.stage === 'decode'), (r) => r.stageEnteredAt),
  };
  const queueDepth = layout.queueIndex.size;
  const slotHolder = (slot: number) => state.requests.find((r) => r.slot === slot);
  const arc = returnArc(decodeX);
  const linkMid = (LINK_X0 + decodeX) / 2;

  return (
    <svg className="scene" viewBox="0 0 820 360" role="img" aria-label="Request flow animation">
      <path d={`M${arc.from.x},${arc.from.y} Q${arc.ctrl.x},${arc.ctrl.y} ${arc.to.x},${arc.to.y}`}
        className="arc" />

      <g className="user">
        <circle cx={USER.x} cy={USER.y - 14} r={10} />
        <path d={`M${USER.x - 16},${USER.y + 22} a16,16 0 0 1 32,0 Z`} />
      </g>
      <text x={USER.x} y={USER.y + 42} className="label">Users</text>

      <text x={QUEUE_X} y={queueSlotY(QUEUE_CAPACITY - 1) - 22} className="label">
        Queue {queueDepth}/{QUEUE_CAPACITY}
      </text>
      {Array.from({ length: QUEUE_CAPACITY }, (_, i) => (
        <rect key={i} x={QUEUE_X - QUEUE_SLOT / 2} y={queueSlotY(i) - QUEUE_SLOT / 2}
          width={QUEUE_SLOT} height={QUEUE_SLOT} rx={5} className="slot" />
      ))}

      <rect x={PREFILL_X} y={BOX_TOP} width={PREFILL_W} height={BOX_H} rx={10} className="box" />
      <text x={PREFILL_X + PREFILL_W / 2} y={BOX_TOP + BOX_H + 20} className="label">Prefill ({PREFILL_SLOTS} GPUs)</text>
      {Array.from({ length: PREFILL_SLOTS }, (_, slot) => (
        <circle key={slot} cx={PREFILL_SLOT_X} cy={prefillSlotY(slot)} r={13}
          className={`slot ${slotHolder(slot)?.stage === 'transfer' ? 'held' : ''}`} />
      ))}

      <line x1={LINK_X0} y1={FLOW_Y} x2={decodeX} y2={FLOW_Y} className="link-track" />
      <line x1={LINK_X0} y1={FLOW_Y} x2={decodeX} y2={FLOW_Y} className="link"
        style={{ strokeWidth: 2 + 8 * linkUtil, opacity: 0.35 + 0.65 * linkUtil }} />
      <text x={linkMid} y={BOX_TOP - 26} className="label strong">{tier.label}</text>
      <text x={linkMid} y={BOX_TOP - 10} className="label">
        KV-cache link: {Math.round(tier.latencySec * 1000)} ms · {tier.bandwidthGBps} GB/s
      </text>

      <rect x={decodeX} y={BOX_TOP} width={DECODE_W} height={BOX_H} rx={10} className="box" />
      <text x={decodeX + DECODE_W / 2} y={BOX_TOP + BOX_H + 20} className="label">Decode</text>

      <g className="legend" transform="translate(24 338)">
        <circle cx={0} cy={0} r={6} fill={YELLOW} className="req" />
        <text x={12} y={4}>request</text>
        <circle cx={82} cy={0} r={6} fill={RED} className="req" />
        <text x={94} y={4}>rejected: queue full</text>
        <circle cx={240} cy={0} r={7} className="slot held" />
        <text x={253} y={4}>GPU slot still held while its KV cache crosses the link</text>
      </g>

      {state.requests.map((r) => {
        const { x, y, opacity } = position(r, layout);
        return (
          <circle key={r.id} r={BALL_R} className="req" fill={r.stage === 'rejected' ? RED : YELLOW}
            style={{ transform: `translate(${x}px, ${y}px)`, opacity }} />
        );
      })}
    </svg>
  );
}
