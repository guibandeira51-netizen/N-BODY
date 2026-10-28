import{readFile,writeFile,readdir}from'node:fs/promises';import{createHash}from'node:crypto';import{resolve,relative}from'node:path';
import{G,MODEL,KPC_METERS,MYR_SECONDS}from'../../src/physics/constants.js';
import{R200,HALO_OUTER_RADIUS,HALO_TOTAL_MASS}from'../../src/physics/models.js';
import{createHaloGeometry,haloGeometryAt,haloWeakMetric,LIGHT_SPEED}from'../../src/physics/halo-geometry.js';
import{createLiveGalaxy}from'../../src/physics/live-initial.js';
const root=resolve(import.meta.dirname,'../..'),folder=import.meta.dirname;
async function hashes(dir){const out={};for(const e of await readdir(dir,{withFileTypes:true})){const p=resolve(dir,e.name);if(e.isDirectory())Object.assign(out,await hashes(p));else out[relative(root,p).replaceAll('\\','/')]=createHash('sha256').update(await readFile(p)).digest('hex');}return out;}
const sourceHashes=await hashes(resolve(root,'src'));for(const f of['experimento-ncorpos.html','HALO_GEOMETRICO_INTEGRADO.md'])sourceHashes[f]=createHash('sha256').update(await readFile(resolve(root,f))).digest('hex');
await writeFile(resolve(folder,'production-before.json'),JSON.stringify(sourceHashes,null,2));
const field=createHaloGeometry(),radii=[0,1e-6,1e-4,.001,.01,.1,1,4,8,15.62,25,50,100,R200*(1-1e-8),R200,R200*(1+1e-8),230,HALO_OUTER_RADIUS*(1-1e-8),HALO_OUTER_RADIUS,HALO_OUTER_RADIUS*(1+1e-8),1000];
const samples=radii.map(r=>({r,...haloGeometryAt([r,0,0],field),metric:haloWeakMetric([r,0,0],field)}));
const gradients=[.001,.01,.1,1,4,8,25,100,230,300].map(r=>{const h=r*1e-4;return{r,h,at:haloGeometryAt([r,0,0],field),lo:haloGeometryAt([r-h,0,0],field),hi:haloGeometryAt([r+h,0,0],field)};});
const boundaries=[field.r200,field.outerRadius].map(r=>({r,rows:[-1e-7,-1e-9,0,1e-9,1e-7].map(delta=>({delta,...haloGeometryAt([r*(1+delta),0,0],field)}))}));
const discrete=[];for(const seed of[2026,2027,2028])for(const factor of[1,4,16,32]){const s=createLiveGalaxy({baseN:1024,seed,haloRefinement:factor});const ids=Array.from(s.components.keys()).filter(i=>s.components[i]===2);discrete.push({seed,factor,center:s.meta.centerShift.map(x=>Math.fround(-x)),positions:ids.flatMap(i=>Array.from(s.positions.slice(3*i,3*i+3),Math.fround)),masses:ids.map(i=>Math.fround(s.masses[i]))});}
await writeFile(resolve(folder,'inputs.json'),JSON.stringify({constants:{G,KPC_METERS,MYR_SECONDS,LIGHT_SPEED,MODEL,R200,HALO_OUTER_RADIUS,HALO_TOTAL_MASS},field,samples,gradients,boundaries,discrete}));
console.log('Audit inputs and production hash baseline saved; no production source changed.');
