import { KV_SIZE_GB, getTier } from '../sim/constants';
import type { TierId } from '../sim/types';

export function InfoPanel({ tierId }: { tierId: TierId }) {
  const tier = getTier(tierId);
  const transferSec = tier.latencySec + KV_SIZE_GB / tier.bandwidthGBps;
  return (
    <footer className="info">
      <p>
        <strong>Time to first token.</strong> TTFT = queue wait + prefill + transfer. First token is counted when
        decode begins.
      </p>
      <p>
        <strong>{tier.label}:</strong> {tier.description}. Latency {Math.round(tier.latencySec * 1000)} ms ·
        bandwidth {tier.bandwidthGBps} GB/s · one {KV_SIZE_GB} GB KV-cache transfer alone
        takes {transferSec.toFixed(2)} s.
      </p>
      <p className="disclaimer">
        Tier values are illustrative. They preserve the ordering of real hardware but are scaled so effects are
        visible at 60 requests per minute with a 5-deep queue. Real systems run at far higher rates with far larger
        queues.
      </p>
    </footer>
  );
}
