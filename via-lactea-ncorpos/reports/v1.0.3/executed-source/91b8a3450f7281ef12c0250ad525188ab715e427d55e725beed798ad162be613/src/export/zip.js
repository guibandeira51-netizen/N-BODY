const encoder=new TextEncoder(),crcTable=Uint32Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
export function crc32(bytes){let crc=0xffffffff;for(const b of bytes)crc=crcTable[(crc^b)&255]^(crc>>>8);return (crc^0xffffffff)>>>0;}
/** Standard ZIP store: no third-party library or external upload. */
export function createZip(entries){
  if(entries.length>65535)throw RangeError('Quantidade de arquivos excede ZIP32.');
  const local=[],central=[];let offset=0;
  for(const {name,data}of entries){
    if(!name||name.startsWith('/')||name.split('/').includes('..'))throw Error('Nome de arquivo ZIP inválido.');
    const path=encoder.encode(name),bytes=typeof data==='string'?encoder.encode(data):new Uint8Array(data.buffer??data,data.byteOffset??0,data.byteLength??data.length),crc=crc32(bytes);
    if(path.length>65535||bytes.length>0xffffffff||offset+bytes.length+path.length+30>0xffffffff)throw RangeError('Arquivo excede ZIP32.');
    const header=new Uint8Array(30+path.length),view=new DataView(header.buffer);view.setUint32(0,0x04034b50,true);view.setUint16(4,20,true);view.setUint16(6,0x800,true);view.setUint16(12,33,true);view.setUint32(14,crc,true);view.setUint32(18,bytes.length,true);view.setUint32(22,bytes.length,true);view.setUint16(26,path.length,true);header.set(path,30);
    const directory=new Uint8Array(46+path.length),d=new DataView(directory.buffer);d.setUint32(0,0x02014b50,true);d.setUint16(4,20,true);d.setUint16(6,20,true);d.setUint16(8,0x800,true);d.setUint16(14,33,true);d.setUint32(16,crc,true);d.setUint32(20,bytes.length,true);d.setUint32(24,bytes.length,true);d.setUint16(28,path.length,true);d.setUint32(42,offset,true);directory.set(path,46);
    local.push(header,bytes);central.push(directory);offset+=header.length+bytes.length;
  }
  const size=central.reduce((sum,p)=>sum+p.length,0);if(offset+size+22>0xffffffff)throw RangeError('Pacote excede ZIP32.');
  const end=new Uint8Array(22),v=new DataView(end.buffer);v.setUint32(0,0x06054b50,true);v.setUint16(8,entries.length,true);v.setUint16(10,entries.length,true);v.setUint32(12,size,true);v.setUint32(16,offset,true);
  return new Blob([...local,...central,end],{type:'application/zip'});
}
export function csv(headers,rows){const cell=value=>value==null||typeof value==='number'&&!Number.isFinite(value)?'':`"${String(value).replaceAll('"','""')}"`;return '\uFEFF'+[headers,...rows].map(row=>row.map(cell).join(',')).join('\r\n')+'\r\n';}
