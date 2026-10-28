import {traverseRange} from '../../reports/cpu-performance-2026-10-22/range-kernel.mjs';
const inNode=typeof process!=='undefined'&&Boolean(process.versions?.node);
const node=inNode?await import('node:worker_threads'):null;
const send=(data,transfer=[])=>inNode?node.parentPort.postMessage(data,transfer):postMessage(data,transfer);
let stack=new Int32Array(128);
function run(m){try{
 if(m.type==='ping'){send({type:'pong',bytes:m.data?.byteLength??0,data:m.data},m.transferBack?[m.data.buffer]:[]);return;}
 const started=performance.now(),tree={...m.tree,stack,ensureStack(required){if(required>this.stack.length){const next=new Int32Array(Math.max(required,2*this.stack.length));next.set(this.stack);this.stack=next;}}};
 let bodies=0,chunks=0;
 for(;;){const first=Atomics.add(m.control,0,m.chunkSize),last=Math.min(m.state.n,first+m.chunkSize);if(first>=m.state.n)break;traverseRange(m.state,tree,m.options,m.state.accelerations,false,first,last);bodies+=last-first;chunks++;}
 stack=tree.stack;send({type:'done',threadId:inNode?node.threadId:null,computeMs:performance.now()-started,bodies,chunks,startEpochMs:performance.timeOrigin+started,endEpochMs:performance.timeOrigin+performance.now()});
 }catch(error){send({type:'error',message:error.message});}}
if(inNode)node.parentPort.on('message',run);else self.onmessage=({data})=>run(data);
