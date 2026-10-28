/** Bound message/queue batching by a measured step cost and UI latency.
 * This limit is on a work batch, never on the number of physical particles. */
export function stepBatch(measuredStepMs,targetMs=20){if(!Number.isFinite(measuredStepMs)||measuredStepMs<=0)return 1;return Math.max(1,Math.min(32,Math.floor(targetMs/measuredStepMs)));}
