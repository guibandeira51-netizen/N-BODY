import {traverseTargets} from './bh-parallel-kernel.js';
const node=typeof process!=='undefined'&&process.versions?.node?await import('node:worker_threads'):null;
const send=data=>node?node.parentPort.postMessage(data):postMessage(data);
let stack=new Int32Array(128);
function receive(m){try{
 if(m.type==='ready'){send({type:'ready'});return;}
 const start=performance.now(),tree={...m.tree,stack,ensureStack(required){if(required>this.stack.length){const next=new Int32Array(Math.max(required,2*this.stack.length));next.set(this.stack);this.stack=next;}}};
 let bodies=0;
 for(;;){const first=Atomics.add(m.control,0,256),last=Math.min(m.state.n,first+256);if(first>=m.state.n)break;traverseTargets(m.state,tree,m.options,m.state.accelerations,false,first,last);bodies+=last-first;}
 stack=tree.stack;send({type:'done',bodies,computeMs:performance.now()-start});
 }catch(error){send({type:'error',message:error.message});}}
if(node)node.parentPort.on('message',receive);else self.onmessage=({data})=>receive(data);
