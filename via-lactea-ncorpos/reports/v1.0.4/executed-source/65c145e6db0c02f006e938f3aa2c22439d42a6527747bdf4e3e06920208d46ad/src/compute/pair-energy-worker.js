import {pairEnergyRange} from '../physics/pair-energy-partition.js';
self.onmessage=({data:d})=>{try{self.postMessage({value:pairEnergyRange(d.positions,d.masses,d.n,d.first,d.last,d.G,d.eps2)});}catch(e){self.postMessage({error:e.message});}};
