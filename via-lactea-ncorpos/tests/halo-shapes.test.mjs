import test from'node:test';import assert from'node:assert/strict';
import{createHaloGeometry,haloGeometryAt,sphericalHaloAt}from'../src/physics/halo-geometry.js';
import{haloShapeOptions,ellipsoidalHaloDensity,ellipsoidalRadius,fromPrincipal}from'../src/physics/halo-ellipsoid.js';
import{createLiveGalaxy}from'../src/physics/live-initial.js';import{liveInputResolution}from'../src/live-particle-input.js';import{energyBase}from'../src/physics/live-energy.js';import{G}from'../src/physics/constants.js';import{gaussLegendre}from'../src/physics/equilibrium-field.js';import{haloIsodensityVertices}from'../src/render/continuous-halo-density.js';
const configurations=[{type:'spherical'},{type:'oblate',q:.8},{type:'prolate',q:1.25},{type:'triaxial',p:.85,q:.7,yaw:30,pitch:15,roll:7}];
test('finite ellipsoidal density preserves total mass and cutoff through the Jacobian pq',()=>{
 const quadrature=gaussLegendre(128);
 for(const shape of configurations){const field=createHaloGeometry({gpu:false,shape});let mass=0;for(let i=0;i<quadrature.x.length;i++){const r=(quadrature.x[i]+1)*field.r200/2,pos=fromPrincipal([r,0,0],field.shape).map((v,k)=>v+field.center[k]);mass+=4*Math.PI*field.shape.p*field.shape.q*r*r*ellipsoidalHaloDensity(pos,field)*quadrature.w[i]*field.r200/2;}
 mass+=(field.mass.at(-1)-field.mass[0])*(field.shape.active?field.shape.radialNormalization:1);const expected=field.shape.active?field.totalMass:field.totalMass+field.shape.tableJoinMassDifference;assert(Math.abs(mass-expected)/field.totalMass<1e-10);
 const outside=fromPrincipal([field.outerRadius*1.01,0,0],field.shape).map((v,k)=>v+field.center[k]);assert.equal(ellipsoidalHaloDensity(outside,field),0);
 }
});
test('ellipsoidal force derives from the same potential and satisfies Poisson inside the smooth NFW body',()=>{
 for(const shape of configurations){const field=createHaloGeometry({gpu:false,shape}),x=[8,3,.7],a=haloGeometryAt(x,field),h=1e-3;let divergence=0;const grad=[];
 for(let k=0;k<3;k++){const lo=x.slice(),hi=x.slice();lo[k]-=h;hi[k]+=h;const l=haloGeometryAt(lo,field),r=haloGeometryAt(hi,field);grad[k]=(r.potential-l.potential)/(2*h);divergence+=(r.acceleration[k]-l.acceleration[k])/(2*h);}
 assert(Math.hypot(...grad.map((v,k)=>v+a.acceleration[k]))/Math.hypot(...a.acceleration)<1e-7);
 const density=ellipsoidalHaloDensity(x,field);assert(Math.abs(divergence+4*Math.PI*G*density)/(4*Math.PI*G*density)<1e-6);
 }
});
test('spherical control is unchanged and non-spherical force is not a spherical enclosed-mass substitution',()=>{
 const field=createHaloGeometry({shape:{type:'spherical'}});for(const x of[[0,0,0],[8,3,1],[300,20,70]])assert.deepEqual(haloGeometryAt(x,field),sphericalHaloAt(x,field));
 const x=[8,3,1],triax=createHaloGeometry({gpu:false,shape:{type:'triaxial',p:.85,q:.7}}),a=haloGeometryAt(x,triax).acceleration;assert(Math.abs(x[0]*a[1]-x[1]*a[0])>1e-4);
 assert.throws(()=>haloShapeOptions({type:'oblate',q:1.2}));assert.throws(()=>haloShapeOptions({type:'prolate',q:.8}));assert.throws(()=>haloShapeOptions({type:'triaxial',p:1,q:.8}));
});
test('shapes preserve identical baryonic phases and diagnose the correct angular-momentum symmetries',()=>{
 const layout=liveInputResolution(128,1,true,'geometry'),reference=createLiveGalaxy({...layout,seed:2026});
 for(const haloShape of configurations){const state=createLiveGalaxy({...layout,seed:2026,haloShape});for(const key of['positions','velocities','masses','components'])assert.deepEqual(state[key],reference[key]);const e=energyBase(state,{haloRepresentation:'geometry',haloField:state.meta.haloField});assert.equal(e.conditions.energy,true);assert.equal(e.conditions.angularVector,haloShape.type==='spherical');assert.equal(e.conditions.angularZ,haloShape.type!=='triaxial');}
});
test('orientation rotates actual forces and every drawn isodensity vertex satisfies m=rs',()=>{
 const shape={type:'triaxial',p:.85,q:.7},base=createHaloGeometry({gpu:false,shape}),rotated=createHaloGeometry({gpu:false,shape:{...shape,yaw:90}}),x=[8,3,.7],a=haloGeometryAt(x,base).acceleration,b=haloGeometryAt([-3,8,.7],rotated).acceleration;assert(Math.hypot(b[0]+a[1],b[1]-a[0],b[2]-a[2])<1e-14);
 const vertices=haloIsodensityVertices(rotated);for(let i=0;i<vertices.length;i+=3)assert(Math.abs(ellipsoidalRadius(Array.from(vertices.slice(i,i+3)),rotated)/rotated.rs-1)<1e-7);
});
