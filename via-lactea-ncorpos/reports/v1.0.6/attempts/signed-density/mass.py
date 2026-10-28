"""Integrate positive physical density in spherical shells, never impose monotonicity."""
from model import *
from numpy.polynomial.legendre import leggauss
def integrate(density,scale,edges,radial,angular,disc):
 x,w=leggauss(radial);a,b=edges[:-1],edges[1:];s=(a[:,None]+b[:,None])/2+(b-a)[:,None]*x/2;ws=(b-a)[:,None]*w/2
 u,wu=leggauss(angular);s=s.ravel();ws=ws.ravel()
 if disc:
  # sinh mapping resolves the equatorial concentration even at very large r.
  tmax=np.arcsinh(s/.03);t=(u[None,:]+1)*tmax[:,None]/2;mu=.03*np.sinh(t)/s[:,None];wm=.03*np.cosh(t)/s[:,None]*tmax[:,None]/2*wu
 else:mu=np.broadcast_to((u+1)/2,(len(s),angular));wm=np.broadcast_to(wu/2,mu.shape)
 xyz=np.c_[(s[:,None]*np.sqrt(1-mu**2)).ravel(),np.zeros(mu.size),(s[:,None]*mu).ravel()];rho=density.density(xyz).reshape(mu.shape)*scale
 negative=4*np.pi*np.sum(s**2*np.sum(np.minimum(rho,0)*wm,axis=1)*ws)
 shells=(4*np.pi*s**2*np.sum(rho*wm,axis=1)*ws).reshape(-1,radial).sum(axis=1)
 print('Density quadrature diagnostics',float(np.min(rho)),float(negative),float(np.min(shells)),flush=True)
 return np.r_[0,np.cumsum(shells)]
if __name__=='__main__':
 old=OUT/'enclosed-mass.csv';backup=OUT/'enclosed-mass-native-estimate.csv'
 if not backup.exists():backup.write_bytes(old.read_bytes())
 rows=list(csv.DictReader(old.open()));rr=np.array([float(r['r_kpc'])for r in rows]);edges=np.unique(np.r_[0,np.geomspace(1e-7,.1,50),rr]);idx=np.searchsorted(edges,rr);m=json.loads((OUT/'model.json').read_text());curves=[];errors=[]
 for i,norm in enumerate(m['numericalMassNormalization']):
  d=agama.Density(str(OLD/f'density-{i}-final.ini'));lo=integrate(d,norm,edges,24,96,i in[1,2])[idx];hi=integrate(d,norm,edges,32,160,i in[1,2])[idx];curves.append(hi);errors.append({'population':i,'maxRelativeDifference':float(max(abs(lo/hi-1))),'finalMassRelativeToAdopted':float(hi[-1]/m['componentMassesMsun'][i]-1)});print('Spherical integration',i,errors[-1],flush=True)
 mm=np.array(curves);new=[dict(r_kpc=float(r),bulge_Msun=float(mm[0,k]),thin_Msun=float(mm[1,k]),thick_Msun=float(mm[2,k]),disk_Msun=float(mm[1,k]+mm[2,k]),halo_Msun=float(mm[3,k]),total_Msun=float(sum(mm[:,k])),f_DM=float(mm[3,k]/sum(mm[:,k])))for k,r in enumerate(rr)];table('enclosed-mass.csv',new)
 dump('mass-quadrature.json',{'definition':'M_i(<r)=4pi integral_0^r s^2 ds integral_0^1 rho_i(s sqrt(1−mu²),0,s mu) dmu, using reflection symmetry.','orders':[24,96],'higherOrders':[32,160],'method':'Gauss-Legendre independently in positive spherical shells. Disk angular variable uses mu=(.03/s)sinh(t) to resolve the equator. Monotonicity follows from nonnegative density and shell integrals; no clipping, cumulative max or visual smoothing.','checks':errors,'supersededEstimate':'enclosed-mass-native-estimate.csv','normalization':'Same density normalization and adopted masses recorded in model.json; no fitted parameters changed.'})
