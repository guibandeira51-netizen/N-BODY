import {createGalaxy} from '../physics/initial.js';
import {Leapfrog} from '../physics/integrator.js';
import {diagnostics,conservationError} from '../physics/diagnostics.js';
let engine=null,reference=null,lastDiagnostic=0,lastSnapshot=0,options={};
function velocityBins(state) {
  const bins=Array.from({length:15},()=>[]);
  for(let i=0;i<state.n;i++)if(state.components[i]===1){const k=3*i,x=state.positions[k],y=state.positions[k+1],r=Math.hypot(x,y),b=Math.floor(r/2);if(r>0&&b<bins.length)bins[b].push((x*state.velocities[k+1]-y*state.velocities[k])/r);}
  return bins.map((v,b)=>{v.sort((a,c)=>a-c);return {r:b*2+1,vphi:v.length?v[Math.floor(v.length/2)]:null,count:v.length};});
}
function pack(state) {
  const data=new Float32Array(state.n*4);
  for(let i=0;i<state.n;i++){data[4*i]=state.positions[3*i];data[4*i+1]=state.positions[3*i+1];data[4*i+2]=state.positions[3*i+2];data[4*i+3]=state.components[i];}
  return data;
}
function result(type,extra={}) {
  const data=pack(engine.state);postMessage({type,data,time:engine.time,steps:engine.steps,lastStepMs:engine.lastStepMs,...extra},[data.buffer]);lastSnapshot=performance.now();
}
self.onmessage=async({data:message})=>{
  const {type,config={}}=message;
  try {
    if(type==='initial') {
      const state=createGalaxy(config);postMessage({type:'initial',state},[state.positions.buffer,state.velocities.buffer,state.masses.buffer,state.components.buffer,state.accelerations.buffer]);return;
    }
    if(type==='prepare') {
      const start=performance.now();options=config;
      const state=createGalaxy(config);engine=new Leapfrog(state,config);engine.initialize();reference=diagnostics(state,config);lastDiagnostic=performance.now();
      result('ready',{meta:state.meta,diagnostic:reference,errors:conservationError(reference,reference),vphi:velocityBins(state),prepareMs:performance.now()-start});return;
    }
    if(type==='step') {
      if(!engine)throw Error('Prepare a simulação antes de integrar.');
      engine.step(message.count??1);const now=performance.now();let extra={};
      if(now-lastDiagnostic>3000||message.diagnostics){const d=diagnostics(engine.state,options);extra={diagnostic:d,errors:conservationError(d,reference),vphi:velocityBins(engine.state)};lastDiagnostic=performance.now();}
      // Only copy positions for the visual update when useful. The physical state stays in f64.
      if(now-lastSnapshot>=50||message.snapshot||extra.diagnostic)result('stepped',extra);
      else postMessage({type:'stepped',time:engine.time,steps:engine.steps,lastStepMs:engine.lastStepMs,...extra});return;
    }
    if(type==='snapshot'){const d=diagnostics(engine.state,options);result('snapshot',{diagnostic:d,errors:conservationError(d,reference)});}
    if(type==='diagnostic') {
      const state=message.state,d=diagnostics(state,message.options);
      if(message.baseline||!reference)reference=d;
      postMessage({type:'diagnostic',diagnostic:d,errors:conservationError(d,reference),vphi:velocityBins(state)});return;
    }
    if(type==='benchmark') {
      const samples=[];
      for(const algorithm of ['direct','barnes-hut']){
        const state=createGalaxy({n:512,seed:2026});const e=new Leapfrog(state,{...config,algorithm});e.initialize();e.step(1);
        const start=performance.now();e.step(3);samples.push({algorithm,n:512,stepMs:(performance.now()-start)/3,precision:'f64',steps:3});
      }
      postMessage({type:'benchmark',samples});
    }
  } catch(error){postMessage({type:'error',message:error.message,stack:error.stack});}
};
