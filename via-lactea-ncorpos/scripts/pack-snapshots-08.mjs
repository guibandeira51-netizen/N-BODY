import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {deserializeInitial} from '../src/physics/iterative-initial.js';
const inputs=process.argv.slice(2);if(inputs.length!==2)throw Error('Informe JSON de snapshots da campanha original e do refinamento.');
const dir=new URL('../reports/v0.8.0/snapshots/',import.meta.url);await mkdir(dir,{recursive:true});
const index=[];
for(const input of inputs){const snapshots=JSON.parse(await readFile(input,'utf8'));for(const row of snapshots){deserializeInitial(row.state);const name=`${row.label}-${row.config.n}-${row.config.seed}.json`,text=JSON.stringify({...row.state,provenance:{config:row.config,protocolLabel:row.label}}),hash=createHash('sha256').update(text).digest('hex');await writeFile(new URL(name,dir),text);await writeFile(new URL(name+'.sha256',dir),hash+'\n');index.push({file:name,sha256:hash,bytes:Buffer.byteLength(text),label:row.label,config:row.config,equilibriumValidated:row.state.meta?.equilibriumValidated??false});}}
if(index.length!==16)throw Error('Esperados 16 snapshots GPU.');
await writeFile(new URL('index.json',dir),JSON.stringify({schema:'initial-snapshot-index-v1',count:index.length,snapshots:index},null,2));console.log('16 snapshots validados e identificados por SHA-256.');
