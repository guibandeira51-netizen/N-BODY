import {readFile,writeFile} from 'node:fs/promises';import {createHash} from 'node:crypto';
import {createAllocatedGalaxy} from '../../src/physics/initial-allocated.js';import {sampleOrbitCandidate} from '../../src/physics/orbit-equilibrium.js';
const folder='reports/resolution-decision',m=JSON.parse(await readFile(folder+'/manifest.json')),pointer=m.library,library=JSON.parse(await readFile(pointer.library));
for(const generator of ['legacy','candidate']){
 const original=JSON.parse(await readFile(m.pools.find(p=>p.generator===generator&&p.seed===2026).file)),counts=[4096,2,2],n=4100,more=generator==='legacy'?createAllocatedGalaxy({counts,n,seed:2026}):sampleOrbitCandidate(library,{counts,n,seed:2026}),pool={...original,n:original.n+4096-512,counts:[4096,...original.counts.slice(1)]};
 // Preserve all existing component phases; append additional paired bulge phases
 // drawn by the same existing generator, without recentering the disk or halo.
 for(const key of ['positions','velocities'])pool[key]=[...original[key].slice(0,512*3),...Array.from(more[key].slice(512*3,4096*3)),...original[key].slice(512*3)];
 pool.meta={...pool.meta,counts:pool.counts};const file=folder+'/pool-'+generator+'-s2026-b4096.json',bytes=JSON.stringify(pool);await writeFile(file,bytes);
 for(const config of [{id:generator+'-s2026-bulge4096',generator,seed:2026,pool:file,counts:[4096,8192,8192],dt:.05,epsilon:.1,duration:40,epochs:[0,10,20,40],control:'C',poolSHA256:createHash('sha256').update(bytes).digest('hex')},...[.05,.2].map(epsilon=>({id:generator+'-s2026-eps'+epsilon,generator,seed:2026,counts:[512,8192,8192],dt:.025,epsilon,duration:40,epochs:[0,10,20,40],control:'C',qualification:'Same initial phases; different softened Hamiltonian. Not a new equilibrium fit or an epsilon optimization.'}))])if(!m.runs.some(r=>r.id===config.id))m.runs.push(config);
}
for(const generator of ['legacy','candidate']){const config={id:generator+'-s2026-high-resolution-200',generator,seed:2026,counts:[512,16384,32768],dt:.05,epsilon:.1,duration:200,epochs:[0,40,100,200],control:'C',qualification:'One seed at high resolution; not a convergence certification.'};if(!m.runs.some(r=>r.id===config.id))m.runs.push(config);}
await writeFile(folder+'/manifest.json',JSON.stringify(m,null,2));console.log('Total planned controls '+m.runs.length);
