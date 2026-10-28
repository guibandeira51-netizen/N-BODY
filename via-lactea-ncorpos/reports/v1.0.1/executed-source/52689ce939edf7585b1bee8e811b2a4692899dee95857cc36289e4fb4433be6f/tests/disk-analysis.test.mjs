import test from 'node:test';import assert from 'node:assert/strict';
import {diskAnalysis,spiralGeometry,patternSpeed,weightedQuantile} from '../src/physics/disk-analysis.js';
function disk(radii=[7],nphi=256,contrast=0,p=0){const n=radii.length*nphi,s={n,positions:new Float64Array(3*n),velocities:new Float64Array(3*n),accelerations:new Float64Array(3*n),masses:new Float64Array(n),components:new Uint8Array(n).fill(1)};let i=0;for(const R of radii)for(let j=0;j<nphi;j++,i++){const phi=2*Math.PI*j/nphi;s.positions.set([R*Math.cos(phi),R*Math.sin(phi),0],3*i);s.velocities.set([-.2*Math.sin(phi),.2*Math.cos(phi),0],3*i);s.masses[i]=1+contrast*Math.cos(2*phi+p*Math.log(R));}return s;}
function tiltTranslate(s,angle,shift){const c=Math.cos(angle),sn=Math.sin(angle);for(let i=0;i<s.n;i++){const k=3*i;for(const key of ['positions','velocities']){const x=s[key][k],y=s[key][k+1],z=s[key][k+2];s[key].set([x,c*y-sn*z,sn*y+c*z],k);}for(let j=0;j<3;j++)s.positions[k+j]+=shift[j];}return s;}
const near=(a,b,t=1e-8)=>assert.ok(Math.abs(a-b)<t,`${a} vs ${b}`);
test('instantaneous plane removes rigid tilt and translation without altering true thickness or projected dispersion',()=>{
 const s=disk();for(let i=0;i<s.n;i++){s.positions[3*i+2]=i%2?.2:-.2;s.velocities[3*i+2]=i%2?.01:-.01;}const base=diskAnalysis(s,{paired:false}),a=tiltTranslate(s,.6,[3,-4,2]),positions=s.positions.slice(),moved=diskAnalysis(a,{paired:false});near(base.instant.h50,.2);near(moved.instant.h50,.2,1e-7);near(moved.instant.sigmaNormal,.01,1e-8);near(moved.plane.tiltDegrees,.6*180/Math.PI,1e-6);assert.ok(moved.fixed.h50>1);assert.deepEqual(s.positions,positions);
});
test('mass quantile remains weighted and is not shifted by equal-mass floating accumulation',()=>{near(weightedQuantile([1,2,9],[1,1,10]),9);assert.equal(weightedQuantile(Array.from({length:4500},(_,i)=>i),Array(4500).fill(6.8/4500)),2249);});
test('axisymmetric uniform ring has no m1..m4; antipodal pair noise differs from independent-particle noise',()=>{
 const s=disk(),old=s.positions.slice();for(let i=0;i<s.n;i++){const j=Math.floor(i/2)+(i%2)*s.n/2;s.positions.set(old.subarray(3*j,3*j+3),3*i);}const r=diskAnalysis(s).rings.find(r=>r.count);for(const m of r.modes)assert.ok(m.amplitude<1e-12);near(r.modes[1].nullRms,Math.sqrt(2/s.n),1e-12);near(r.modes[0].inferenceRms,1/Math.sqrt(s.n),1e-12);near(r.modes[0].approximateNullP,1,1e-12);assert.equal(spiralGeometry(diskAnalysis(s),2).available,false);
});
test('known positive mass modulation recovers A2, logarithmic pitch and pattern speed; aliasing is rejected',()=>{
 const s=disk([3,5,7,9,11,14,18],256,.8,4),a=diskAnalysis(s,{paired:false}),fit=spiralGeometry(a,2);assert.equal(fit.available,true);near(fit.pitchDegrees,Math.atan(.5)*180/Math.PI,1e-5);for(const r of a.rings.filter(r=>r.count))near(r.modes[1].amplitude,.4,1e-9);
 for(let i=0;i<s.n;i++){const k=3*i,x=s.positions[k],y=s.positions[k+1];s.positions[k]=Math.cos(.1)*x-Math.sin(.1)*y;s.positions[k+1]=Math.sin(.1)*x+Math.cos(.1)*y;}const b=diskAnalysis(s,{paired:false}),ra=a.rings.find(r=>r.count),rb=b.rings.find(r=>r.lower===ra.lower);near(patternSpeed(ra,rb,5,2,{maxReferenceOmega:.08}).omegaRadiansPerMyr,.02,1e-8);assert.equal(patternSpeed(ra,rb,100,2,{maxReferenceOmega:.08}).available,false);
});
test('local ring plane distinguishes warp orientation from local thickness',()=>{
 const s=disk([3,11]);for(let i=0;i<s.n;i++){const k=3*i;s.positions[k+2]=(i%2?.1:-.1);if(i>=256){const y=s.positions[k+1],z=s.positions[k+2];s.positions[k+1]=Math.cos(.15)*y-Math.sin(.15)*z;s.positions[k+2]=Math.sin(.15)*y+Math.cos(.15)*z;}}
 const a=diskAnalysis(s),populated=a.rings.filter(r=>r.count>200);assert.equal(populated.length,2);for(const r of populated)near(r.localPlane.h50,.1,1e-4);assert.ok(populated.some(r=>r.globalPlane.h50>.2));assert.ok(populated.some(r=>r.localPlane.tiltFromGlobalDegrees>4));
});
test('strong constant-phase bar is not assigned a spiral pitch',()=>{const a=diskAnalysis(disk([3,5,7,9,11,14,18],256,.8,0),{paired:false}),fit=spiralGeometry(a,2);assert.equal(fit.phaseFitAccepted,true);assert.equal(fit.available,false);assert.equal(fit.pitchDegrees,null);});
