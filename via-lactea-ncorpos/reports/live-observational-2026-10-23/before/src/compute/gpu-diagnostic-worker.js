import {createLiveGalaxy} from '../physics/live-initial.js';
import {gpuEnergy} from '../physics/gpu-energy.js';
import {copyEnergySnapshot} from '../physics/live-energy.js';
import {laboratorySample} from '../physics/laboratory.js';
import {conservationError} from '../physics/diagnostics.js';
import {EnergySnapshotSampler} from './energy-snapshot-sampler.js';
let initial=null,reference=null,sampler=new EnergySnapshotSampler();
self.onmessage=({data:m})=>{try{
 if(m.type==='initial'){const state=createLiveGalaxy(m.config);postMessage({type:'initial',state},[state.positions.buffer,state.velocities.buffer,state.accelerations.buffer,state.masses.buffer,state.components.buffer]);return;}
 if(m.type==='energy-baseline'){if(!initial)throw Error('Estado inicial indisponível.');const state=copyEnergySnapshot(initial.state);postMessage({type:m.type,state,fast:initial.fast},[state.positions.buffer,state.velocities.buffer,state.masses.buffer,state.components.buffer]);return;}
 if(m.type!=='diagnostic')throw Error('Este Worker apenas gera condições iniciais e analisa snapshots GPU.');
 const start=performance.now(),state=m.state,options=m.options,d=gpuEnergy(state,options);
 if(m.baseline){sampler=new EnergySnapshotSampler();initial=null;reference=d;}
 if(!state.gpuRotationField||state.gpuRotationField.timeMyr!==state.time)throw Error('Campo radial GPU não corresponde à época do snapshot.');
 initial??={state:copyEnergySnapshot(state),fast:structuredClone(d)};
 const sample=laboratorySample(state,d,options);sample.rotationField=state.gpuRotationField;sample.automaticEnergy=sampler.capture(state,d,options);
 postMessage({type:'diagnostic',laboratory:sample,diagnostic:d,errors:conservationError(d,reference??d),workMs:performance.now()-start});
 }catch(error){postMessage({type:'error',message:error.message});}};
