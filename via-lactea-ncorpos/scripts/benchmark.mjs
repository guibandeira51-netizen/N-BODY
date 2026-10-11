import {createGalaxy} from '../src/physics/initial.js';
import {Leapfrog} from '../src/physics/integrator.js';
import {estimateTreeBytes} from '../src/physics/forces.js';
import {writeFile} from 'node:fs/promises';import os from 'node:os';
const ns=process.argv.slice(2).map(Number);if(!ns.length)ns.push(1000,10000,100000);
const report={dateUTC:new Date().toISOString(),runtime:process.version,platform:process.platform,cpu:os.cpus()[0]?.model,logicalProcessors:os.availableParallelism(),memoryBytes:os.totalmem(),method:'CPU f64: initial condition generation and one real KDK step, preceded by acceleration initialization; timings wall clock, no extrapolated results',results:[]};
for(const n of ns) {
  if(!Number.isSafeInteger(n)||n<3)throw Error('N inválido.');
  const estimated=estimateTreeBytes(n)+n*100;if(estimated>os.freemem()*0.65){report.results.push({n,status:'not_run',reason:'Estimated working memory exceeds 65% of currently free host memory',estimated});continue;}
  for(const algorithm of (n<=10000?['direct','barnes-hut']:['barnes-hut'])) {
    let t=performance.now();const state=createGalaxy({n});const initialMs=performance.now()-t;
    const engine=new Leapfrog(state,{algorithm,dt:0.1,epsilon:0.1,theta:0.5});t=performance.now();engine.initialize();const forceMs=performance.now()-t;
    engine.step(1);const entry={n,algorithm,status:'measured',initialMs,forceMs,stepMs:engine.lastStepMs,physicalMyr:engine.time,finite:state.positions.every(Number.isFinite)&&state.velocities.every(Number.isFinite),estimatedBytes:estimated,rssBytes:process.memoryUsage().rss};
    report.results.push(entry);console.log(JSON.stringify(entry));
    await writeFile(new URL('../reports/benchmark-cpu.json',import.meta.url),JSON.stringify(report,null,2));
  }
}
await writeFile(new URL('../reports/benchmark-cpu.json',import.meta.url),JSON.stringify(report,null,2));
