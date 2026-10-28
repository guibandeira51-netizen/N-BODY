"""Verify final generated archives, individual review assets and static output."""
import hashlib,json,zipfile
from pathlib import Path
root=Path(__file__).resolve().parents[1];downloads=root/'downloads';results=[]
for name in ['investigacao-0.9.0.zip','historico-experimentos.zip']:
    path=downloads/name
    with zipfile.ZipFile(path) as z:
        assert z.testzip() is None
        if name.startswith('investigacao'):
            for line in z.read('SHA256SUMS.txt').decode().splitlines():
                expected,p=line.split('  ',1)
                assert hashlib.sha256(z.read(p)).hexdigest()==expected
        results.append({'name':name,'entries':len(z.namelist()),'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'crcVerified':True})
manifest=json.loads((downloads/'review-assets.json').read_text(encoding='utf-8'))
for asset in manifest['files']:
    data=(root/asset['url']).read_bytes()
    assert len(data)==asset['bytes'] and hashlib.sha256(data).hexdigest()==asset['sha256'],asset['url']
    assert (root/'dist'/asset['url']).read_bytes()==data,asset['url']
total=sum(a['bytes'] for a in manifest['files']);assert 3*total+50000*1000<512*1024**2
result={'archives':results,'reviewFiles':len(manifest['files']),'reviewBytes':total,'estimatedReviewWithN50000Bytes':3*total+50000*1000,'defaultBudgetBytes':512*1024**2,'reviewAssetHashesVerified':True,'distMatchesSources':True}
# Keep verification outside assets to avoid modifying a file already hashed into
# the review manifest. The release JSON is a sibling of the application folder.
target=root.parent/'verificacao-artefatos-0.9.0.json';target.write_text(json.dumps(result,indent=2),encoding='utf-8');print(json.dumps(result))
