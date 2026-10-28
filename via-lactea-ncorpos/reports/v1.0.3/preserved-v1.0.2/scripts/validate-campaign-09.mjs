import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../reports/v0.9.0/',import.meta.url),read=async n=>JSON.parse(await readFile(new URL(n,root),'utf8')),campaign=await read('halo-campaign.json'),dt=await read('halo-high-dt.json'),analysis=await read('analysis.json');
if(campaign.status!=='completed'||dt.status!=='completed'||campaign.runs.length!==22||dt.runs.length!==3||!analysis.completed)throw Error('Campaign incomplete');
const checks=[];
for(const group of [campaign,dt])for(const r of group.runs){if(r.samples.length!==r.config.duration/5+1)throw Error('Missing epochs');let previous=-Infinity;
 for(const s of r.samples){if(s.timeMyr<=previous)throw Error('Non-increasing epoch');previous=s.timeMyr;if(!s.disk.available||Math.abs(Math.hypot(...s.disk.plane.normal)-1)>1e-10)throw Error('Invalid disk plane');
  for(const c of s.components)if(Math.abs(c.mass-r.initialMeta.masses[c.id])>1e-6*Math.max(1,r.initialMeta.masses[c.id]))throw Error('Mass changed');
  for(const b of s.disk.rings)for(const m of b.modes)if(b.count&&Math.abs(Math.hypot(m.re,m.im)-m.amplitude)>1e-12)throw Error('Inconsistent complex mode');
 }
 checks.push({label:r.config.label,n:r.config.n,seed:r.config.haloSeed??null,epochs:r.samples.length,timeMyr:r.samples.at(-1).timeMyr,componentMassesConstant:true,complexModeConsistency:true});
}
const provenanceChecks=[];
const epochs=campaign.sourceEpochs.map((epoch,i)=>[epoch.archiveName??(i===0?'campaign':'continuation'),epoch.sourceHashes]);epochs.push(['high-dt',dt.sourceHashes]);
for(const [name,hashes] of epochs){const archived=await read(name==='campaign'?'campaign-provenance.json':name+'-provenance.json');for(const [path,expected] of Object.entries(hashes)){if(archived.sourceHashes[path]!==expected)throw Error('Source manifest mismatch '+path);const bytes=await readFile(new URL(`executed-source-${name}/${path.replaceAll('/','__')}.txt`,root));if(createHash('sha256').update(bytes).digest('hex')!==expected)throw Error('Archive checksum mismatch '+path);}provenanceChecks.push({name,files:Object.keys(hashes).length,verified:true});}
const result={createdUTC:new Date().toISOString(),completedRuns:checks.length,checks,provenanceChecks,limits:'Checks validate data integrity and configurations, not equilibrium or a collisionless limit.'};await writeFile(new URL('campaign-validation.json',root),JSON.stringify(result,null,2));console.log(JSON.stringify({completedRuns:checks.length,provenanceChecks}));
