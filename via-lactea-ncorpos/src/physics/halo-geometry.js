import {G,MODEL,KPC_METERS,MYR_SECONDS} from './constants.js';
import {haloMass,haloTable,HALO_OUTER_RADIUS,HALO_TOTAL_MASS,R200,interpolate} from './models.js';
import{withHaloShape,ellipsoidalHaloAt}from'./halo-ellipsoid.js';
export const LIGHT_SPEED=299792458*MYR_SECONDS/KPC_METERS;
export const GEOMETRY_HALO_ID='nfw-truncated-weak-field-v1';
export function assertGeometryState(state){if(state.components.some((c,i)=>c===2&&state.masses[i]>0))throw Error('Halo geométrico não pode coexistir com macropartículas gravitantes do halo.');}
// Integrate the SAME linear mass interpolation used by the force in the taper.
function interval(a,b,ma,mb,lo,hi){const slope=(mb-ma)/(b-a),intercept=ma-slope*a;return intercept*(hi-lo)/(lo*hi)+slope*Math.log1p((hi-lo)/lo);}
export function createHaloGeometry({center=[0,0,0],gpu=true,shape}={}){
 const q=gpu?Math.fround:x=>x,rs=q(MODEL.haloScale),massScale=q(MODEL.haloMassScale),r200=q(R200),outerRadius=q(HALO_OUTER_RADIUS),totalMass=q(HALO_TOTAL_MASS);
 const radius=[r200],mass=[q(interpolate(haloTable.r,haloTable.mass,R200))];
 for(let i=0;i<haloTable.r.length;i++)if(haloTable.r[i]>R200&&haloTable.r[i]<HALO_OUTER_RADIUS){radius.push(q(haloTable.r[i]));mass.push(q(haloTable.mass[i]));}
 radius.push(outerRadius);mass.push(totalMass);const tail=new Array(radius.length);tail[tail.length-1]=totalMass/outerRadius;
 for(let i=tail.length-2;i>=0;i--)tail[i]=tail[i+1]+interval(radius[i],radius[i+1],mass[i],mass[i+1],radius[i],radius[i+1]);
 const offset=massScale*Math.log1p(r200/rs)/r200-tail[0];
 const field={id:GEOMETRY_HALO_ID,center:center.map(q),rs,massScale,r200,outerRadius,totalMass,radius,mass,tail,offset,gpuQuantized:gpu,
  source:'Same finite NFW mass profile and taper as models.js; Float32 effective constants/nodes recorded when GPU mode is used',
  interpretation:'Static material NFW source; leading nonrelativistic geodesics of weak-field GR. Not vacuum, not emergent dark matter, no full 1PN or Einstein evolution.',haloSoftening:0};
 return shape?withHaloShape(field,shape):field;
}
export function haloGeometryAt(position,field,gravity=G){return field?.shape?.active?ellipsoidalHaloAt(position,field,gravity,sphericalHaloAt):sphericalHaloAt(position,field,gravity);}
export function sphericalHaloAt(position,field,gravity=G){
 if(field?.id!==GEOMETRY_HALO_ID||!(gravity>0))throw Error('Campo geométrico NFW ou G inválido.');
 const d=position.map((v,k)=>v-field.center[k]),r=Math.hypot(...d);let mass,integral;
 if(r<=field.r200){const x=r/field.rs,f=x<1e-3?x*x*(.5+x*(-2/3+x*(.75+x*(-.8+x*5/6)))):Math.log1p(x)-x/(1+x);mass=field.massScale*f;integral=(r>0?field.massScale*Math.log1p(x)/r:field.massScale/field.rs)-field.offset;}
 else if(r>=field.outerRadius){mass=field.totalMass;integral=mass/r;}
 else{let lo=0,hi=field.radius.length-1;while(hi-lo>1){const m=(lo+hi)>>>1;if(field.radius[m]>r)hi=m;else lo=m;}const a=field.radius[lo],b=field.radius[hi],ma=field.mass[lo],mb=field.mass[hi];mass=ma+(mb-ma)*(r-a)/(b-a);integral=field.tail[hi]+interval(a,b,ma,mb,r,b);}
 const potential=-gravity*integral,f=r>0?-gravity*mass/r**3:0;
 return{potential,acceleration:d.map(v=>f*v),enclosedMass:mass,radius:r};
}
export function haloWeakMetric(position,field,gravity=G){const {potential,acceleration}=haloGeometryAt(position,field,gravity),u=potential/LIGHT_SPEED**2;return{g00:-(1+2*u),g11:1-2*u,g22:1-2*u,g33:1-2*u,g0i:[0,0,0],potential,absPhiOverC2:Math.abs(u),slowGeodesicAcceleration:acceleration,order:'leading scalar weak-field GR; no claim of full relativistic geodesics'};}
export function haloGeometryBuffer(field){
 const start=3+field.radius.length,shape=field.shape,data=new Float32Array(4*(start+(shape?4+2*shape.nodes.length:0)));data.set([field.rs,field.massScale,field.r200,field.outerRadius],0);data.set([...field.center,field.totalMass],4);data.set([field.offset,field.radius.length,shape?start:0,shape?.active?1:0],8);
 field.radius.forEach((r,i)=>data.set([r,field.mass[i],field.tail[i],0],4*(i+3)));if(shape){data.set([shape.p,shape.q,shape.nodes.length,shape.radialNormalization],4*start);shape.rotation.forEach((row,i)=>data.set([...row,i===0?shape.tableJoinMassDifference:0],4*(start+1+i)));shape.nodes.forEach((n,i)=>{data.set([n.t,n.w,n.ratios[0],n.ratios[1]],4*(start+4+2*i));data.set([n.ratios[2],n.weight,n.t*n.t,0],4*(start+5+2*i));});}return data;
}
// Independent Float64 oracle for the analytical target, before GPU quantization.
export function unquantizedHaloGeometry(center=[0,0,0]){return createHaloGeometry({center,gpu:false});}
