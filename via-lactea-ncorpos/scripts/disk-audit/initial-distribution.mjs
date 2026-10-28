import {writeFile} from 'node:fs/promises';
import {createGalaxy} from '../../src/physics/initial.js';
import {diskDensity,analyticAcceleration} from '../../src/physics/models.js';
import {MODEL,KM_S_TO_KPC_MYR} from '../../src/physics/constants.js';
function pressure(R,z,n=640){let P=0;z=Math.abs(z);const scale=Math.max(MODEL.diskB,z*.2);for(let i=0;i<n;i++){const t=(i+.5)/n,s=z+scale*t/(1-t);P+=diskDensity(R,s)*(-analyticAcceleration(R,0,s,true)[2])*scale/(1-t)**2/n;}return P;}
function moments(R,z){const rho=diskDensity(R,z),P=pressure(R,z),h=Math.max(.00001,R*1e-4),grad=(pressure(R+h,z)-pressure(R-h,z))/(2*h),a=analyticAcceleration(R,0,z,true),stream2=-R*a[0]+R*grad/rho;return {rho,sigma2:P/rho,stream:stream2>=0?Math.sqrt(stream2):null,a};}
function logf(R,z,v){const m=moments(R,z);return Math.log(m.rho)-1.5*Math.log(2*Math.PI*m.sigma2)-(v[0]**2+v[2]**2+(v[1]-m.stream)**2)/(2*m.sigma2);}
const cbe=[];for(const R of [2,4,8.2,16])for(const z of [.1,.28]){
 const m=moments(R,z),sig=Math.sqrt(m.sigma2),v=[sig,m.stream,.5*sig],h=1e-4;
 const spatialR=(logf(R+h,z,v)-logf(R-h,z,v))/(2*h),spatialZ=(logf(R,z+h,v)-logf(R,z-h,v))/(2*h),dv=[-v[0]/m.sigma2,-(v[1]-m.stream)/m.sigma2,-v[2]/m.sigma2];
 const terms=[v[0]*spatialR,v[2]*spatialZ,(v[1]**2/R+m.a[0])*dv[0],-v[0]*v[1]/R*dv[1],m.a[2]*dv[2]],residual=terms.reduce((a,b)=>a+b,0),vc=Math.sqrt(-R*m.a[0]);
 cbe.push({R,z,vKpcMyr:v,sigmaZKmS:sig/KM_S_TO_KPC_MYR,termsPerMyr:terms,logDistributionStationarityResidualPerMyr:residual,residualTimesCrossingTime:residual*R/vc});
}
const sampled=[];for(const seed of [2026,2027,2028]){
 const s=createGalaxy({n:20000,seed}),edges=[0,2,4,8,12,20,30,Infinity],bins=edges.slice(0,-1).map((lo,i)=>({lo,hi:Number.isFinite(edges[i+1])?edges[i+1]:null,n:0,observedSum:0,expectedSum:0,varianceOfSum:0}));
 for(let i=0;i<s.n;i++)if(s.components[i]===1){const k=3*i,R=Math.hypot(s.positions[k],s.positions[k+1]),z=Math.abs(s.positions[k+2]),sig2=pressure(R,z,160)/diskDensity(R,z),b=bins.find(b=>R>=b.lo&&(b.hi==null||R<b.hi));b.n++;b.observedSum+=s.velocities[k+2]**2;b.expectedSum+=sig2;b.varianceOfSum+=4*sig2**2;}
 sampled.push({seed,n:s.n,diskCount:s.meta.counts[1],bins:bins.map(b=>({...b,observedSigmaZKmS:Math.sqrt(b.observedSum/b.n)/KM_S_TO_KPC_MYR,expectedSigmaZKmS:Math.sqrt(b.expectedSum/b.n)/KM_S_TO_KPC_MYR,approximateZScore:(b.observedSum-b.expectedSum)/Math.sqrt(b.varianceOfSum)}))});
}
const result={createdUTC:new Date().toISOString(),sampling:'Legacy generator unchanged; three seeds and 9000 disk bodies each; pressure evaluated independently. Pair correlations included in approximate variance of sum(vz²).',cbeScope:'Stationarity of the ideal local Gaussian closure associated with independently refined Jeans moments, not a recovery of a global DF or a numerical diagnostic of every sampled point. Nonzero residual is not cured by matching second moments.',cbe,sampled};
await writeFile(new URL('../../reports/disk-audit-current/initial-distribution-audit.json',import.meta.url),JSON.stringify(result,null,2));console.log(JSON.stringify({cbe:cbe.map(({termsPerMyr,vKpcMyr,...x})=>x),sampled:sampled.map(s=>({seed:s.seed,bins:s.bins.map(b=>({lo:b.lo,hi:b.hi,n:b.n,z:b.approximateZScore}))}))},null,2));
