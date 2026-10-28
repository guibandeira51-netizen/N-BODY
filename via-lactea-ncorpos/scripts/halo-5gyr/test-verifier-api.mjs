import assert from 'node:assert/strict';import {writeFile} from 'node:fs/promises';
const endpoint='http://127.0.0.1:4193/verify',headers={'Content-Type':'application/json',Origin:'http://localhost:4180'},results=[];
let r=await fetch(endpoint,{method:'POST',headers,body:JSON.stringify({id:'halo-x8'})}),d=await r.json();
assert.equal(r.status,200);assert.equal(d.independentlyRecomputed,true);assert.equal(d.epochVerified,true);assert.equal(d.globalSteps,50000);assert.equal(d.h50FinalKpc,.6295209027799722);assert.equal(d.independentPass,false);
results.push({case:'completed actual x8 binary phases',status:r.status,result:d});
r=await fetch(endpoint,{method:'POST',headers,body:JSON.stringify({id:'halo-x16'})});d=await r.json();assert.equal(r.status,400);results.push({case:'incomplete real x16 cannot be certified',status:r.status,result:d});
r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:'halo-x8'})});assert.equal(r.status,403);results.push({case:'missing local origin refused',status:r.status});
await writeFile('reports/halo-5gyr/verification-api-test.json',JSON.stringify({createdUTC:new Date().toISOString(),results,passed:true},null,2));console.log(JSON.stringify({passed:true,cases:results.map(r=>({case:r.case,status:r.status}))},null,2));
