"""Extract published numbers from two independently typeset source tables."""
from pathlib import Path
import re,json,csv,hashlib,datetime
import pdfplumber
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'reports/v1.0.6/observations'
def rows(path,n):
 with pdfplumber.open(path)as pdf:
  pages=pdf.pages[7:9]if n==4 else pdf.pages[-1:]
  text='\n'.join(p.extract_text()or''for p in pages)
  return [[float(x)for x in m]for m in re.findall(r'^\s*'+r'\s+'.join([r'(\d+\.\d+)']*n)+r'\s*$',text,re.M)if 5<float(m[0])<26]
a=rows(OUT/'eilers-2019-source.pdf',4);b=rows(OUT/'jiao-2021-source.pdf',5)
assert len(a)==len(b)==38,(len(a),len(b))
assert a==[r[:4]for r in b],'Published sources disagree'
columns=['R_kpc','vc_km_s','stat_minus_km_s','stat_plus_km_s','jiao_fractional_systematic']
with(OUT/'eilers2019-jiao2021.csv').open('w',newline='',encoding='utf8')as f:
 w=csv.writer(f);w.writerow(columns);w.writerows(b)
sources={'Eilers2019':{'doi':'10.3847/1538-4357/aaf648','url':'https://arxiv.org/abs/1810.09466','table':'1, PDF pages 8 and 9','method':'Circular velocity inferred by axisymmetric Jeans modelling of APOGEE/WISE/2MASS/Gaia DR2 red giants, not raw stellar azimuthal speeds.','notGaiaDR3':True},'Jiao2021':{'doi':'10.1051/0004-6361/202141058','url':'https://arxiv.org/abs/2107.00014','table':'A.1, PDF page 10','method':'Reproduces Eilers points and adds a fractional systematic prescription; this is the SAME dataset, not an independent second sample.','globalScaleUncertainty':'Approximately 2 percent common velocity scale discussed separately in section2.1; covariance matrix not supplied.'}}
metadata={'schema':'observational-table-106','UTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'rows':38,'columns':columns,'crossCheck':'All 152 R/v/statistical-error entries match between original Table1 and Jiao TableA.1, exact published decimal precision.','sources':sources,'redistribution':'CSV contains numerical scientific facts transcribed from cited tables. Original article PDFs retained locally for verification; release links to official/arXiv sources rather than redistributing complete publisher works.','sourceSHA256':{p.name:hashlib.sha256(p.read_bytes()).hexdigest()for p in OUT.glob('*source.pdf')},'scope':'5.27 to24.82 kpc. No covariance supplied. Statistical asymmetry retained; no synthetic points or flat observational line.'}
(OUT/'provenance.json').write_text(json.dumps(metadata,indent=2,ensure_ascii=False)+'\n',encoding='utf8')
with pdfplumber.open(OUT/'jiao-2021-source.pdf')as pdf:pdf.pages[-1].to_image(resolution=110).save(OUT/'jiao-table-review.png')
print('Verified',len(b),'published observations against two tables')
