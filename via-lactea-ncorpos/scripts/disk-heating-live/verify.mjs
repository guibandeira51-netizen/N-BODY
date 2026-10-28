import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const folder='reports/disk-heating-live/';
const digest=data=>createHash('sha256').update(data).digest('hex');
const manifest=JSON.parse(await readFile(folder+'snapshot-manifest.json','utf8'));
const source=await readFile(folder+'observed-session.json');
assert.equal(digest(source),manifest.sourceSHA256);
const audit=JSON.parse(source).laboratory.energyAudit;
const results=JSON.parse(await readFile(folder+'analysis.json','utf8'));
const codeChecks=[];
for(const [file,expected] of Object.entries(manifest.codeIdentity.files)){
  const hash=digest(await readFile(file));
  codeChecks.push({file,expected,actual:hash,unchanged:hash===expected});
}
assert.ok(codeChecks.every(c=>c.unchanged),'Runtime source differs from preserved realization identity');
assert.equal(audit.references.length,199);
for(const s of results.snapshotResults){
  assert.equal(s.diskCount,22409);assert.equal(s.positiveEnergyCount,0);
  assert.ok(s.specificEnergyMax<0);
  assert.equal(s.h50Kpc,s.boundOnlyH50Kpc);
}
const parameters=manifest.snapshots.map(s=>({G:s.parameters.G,epsilonSquared:s.parameters.epsilonSquared,n:s.n}));
for(const p of parameters)assert.deepEqual(p,parameters[0]);
const artifactFiles=await readdir(folder),hashes={};
for(const file of artifactFiles.filter(f=>/\.(json|csv|png|svg|md|bin|tap)$/.test(f)&&f!=='verification.json'))hashes[file]=digest(await readFile(folder+file));
const scriptHashes={};
for(const file of await readdir('scripts/disk-heating-live'))scriptHashes[file]=digest(await readFile('scripts/disk-heating-live/'+file));
const report={verifiedUTC:new Date().toISOString(),rawExportUnchanged:true,runtimeFilesChecked:codeChecks.length,runtimeUnchanged:true,parameters,realizationId:manifest.realizationId,retainedDirectReferences:audit.references.length,fullSnapshots:manifest.snapshots.length,codeChecks,hashes,scriptHashes};
await writeFile(folder+'verification.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({runtimeFilesUnchanged:codeChecks.length,rawExportUnchanged:true,fullSnapshots:3,directReferenceCount:audit.references.length}));
