import {readFile,writeFile,readdir,mkdir,stat} from 'node:fs/promises';
import {resolve,relative} from 'node:path';
import {deflateRawSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {crc32} from '../src/export/zip.js';
async function walk(dir){const files=[];for(const e of await readdir(dir,{withFileTypes:true})){const p=resolve(dir,e.name);if(e.isDirectory())files.push(...await walk(p));else files.push(p);}return files;}
// ZIP/deflate assembled by Node built-ins. The browser export keeps its existing
// store format; this archive makes the recorded campaign practical to download.
export function archive(entries){const local=[],central=[];let offset=0;
 for(const {name,data} of entries){const path=Buffer.from(name),packed=deflateRawSync(data,{level:6}),crc=crc32(data),h=Buffer.alloc(30+path.length);h.writeUInt32LE(0x04034b50,0);h.writeUInt16LE(20,4);h.writeUInt16LE(0x800,6);h.writeUInt16LE(8,8);h.writeUInt16LE(33,12);h.writeUInt32LE(crc,14);h.writeUInt32LE(packed.length,18);h.writeUInt32LE(data.length,22);h.writeUInt16LE(path.length,26);path.copy(h,30);
  const c=Buffer.alloc(46+path.length);c.writeUInt32LE(0x02014b50,0);c.writeUInt16LE(20,4);c.writeUInt16LE(20,6);c.writeUInt16LE(0x800,8);c.writeUInt16LE(8,10);c.writeUInt16LE(33,14);c.writeUInt32LE(crc,16);c.writeUInt32LE(packed.length,20);c.writeUInt32LE(data.length,24);c.writeUInt16LE(path.length,28);c.writeUInt32LE(offset,42);path.copy(c,46);local.push(h,packed);central.push(c);offset+=h.length+packed.length;
 }const size=central.reduce((s,b)=>s+b.length,0),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(entries.length,8);end.writeUInt16LE(entries.length,10);end.writeUInt32LE(size,12);end.writeUInt32LE(offset,16);return Buffer.concat([...local,...central,end]);
}
export async function prepareInvestigationAssets(root){
 const pkg=JSON.parse(await readFile(resolve(root,'package.json'),'utf8')),historicalOnly=pkg.version!=='0.9.0';
 if(historicalOnly){try{await stat(resolve(root,'downloads/investigacao-0.9.0.zip'));await stat(resolve(root,'downloads/historico-experimentos.zip'));console.log('Pacotes históricos 0.9 e anteriores preservados.');return;}catch{}}
 let analysis;try{analysis=JSON.parse(await readFile(resolve(root,'reports/v0.9.0/analysis.json'),'utf8'));}catch{return;}
 if(!analysis.completed)return; // never advertise a partial campaign as final
 const paths=[];for(const folder of ['reports/v0.9.0','reports/history/v0.8.0/source',...(historicalOnly?[]:['src'])])paths.push(...await walk(resolve(root,folder)));
 for(const folder of ['scripts','tests'])paths.push(...(await walk(resolve(root,folder))).filter(p=>p.includes('-09.')||p.endsWith('serve.mjs')));
 for(const name of ['AQUECIMENTO_DISCO.md','COMPARACAO_HALOS.md','ESTRUTURA_ESPIRAL.md','VALIDACAO_09.md','PARAMETROS_E_FONTES.md','EQUILIBRIO_INICIAL.md',...(historicalOnly?[]:['package.json'])])paths.push(resolve(root,name));
 const entries=[];for(const p of paths.sort()){if(p.endsWith('-partial.json'))continue;entries.push({name:relative(root,p).replaceAll('\\','/'),data:await readFile(p)});}
 const checksum=entries.map(e=>`${createHash('sha256').update(e.data).digest('hex')}  ${e.name}`).join('\n')+'\n';entries.push({name:'SHA256SUMS.txt',data:Buffer.from(checksum)});
 await mkdir(resolve(root,'downloads'),{recursive:true});const data=archive(entries);await writeFile(resolve(root,'downloads/investigacao-0.9.0.zip'),data);
 await writeFile(resolve(root,'downloads/investigacao-0.9.0.sha256'),createHash('sha256').update(data).digest('hex')+'  investigacao-0.9.0.zip\n');
 console.log(`Investigação: ${entries.length} arquivos, ${(data.length/1024**2).toFixed(2)} MiB comprimidos.`);
 const history=[];for(const p of await walk(resolve(root,'reports'))){const name=relative(root,p).replaceAll('\\','/');if(!name.startsWith('reports/v0.9.0/')&&!name.startsWith('reports/v1.0.0/'))history.push({name,data:await readFile(p)});}
 const historicalData=archive(history);await writeFile(resolve(root,'downloads/historico-experimentos.zip'),historicalData);await writeFile(resolve(root,'downloads/historico-experimentos.sha256'),createHash('sha256').update(historicalData).digest('hex')+'  historico-experimentos.zip\n');
 console.log(`Histórico: ${history.length} arquivos, ${(historicalData.length/1024**2).toFixed(2)} MiB comprimidos.`);
}
