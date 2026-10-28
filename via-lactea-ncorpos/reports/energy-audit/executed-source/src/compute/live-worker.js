// Generated from preserved worker.js; adds read-only component field diagnostics.
import {componentRotationField} from '../physics/rotation-field.js';
import {fastEnergy as diagnostics} from '../physics/live-energy.js';
let energyInitial=null;
import {createGalaxy} from '../physics/initial.js';
import {Leapfrog} from '../physics/integrator.js';
import {conservationError} from '../physics/diagnostics.js';
import {copyState,stateTransfers} from '../export/state.js';
import {laboratorySample} from '../physics/laboratory.js';
let engine=null,reference=null,lastDiagnostic=0,lastSnapshot=0,options={},requestStarted=0,diagnosticCost=0,lastPhysicalDiagnostic=0;
function measure(state,diagnostic,config){if(!energyInitial)energyInitial={state:copyState(state),fast:structuredClone(diagnostic)};const sample=laboratorySample(state,diagnostic,config);sample.rotationField=componentRotationField(state,config.rotationParameters??config);diagnosticCost=performance.now()-requestStarted;lastPhysicalDiagnostic=state.time??0;return sample;}
function pack(state) {
  const data=new Float32Array(state.n*4);
  for(let i=0;i<state.n;i++){data[4*i]=state.positions[3*i];data[4*i+1]=state.positions[3*i+1];data[4*i+2]=state.positions[3*i+2];data[4*i+3]=state.components[i];}
  return data;
}
function result(type,extra={}) {
  const data=pack(engine.state);postMessage({type,data,time:engine.time,steps:engine.steps,lastStepMs:engine.lastStepMs,workMs:performance.now()-requestStarted,...extra},[data.buffer]);lastSnapshot=performance.now();
}
self.onmessage=async({data:message})=>{
  const {type,config={}}=message;requestStarted=performance.now();
  try {
    if(type==='initial') {
      const state=createGalaxy(config);postMessage({type:'initial',state},[state.positions.buffer,state.velocities.buffer,state.masses.buffer,state.components.buffer,state.accelerations.buffer]);return;
    }
    if(type==='prepare') {energyInitial=null;
      const start=performance.now();options=config;
      const state=createGalaxy(config);engine=new Leapfrog(state,config);engine.initialize();reference=diagnostics(state,config);lastDiagnostic=performance.now();
      result('ready',{laboratory:measure(state,reference,config),meta:state.meta,diagnostic:reference,errors:conservationError(reference,reference),prepareMs:performance.now()-start});return;
    }
    if(type==='step') {
      if(!engine)throw Error('Prepare a simulação antes de integrar.');
      engine.step(message.count??1);const now=performance.now();let extra={};
      if((now-lastDiagnostic>Math.max(1000,10*diagnosticCost)&&engine.time-lastPhysicalDiagnostic>=(message.labCadence??5))||message.diagnostics){const d=diagnostics(engine.state,options);extra={laboratory:measure(engine.state,d,options),diagnostic:d,errors:conservationError(d,reference)};lastDiagnostic=performance.now();}
      // Only copy positions for the visual update when useful. The physical state stays in f64.
      if(now-lastSnapshot>=50||message.snapshot||extra.diagnostic)result('stepped',extra);
      else postMessage({type:'stepped',time:engine.time,steps:engine.steps,lastStepMs:engine.lastStepMs,workMs:performance.now()-requestStarted,...extra});return;
    }
    if(type==='snapshot'){const d=diagnostics(engine.state,options);result('snapshot',{laboratory:measure(engine.state,d,options),diagnostic:d,errors:conservationError(d,reference)});}
    if(type==='export-state'){if(!engine)throw Error('Nenhum estado massivo disponível.');const state=copyState(engine.state);postMessage({type,time:engine.time,steps:engine.steps,state},stateTransfers(state));return;}
    if(type==='energy-baseline'){if(!energyInitial)throw Error('Referência inicial indisponível.');const state=copyState(energyInitial.state);postMessage({type,state,fast:energyInitial.fast},stateTransfers(state));return;}
    if(type==='diagnostic') {if(message.baseline)energyInitial=null;
      const state=message.state,d=diagnostics(state,message.options);
      if(message.baseline||!reference)reference=d;
      postMessage({type:'diagnostic',laboratory:measure(state,d,message.options??{}),diagnostic:d,errors:conservationError(d,reference),workMs:performance.now()-requestStarted});return;
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
