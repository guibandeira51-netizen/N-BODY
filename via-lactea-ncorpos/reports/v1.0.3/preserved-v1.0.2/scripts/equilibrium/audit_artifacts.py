"""Verify real exported snapshots, paired controls and execution-source hashes."""
from pathlib import Path
import json,hashlib,argparse,shutil
import numpy as np
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def vector_hash(a):return hashlib.sha256(np.asarray(a,dtype='<f8').tobytes()).hexdigest()
def load(p):return json.loads(p.read_text(encoding='utf8'))
def main():
 p=argparse.ArgumentParser();p.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[2]);a=p.parse_args();root=a.root.resolve();out=root/'reports/v1.0.0';snapshots=[];run_checks=[];groups={};errors=[]
 for dataset in ['agama','agama-calibrated']:
  folder=out/dataset
  if not (folder/'snapshots.json').exists():continue
  prep=load(folder/'preparation.json');pot_sha=sha(folder/'potential-final.ini')
  for row in load(folder/'snapshots.json'):
   path=folder/row['file'];d=load(path);n=d['n'];pos=np.array(d['positions']);vel=np.array(d['velocities']);m=np.array(d['masses']);c=np.array(d['components']);sub=np.array(d['subpopulations']);meta=d['meta'];physical=meta['physicalModel'];sums=[float(sum(m[c==i]))*1e10 for i in range(3)];mass_error=max(abs(x/y-1) for x,y in zip(sums,physical['componentMassesMsun']));assert sha(path)==row['sha256'],path;assert len(pos)==len(vel)==3*n and len(m)==len(c)==n;assert np.isfinite(pos).all() and np.isfinite(vel).all() and min(m)>0;assert mass_error<1e-10;assert np.array_equal(pos.reshape(-1,3)[::2],-pos.reshape(-1,3)[1::2]);assert np.array_equal(vel.reshape(-1,3)[::2],-vel.reshape(-1,3)[1::2]);assert physical['preparationPotentialSHA256']==pot_sha;assert all(x['negativeDF']==x['nonFiniteDF']==x['unboundInContinuum']==0 for x in meta['preparation']['admissibility']);assert meta['equilibriumValidated'] is False
   baryons=np.sum(c!=2);key=(dataset,row['counts'][0],row['counts'][1],row['seed']);star=(vector_hash(pos[:3*baryons]),vector_hash(vel[:3*baryons]),vector_hash(m[:baryons]));previous=groups.setdefault(key,star);assert previous==star,('Stellar sample changed during halo refinement',key)
   snapshots.append({'dataset':dataset,'file':row['file'],'sha256':row['sha256'],'n':n,'componentSumsMsun':sums,'maxMassDeclarationRelativeError':mass_error,'stellarHashes':star,'potentialSHA256':pot_sha,'DFsampleAdmissible':True,'counts':np.bincount(c,minlength=3).tolist(),'subpopulationCounts':np.bincount(sub,minlength=4).tolist()})
 for path in sorted((out/'runs').glob('*.json')):
  run=load(path);assert run['status']=='completed',path;assert run['samples'][-1]['timeMyr']==run['config']['duration'];assert all(b['timeMyr']>a['timeMyr'] for a,b in zip(run['samples'],run['samples'][1:]));sources=[]
  for name,digest in run['sourceHashes'].items():
   current=root/name;archived=out/'executed-source'/digest/name
   if sha(current)==digest:
    archived.parent.mkdir(parents=True,exist_ok=True)
    if not archived.exists():shutil.copy2(current,archived)
   assert archived.exists() and sha(archived)==digest,('Executed source unavailable',run['id'],name)
   sources.append({'path':name,'sha256':digest,'archive':str(archived.relative_to(root)).replace('\\','/')})
  orchestration=run.get('batchOrchestration')
  if orchestration:
   original=root/orchestration['file'];dest=out/'executed-source'/orchestration['sha256']/orchestration['file'];assert sha(original)==orchestration['sha256'] or dest.exists();dest.parent.mkdir(parents=True,exist_ok=True)
   if not dest.exists():shutil.copy2(original,dest)
  if run.get('snapshotSHA256'):
   cfg=run['config'];dataset='agama-calibrated' if run['id'].startswith('calibrated-') else 'agama';stem=f"c20-agama-n{cfg['nb']+cfg['nd']+cfg['nh']}-nb{cfg['nb']}-nd{cfg['nd']}-nh{cfg['nh']}-s{cfg['seed']}-h{cfg['haloSeed']}"+('-gaussian' if cfg.get('kind')=='gaussian-control' else '')+'.json';assert sha(out/dataset/stem)==run['snapshotSHA256']
   if run.get('externalGridSHA256'):assert sha(out/dataset/'halo-fixed-grid.json')==run['externalGridSHA256']
  run_checks.append({'id':run['id'],'status':run['status'],'lastTimeMyr':run['samples'][-1]['timeMyr'],'sha256':sha(path),'sources':sources})
 baseline=load(out/'baseline/code-identity-09.json')['files'];core=['src/physics/constants.js','src/physics/models.js','src/physics/initial-legacy.js','src/physics/forces.js','src/physics/integrator.js','src/compute/gpu.js']+[name for name in baseline if name.startswith('src/render/')]
 unchanged={name:sha(root/name)==baseline[name] for name in core};assert all(unchanged.values()),unchanged
 result={'schema':'equilibrium-artifact-audit-v1','snapshots':snapshots,'completedRuns':run_checks,'unchangedHistoricalPhysicsAndRenderers':unchanged,'stellarPairingGroupsVerified':len(groups),'qualification':'Hashes verify data/code identity and numerical bookkeeping; they do not certify physical equilibrium.'};(out/'artifact-audit.json').write_text(json.dumps(result,indent=2,ensure_ascii=False),encoding='utf8');print({'snapshotsVerified':len(snapshots),'runsVerified':len(run_checks),'historicalFilesUnchanged':len(unchanged)})

if __name__=='__main__':main()
