"""Audit spherical quadrature produced by model.py; never rewrite its curve."""
from model import *
if __name__=='__main__':
 report=json.loads((OUT/'mass-quadrature.json').read_text());rows=list(csv.DictReader((OUT/'enclosed-mass.csv').open()))
 for key in['bulge_Msun','thin_Msun','thick_Msun','halo_Msun']:
  values=np.array([float(r[key])for r in rows]);assert np.min(np.diff(values))>=0
 assert max(x['maxQuadratureRelativeDifference']for x in report['checks'])<1e-5
 print('Positive spherical shell integration and refined quadrature verified')
