"""Stream a versioned supplemental archive, never rewriting older releases."""
from pathlib import Path
import zipfile,json,hashlib,datetime
ROOT=Path(__file__).resolve().parents[2];BASE=ROOT/'reports/v1.0.3';paths=set();checkpoints=[]
for folder in ['src','scripts','tests','assets','reports/v1.0.3']:
 for p in(ROOT/folder).rglob('*'):
  if not p.is_file()or'__pycache__'in p.parts or p.suffix=='.pyc'or p.name in ['package-audit.json','checkpoint-manifest.json']:continue
  if p.parent==BASE/'checkpoints':checkpoints.append({'path':p.relative_to(ROOT).as_posix(),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()});continue
  paths.add(p)
for p in ROOT.iterdir():
 if p.is_file()and p.suffix.lower()in ['.md','.html','.css','.json','.cmd']:paths.add(p)
for folder in ['reports/v1.0.2/corrected','reports/v1.0.0/agama-calibrated']:
 for p in(ROOT/folder).iterdir():
  if p.is_file()and(p.suffix=='.ini'or p.name in ['snapshots.json','preparation.json','continuum-profiles.json','model-c20-calibrated.json']):paths.add(p)
old=ROOT/'reports/v1.0.2/corrected';manifest=json.loads((old/'snapshots.json').read_text());paths.update(old/r['file']for r in manifest if r['n']==10000)
paths.add(ROOT/'reports/v1.0.2/short-overview.json');paths.add(ROOT/'reports/v1.0.2/kinematic-profiles.csv')
# Historical immutable copied inputs used to reconstruct the old DFs.
legacy=ROOT/'reports/v1.0.0/agama-calibrated';lm=json.loads((legacy/'snapshots.json').read_text());paths.update(legacy/r['file']for r in lm if r['seed']==r['haloSeed']and r['seed']in [2026,2027]and r['n']in [1000,10000])
checkpoint_meta={'files':checkpoints,'qualification':'Latest partial checkpoints remain intact in the local project. This archive includes their hashes; completed trajectories carry initial/final full states and all recorded diagnostics. Native continuous41-epoch trajectories are included.'};(BASE/'checkpoint-manifest.json').write_text(json.dumps(checkpoint_meta,indent=2)+'\n',encoding='utf8');paths.add(BASE/'checkpoint-manifest.json')
dest=ROOT/'downloads/granularidade-1.0.3.zip';sums=[]
with zipfile.ZipFile(dest,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6,allowZip64=True)as z:
 for p in sorted(paths):
  name=p.relative_to(ROOT).as_posix();sums.append(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+name);z.write(p,name)
 z.writestr('SHA256SUMS.txt','\n'.join(sums)+'\n');z.writestr('PACOTE_1_0_3.md','# Granularidade1.0.3 — experimental\n\nComplemento do projeto preservado, com fontes, snapshots e evidências científicas. Consulte VALIDACAO_FINAL_1_0_3.md e REPRODUCAO_1_0_3.md. Resultados de versões anteriores continuam em seus pacotes separados. Checkpoints parciais continuam locais e têm manifesto de hashes; os resultados completos e estados inicial/final estão incluídos. O candidato não substitui automaticamente o padrão.\n')
with zipfile.ZipFile(dest)as z:
 bad=z.testzip()
 if bad:raise RuntimeError('ZIP CRC '+bad)
 for line in sums:
  expected,name=line.split('  ',1)
  if hashlib.sha256(z.read(name)).hexdigest()!=expected:raise RuntimeError('ZIP hash '+name)
digest=hashlib.sha256(dest.read_bytes()).hexdigest();dest.with_suffix('.sha256').write_text(digest+'  '+dest.name+'\n',encoding='ascii');audit={'status':'passed','UTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'archive':dest.name,'bytes':dest.stat().st_size,'sha256':digest,'files':len(sums),'CRCVerified':True,'entrySHA256Verified':True,'checkpointHashes':len(checkpoints),'scope':'Supplement to preserved project; prior complete release packages remain separate.'};(BASE/'package-audit.json').write_text(json.dumps(audit,indent=2)+'\n',encoding='utf8');print(json.dumps(audit))
