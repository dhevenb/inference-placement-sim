# Inference Placement Simulator

A browser-based simulator that shows how the physical placement of two groups of AI inference servers affects request latency and queueing. Serving a large language model request has two phases: **prefill** reads the prompt and builds a block of working memory (the **KV cache**), and **decode** generates the answer from it. When prefill and decode run on separate server groups, the KV cache must cross the network between them. Pick a placement tier (same node, same rack, cross-rack, cross-AZ) and a request rate, then watch requests queue, prefill, cross the link and decode, as time-to-first-token (TTFT) climbs, the queue fills, rejections begin, and the bottleneck label shifts between prefill compute and the network link.

**Live site:** https://dhevenb.github.io/inference-placement-sim/

## Run locally

Requires Node.js 20.19 or newer (`.nvmrc` pins 20).

```sh
npm install
npm run dev      # dev server at http://localhost:5173/inference-placement-sim/
npm test         # engine and metrics tests (Vitest)
npm run build    # type-check and production build into dist/
```

Pushes to `main` run tests, build, and deploy to GitHub Pages via `.github/workflows/deploy.yml`.

## How the simulation works

The engine (`src/sim/`) is pure TypeScript, deterministic, and advances in fixed 1/60 s steps. Each step:

1. Spawns requests at exactly `60 / RPM` second intervals. If 5 requests are already waiting (or flying to the queue), the new one is **rejected**.
2. Moves landed arrivals into the FIFO **queue**; TTFT's clock starts here.
3. Finishes **prefill** after 0.9 s. The request moves to **transfer** but *keeps its prefill slot* (3 slots total).
4. Advances transfers: first the tier's fixed latency, then 1.3 GB of KV cache at the tier's bandwidth, **shared equally** among transfers sending bytes at the same moment.
5. When a transfer completes, the slot is released and **TTFT = queue wait + prefill + transfer** is recorded (first token counts when decode begins). Decode is unlimited and cosmetic.
6. Assigns freed slots to the oldest queued requests, then samples queue depth, busy slots and link activity.

The bottleneck label looks at the last 5 s: if the queue was non-empty in fewer than half the samples it reads **None**; otherwise **Network link** if the last 10 requests spent longer in transfer than in prefill, else **Prefill compute**. Slot utilization can't discriminate, because a slot stays busy through its transfer either way.

## Tier values

Values are illustrative: ordered like real hardware, scaled so effects are visible at 60 RPM with a 5-deep queue.

| Tier        | Latency | Bandwidth | Single-transfer time | Measured ceiling (240 RPM, 120 s) |
|-------------|--------:|----------:|---------------------:|----------------------------------:|
| Same node   | 10 ms   | 26 GB/s   | 0.06 s               | 182.5 RPM |
| Same rack   | 20 ms   | 6.5 GB/s  | 0.22 s               | 155.5 RPM |
| Cross-rack  | 50 ms   | 1.6 GB/s  | 0.86 s               | 68 RPM    |
| Cross-AZ    | 150 ms  | 0.8 GB/s  | 1.77 s               | 33.5 RPM  |

These are the original spec values; all throughput and bottleneck tests passed without tuning.

## Simplifications

Deliberately left out to keep the model readable:

- Decode capacity limits (decode always accepts work)
- Variable prompt sizes (every KV cache is 1.3 GB)
- Random or bursty arrivals (arrivals are evenly spaced)
- Request timeouts and retries (the only failure is rejection at a full queue)
- Server failures
- Multiple model replicas and routing between them
- Per-percentile latency (a single TTFT series, no p95/p99)
- Configurable queue size or prefill slot count
- Dark mode, mobile layout, and persistence of any kind
