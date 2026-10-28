"""Reproducible 106 supplement; never rewrites historical archives."""
from pathlib import Path
import json,hashlib,zipfile,datetime
ROOT=Path(__file__).resolve().parents[2];BASE=ROOT/'reports/v1.0.6';paths=set()
def digest(p):
 h=hashlib.sha256()
 with p.open('rb')as f:
  for b in iter(lambda:f.read(4*1024**2),b''):h.update(b)
 return h.hexdigest()
for folder in['src','scripts','tests','assets','reports/v1.0.6']:
 for p in(ROOT/folder).rglob('*'):
  if not p.is_file()or'__pycache__'in p.parts or p.suffix=='.pyc'or p.name in['package-audit.json','build-audit.json']:continue
  if p.name.endswith('-source.pdf')or p.name=='jiao-table-review.png':continue
  paths.add(p)
for p in ROOT.iterdir():
 if p.is_file()and p.suffix in['.html','.css','.md','.json','.cmd']:paths.add(p)
for p in(ROOT/'reports/v1.0.2/corrected').iterdir():
 if p.suffix=='.ini'or p.name in['preparation.json','protocol.json']:paths.add(p)
validation=json.loads((BASE/'validation.json').read_text())
for name in validation['sources']:
 p=ROOT/name;paths.add(p);r=json.loads(p.read_text());source=r.get('source')
 if source and(ROOT/source).exists():paths.add(ROOT/source)
for name in validation['derivedSourceSHA256']:paths.add(ROOT/name)
for p in(ROOT/'reports/v1.0.5').iterdir():
 if p.is_file()and p.suffix in['.json','.csv','.tap']:paths.add(p)
inventory=json.loads((BASE/'graph-inventory.json').read_text())
for row in inventory['figures']:
 paths.add(ROOT/row['source'])
 for f in row.get('formats',[]):paths.add(ROOT/f['path'])
dest=ROOT/'downloads/materia-escura-1.0.6.zip';sums=[]
with zipfile.ZipFile(dest,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6,allowZip64=True)as z:
 for p in sorted(paths):
  name=p.relative_to(ROOT).as_posix();sums.append(digest(p)+'  '+name);z.write(p,name)
 z.writestr('SHA256SUMS.txt','\n'.join(sums)+'\n');z.writestr('LEIA_PRIMEIRO_106.md','# Matéria escura na Via Láctea1.0.6\n\nComece por index.html servido localmente e MATERIA_ESCURA_VIA_LACTEA_1_0_6.md. Consulte REPRODUCAO_1_0_6.md para dependências e alcance. Este pacote contém a nova investigação, fontes atuais e originais, dados e figuras históricas necessários. Os ZIP históricos completos continuam preservados separadamente. Artigos científicos integrais não são redistribuídos: tabela numérica e referências oficiais incluídas. Sete gráficos na exposição,83 no arquivo técnico sob consulta. Nenhuma nova campanha N-corpos.\n')
with zipfile.ZipFile(dest)as z:
 bad=z.testzip()
 if bad:raise RuntimeError('CRC failure '+bad)
 for line in sums:
  expected,name=line.split('  ',1);h=hashlib.sha256()
  with z.open(name)as f:
   for b in iter(lambda:f.read(4*1024**2),b''):h.update(b)
  if h.hexdigest()!=expected:raise RuntimeError('Archive hash failure '+name)
sha=digest(dest);dest.with_suffix('.sha256').write_text(sha+'  '+dest.name+'\n',encoding='ascii');report={'status':'passed','UTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'archive':dest.name,'sha256':sha,'bytes':dest.stat().st_size,'files':len(sums),'CRCVerified':True,'entryHashesVerified':True,'scope':'106 supplement with new field, observations, orbits, presentation, source backups and historical evidence used. Complete historical packages stay separately preserved.'};(BASE/'package-audit.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf8');print(json.dumps(report),flush=True)
