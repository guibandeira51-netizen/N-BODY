"""Supplemental reproducible release; never modifies historical data or ZIPs."""
from pathlib import Path
import zipfile,json,hashlib,datetime
ROOT=Path(__file__).resolve().parents[2];BASE=ROOT/'reports/v1.0.5';paths=set();checkpoints=[]
def digest(p):
 h=hashlib.sha256()
 with p.open('rb')as f:
  for chunk in iter(lambda:f.read(4*1024**2),b''):h.update(chunk)
 return h.hexdigest()
for folder in['src','scripts','tests','assets','reports/v1.0.5']:
 for p in(ROOT/folder).rglob('*'):
  if not p.is_file()or'__pycache__'in p.parts or p.suffix=='.pyc'or p.name in['package-audit.json','checkpoint-manifest.json','build-audit.json']:continue
  if p.parent==BASE/'checkpoints':checkpoints.append({'path':p.relative_to(ROOT).as_posix(),'sha256':digest(p),'bytes':p.stat().st_size});continue
  paths.add(p)
for p in ROOT.iterdir():
 if p.is_file()and p.suffix.lower()in['.md','.html','.css','.json','.cmd']:paths.add(p)
for folder in['reports/v1.0.0/agama-calibrated','reports/v1.0.2/corrected']:
 for p in(ROOT/folder).iterdir():
  if p.is_file()and(p.suffix=='.ini'or p.name in['preparation.json','protocol.json','iterations.json','continuum-profiles.json','kinematic-moments.json','snapshots.json']):paths.add(p)
for p in(ROOT/'reports/v1.0.4').iterdir():
 if p.is_file()and p.suffix in['.json','.csv','.tap']:paths.add(p)
for p in(ROOT/'reports/v1.0.4/native-df').iterdir():
 if p.is_file():paths.add(p)
phase=json.loads((BASE/'phase-a.json').read_text());analysis=json.loads((BASE/'analysis.json').read_text())
for row in phase['references']:
 source=ROOT/row['path'];paths.add(source);r=json.loads(source.read_text());paths.add(ROOT/r['source'])
 if row['kind']=='A':
  for suffix in['.jsonl','-protocol.json']:paths.add(ROOT/'reports/v1.0.3/continuum'/(r['id']+suffix))
for row in analysis['runs']:
 if not row['path'].startswith('reports/v1.0.5/'):
  source=ROOT/row['path'];paths.add(source);r=json.loads(source.read_text());paths.add(ROOT/r['source'])
for row in json.loads((ROOT/'reports/v1.0.4/higher-initial-manifest.json').read_text()):
 if row['family']=='E':paths.add(ROOT/'reports/v1.0.4'/row['file'])
for p in(ROOT/'reports/v1.0.4/runs').glob('*time*200*.json'):paths.add(p)
oldcampaign=json.loads((ROOT/'reports/v1.0.4/campaign.json').read_text())
for row in oldcampaign['runs']:
 if row['stage'].startswith('time')or row['family']=='E'and row['stage']=='higher-pilot20':
  paths.add(ROOT/'reports/v1.0.4/runs'/(row['id']+'.json'));paths.add(ROOT/row['source'])
for folder in['reports/v1.0.2/field-validation','reports/v1.0.2/df-validation']:
 paths.update(p for p in(ROOT/folder).iterdir()if p.is_file())
paths.update(ROOT/'reports/v1.0.3'/p for p in['halo-fixed-grid.json','halo-wgsl-force-validation.json','halo-grid-validation.json','halo-plummer-potential.ini','halo-density-newtonian.ini','halo-initial-manifest.json','baryons-initial-manifest.json'])
meta={'files':checkpoints,'qualification':'Latest partial checkpoints remain intact locally; completed runs and native trajectories are included. Baseline history hashes cover prior versions that remain available in their own preserved full packages. This ZIP is a supplement, not a repackaging of every historical release.'};(BASE/'checkpoint-manifest.json').write_text(json.dumps(meta,indent=2)+'\n',encoding='utf8');paths.add(BASE/'checkpoint-manifest.json');dest=ROOT/'downloads/equilibrio-1.0.5.zip';sums=[]
with zipfile.ZipFile(dest,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6,allowZip64=True)as z:
 for p in sorted(paths):
  name=p.relative_to(ROOT).as_posix();sums.append(digest(p)+'  '+name);z.write(p,name)
 z.writestr('SHA256SUMS.txt','\n'.join(sums)+'\n');z.writestr('PACOTE_1_0_5.md','# Equilíbrio1.0.5 — experimental\n\nComplemento ao projeto preservado. Comece por VALIDACAO_FINAL_1_0_5.md e REPRODUCAO_1_0_5.md. Inclui resultados negativos, condições iniciais, referências e dados brutos usados nesta campanha. Versões anteriores permanecem em seus próprios pacotes. A família E104 não é o legacy Jeans+Satoh de80000partículas totais. Nenhum modelo foi promovido automaticamente a estável.\n')
with zipfile.ZipFile(dest)as z:
 bad=z.testzip()
 if bad:raise RuntimeError('CRC failure '+bad)
 for line in sums:
  expected,name=line.split('  ',1);h=hashlib.sha256()
  with z.open(name)as f:
   for b in iter(lambda:f.read(4*1024**2),b''):h.update(b)
  if h.hexdigest()!=expected:raise RuntimeError('Hash failure '+name)
sha=digest(dest);dest.with_suffix('.sha256').write_text(sha+'  '+dest.name+'\n',encoding='ascii');audit={'status':'passed','UTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'archive':dest.name,'bytes':dest.stat().st_size,'files':len(sums),'sha256':sha,'CRCVerified':True,'entryHashesVerified':True,'checkpointHashes':len(checkpoints),'scope':'Supplement to preserved project, sources, complete new results and required historical control inputs/trajectories.'};(BASE/'package-audit.json').write_text(json.dumps(audit,indent=2)+'\n',encoding='utf8');print(json.dumps(audit),flush=True)
