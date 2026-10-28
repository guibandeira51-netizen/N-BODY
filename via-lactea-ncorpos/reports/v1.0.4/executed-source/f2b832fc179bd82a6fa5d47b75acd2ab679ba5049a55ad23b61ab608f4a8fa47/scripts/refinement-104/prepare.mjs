import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';import {createHash} from 'node:crypto';
const root=resolve(import.meta.dirname,'../..'),base=resolve(root,'reports/v1.0.4'),old='reports/v1.0.3/',hash=b=>createHash('sha256').update(b).digest('hex');
const load=async p=>JSON.parse(await readFile(resolve(root,p),'utf8'));
const save=async(p,d)=>{try{await readFile(p);throw Error('Refusing overwrite '+p);}catch(e){if(e.code!=='ENOENT')throw e;}await writeFile(p,JSON.stringify(d)+'\n');};
await mkdir(resolve(base,'initial'),{recursive:true});
const hm=await load(old+'halo-initial-manifest.json'),bm=await load(old+'baryons-initial-manifest.json'),rows=[];
function block(d,p){const ids=d.subpopulations.flatMap((x,i)=>x===p?[i]:[]),o={};for(const key of ['positions','velocities','masses','components','subpopulations'])o[key]=ids.flatMap(i=>key==='positions'||key==='velocities'?d[key].slice(3*i,3*i+3):[d[key][i]]);return o;}
function phase(b){const bytes=[];for(const key of ['positions','velocities','masses','components','subpopulations']){const a=key==='components'||key==='subpopulations'?Int32Array.from(b[key]):Float64Array.from(b[key]);bytes.push(Buffer.from(a.buffer));}return hash(Buffer.concat(bytes));}
for(const family of ['A','B','C','D'])for(const seed of [2026,2027,2028]){
 const fine=['C','D'].includes(family),nh=['B','D'].includes(family)?40000:4000,brow=bm.find(r=>r.baryonSeed===seed&&r.refinedPopulation===(fine?1:null)),hrow=hm.find(r=>r.haloSeed===seed&&r.nh===nh),bp=old+brow.file,hp=old+hrow.file,b=await load(bp),h=await load(hp),d=structuredClone(h),blocks=[block(b,0),block(b,1),block(b,2),block(h,3)],id=`F${family}-b${seed}-h${seed}`;
 for(const key of Object.keys(blocks[0]))d[key]=blocks.flatMap(p=>p[key]);d.n=d.masses.length;delete d.meta.version103;
 const parents=[{source:bp,sha256:hash(await readFile(resolve(root,bp)))},{source:hp,sha256:hash(await readFile(resolve(root,hp)))}];
 d.meta.version104={family,seed,parents,populationSHA256:blocks.map(phase),counts:blocks.map(b=>b.masses.length),qualification:'Same fixed v1.0.2 action DFs and Plummer mean; v1.0.3 exact population blocks. Thin2 was independently resampled, not cloned. Paired diagonal seeds vary both baryon and halo together; not a full 3x3 seed factorial.'};
 d.meta.realizationId='v104-'+id;d.meta.subpopulationCounts=d.meta.version104.counts;d.meta.counts=[d.components.filter(x=>x===0).length,d.components.filter(x=>x===1).length,d.components.filter(x=>x===2).length];
 const coords=new Set();for(let i=0;i<d.n;i++){const k=d.positions.slice(3*i,3*i+3).join(',');if(coords.has(k))throw Error('Coincident duplicate');coords.add(k);}
 const file='initial/'+id+'.json';await save(resolve(base,file),d);rows.push({id,family,file,sha256:hash(await readFile(resolve(base,file))),n:d.n,nh,baryonSeed:seed,haloSeed:seed,refinedPopulation:fine?1:null,counts:d.meta.subpopulationCounts,populationSHA256:blocks.map(phase),parents,haloParticleMassMsun:blocks[3].masses[0]*1e10,haloToThinParticleMass:blocks[3].masses[0]/blocks[1].masses[0]});
}
for(const seed of [2026,2027,2028]){const r=Object.fromEntries(rows.filter(r=>r.baryonSeed===seed).map(r=>[r.family,r]));for(const [a,b,pops]of [['A','B',[0,1,2]],['C','D',[0,1,2]],['A','C',[0,2,3]],['B','D',[0,2,3]]])for(const p of pops)if(r[a].populationSHA256[p]!==r[b].populationSHA256[p])throw Error('Pair mismatch');}
await save(resolve(base,'initial-manifest.json'),rows);
await save(resolve(base,'initial/protocol.json'),{schema:'preparation-proxy-104',actualCounts:'See meta.version104.counts and particle arrays. Older meta.preparation describes parent preparation, not current sampling.',physicalPreparation:'reports/v1.0.2/corrected/protocol.json',generatorUnchanged:true,pairedCopiesVerified:true,coincidentDuplicates:0});
const runs=rows.map(r=>({...r,id:r.id+'-t20',stage:'factorial20',model:'C',kind:'live',source:'reports/v1.0.4/'+r.file,sourceSHA256:r.sha256,dt:.05,epsilon:.1,durationMyr:20,cadenceMyr:.5,workers:6}));
await save(resolve(base,'campaign.json'),{schema:'refinement-campaign-104',registeredUTC:new Date().toISOString(),runs,qualification:'Initial four-family three-seed comparison only. Medium and higher-resolution stages must be registered after measurement.'});console.log('Prepared and paired',rows.length,'inputs');
