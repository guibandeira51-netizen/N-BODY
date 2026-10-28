from decimal import Decimal as D, localcontext
from pathlib import Path
import json
root=Path(__file__).resolve().parents[1];base=root/'reports/energy-audit'
r=json.loads((base/'precision-input.json').read_text()); p=list(map(D.from_float,r['positions']));v=list(map(D.from_float,r['velocities']));m=list(map(D.from_float,r['masses']));g=D.from_float(r['G']);eps=D.from_float(r['epsilonSquared'])
with localcontext() as c:
 c.prec=80
 K=sum(m[i]*sum(v[3*i+k]**2 for k in range(3))/2 for i in range(len(m)))
 U=sum(-g*m[i]*m[j]/(sum((p[3*i+k]-p[3*j+k])**2 for k in range(3))+eps).sqrt() for i in range(len(m)) for j in range(i+1,len(m)))
 E=K+U; result={'schema':'stored-binary64-decimal80-calibration','n':len(m),'decimalDigits':80,'inputConvention':'Decimal.from_float: exact binary64 inputs, including stored epsilonSquared, not decimal reparsing of physical parameters.','reference':{'K':str(K),'U':str(U),'E':str(E)},'errors':{}}
 for key,truth in [('kinetic',K),('potential',U),('energy',E)]:
  got=D.from_float(r['result'][key]);result['errors'][key]={'absolute':float(abs(got-truth)),'relative':float(abs((got-truth)/truth))}
 result['scope']='Empirical calibration on this 96-body snapshot; not a formal error enclosure for arbitrary N, positions, cancellation, underflow, or Float32 trajectory integration.'
 (base/'precision-calibration.json').write_text(json.dumps(result,indent=2),encoding='utf-8');print(json.dumps(result))
