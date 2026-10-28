import {writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {prepareIterative,serializeInitial} from '../src/physics/iterative-initial.js';
import {Leapfrog} from '../src/physics/integrator.js';
const args=process.argv.slice(2),value=(key,fallback)=>args.includes('--'+key)?args[args.indexOf('--'+key)+1]:fallback;
const config={n:Number(value('n',2000)),seed:Number(value('seed',2026)),dt:Number(value('dt',.1)),epsilon:Number(value('epsilon',.1)),theta:Number(value('theta',.5)),algorithm:value('algorithm','barnes-hut'),withHalo:true};
const iterations=Number(value('iterations',20)),segmentMyr=Number(value('segment',10)),neighbours=Number(value('neighbours',10));
const output=resolve(value('out',`reports/v0.8.0/snapshots/candidate-${config.n}-${config.seed}.json`)),start=performance.now();
const state=await prepareIterative(config,{iterations,segmentMyr,neighbours,
 evolve:async(s,t)=>{const count=t/config.dt;if(Math.abs(count-Math.round(count))>1e-8)throw Error('Segmento deve conter passos inteiros.');const e=new Leapfrog(s,config);e.initialize();e.step(Math.round(count));return s;},
 onIteration:row=>console.log(JSON.stringify(row))});
const snapshot=serializeInitial(state);snapshot.provenance={createdUTC:new Date().toISOString(),backend:'CPU f64',wallMs:performance.now()-start};
await mkdir(dirname(output),{recursive:true});const text=JSON.stringify(snapshot);await writeFile(output,text);await writeFile(output+'.sha256',createHash('sha256').update(text).digest('hex')+'\n');console.log('Candidato salvo, sem certificação de equilíbrio: '+output);
