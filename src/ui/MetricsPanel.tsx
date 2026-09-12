import type { ReactNode } from 'react';
import { QUEUE_CAPACITY } from '../sim/constants';
import type { Bottleneck, Metrics } from '../sim/metrics';

const BOTTLENECK: Record<Bottleneck, { label: string; color: string }> = {
  none: { label: 'None', color: '#9a9a92' },
  prefill: { label: 'Prefill compute', color: '#F08C00' },
  link: { label: 'Network link', color: '#E5484D' },
};

const sec = (v: number | null) => (v === null ? '—' : `${v.toFixed(2)} s`);
const pct = (v: number) => `${Math.round(v * 100)}%`;

function Stat({ label, value, sub, wide }: { label: string; value: ReactNode; sub?: string; wide?: boolean }) {
  return (
    <div className={wide ? 'stat wide' : 'stat'}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

export function MetricsPanel({ metrics: m }: { metrics: Metrics }) {
  const b = BOTTLENECK[m.bottleneck];
  return (
    <div className="panel metrics">
      <Stat label="TTFT, last request" value={sec(m.ttftLast)} sub={`avg of last 10: ${sec(m.ttftAvg10)}`} />
      <Stat label="Queue depth" value={`${m.queueDepth} / ${QUEUE_CAPACITY}`} sub="waiting for a prefill slot" />
      <Stat label="Rejections" value={m.rejectedTotal} sub={`${m.rejectedLast60s} in the last 60 s`} />
      <Stat label="Completed" value={m.completedTotal} sub="answers returned" />
      <Stat label="Bottleneck" wide
        value={<><span className="dot" style={{ background: b.color }} />{b.label}</>} />
      <Stat label="Prefill slot use" value={pct(m.prefillSlotUtil)} sub="last 5 s" />
      <Stat label="Link busy" value={pct(m.linkUtil)} sub="last 5 s" />
    </div>
  );
}
