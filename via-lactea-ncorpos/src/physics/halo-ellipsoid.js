import{G}from'./constants.js';
import{gaussLegendre}from'./equilibrium-field.js';

export const HALO_SHAPES=Object.freeze(['spherical','oblate','prolate','triaxial']);
export function haloShapeOptions({type='spherical',p=1,q=1,yaw=0,pitch=0,roll=0,order=64}={}){
 if(!HALO_SHAPES.includes(type))throw Error('Geometria do halo desconhecida.');
 if(type==='spherical')p=q=1;else if(type!=='triaxial')p=1;
 if(![p,q,yaw,pitch,roll].every(Number.isFinite)||p<=0||q<=0)throw Error('Eixos positivos e orientação finita são necessários.');
 if(type==='oblate'&&q>=1||type==='prolate'&&q<=1)throw Error('Oblato requer q < 1; prolato requer q > 1.');
 if(type==='triaxial'&&(p===1||q===1||p===q))throw Error('Triaxial requer três eixos diferentes.');
 if(!Number.isInteger(order)||order<8||order>512)throw Error('Ordem de quadratura deve estar entre 8 e 512.');
 return{type,p,q,yaw,pitch,roll,order};
}
/** R = Rz(yaw) Ry(pitch) Rx(roll); rows below map world -> principal. */
export function shapeRotation({yaw=0,pitch=0,roll=0}){
 const [a,b,c]=[yaw,pitch,roll].map(v=>v*Math.PI/180),ca=Math.cos(a),sa=Math.sin(a),cb=Math.cos(b),sb=Math.sin(b),cc=Math.cos(c),sc=Math.sin(c);
 return[[ca*cb,sa*cb,-sb],[ca*sb*sc-sa*cc,sa*sb*sc+ca*cc,cb*sc],[ca*sb*cc+sa*sc,sa*sb*cc-ca*sc,cb*cc]];
}
export function toPrincipal(d,shape){return shape.rotation.map(row=>row.reduce((s,v,k)=>s+v*d[k],0));}
export function fromPrincipal(d,shape){return [0,1,2].map(k=>shape.rotation.reduce((s,row,i)=>s+row[k]*d[i],0));}
export function ellipsoidalRadius(position,field){const d=position.map((v,k)=>v-field.center[k]),s=field.shape;if(!s?.active)return Math.hypot(...d);const x=toPrincipal(d,s);return Math.sqrt(x[0]**2+x[1]**2/s.p**2+x[2]**2/s.q**2);}

export function radialHaloDensity(r,f){
 if(r>=f.outerRadius)return 0;if(r<=0)return Infinity;
 if(r<=f.r200)return f.massScale/(4*Math.PI*r*(r+f.rs)**2);
 let lo=0,hi=f.radius.length-1;while(hi-lo>1){const mid=(lo+hi)>>>1;if(f.radius[mid]>r)hi=mid;else lo=mid;}
 return(f.mass[hi]-f.mass[lo])/(f.radius[hi]-f.radius[lo])/(4*Math.PI*r*r);
}
/** Psi_tail(r) = 2 integral_r^outer rho0(s) s ds, exact for the mass table. */
export function haloDensityTail(r,f){
 if(r>=f.outerRadius)return 0;
 const tail=f.shape.densityTail;
 if(r<=f.r200)return f.massScale/(2*Math.PI)*(1/(r+f.rs)-1/(f.r200+f.rs))+tail[0];
 let lo=0,hi=f.radius.length-1;while(hi-lo>1){const mid=(lo+hi)>>>1;if(f.radius[mid]>r)hi=mid;else lo=mid;}
 const slope=(f.mass[hi]-f.mass[lo])/(f.radius[hi]-f.radius[lo]);return tail[hi]+slope/(2*Math.PI)*Math.log(f.radius[hi]/r);
}
export function withHaloShape(field,options){
 const o=haloShapeOptions(options),quantize=field.gpuQuantized?Math.fround:x=>x,p=quantize(o.p),q=quantize(o.q),rotation=shapeRotation(o).map(row=>row.map(quantize)),tail=new Array(field.radius.length).fill(0);
 for(let i=tail.length-2;i>=0;i--)tail[i]=tail[i+1]+(field.mass[i+1]-field.mass[i])/(field.radius[i+1]-field.radius[i])/(2*Math.PI)*Math.log(field.radius[i+1]/field.radius[i]);
 const rule=gaussLegendre(o.order),nodes=Array.from(rule.x,(u,i)=>{const t=(u+1)/2,weight=rule.w[i]/2,t2=t*t,D=[1,1+(p*p-1)*t2,1+(q*q-1)*t2];return{t:quantize(t),weight:quantize(weight),w:quantize(weight/Math.sqrt(D[0]*D[1]*D[2])),ratios:D.map(x=>quantize(t2/x))};});
 const x=field.r200/field.rs,tableJoinMassDifference=quantize(field.massScale*(Math.log1p(x)-x/(1+x))-field.mass[0]),radialNormalization=quantize(field.totalMass/(field.totalMass+tableJoinMassDifference));
 return{...field,interpretation:'Static finite material NFW ellipsoid in Newtonian gravity; no relativistic dynamics or geometric mass source.',shape:{...o,p,q,rotation,active:p!==1||q!==1,densityTail:tail,nodes,tableJoinMassDifference,radialNormalization,massNormalization:radialNormalization/(p*q),method:'finite homeoidal density; spherical control plus fixed Gauss-Legendre correction; static orientation',coordinate:'m²=xprime²+yprime²/p²+zprime²/q²; taper and cutoff in m',symmetry:p===1&&q===1?'spherical':p===1&&Math.abs(Math.sin(o.pitch*Math.PI/180))<1e-12&&Math.abs(Math.sin(o.roll*Math.PI/180))<1e-12?'axisymmetric':'none'}};
}
export function ellipsoidalHaloDensity(position,field){return radialHaloDensity(ellipsoidalRadius(position,field),field)*(field.shape?.active?field.shape.massNormalization:1);}
/** Monopole subtraction improves the far field and makes the spherical control exact.
 * The force is the derivative of this SAME fixed-node potential, not GM(<m)/m².
 */
export function ellipsoidalHaloAt(position,field,gravity=G,sphericalOracle){
 const s=field.shape,base=sphericalOracle(position,field,gravity),d=position.map((v,k)=>v-field.center[k]),x=toPrincipal(d,s),r=Math.hypot(...x),a=[0,0,0];let correction=0;
 for(const n of s.nodes){const m=Math.sqrt(x.reduce((sum,v,k)=>sum+v*v*n.ratios[k],0)),r0=r*n.t;
  correction+=n.w*haloDensityTail(m,field)-n.weight*haloDensityTail(r0,field);
  if(r>0){const rho=radialHaloDensity(m,field),rho0=radialHaloDensity(r0,field);for(let k=0;k<3;k++)a[k]+=-4*Math.PI*gravity*x[k]*(n.w*n.ratios[k]*rho-n.weight*n.t*n.t*rho0);}
 }
 // The old mass interpolation at R200 differs slightly from analytic M(R200).
 // Remove its tiny implicit join shell, then normalize the continuous density.
 const world=fromPrincipal(a,s),radius=Math.hypot(...d),delta=s.tableJoinMassDifference,norm=s.radialNormalization;
 return{...base,potential:norm*(base.potential-gravity*delta/Math.max(radius,field.r200)-2*Math.PI*gravity*correction),acceleration:world.map((v,k)=>norm*(v+base.acceleration[k]-(radius>field.r200?gravity*delta*d[k]/radius**3:0))),ellipsoidalRadius:ellipsoidalRadius(position,field),method:s.method};
}
