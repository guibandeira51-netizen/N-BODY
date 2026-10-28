import test from 'node:test';import assert from 'node:assert/strict';
import {componentRotationField} from '../src/physics/rotation-field.js';
import {directAccelerations} from '../src/physics/forces.js';
import {KM_S_TO_KPC_MYR,G} from '../src/physics/constants.js';
const central=()=>({n:3,time:4,positions:new Float64Array(9),masses:new Float64Array([1,2,3]),components:new Uint8Array([0,1,2])});
test('component circular fields match softened point sources and add in squared speed; motion changes the measured field',()=>{
 const s=central(),before=structuredClone(s),f=componentRotationField(s,{radii:[1,5],epsilon:.2,azimuthSamples:8});assert.deepEqual(s,before);assert.deepEqual(f.sourceCounts,[1,1,1]);assert.equal(f.timeMyr,4);
 for(const r of f.rows){const unit=G*r.R_kpc**2/(r.R_kpc**2+.04)**1.5;for(const[key,m]of[['bulge',1],['disk',2],['halo',3],['diskBulge',3],['total',6]]){assert(Math.abs(r.v2_kpc2_Myr2[key]/(m*unit)-1)<1e-13);assert(Math.abs(r.vc_km_s[key]**2*KM_S_TO_KPC_MYR**2/(m*unit)-1)<1e-13);}}
 s.positions[8]=10;const moved=componentRotationField(s,{radii:[1,5],epsilon:.2,azimuthSamples:8});assert(moved.rows[0].vc_km_s.halo<f.rows[0].vc_km_s.halo);assert.equal(moved.rows[0].vc_km_s.disk,f.rows[0].vc_km_s.disk);
 const absent=central();absent.masses[2]=0;const b=componentRotationField(absent,{radii:[1]});assert.equal(b.rows[0].vc_km_s.halo,0);assert.equal(b.rows[0].vc_km_s.total,b.rows[0].vc_km_s.diskBulge);
});
test('off-axis component probes agree with the independent production pair force and retain outward support as missing speed',()=>{
 const s=central();s.positions.set([.4,-.7,.3,1.1,.2,-.5,-2,1,3]);const options={epsilon:.17,azimuthSamples:8,radii:[.7,3]},f=componentRotationField(s,options);
 for(const row of f.rows)for(let id=0;id<3;id++){let reference=0;for(let a=0;a<8;a++){const phi=2*Math.PI*a/8,cos=Math.cos(phi),sin=Math.sin(phi),p=new Float64Array(12);p.set(s.positions);p.set([row.R_kpc*cos,row.R_kpc*sin,0],9);const masses=new Float64Array(4);masses[id]=s.masses[id];const acc=directAccelerations({n:4,positions:p,masses,accelerations:new Float64Array(12)},{epsilon:.17});reference+=(acc[9]*cos+acc[10]*sin)/8;}assert(Math.abs(row.aR_kpc_Myr2[['bulge','disk','halo'][id]]-reference)<32*Number.EPSILON*Math.abs(reference));}
 const ring={n:32,positions:new Float64Array(96),masses:new Float64Array(32).fill(1/32),components:new Uint8Array(32).fill(1)};for(let j=0;j<32;j++){ring.positions[3*j]=10*Math.cos(j*Math.PI/16);ring.positions[3*j+1]=10*Math.sin(j*Math.PI/16);}
 const outward=componentRotationField(ring,{radii:[1],epsilon:.1}).rows[0];assert(outward.v2_kpc2_Myr2.disk<0);assert.equal(outward.vc_km_s.disk,null);
});
