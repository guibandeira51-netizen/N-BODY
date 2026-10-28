import {readFile,writeFile} from 'node:fs/promises';
import {equilibriumFieldAt} from '../../src/physics/equilibrium-field.js';
const base='reports/equilibrium-rebuild',pointer=JSON.parse(await readFile(base+'/latest-library-1024.json','utf8')),library=JSON.parse(await readFile(pointer.library,'utf8')),field=JSON.parse(await readFile(library.field,'utf8')),components=[];
for(const c of library.components){
 const derivative=[0,0,0,0],absoluteTerms=[0,0,0,0],endpoint=[0,0,0,0],names=['z^2','z*vz','x^2+y^2','x*vx+y*vy'];let first=0;const mean=[0,0,0],second=[0,0,0],cross={Rz:0,Rphi:0,zphi:0};
 const g=s=>[s[2]**2,s[2]*s[5],s[0]**2+s[1]**2,s[0]*s[3]+s[1]*s[4]];
 for(let i=0;i<c.orbits.length;i++){
  const o=c.orbits[i],w=c.fit.weights[i],g0=g(o.initialPhase),g1=g(o.states.at(-1));for(let j=0;j<4;j++)endpoint[j]+=w*(g1[j]-g0[j])/o.duration;
  for(const s of o.states){const [x,y,z,vx,vy,vz]=s,a=equilibriumFieldAt(field,x,y,z).acceleration,m=w/o.states.length,R=Math.hypot(x,y),vr=(x*vx+y*vy)/R,vp=(x*vy-y*vx)/R,terms=[[2*z*vz],[vz*vz,z*a[2]],[2*x*vx,2*y*vy],[vx*vx,vy*vy,x*a[0],y*a[1]]];
   for(let j=0;j<4;j++){derivative[j]+=m*terms[j].reduce((a,b)=>a+b,0);absoluteTerms[j]+=m*terms[j].reduce((a,b)=>a+Math.abs(b),0);}
   for(let j=0;j<3;j++){const v=[vr,vp,vz][j];mean[j]+=m*v;second[j]+=m*v*v;}cross.Rz+=m*vr*vz;cross.Rphi+=m*vr*vp;cross.zphi+=m*vz*vp;first+=m;
  }
 }
 components.push({component:c.component,totalProbability:first,weakTests:names.map((name,j)=>({g:name,meanPoissonBracketUnreversed:derivative[j],meanPoissonBracketRepresented:c.component!==1&&(j===0||j===2)?0:derivative[j],finiteOrbitEndpointRateUnreversed:endpoint[j],normalizedResidualUnreversed:absoluteTerms[j]>0?derivative[j]/absoluteTerms[j]:null,normalizedResidual:c.component!==1&&(j===0||j===2)?0:absoluteTerms[j]>0?derivative[j]/absoluteTerms[j]:null,normalization:absoluteTerms[j],qualification:'Finite stored-phase quadrature; endpoint identity exact for continuous orbit, not for sparse quadrature or finite-step KDK. Nonzero residual need not be purely physical.'})),moments:{unreversedMeanCylindrical:mean,meanCylindrical:c.component===1?mean:[0,0,0],secondCylindrical:second,dispersionCylindrical:second.map((s,j)=>Math.sqrt(Math.max(0,s-(c.component===1?mean[j]**2:0)))),crossSecondMoments:cross,units:'kpc/Myr, squared for second moments',qualification:'Orbit-library moments, before equal-mass particle resampling; spheroid time reversal makes all first velocity moments zero in the represented mixture, while second moments remain. Cylindrical moments do not impose sigmaR=sigmaz.'}});
}
await writeFile(base+'/weak-stationarity.json',JSON.stringify({schema:'weak-orbit-stationarity-v1',libraryId:library.id,identity:'For continuous Hamiltonian trajectories, mean {g,H} over finite T = [g(T)-g(0)]/T. Stationarity requires appropriate weak residuals to vanish as numerical/library/time resolution is refined.',components,equilibriumValidated:false},null,2));console.log(components.map(c=>({component:c.component,residuals:c.weakTests.map(t=>t.normalizedResidual),sigmas:c.moments.dispersionCylindrical})));
