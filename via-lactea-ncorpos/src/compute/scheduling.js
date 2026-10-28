/** Bound message/queue batching by a measured step cost and UI latency.
 * This limit is on a work batch, never on the number of physical particles. */
export function stepBatch(measuredStepMs,targetMs=20){if(!Number.isFinite(measuredStepMs)||measuredStepMs<=0)return 1;return Math.max(1,Math.min(32,Math.floor(targetMs/measuredStepMs)));}

/** A small-N CPU extrapolation is not a measurement at the requested N.
 * Keep an admitted, measured GPU pilot unless an actual CPU measurement at
 * that same N is faster. This does not certify either backend scientifically.
 */
export function preferMeasuredGPU(gpuStepMs,cpuMeasuredStepMs=null,maxStepMs=2000){
 if(!Number.isFinite(gpuStepMs)||gpuStepMs<=0||gpuStepMs>maxStepMs)return false;
 return !(Number.isFinite(cpuMeasuredStepMs)&&cpuMeasuredStepMs>0&&cpuMeasuredStepMs<gpuStepMs);
}
