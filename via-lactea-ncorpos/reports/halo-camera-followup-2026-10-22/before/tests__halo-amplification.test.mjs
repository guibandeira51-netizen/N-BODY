import test from'node:test';import assert from'node:assert/strict';
import{createHaloGeometry}from'../src/physics/halo-geometry.js';import{geometryMesh,displacedGeometryVertices,geometryBounds}from'../src/render/halo-geometry-overlay.js';import{OrbitCamera}from'../src/render/camera.js';
const canvas=()=>({clientWidth:900,clientHeight:600,width:900,height:600,style:{},addEventListener(){},removeEventListener(){}});
const project=(m,p)=>{const q=Array.from({length:4},(_,r)=>m[r]*p[0]+m[4+r]*p[1]+m[8+r]*p[2]+m[12+r]);return q.map(v=>v/q[3]);};
test('8 to 50 multiplies only halo world-height about its nonzero center and preserves base/color data',()=>{
 const field=createHaloGeometry({center:[1.25,-.5,.375]}),copy=structuredClone(field),base=geometryMesh(field),bytes=base.slice(),a=displacedGeometryVertices(base,8),b=displacedGeometryVertices(base,50),zc=field.center[2];let maximum=0;
 for(let i=0;i<a.length;i+=3){assert.equal(a[i],b[i]);assert.equal(a[i+1],b[i+1]);const expected=6.25*(a[i+2]-zc),error=Math.abs(b[i+2]-zc-expected);maximum=Math.max(maximum,error);assert(error<=16*Number.EPSILON*Math.max(1,Math.abs(expected),Math.abs(zc)));}
 assert.deepEqual(base,bytes);assert.deepEqual(field,copy);const ba=geometryBounds(a),bb=geometryBounds(b);assert.deepEqual(ba.min.slice(0,2),bb.min.slice(0,2));assert.deepEqual(ba.max.slice(0,2),bb.max.slice(0,2));assert(bb.min[2]<ba.min[2]);assert(maximum<1e-12);
});
test('comparison freezes pose, projection, zoom, near/far and matrices even if fit/orbit/wheel are attempted',()=>{
 const camera=new OrbitCamera(canvas(),{target:[1,2,3],distance:180});camera.setComparisonLocked(true,900,600);const before=camera.snapshot();
 camera.fitHalo(500);camera.setView('top');camera.distance=12;camera._down({button:0,pointerId:1,clientX:0,clientY:0});camera._move({pointerId:1,clientX:100,clientY:100});camera._wheel({preventDefault(){},deltaY:600,deltaMode:0});
 assert.deepEqual(camera.snapshot(),before);assert.deepEqual(camera.snapshot(1200,900),before);assert.equal(before.projection,'orthographic');camera.setComparisonLocked(false);assert.equal(camera.snapshot().projection,'perspective');camera.dispose();
});
test('fixed orthographic screen x is unchanged by height; ordinary perspective can change screen x without camera motion',()=>{
 const camera=new OrbitCamera(canvas(),{distance:180}),p8=[10,4,-8],p50=[10,4,-50],before=camera.snapshot(),a=project(camera.matrix(),p8),b=project(camera.matrix(),p50);assert.deepEqual(camera.snapshot(),before);assert(Math.abs(a[0]-b[0])>1e-4);
 camera.setComparisonLocked(true);const m=camera.matrix().slice(),x=project(m,p8),y=project(m,p50);assert.equal(x[0],y[0]);assert.notEqual(x[1],y[1]);camera.dispose();
});
