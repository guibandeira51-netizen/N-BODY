"""Package the reorganised static site without nesting or changing old archives."""
from pathlib import Path
import json,hashlib,zipfile,datetime
ROOT=Path(__file__).resolve().parents[2]; BASE=ROOT/'reports/interface-106'; paths=set()
def digest(p):
 h=hashlib.sha256()
 with p.open('rb')as f:
  for b in iter(lambda:f.read(4*1024**2),b''):h.update(b)
 return h.hexdigest()
def admissible(p):
 return p.is_file()and'__pycache__'not in p.parts and p.suffix!='.pyc'and not p.name.endswith('-source.pdf')and p.name!='jiao-table-review.png'
for folder in ['src','scripts','tests','assets','reports/v1.0.6','reports/interface-106']:
 for p in(ROOT/folder).rglob('*'):
  if admissible(p)and not(folder=='reports/interface-106'and p.name in['package-audit.json','build-audit.json']):paths.add(p)
for p in ROOT.iterdir():
 if p.is_file()and p.suffix in['.html','.css','.md','.json','.cmd']:paths.add(p)
# Everything the static build exposes as a loose scientific record is included.
for p in(ROOT/'dist/reports').rglob('*'):
 if admissible(p):
  current=ROOT/p.relative_to(ROOT/'dist')
  if admissible(current)and not('interface-106'in current.parts and current.name in['package-audit.json','build-audit.json']):paths.add(current)
for p in(ROOT/'downloads').iterdir():
 if p.suffix in['.json','.sha256']and p.name!='apresentacao-tcc-1.0.6-ncorpos.sha256':paths.add(p)
validation=json.loads((ROOT/'reports/v1.0.6/validation.json').read_text())
for name in validation['sources']:
 p=ROOT/name;paths.add(p);r=json.loads(p.read_text());source=r.get('source')
 if source and(ROOT/source).exists():paths.add(ROOT/source)
for name in validation['derivedSourceSHA256']:paths.add(ROOT/name)
for p in(ROOT/'reports/v1.0.2/corrected').iterdir():
 if p.suffix=='.ini'or p.name in['preparation.json','protocol.json']:paths.add(p)
dest=ROOT/'downloads/apresentacao-tcc-1.0.6-ncorpos.zip';sums=[]
with zipfile.ZipFile(dest,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6,allowZip64=True)as z:
 for p in sorted(paths):
  name=p.relative_to(ROOT).as_posix();sums.append(digest(p)+'  '+name);z.write(p,name)
 z.writestr('SHA256SUMS.txt','\n'.join(sums)+'\n')
 z.writestr('LEIA_PRIMEIRO_INTERFACE.md','# Site de apresentação do TCC\n\nExecute `node scripts/serve.mjs` e abra http://localhost:4180/. A entrada é Apresentação; as outras duas áreas principais são Experimento N-corpos e Matéria Escura. Consulte REORGANIZACAO_INTERFACE_TCC.md. Código, testes e dados públicos necessários às páginas estão incluídos. Os grandes ZIPs históricos são preservados separadamente e não estão aninhados neste arquivo: mantenha-os também em downloads para restaurar todos os links de campanhas antigas. Os artigos integrais não são redistribuídos. As auditorias de preservação do acervo completo pressupõem a pasta original com esses arquivos históricos; os 114 testes de código e dados podem ser executados com node scripts/test.mjs.\n')
with zipfile.ZipFile(dest)as z:
 bad=z.testzip()
 if bad:raise RuntimeError('CRC failure '+bad)
 for line in sums:
  expected,name=line.split('  ',1);h=hashlib.sha256()
  with z.open(name)as f:
   for b in iter(lambda:f.read(4*1024**2),b''):h.update(b)
  if h.hexdigest()!=expected:raise RuntimeError('Archive hash failure '+name)
sha=digest(dest);dest.with_suffix('.sha256').write_text(sha+'  '+dest.name+'\n',encoding='ascii')
r={'status':'passed','UTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'archive':dest.name,'sha256':sha,'bytes':dest.stat().st_size,'files':len(sums),'CRCVerified':True,'entryHashesVerified':True,'scope':'Reorganised site, current source, tests, public loose historical records, 106 evidence and UI verification. Large historical campaign ZIPs remain separate and unchanged.'}
(BASE/'package-audit.json').write_text(json.dumps(r,indent=2)+'\n',encoding='utf8');print(json.dumps(r),flush=True)
