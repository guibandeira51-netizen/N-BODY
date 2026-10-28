import {COMPONENT_MASSES} from '../../src/physics/equilibrium-field.js';
export function allocation(pool,counts,{diskOnly=false}={}){
 if(counts.length!==3||counts.some((n,c)=>!Number.isSafeInteger(n)||n<2||n%2||n>pool.counts[c]))throw Error('Even nested allocation within pool required');
 const n=diskOnly?counts[1]:counts.reduce((a,b)=>a+b,0),s={n,time:0,positions:new Float64Array(3*n),velocities:new Float64Array(3*n),accelerations:new Float64Array(3*n),masses:new Float64Array(n),components:new Uint8Array(n),meta:{...pool.meta,counts:diskOnly?[0,counts[1],0]:counts,allocation:'nested component prefixes; unchanged phase-space samples; exact target mass per component',equilibriumValidated:false}};let src=0,dest=0;
 for(let c=0;c<3;c++){if(!diskOnly||c===1){for(let j=0;j<counts[c];j++){s.positions.set(pool.positions.slice(3*(src+j),3*(src+j+1)),3*dest);s.velocities.set(pool.velocities.slice(3*(src+j),3*(src+j+1)),3*dest);s.masses[dest]=COMPONENT_MASSES[c]/counts[c];s.components[dest++]=c;}}src+=pool.counts[c];}return s;
}
export function roundedState(s){for(const key of ['positions','velocities','masses'])s[key]=Float64Array.from(s[key],Math.fround);return s;}
export function angular(s){const L=[0,0,0];let scale=0;for(let i=0;i<s.n;i++){const p=s.positions.subarray(3*i,3*i+3),v=s.velocities.subarray(3*i,3*i+3),m=s.masses[i],l=[m*(p[1]*v[2]-p[2]*v[1]),m*(p[2]*v[0]-p[0]*v[2]),m*(p[0]*v[1]-p[1]*v[0])];for(let k=0;k<3;k++)L[k]+=l[k];scale+=Math.hypot(...l);}return {L,scale};}
