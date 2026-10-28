// Experimental continuous Plummer convolution. Never added to all-live forces.
import {G,MODEL} from './constants.js';
import {analyticPotential,analyticAcceleration,HALO_TOTAL_MASS} from './models.js';
import {externalGridAt} from './external-grid.js';
export const COMPONENT_MASSES=Object.freeze([MODEL.bulgeMass,MODEL.diskMass,HALO_TOTAL_MASS]);
export function gaussLegendre(n){
 if(!Number.isSafeInteger(n)||n<2)throw Error('Gauss order must be >=2');
 const x=new Float64Array(n),w=new Float64Array(n);
 for(let i=0;i<(n+1)/2;i++){let z=Math.cos(Math.PI*(i+.75)/(n+.5)),der;
  for(let k=0;k<64;k++){let p=1,q=0;for(let j=1;j<=n;j++){const old=p;p=((2*j-1)*z*p-(j-1)*q)/j;q=old;}der=n*(z*p-q)/(z*z-1);const next=z-p/der;if(Math.abs(next-z)<4*Number.EPSILON){z=next;break;}z=next;}
  x[i]=-z;x[n-i-1]=z;w[i]=w[n-i-1]=2/((1-z*z)*der*der);
 }return {x,w};
}
export function plummerKernel(epsilon,orders=[16,8,16]){
 if(!(epsilon>0)||!Number.isFinite(epsilon)||orders.length!==3||orders.some(n=>!Number.isSafeInteger(n)||n<4)||orders[2]%2)throw Error('Positive epsilon and even azimuth order >=4 required');
 const radial=gaussLegendre(orders[0]),polar=gaussLegendre(orders[1]),nodes=[];let mass=0;
 for(let i=0;i<orders[0];i++){const t=(radial.x[i]+1)*Math.PI/4,r=epsilon*Math.tan(t),wr=radial.w[i]*Math.PI/4*3*Math.sin(t)**2*Math.cos(t);
  for(let j=0;j<orders[1];j++)for(let k=0;k<orders[2];k++){const mu=polar.x[j],phi=2*Math.PI*(k+.5)/orders[2],weight=wr*polar.w[j]/(2*orders[2]);nodes.push([r*Math.sqrt(1-mu*mu)*Math.cos(phi),r*Math.sqrt(1-mu*mu)*Math.sin(phi),r*mu,weight]);mass+=weight;}
 }return {epsilon,orders,nodes,rawWeightSum:mass};
}
export function componentPotential(c,x,y,z){
 if(c===0)return -G*MODEL.bulgeMass/(Math.hypot(x,y,z)+MODEL.bulgeScale);
 if(c===1)return -G*MODEL.diskMass/Math.hypot(x,y,MODEL.diskA+Math.hypot(z,MODEL.diskB));
 if(c===2)return analyticPotential(x,y,z,true)-analyticPotential(x,y,z,false);
 throw Error('Unknown component');
}
export function convolvedAt(kernel,R,z,c){
 if(!Number.isFinite(R)||R<0||!Number.isFinite(z))throw Error('Invalid convolution point');
 let phi=0,ar=0,az=0;
 for(const [dx,dy,dz,w]of kernel.nodes){const x=R+dx,zz=z+dz,a=analyticAcceleration(x,dy,zz,true,c);phi+=w*componentPotential(c,x,dy,zz);ar+=w*a[0];az+=w*a[2];}
 return {potential:phi,acceleration:[R===0?0:ar,0,z===0?0:az]};
}
export function buildEquilibriumField({epsilon=.1,orders=[16,8,16],nu=64,nv=64,Rmax=2000,zmax=2000,rscale=.1,zscale=.1}={}){
 if(![nu,nv].every(n=>Number.isSafeInteger(n)&&n>=4)||![Rmax,zmax,rscale,zscale].every(n=>Number.isFinite(n)&&n>0))throw Error('Invalid field grid');
 const started=performance.now(),kernel=plummerKernel(epsilon,orders),du=Math.log1p(Rmax/rscale)/(nu-1),dv=Math.log1p(zmax/zscale)/(nv-1),grids=[];
 for(let c=0;c<3;c++){
  const values=new Float64Array(nu*nv*4);
  for(let i=0;i<nu;i++)for(let j=0;j<nv;j++){const R=rscale*Math.expm1(i*du),z=zscale*Math.expm1(j*dv),q=convolvedAt(kernel,R,z,c),idx=4*(i*nv+j);values[idx]=q.potential;values[idx+1]=-q.acceleration[0]*(R+rscale);values[idx+2]=-q.acceleration[2]*(z+zscale);}
  for(let i=0;i<nu;i++)for(let j=0;j<nv;j++){const idx=4*(i*nv+j),lo=Math.max(0,j-1),hi=Math.min(nv-1,j+1);values[idx+3]=i===0||j===0?0:(values[4*(i*nv+hi)+1]-values[4*(i*nv+lo)+1])/((hi-lo)*dv);}
  grids.push({schema:'axisymmetric-potential-hermite-v1',nu,nv,du,dv,rscale,zscale,massInternal:COMPONENT_MASSES[c],values:Array.from(values),modelId:'legacy-target-plummer-orbit-candidate-v1'});
 }
 const combine=ids=>({...grids[0],massInternal:ids.reduce((s,c)=>s+COMPONENT_MASSES[c],0),values:grids[0].values.map((_,k)=>ids.reduce((s,c)=>s+grids[c].values[k],0))});
 return {schema:'legacy-target-plummer-field-v1',epsilon,orders,rawKernelMass:kernel.rawWeightSum,grids,total:combine([0,1,2]),spheroids:combine([0,2]),wallMs:performance.now()-started,numericalConvergenceValidated:false,equilibriumValidated:false};
}
const kernels=new WeakMap();
export function equilibriumFieldAt(field,x,y,z,component='total'){
 if(field?.schema!=='legacy-target-plummer-field-v1'||![x,y,z].every(Number.isFinite))throw Error('Invalid equilibrium field');
 const t=component==='total'?field.total:component==='spheroids'?field.spheroids:field.grids[component];if(!t)throw Error('Invalid component');
 const outside=Math.log1p(Math.hypot(x,y)/t.rscale)>t.du*(t.nu-1)||Math.log1p(Math.abs(z)/t.zscale)>t.dv*(t.nv-1);
 if(!outside)return externalGridAt(t,x,y,z);
 // Untruncated MN/Hernquist tails are kept. No point-mass extrapolation.
 if(!kernels.has(field))kernels.set(field,plummerKernel(field.epsilon,field.orders));
 const R=Math.hypot(x,y),ids=component==='total'?[0,1,2]:component==='spheroids'?[0,2]:[component],out={potential:0,acceleration:[0,0,0],extrapolated:false,directConvolution:true};
 for(const c of ids){const q=convolvedAt(kernels.get(field),R,z,c);out.potential+=q.potential;out.acceleration[0]+=R?q.acceleration[0]*x/R:0;out.acceleration[1]+=R?q.acceleration[0]*y/R:0;out.acceleration[2]+=q.acceleration[2];}return out;
}
export function equilibriumFrequencies(field,R,h=R*1e-3){
 if(!(R>0)||!(h>0)||h>=R)throw Error('Invalid frequency radius');
 const omega2=r=>-equilibriumFieldAt(field,r,0,0).acceleration[0]/r,w=omega2(R),k2=4*w+R*(omega2(R+h)-omega2(R-h))/(2*h),nu2=-equilibriumFieldAt(field,R,0,h).acceleration[2]/h;
 return {R,omega2:w,kappa2:k2,nu2,vcKpcMyr:w>0?R*Math.sqrt(w):null,periodMyr:w>0?2*Math.PI/Math.sqrt(w):null,verticalPeriodMyr:nu2>0?2*Math.PI/Math.sqrt(nu2):null};
}
