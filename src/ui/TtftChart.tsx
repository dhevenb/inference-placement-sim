import { CHART_MIN_Y_SEC, CHART_WINDOW_SEC, PREFILL_TIME } from '../sim/constants';
import type { SimState } from '../sim/types';

const W = 380, H = 170;
const PAD = { left: 34, right: 10, top: 10, bottom: 22 };

export function TtftChart({ state }: { state: SimState }) {
  // The window fills from the left for the first 90 s, then scrolls.
  const tMax = Math.max(state.time, CHART_WINDOW_SEC);
  const tMin = tMax - CHART_WINDOW_SEC;
  const points = state.history.ttft.filter((e) => e.t >= tMin);
  const yMax = Math.max(CHART_MIN_Y_SEC, 1.2 * Math.max(0, ...points.map((e) => e.ttft)));

  const x = (t: number) => PAD.left + ((t - tMin) / CHART_WINDOW_SEC) * (W - PAD.left - PAD.right);
  const y = (v: number) => H - PAD.bottom - (v / yMax) * (H - PAD.top - PAD.bottom);
  const yTicks = [0, yMax / 2, yMax];

  return (
    <div className="panel chart">
      <div className="stat-label">TTFT over time (last {CHART_WINDOW_SEC} s)</div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="TTFT over time">
        {yTicks.map((v) => (
          <g key={v}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} className="grid" />
            <text x={PAD.left - 6} y={y(v) + 4} className="tick" textAnchor="end">{v.toFixed(1)}s</text>
          </g>
        ))}
        <line x1={PAD.left} x2={W - PAD.right} y1={y(PREFILL_TIME)} y2={y(PREFILL_TIME)} className="ref" />
        <text x={W - PAD.right} y={y(PREFILL_TIME) - 4} className="tick" textAnchor="end">prefill only</text>
        <polyline className="series" points={points.map((e) => `${x(e.t)},${y(e.ttft)}`).join(' ')} />
        {points.map((e, i) => <circle key={i} cx={x(e.t)} cy={y(e.ttft)} r={2} className="point" />)}
        <text x={PAD.left} y={H - 6} className="tick">{Math.floor(tMin)}s</text>
        <text x={W - PAD.right} y={H - 6} className="tick" textAnchor="end">{Math.floor(tMax)}s sim time</text>
      </svg>
    </div>
  );
}
