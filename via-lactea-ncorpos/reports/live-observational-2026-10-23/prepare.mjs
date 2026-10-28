import{readFile,writeFile}from'node:fs/promises';
import{liveDiagnosticsView}from'../../src/live-diagnostics.js';
import{BOVY_RIX_2013,ROCHE_2024}from'../../src/observations/vertical-escape.js';
// Rebuild only the diagnostics block from this task's preserved input document.
// Count nested sections (the energy panel is itself a section).
const path=new URL('../../experimento-ncorpos.html',import.meta.url),text=await readFile(new URL('before/experimento-ncorpos.html',import.meta.url),'utf8'),start=text.indexOf('<section class="live-diagnostics"');let end=-1,depth=0;const tags=/<\/?section\b[^>]*>/g;tags.lastIndex=start;for(let match;(match=tags.exec(text));){depth+=match[0].startsWith('</')?-1:1;if(depth===0){end=tags.lastIndex;break;}}if(start<0||end<0)throw Error('Seção não encontrada');await writeFile(path,text.slice(0,start)+liveDiagnosticsView({gpu:true})+text.slice(end));
await writeFile(new URL('observational-sources.json',import.meta.url),JSON.stringify({BOVY_RIX_2013,ROCHE_2024,verifiedUTC:new Date().toISOString(),redistribution:'Numerical facts with exact primary references; no full paper redistributed.'},null,2));
await writeFile(new URL('bovy-rix-2013-table3.csv',import.meta.url),'R_kpc,Kz_over_2piG_Msun_pc2,error_Msun_pc2\n'+BOVY_RIX_2013.rows.map(r=>[r.R_kpc,r.value,r.error].join(',')).join('\n')+'\n');
await writeFile(new URL('roche-2024-bin8-9.csv',import.meta.url),'method,R_kpc,R_min_kpc,R_max_kpc,escape_km_s,minus_km_s,plus_km_s\n'+ROCHE_2024.rows.map(r=>[r.method,r.R_kpc,r.R_min_kpc,r.R_max_kpc,r.value,r.minus,r.plus].join(',')).join('\n')+'\n');
