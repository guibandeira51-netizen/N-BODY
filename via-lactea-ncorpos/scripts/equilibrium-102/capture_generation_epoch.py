"""Preserve the first running generator epoch before CLI-only extensions.

During its first execution --sample-only and manifest merging were added to the
file on disk. Python had already loaded the earlier main function. Reconstruct
those three documented CLI/manifest-only changes, preserving the exact numerical
iteration and operator that actually ran. No numerical result is regenerated.
"""
from pathlib import Path
import hashlib,json,shutil
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'reports/v1.0.2/generation-epoch-0';OUT.mkdir(exist_ok=True)
path=Path(__file__).with_name('generate_softened.py');text=path.read_text()
old=text.replace("p.add_argument('--sample-only',action='store_true');",'')
old=old.replace('range(len(trace),len(trace) if args.sample_only else args.iterations)','range(len(trace),args.iterations)')
old=old.replace("        old_manifest=json.loads((out/'snapshots.json').read_text()) if (out/'snapshots.json').exists() else []\n",'')
old=old.replace("save(out/'snapshots.json',[r for r in old_manifest if r['file'] not in {x['file'] for x in manifest}]+manifest)","save(out/'snapshots.json',manifest)")
if old==text or 'sample_only' in old:raise RuntimeError('Unexpected generator source; do not guess an execution epoch')
(OUT/'generate_softened.py').write_text(old,encoding='utf8',newline='\n')
for src in [path.with_name('plummer_mean.py'),ROOT/'scripts/equilibrium/generate_agama.py',ROOT/'scripts/equilibrium/model-c20-calibrated.json']:
 shutil.copy2(src,OUT/src.name)
files={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in OUT.iterdir() if p.is_file()}
(OUT/'identity.json').write_text(json.dumps({'files':files,'qualification':'First generation loaded before sample-only/manifest-merging CLI extension. Iteration/operator numerical code identical. Subsequent sample-only calls execute current source and preserve their separate hashes.'},indent=2))
print('Generation numerical epoch preserved',files['generate_softened.py'])
