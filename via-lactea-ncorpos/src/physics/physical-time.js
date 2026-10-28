/** Diagnostic epoch only: never modifies forces, velocities or the KDK step. */
export function physicalEpoch(initialTime,completedSteps,effectiveDt){
 if(!Number.isFinite(initialTime)||!Number.isSafeInteger(completedSteps)||completedSteps<0||!Number.isFinite(effectiveDt)||effectiveDt<=0)throw new RangeError('Relógio físico exige época finita, passos inteiros seguros e passo efetivo positivo.');
 const time=initialTime+completedSteps*effectiveDt;
 if(!Number.isFinite(time))throw new RangeError('Tempo físico fora da representação finita.');
 return time;
}
