import {readFile,writeFile} from 'node:fs/promises';
import {createGalaxy} from '../src/physics/initial.js';
import {Leapfrog} from '../src/physics/integrator.js';
import {diagnostics,conservationError} from '../src/physics/diagnostics.js';
import {directAccelerations} from '../src/physics/forces.js';
import {analyticAcceleration,diskDensity,hernquistDensity,haloDensity,HALO_OUTER_RADIUS,interpolate} from '../src/physics/models.js';
import {MODEL as P,G} from '../src/physics/constants.js';

// Inspection copy in memory; the production initializer is not modified.
let source=await readFile(new URL('../src/physics/initial.js',import.meta.url),'utf8');
for(const name of ['constants','models'])source=source.replace(`from './${name}.js'`,`from '${new URL(`../src/physics/${name}.js`,import.meta.url).href}'`);
source+='\nexport {jeansTables,verticalPressure,radialField};';
const {jeansTables,radialField}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const tables=jeansTables(true);
const initial=createGalaxy({n:2000,seed:2026,withHalo:true});
const clone=s=>({...s,positions:s.positions.slice(),velocities:s.velocities.slice(),accelerations:s.accelerations.slice(),masses:s.masses.slice(),components:s.components.slice()});
function profile(s){return [0,1,2].map(c=>{const r=[],R=[],z=[];for(let i=0;i<s.n;i++)if(s.components[i]===c){const k=3*i;r.push(Math.hypot(s.positions[k],s.positions[k+1],s.positions[k+2]));R.push(Math.hypot(s.positions[k],s.positions[k+1]));z.push(Math.abs(s.positions[k+2]));}for(const a of[r,R,z])a.sort((a,b)=>a-b);return {component:c,n:r.length,r50:r[Math.floor(r.length*.5)],R50:R[Math.floor(r.length*.5)],z50:z[Math.floor(r.length*.5)],z90:z[Math.floor(r.length*.9)]};});}
function velocityBins(s){const edges=[0,.5,1,2,4,8,16,32],bins=edges.slice(0,-1).map((r,i)=>({range:[r,edges[i+1]],count:0,R:0,vR:0,vR2:0,vphi:0,vphi2:0,vz:0,vz2:0}));for(let i=0;i<s.n;i++)if(s.components[i]===1){const k=3*i,x=s.positions[k],y=s.positions[k+1],R=Math.hypot(x,y),b=bins.find(b=>R>=b.range[0]&&R<b.range[1]);if(!b||!R)continue;const vR=(x*s.velocities[k]+y*s.velocities[k+1])/R,vphi=(x*s.velocities[k+1]-y*s.velocities[k])/R,vz=s.velocities[k+2];b.count++;b.R+=R;b.vR+=vR;b.vR2+=vR*vR;b.vphi+=vphi;b.vphi2+=vphi*vphi;b.vz+=vz;b.vz2+=vz*vz;}return bins.map(b=>({...b,meanR:b.R/b.count,meanVR:b.vR/b.count,sigmaR:Math.sqrt(Math.max(0,b.vR2/b.count-(b.vR/b.count)**2)),meanVphi:b.vphi/b.count,sigmaPhi:Math.sqrt(Math.max(0,b.vphi2/b.count-(b.vphi/b.count)**2)),sigmaZ:Math.sqrt(Math.max(0,b.vz2/b.count-(b.vz/b.count)**2))}));}
function virialAndField(s,epsilon){const a=directAccelerations(s,{epsilon},new Float64Array(s.n*3)),cs=[0,1,2].map(component=>({component,K:0,Wdiscrete:0,Wanalytic:0,forceError2:0,forceNorm2:0}));for(let i=0;i<s.n;i++){const k=3*i,m=s.masses[i],c=cs[s.components[i]],an=analyticAcceleration(s.positions[k],s.positions[k+1],s.positions[k+2],true);for(let d=0;d<3;d++){c.K+=.5*m*s.velocities[k+d]**2;c.Wdiscrete+=m*s.positions[k+d]*a[k+d];c.Wanalytic+=m*s.positions[k+d]*an[d];c.forceError2+=(a[k+d]-an[d])**2;c.forceNorm2+=an[d]**2;}}const diag=diagnostics(s,{algorithm:'direct',epsilon});return {components:cs.map(c=>({...c,virialDiscrete:2*c.K/-c.Wdiscrete,virialAnalytic:2*c.K/-c.Wanalytic,relativeForceRms:Math.sqrt(c.forceError2/c.forceNorm2)})),Usoftened:diag.potential,K:diag.kinetic,twiceKOverNegativeU:2*diag.kinetic/-diag.potential,twiceKOverNegativeW:2*diag.kinetic/-cs.reduce((a,c)=>a+c.Wdiscrete,0)};}
const output={qualification:'Controlled initializer audit; no production parameters changed; one seed is not an ensemble convergence proof',units:'kpc, Myr, 1e10 Msun',initialProfile:profile(initial),initialVelocityBins:velocityBins(initial),virialBySoftening:[],runs:[],analyticControl:[],diskJeansQuadrature:[],sphericalJeansQuadrature:[]};
for(const epsilon of [.1,.3,1])output.virialBySoftening.push({epsilon,...virialAndField(initial,epsilon)});
async function persist(){await writeFile(new URL('../reports/initial-audit.json',import.meta.url),JSON.stringify(output,null,2));}
for(const setup of [{n:2000,epsilon:.1,dt:.1,time:20},{n:2000,epsilon:.3,dt:.1,time:20},{n:2000,epsilon:1,dt:.1,time:20},{n:2000,epsilon:.1,dt:.05,time:20},{n:10000,epsilon:.1,dt:.1,time:10}]){
  const s=setup.n===2000?clone(initial):createGalaxy({n:setup.n,seed:2026,withHalo:true});
  const before=diagnostics(s,{algorithm:'direct',epsilon:setup.epsilon}),p0=profile(s),t0=performance.now(),lf=new Leapfrog(s,{algorithm:'barnes-hut',theta:.5,epsilon:setup.epsilon,dt:setup.dt});
  const firstSteps=Math.round(Math.min(10,setup.time)/setup.dt);lf.step(firstSteps);const profile10=profile(s);lf.step(Math.round(setup.time/setup.dt)-firstSteps);
  const after=diagnostics(s,{algorithm:'direct',epsilon:setup.epsilon});
  const result={...setup,theta:.5,elapsedMs:performance.now()-t0,initial:p0,at10Myr:profile10,final:profile(s),exactEnergyErrors:conservationError(after,before),velocityBinsFinal:velocityBins(s),initialMeta:s.meta};
  output.runs.push(result);await persist();console.log(JSON.stringify({setup,initial:p0,final:result.final,errors:result.exactEnergyErrors}));
}
for(const withHalo of [false,true]){
  const s=withHalo?clone(initial):createGalaxy({n:2000,seed:2026,withHalo:false}),p0=profile(s),dt=.1,a=new Float64Array(3*s.n);
  const force=()=>{for(let i=0;i<s.n;i++){const k=3*i,ai=analyticAcceleration(s.positions[k],s.positions[k+1],s.positions[k+2],withHalo);a[k]=ai[0];a[k+1]=ai[1];a[k+2]=ai[2];}};
  force();for(let step=0;step<200;step++){for(let k=0;k<a.length;k++){s.velocities[k]+=.5*dt*a[k];s.positions[k]+=dt*s.velocities[k];}force();for(let k=0;k<a.length;k++)s.velocities[k]+=.5*dt*a[k];}
  output.analyticControl.push({withHalo,field:'fixed unsoftened analytic field; diagnostic control only',time:20,dt,initial:p0,final:profile(s),velocityBinsFinal:velocityBins(s)});
}
function highPressure(R,z,n=8192){let result=0;const scale=Math.max(P.diskB,z*.2);for(let i=0;i<n;i++){const t=(i+.5)/n,zz=z+scale*t/(1-t);result+=diskDensity(R,zz)*(-analyticAcceleration(R,0,zz,true)[2])*scale/(1-t)**2/n;}return result;}
for(const R of [.1,.5,1,3,8.2,15,30])for(const z of [0,.14,.28,.56,1]){const rho=diskDensity(R,z),table=tables.disk(R,z),pressure=highPressure(R,z),h=Math.max(.001,R*.005),gradient=(highPressure(R+h,z,4096)-highPressure(R-h,z,4096))/(2*h),stream2=-R*analyticAcceleration(R,0,z,true)[0]+R*gradient/rho;output.diskJeansQuadrature.push({R,z,sigma2Table:table.sig2,sigma2High:pressure/rho,relativeSigma2Error:(table.sig2*rho-pressure)/pressure,stream2Table:table.stream2,stream2High:stream2,relativeStream2Error:(table.stream2-stream2)/stream2});}
output.pressureQuadratureConvergence={R:8.2,z:0,n8192:highPressure(8.2,0),n16384:highPressure(8.2,0,16384)};
for(const component of[0,2]){const density=component===0?hernquistDensity:haloDensity,table=component===0?tables.bulge:tables.halo,n=32768,r=new Float64Array(n),pressure=new Float64Array(n),rmax=component===0?1e6:HALO_OUTER_RADIUS;for(let i=0;i<n;i++)r[i]=1e-5*(rmax/1e-5)**(i/(n-1));let next=density(r[n-1])*radialField(r[n-1],true);for(let i=n-2;i>=0;i--){const value=density(r[i])*radialField(r[i],true);pressure[i]=pressure[i+1]+(r[i+1]-r[i])*(value+next)/2;next=value;}for(const radius of [.01,.1,.5,1,3,8.2,30,100]){const high=interpolate(r,pressure,radius)/density(radius),tab=interpolate(table.r,table.sigma,radius);output.sphericalJeansQuadrature.push({component,radius,sigma2Table:tab,sigma2High:high,relativeError:(tab-high)/high});}}
await persist();console.log('audit calculations complete');
