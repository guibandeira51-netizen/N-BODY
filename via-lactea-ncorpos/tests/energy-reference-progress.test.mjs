import test from 'node:test';
import assert from 'node:assert/strict';
import {pairEnergyRange} from '../src/physics/pair-energy-partition.js';
import {LiveEnergyReference} from '../src/compute/live-energy-reference.js';
import {directEnergy} from '../src/physics/live-energy.js';

test('pair progress counts completed pairs without changing summation order, energy, or particles',()=>{
 const n=197,positions=Float64Array.from({length:3*n},(_,k)=>Math.sin(k)*10),masses=Float64Array.from({length:n},(_,k)=>.01+k*.0001),before=positions.slice();
 const events=[],plain=pairEnergyRange(positions,masses,n,7,143,.044985,.01),reported=pairEnergyRange(positions,masses,n,7,143,.044985,.01,done=>events.push(done));
 assert.equal(reported,plain);assert.deepEqual(positions,before);assert(events.length>1);
 assert.equal(events.at(-1),(143-7)*(2*n-7-143-1)/2);assert(events.every((v,k)=>v>0&&(!k||v>events[k-1])));
});

test('worker progress does not finish a job, create a reference, or terminate the worker',async()=>{
 const previous=globalThis.Worker,workers=[];
 class W{constructor(){this.terminated=false;workers.push(this);}postMessage(m){this.message=m;}terminate(){this.terminated=true;}}
 globalThis.Worker=W;
 try{
  const s={n:4,time:0,positions:Float64Array.of(0,0,0,1,0,0,0,2,0,0,0,3),velocities:new Float64Array(12),masses:Float64Array.of(1,2,3,4),components:new Uint8Array(4)},o={epsilon:.1},values=[],pool=new LiveEnergyReference(2);
  let finished=false;const pending=pool.evaluate(s,o,v=>values.push(v)).then(d=>{finished=true;return d;});
  assert.equal(workers[0].message.progressProtocol,1);
  workers[0].onmessage({data:{type:'progress',done:1}});assert.equal(values.at(-1),1/6);assert(!finished);assert(!workers[0].terminated);assert(pool.active);
  workers[0].onmessage({data:{type:'progress',done:0}});assert.equal(values.at(-1),1/6);
  const expected=directEnergy(s,o);
  for(const w of workers){const m=w.message;w.onmessage({data:{value:pairEnergyRange(s.positions,s.masses,s.n,m.first,m.last,m.G,m.epsilonSquared),base:m.base?expected:null,ms:10}});}
  const actual=await pending;assert.equal(actual.energy,expected.energy);assert.equal(values.at(-1),1);assert(finished);assert(!pool.active);
 }finally{globalThis.Worker=previous;}
});

test('updated worker sends only a final result to an already-open legacy client; progress requires negotiation',async()=>{
 const saved={self:globalThis.self,postMessage:globalThis.postMessage,performance:globalThis.performance},messages=[];
 let clock=0;
 globalThis.self={};globalThis.postMessage=m=>messages.push(m);globalThis.performance={now:()=>clock+=300};
 try{
  await import('../src/compute/energy-reference-worker.js?protocol-regression');
  const n=197,s={n,time:1355,positions:Float64Array.from({length:3*n},(_,k)=>Math.sin(k)*10),velocities:new Float64Array(3*n),masses:new Float64Array(n).fill(.1),components:new Uint8Array(n)};
  const request={state:s,options:{epsilon:.1},first:0,last:n-1,base:true,G:.044985,epsilonSquared:.01};
  self.onmessage({data:request});
  assert.equal(messages.length,1);assert.equal(messages[0].type,'result');assert.equal(messages[0].base.time,1355);assert(Number.isFinite(messages[0].base.kinetic));assert(Number.isFinite(messages[0].value));
  const legacyResult=structuredClone(messages[0]);messages.length=0;
  self.onmessage({data:{...request,progressProtocol:1}});
  assert(messages.some(m=>m.type==='progress'));assert.equal(messages.at(-1).type,'result');assert.equal(messages.at(-1).value,legacyResult.value);assert.deepEqual(messages.at(-1).base,legacyResult.base);
 }finally{
  for(const [key,value] of Object.entries(saved))if(value===undefined)delete globalThis[key];else globalThis[key]=value;
 }
});

test('missing kinetic base and malformed final messages fail explicitly without producing an energy',async()=>{
 const previous=globalThis.Worker,workers=[];
 class W{constructor(){workers.push(this);}postMessage(m){this.message=m;}terminate(){}}
 globalThis.Worker=W;
 try{
  const s={n:2,time:0,positions:Float64Array.of(0,0,0,1,0,0),velocities:new Float64Array(6),masses:Float64Array.of(1,1),components:new Uint8Array(2)},pool=new LiveEnergyReference(1);
  const missing=pool.evaluate(s);workers[0].onmessage({data:{type:'result',value:-1,ms:2,base:null}});await assert.rejects(missing,/cinética.*ausente/);assert(!pool.active);
  const malformed=pool.evaluate(s);workers[1].onmessage({data:{type:'other',value:-1,ms:2}});await assert.rejects(malformed,/Resposta inválida/);assert(!pool.active);
 }finally{globalThis.Worker=previous;}
});
