import {parentPort,workerData} from 'node:worker_threads';import {readFileSync} from 'node:fs';import {deserialize} from 'node:v8';import {directTargetField} from './direct-target-field.mjs';
const state=deserialize(readFileSync(workerData.file)),start=performance.now();
const result=directTargetField(state,workerData.ids,workerData.parameters,(done,total)=>{if(done%2048===1)parentPort.postMessage({progress:done,total});});
parentPort.postMessage({result,ms:performance.now()-start});
