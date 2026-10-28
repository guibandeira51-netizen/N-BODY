import {createReadStream} from 'node:fs';
import {createInterface} from 'node:readline';
import {resolve} from 'node:path';
import {validationSnapshot,conservationSample,summarizeConservationSeries} from '../../src/physics/validation-101.js';
import {directAccelerations} from '../../src/physics/forces.js';
import {out,read,save,loadModel,structural,serialized,codeIdentity} from './common.mjs';
const mismatch=[];
for(const dataset of ['agama','agama-calibrated']){
 const {s,path,sha256}=await loadModel(dataset),protocol=await read('reports/v1.0.1/continuum/'+dataset+'-protocol.json'),raw=[],samples=[],states=[];
 const reader=createInterface({input:createReadStream(resolve(out,'continuum',dataset+'.jsonl')),crlfDelay:Infinity});
 for await(const line of reader){const r=JSON.parse(line);s.time=r.timeMyr;for(const k of ['positions','velocities','accelerations'])s[k].set(r[k]);let index=0;const d=validationSnapshot(s,{selfGravity:false,externalPotential:()=>r.specificPotential[index++],externalSymmetry:'axisymmetric'});raw.push(d);samples.push(structural(s,d));if([0,20,200,1000].includes(s.time))states.push(serialized({...s,positions:s.positions.slice(),velocities:s.velocities.slice(),accelerations:s.accelerations.slice()}));}
 const id='A-continuum-'+dataset,run={schema:'validation-101-run',id,status:'completed',origin:'new-continuum-integration-1.0.1',config:{n:s.n,durationMyr:1000,algorithm:'AGAMA-DOP853',precision:'Float64',cadenceMyr:2,seed:2026,externalField:'Frozen own full AGAMA total potential, no self-gravity'},source:path,sourceSHA256:sha256,codeSHA256:(await codeIdentity()).sha256,protocol,conservation:summarizeConservationSeries(raw),energySeries:raw.map(d=>conservationSample(d,raw[0])),samples,qualification:'K + sum m Phi_total continuum. This is a test-particle orbital-energy sum, NOT K + U_pairs of the self-gravitating realization.'};await save('runs/'+id+'.json',run);await save('snapshots/'+id+'.json',{id,config:run.config,states});
 const initial=await loadModel(dataset),f=await read('reports/v1.0.1/continuum/'+dataset+'-initial-field.json');
 for(const epsilon of [.05,.1,.2]){const direct=directAccelerations(initial.s,{epsilon},new Float64Array(3*s.n));const groups=[];for(const id of [0,1,2,3]){let difference2=0,reference2=0,differenceNormal2=0,referenceNormal2=0,count=0;for(let i=0;i<s.n;i++)if(initial.s.subpopulations[i]===id){count++;for(let k=0;k<3;k++){difference2+=(direct[3*i+k]-f.acceleration[3*i+k])**2;reference2+=f.acceleration[3*i+k]**2;}differenceNormal2+=(direct[3*i+2]-f.acceleration[3*i+2])**2;referenceNormal2+=f.acceleration[3*i+2]**2;}groups.push({id,name:['bulge','thin','thick','halo'][id],count,forceDifferenceRmsRelative:Math.sqrt(difference2/reference2),verticalForceDifferenceRmsRelative:Math.sqrt(differenceNormal2/referenceNormal2)});}mismatch.push({dataset,epsilon,groups,qualification:'Discrete softened direct field versus actual unsoftened AGAMA mean at IDENTICAL initial positions. Includes softening bias + all-component discreteness + finite realization; not a pure integrator or BH error.'});}
 console.log(id,run.conservation.maxAbsEnergyError,'h50',samples[0].disk.instant.h50,samples.at(-1).disk.instant.h50);
}
await save('continuum-discrete-field-mismatch.json',mismatch);
