export function copyState(state){if(!state)return null;return Object.fromEntries(Object.entries(state).map(([key,value])=>[key,ArrayBuffer.isView(value)?value.slice():value]));}
export function stateTransfers(...states){return states.flatMap(state=>state?Object.values(state).filter(ArrayBuffer.isView).map(value=>value.buffer):[]);}
export async function waitIdle(busy){const start=performance.now();while(busy()){if(performance.now()-start>30000)throw Error('O passo pendente não terminou em 30 s. Aguarde a pausa e tente novamente.');await new Promise(resolve=>setTimeout(resolve,20));}}
