import {pairEnergyRange} from '../physics/pair-energy-partition.js';
import {energyBase} from '../physics/live-energy.js';
self.onmessage=({data:m})=>{try{
 const started=performance.now(),s=m.state,d=m.base?energyBase(s,m.options):null;
 let lastProgress=started;
 // Already-open clients predate progress messages and treat any message as
 // the final answer. Only send intermediate messages after explicit opt-in.
 const onProgress=m.progressProtocol===1?done=>{const now=performance.now();if(now-lastProgress>=250){postMessage({type:'progress',done});lastProgress=now;}}:undefined;
 const value=pairEnergyRange(s.positions,s.masses,s.n,m.first,m.last,m.G,m.epsilonSquared,onProgress);
 postMessage({type:'result',value,base:d,ms:performance.now()-started});
}catch(e){postMessage({error:e.message});}};
