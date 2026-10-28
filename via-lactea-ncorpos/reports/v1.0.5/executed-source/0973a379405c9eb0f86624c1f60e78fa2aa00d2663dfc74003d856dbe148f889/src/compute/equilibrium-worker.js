import {Leapfrog} from '../physics/integrator.js';
import {createGalaxy} from '../physics/initial.js';
import {equilibriumSample,ringMembership} from '../physics/equilibrium-analysis.js';
import {diagnostics} from '../physics/diagnostics.js';
let engine,options,baseline,cohorts;
self.onmessage=({data:m})=>{try{
 if(m.type==='prepare'){options=m.config;const s=createGalaxy({initialization:'snapshot',snapshot:m.snapshot});engine=new Leapfrog(s,options);engine.initialize();cohorts=ringMembership(s);baseline=diagnostics(s,options);}
 if(!engine)throw Error('Prepare o snapshot.');
 if(m.type==='step')engine.step(m.count??1);
 const s=engine.state,packed=new Float32Array(s.n*4);for(let i=0;i<s.n;i++)packed.set([...s.positions.subarray(3*i,3*i+3),s.components[i]],4*i);
 const sample=m.measure||m.type==='prepare'?equilibriumSample(s,{options,baseline,initialMembership:cohorts}):null;
 const result={type:m.type,time:engine.time,steps:engine.steps,packed,sample};const transfer=[packed.buffer];
 if(m.type==='export'){result.state=Object.fromEntries(Object.entries(s).map(([k,v])=>[k,ArrayBuffer.isView(v)?v.slice():v]));for(const v of Object.values(result.state))if(ArrayBuffer.isView(v))transfer.push(v.buffer);}
 postMessage(result,transfer);
 }catch(e){postMessage({type:'error',message:e.message});}};
