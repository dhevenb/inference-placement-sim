export type TierId = 'node' | 'rack' | 'xrack' | 'xaz';

export interface Tier {
  id: TierId; label: string; latencySec: number;
  bandwidthGBps: number; gapPx: number; description: string;
}

export type Stage =
  | 'arriving'    // cosmetic flight from user to queue; capacity already reserved
  | 'queued'
  | 'prefill'     // holds a prefill slot
  | 'transfer'    // still holds the prefill slot
  | 'decode'      // slot released; TTFT recorded at entry
  | 'returning'   // cosmetic flight back to user
  | 'rejected';   // cosmetic bounce, then removed

export interface Request {
  id: number;
  stage: Stage;
  stageEnteredAt: number;     // sim seconds
  queuedAt?: number;          // set when stage becomes 'queued'; TTFT clock starts here
  slot?: number;              // prefill slot index while in prefill/transfer
  tier?: Tier;                // captured when transfer starts
  latencyRemaining?: number;  // transfer phase 1
  bytesRemaining?: number;    // transfer phase 2, GB
  transferStartedAt?: number;
  ttft?: number;              // set at decode entry
}

export interface Params { tierId: TierId; rpm: number; }

export interface SimState {
  time: number;               // sim seconds
  nextArrivalAt: number;
  nextId: number;
  requests: Request[];        // all live requests
  totals: { arrived: number; rejected: number; completed: number };
  rejectedAt: number[];       // spawn times of rejections, pruned to the last 60 s
  history: {
    ttft: Array<{ t: number; ttft: number; prefillSec: number; transferSec: number }>;
    samples: Array<{ t: number; queueDepth: number; slotsBusy: number; linkBusy: boolean }>;
  };
}
