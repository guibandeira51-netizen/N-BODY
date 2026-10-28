"""Stream a scientific supplement without rewriting older archives."""
from pathlib import Path
import hashlib,json,zipfile
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'reports/v1.0.1';DEST=ROOT/'downloads/validacao-1.0.1.zip'
documents=['ESTABILIDADE_E_CONSERVACAO_TCC.md','AUDITORIA_ENERGIA_1_0_1.md','EQUILIBRIO_AXISIMETRICO_1_0_1.md','CONVERGENCIA_NUMERICA_1_0_1.md','COMPARACAO_AGAMA_1_0_1.md','README.md','package.json','equilibrio.html','index.html','style.css','vercel.json','INICIAR_WINDOWS.cmd','REPRODUCAO_AGAMA_WINDOWS.md']
paths=[]
for folder in ['reports/v1.0.1','scripts','src','tests','assets']:
 paths += [p for p in (ROOT/folder).rglob('*') if p.is_file() and '__pycache__' not in p.parts and p.suffix!='.pyc' and p.name not in ['package-audit.json','release-files.json']]
paths += [ROOT/p for p in documents]
for dataset in ['agama','agama-calibrated']:
 folder=ROOT/'reports/v1.0.0'/dataset
 for item in json.loads((folder/'snapshots.json').read_text()):paths.append(folder/item['file'])
 for name in ['snapshots.json','halo-fixed-grid.json','preparation.json','potential-final.ini','continuum-profiles.json']:paths.append(folder/name)
paths.append(ROOT/'reports/v1.0.0/dependencies.json')
paths=sorted(set(paths));sums=[];DEST.parent.mkdir(exist_ok=True)
def digest(p):
 with p.open('rb') as f:return hashlib.file_digest(f,'sha256').hexdigest()
with zipfile.ZipFile(DEST,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6,allowZip64=True) as z:
 for p in paths:
  name=p.relative_to(ROOT).as_posix();z.write(p,name);sums.append(digest(p)+'  '+name)
 z.writestr('SHA256SUMS.txt','\n'.join(sums)+'\n')
 z.writestr('LEIA_PRIMEIRO_1_0_1.md','# Validação científica 1.0.1\n\nO equilíbrio estrutural da galáxia permanece NÃO VALIDADO. O domínio numérico verificado e os resultados reais estão nos cinco relatórios e reports/v1.0.1/assessment.json.\n\nEste suplemento inclui código atual, condições iniciais originais e novos resultados. Os resultados históricos continuam intactos na pasta original. Para repetir a reanálise dos dez ensaios históricos, extraia também o pacote preservado downloads/ensaios-1.0.0.zip na mesma raiz; seu hash consta no manifesto histórico de downloads. Para restaurar toda a publicação anterior, use também equilibrio-1.0.0.zip e os arquivos 0.9 preservados.\n\nA reprodução científica está em reports/v1.0.1/REPRODUCAO.md. Os dados brutos contínuos usam JSONL para as 501 épocas; os demais usam JSON/CSV. As figuras têm PNG, SVG e os valores efetivamente desenhados em CSV. Nenhum arquivo parcial ou tentativa malsucedida conta como integração concluída.\n')
sha=digest(DEST);DEST.with_suffix('.sha256').write_text(sha+'  '+DEST.name+'\n')
with zipfile.ZipFile(DEST) as z:
 bad=z.testzip()
 if bad:raise RuntimeError('ZIP CRC failure: '+bad)
audit={'file':str(DEST.relative_to(ROOT)),'sha256':sha,'bytes':DEST.stat().st_size,'entries':len(paths)+2,'zipCRC':'passed','scope':'scientific supplement; historical raw trajectories remain in separately hashed ensaios-1.0.0.zip'}
(OUT/'package-audit.json').write_text(json.dumps(audit,indent=2)+'\n');print(json.dumps(audit))
