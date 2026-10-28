"""Supplementary reproducible scientific release; old archives untouched."""
from pathlib import Path
import zipfile,hashlib,json,datetime
ROOT=Path(__file__).resolve().parents[2];BASE=ROOT/'reports/v1.0.2';paths=set()
for folder in ['src','scripts','tests','assets','reports/v1.0.2']:
 for p in (ROOT/folder).rglob('*'):
  if p.is_file() and '__pycache__'not in p.parts and p.suffix!='.pyc'and p.name not in ['package-audit.json','SHA256SUMS.txt']:paths.add(p)
for p in ROOT.iterdir():
 if p.is_file()and p.suffix.lower()in ['.md','.html','.css','.json','.cmd']:paths.add(p)
old=ROOT/'reports/v1.0.0/agama-calibrated';manifest=json.loads((old/'snapshots.json').read_text())
for p in old.iterdir():
 if p.is_file()and not p.name.startswith('c20-agama-'):paths.add(p)
for r in manifest:
 if r['counts']in [[150,450,400],[1500,4500,4000]]and r['seed']==r['haloSeed']and r['seed']in [2026,2027,2028]:paths.add(old/r['file'])
# Check inputs needed by imported legacy and validation helpers. No downloads or
# dist recursion: previous releases remain independently available.
sums=[];destination=ROOT/'downloads/correcao-equilibrio-1.0.2.zip'
with zipfile.ZipFile(destination,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6,allowZip64=True)as z:
 for p in sorted(paths):
  rel=p.relative_to(ROOT).as_posix();sums.append(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+rel);z.write(p,rel)
 z.writestr('SHA256SUMS.txt','\n'.join(sums)+'\n')
 z.writestr('PACOTE_1_0_2.md','# Correção 1.0.2 — etapa 1 experimental\n\nCódigo, seis novos snapshots, entradas históricas necessárias, dados das 21 integrações e oito figuras. Consulte VALIDACAO_FINAL_1_0_2.md e reports/v1.0.2/REPRODUCAO.md. Este pacote complementa o projeto: os pacotes completos 0.9/1.0/1.0.1 continuam separados. B/D, refinamento e estabilidade longa ainda não validados. Não seleciona automaticamente o novo modelo.\n')
with zipfile.ZipFile(destination)as z:
 bad=z.testzip()
 if bad:raise RuntimeError('ZIP CRC failure '+bad)
 for line in sums:
  expected,path=line.split('  ',1)
  if hashlib.sha256(z.read(path)).hexdigest()!=expected:raise RuntimeError('ZIP SHA failure '+path)
digest=hashlib.sha256(destination.read_bytes()).hexdigest();destination.with_suffix('.sha256').write_text(digest+'  '+destination.name+'\n',encoding='ascii')
audit={'status':'passed','UTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'archive':destination.name,'bytes':destination.stat().st_size,'sha256':digest,'dataFiles':len(sums),'crcVerified':True,'entrySHA256Verified':True,'scope':'Stage1 supplement, historical complete releases remain separate.'}
(BASE/'package-audit.json').write_text(json.dumps(audit,indent=2)+'\n',encoding='utf8');print(json.dumps(audit))
