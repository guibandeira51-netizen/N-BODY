import {pairEnergyRange} from '../physics/pair-energy-partition.js';
import {energyBase} from '../physics/live-energy.js';
self.onmessage=({data:m})=>{try{
 const started=performance.now(),s=m.state,d=m.base?energyBase(s,m.options):null;
 const value=pairEnergyRange(s.positions,s.masses,s.n,m.first,m.last,m.G,m.epsilonSquared);
 postMessage({value,base:d,ms:performance.now()-started});
}catch(e){postMessage({error:e.message});}};
