import { KV_SIZE_GB, PREFILL_SLOTS, PREFILL_TIME, QUEUE_CAPACITY, getTier } from '../sim/constants';
import type { TierId } from '../sim/types';

const TERMS: Array<[term: string, definition: string]> = [
  ['Prefill', `The model reads the prompt and builds its working memory. Here: ${PREFILL_SLOTS} GPUs, ${PREFILL_TIME} s each.`],
  ['Decode', 'Separate servers write the answer one word-piece at a time, using that working memory.'],
  ['KV cache', `That working memory (${KV_SIZE_GB} GB here). It must cross the network to decode before the answer starts.`],
  ['TTFT', 'The wait before the answer starts. TTFT = queue wait + prefill + transfer. First token is counted when decode begins.'],
  ['Placement', 'How far apart prefill and decode sit: same machine, same rack, another rack, or another building (AZ).'],
  ['Latency & bandwidth', 'Latency: a fixed delay per transfer. Bandwidth: data per second, shared by transfers in flight.'],
  ['Queue', `Requests wait here for a free prefill GPU. It holds ${QUEUE_CAPACITY}; arrivals when it is full are rejected.`],
  ['Bottleneck', 'The slowest stage. It caps the requests per minute (RPM) the system can finish; beyond that, the queue fills.'],
];

export function InfoPanel({ tierId }: { tierId: TierId }) {
  const tier = getTier(tierId);
  const transferSec = tier.latencySec + KV_SIZE_GB / tier.bandwidthGBps;
  return (
    <footer className="info">
      <h2>Key terms</h2>
      <dl className="terms">
        {TERMS.map(([term, definition]) => (
          <div key={term}>
            <dt>{term}</dt>
            <dd>{definition}</dd>
          </div>
        ))}
      </dl>
      <p className="notes">
        <strong>{tier.label}:</strong> {tier.description}. Latency {Math.round(tier.latencySec * 1000)} ms ·
        bandwidth {tier.bandwidthGBps} GB/s · one {KV_SIZE_GB} GB KV-cache transfer alone
        takes {transferSec.toFixed(2)} s. <em>Tier values are illustrative. They preserve the ordering of real
        hardware but are scaled so effects are visible at 60 requests per minute with a 5-deep queue. Real systems run
        at far higher rates with far larger queues.</em>
      </p>
    </footer>
  );
}
