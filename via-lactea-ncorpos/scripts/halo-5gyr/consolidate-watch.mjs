// Refresh only derived tables/figures when a real measured checkpoint arrives.
// Original runs and binary snapshots are never edited by this helper.
import {watch} from 'node:fs';import {spawn} from 'node:child_process';
let timer,running=false,pending=false;
function consolidate(){if(running){pending=true;return;}running=true;
 const p=spawn(process.execPath,['scripts/halo-5gyr/report.mjs'],{windowsHide:true,stdio:['ignore','pipe','pipe']});let out='',err='';
 p.stdout.on('data',b=>out+=b);p.stderr.on('data',b=>err+=b);
 p.on('error',e=>{console.error(e);running=false;});
 p.on('exit',code=>{running=false;if(code)console.error(err);else console.log(new Date().toISOString()+' derived figures updated\n'+out);if(pending){pending=false;consolidate();}});
}
const w=watch('reports/halo-5gyr',(event,name)=>{if(String(name)!=='latest.json')return;clearTimeout(timer);timer=setTimeout(consolidate,500);});
process.on('SIGINT',()=>{clearTimeout(timer);w.close();process.exit(0);});
consolidate();console.log('Watching measured halo-5gyr results. Ctrl+C ends consolidation only.');
