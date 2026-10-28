import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {buildEquilibriumField,plummerKernel,convolvedAt,equilibriumFieldAt,equilibriumFrequencies} from '../../src/physics/equilibrium-field.js';
import {analyticAcceleration} from '../../src/physics/models.js';
const base='reports/equilibrium-rebuild',id=new Date().toISOString().replace(/[:.]/g,'-'),out=base+'/'+id;await mkdir(out,{recursive:true});
const variants=[{id:'coarse',orders:[16,8,16],nu:64,nv:64},{id:'quadrature',orders:[32,12,24],nu:64,nv:64},{id:'grid',orders:[32,12,24],nu:112,nv:96}];
const fields=[];
for(const v of variants){const f=buildEquilibriumField({...v,epsilon:.1});await writeFile(out+'/field-'+v.id+'.json',JSON.stringify(f));fields.push(f);console.log(JSON.stringify({field:v.id,wallMs:f.wallMs,nodes:v.orders.reduce((a,b)=>a*b,1),kernelMass:f.rawKernelMass}));}
const kernels=variants.map(v=>plummerKernel(.1,v.orders)),rows=[];
for(const R of [.1,.3,1,3,8.2,20,100,220])for(const z of [0,.05,.28,1])for(let c=0;c<3;c++){
 const q=kernels.map(k=>convolvedAt(k,R,z,c)),tab=fields.map(f=>equilibriumFieldAt(f,R,0,z,c)),norm=a=>Math.hypot(...a),difference=(a,b)=>norm(a.map((x,k)=>x-b[k])),scale=norm(q[1].acceleration);
 const h=Math.max(1e-5,R*1e-5),fd=[0,1,2].map(k=>{const p=[R,0,z],m=[R,0,z];p[k]+=h;m[k]-=h;return -(equilibriumFieldAt(fields[2],...p,c).potential-equilibriumFieldAt(fields[2],...m,c).potential)/(2*h);});
 rows.push({R,z,component:c,analyticAcceleration:analyticAcceleration(R,0,z,true,c),convolution:q[1].acceleration,quadratureRelativeForceChange:difference(q[0].acceleration,q[1].acceleration)/scale,coarseGridError:difference(tab[1].acceleration,q[1].acceleration)/scale,fineGridError:difference(tab[2].acceleration,q[1].acceleration)/scale,gridRelativeForceChange:difference(tab[1].acceleration,tab[2].acceleration)/scale,gradientRelativeError:difference(fd,tab[2].acceleration)/scale});
}
const max=key=>Math.max(...rows.map(r=>r[key]));
const summary={schema:'equilibrium-rebuild-field-audit-v1',createdUTC:new Date().toISOString(),epsilonKpc:.1,variants,rows,frequencies:[1,3,8.2,16,30,100,220].map(r=>equilibriumFrequencies(fields[2],r)),maxQuadratureRelativeForceChange:max('quadratureRelativeForceChange'),maxFineGridRelativeForceError:max('fineGridError'),maxGradientRelativeError:max('gradientRelativeError'),qualification:'Measured differences, not a formal error bound or equilibrium acceptance. Field approximation must be carried into density/stationarity assessment.'};
await writeFile(out+'/field-audit.json',JSON.stringify(summary,null,2));
const chosen=out+'/field-grid.json',hash=createHash('sha256').update(await readFile(chosen)).digest('hex');await writeFile(base+'/latest-field.json',JSON.stringify({id,path:out,field:chosen,sha256:hash,audit:out+'/field-audit.json'},null,2));console.log(JSON.stringify({out,hash,maxQuadrature:summary.maxQuadratureRelativeForceChange,maxGrid:summary.maxFineGridRelativeForceError,maxGradient:summary.maxGradientRelativeError}));
