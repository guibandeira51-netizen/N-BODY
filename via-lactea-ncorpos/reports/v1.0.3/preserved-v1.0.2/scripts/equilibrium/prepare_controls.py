"""After generate_agama.py: export the converged halo, test interpolation,
create a controlled local Gaussian contrast, integrate frozen-field orbits.
No outcome-dependent velocity adjustment or cooling is performed.
"""
from pathlib import Path
import argparse, json, time, hashlib, math
import numpy as np
from scipy.spatial import cKDTree
import agama
from generate_agama import save,plain,KM_S_TO_INTERNAL,G_APP

def hermite(t,pos):
    R=np.hypot(pos[:,0],pos[:,1]);z=np.abs(pos[:,2]);u=np.log1p(R/t['rscale'])/t['du'];v=np.log1p(z/t['zscale'])/t['dv']
    i=np.minimum(t['nu']-2,u.astype(int));j=np.minimum(t['nv']-2,v.astype(int));a=u-i;b=v-j
    H=lambda x:np.array([2*x**3-3*x*x+1,-2*x**3+3*x*x,x**3-2*x*x+x,x**3-x*x])
    D=lambda x:np.array([6*x*x-6*x,-6*x*x+6*x,3*x*x-4*x+1,3*x*x-2*x])
    ha,hb,da,db=H(a),H(b),D(a),D(b);values=np.array(t['values']).reshape(t['nu'],t['nv'],4)
    phi=np.zeros(len(pos));du=phi.copy();dv=phi.copy()
    for p in range(4):
        for q in range(4):
            f=values[i+p%2,j+q%2,(p>=2)+2*(q>=2)]*(t['du'] if p>=2 else 1)*(t['dv'] if q>=2 else 1)
            phi+=ha[p]*hb[q]*f;du+=da[p]*hb[q]*f/t['du'];dv+=ha[p]*db[q]*f/t['dv']
    fr=-du/(R+t['rscale']);fz=-np.sign(pos[:,2])*dv/(z+t['zscale']);return phi,np.c_[fr*pos[:,0]/R,fr*pos[:,1]/R,fz]

def grid(out,audit):
    agama.setUnits(length=1,velocity=1,mass=1)
    conversion=audit['velocityConversion'];den=agama.Density(str(out/'density-3-final.ini'));pot=agama.Potential(type='Multipole',density=den,lmax=6,rmin=.005,rmax=2000,gridSizeR=60)
    nu=257;nv=257;du=np.log1p(1e5/.1)/(nu-1);dv=np.log1p(1e5/.03)/(nv-1);u=np.arange(nu)*du;v=np.arange(nv)*dv
    R=np.expm1(u)*.1;z=np.expm1(v)*.03;xx,zz=np.meshgrid(R,z,indexing='ij');pts=np.c_[xx.ravel(),0*xx.ravel(),zz.ravel()]
    f=pot.force(pts);phi=pot.potential(pts);dU=-f[:,0]*(pts[:,0]+.1);dV=-f[:,2]*(pts[:,2]+.03)
    step=1e-5;plus=pts.copy();minus=pts.copy();plus[:,2]=.03*np.expm1(np.repeat(v[None,:]+step,nu,axis=0).ravel());minus[:,2]=.03*np.expm1(np.repeat(v[None,:]-step,nu,axis=0).ravel())
    cross=-(pot.force(plus)[:,0]-pot.force(minus)[:,0])/(2*step)*(pts[:,0]+.1)
    values=np.c_[phi,dU,dV,cross]*conversion**2
    table={'schema':'axisymmetric-potential-hermite-v1','modelId':audit['config']['id'],'nu':nu,'nv':nv,'du':float(du),'dv':float(dv),'rscale':.1,'zscale':.03,'massInternal':float(den.totalMass()/1e10),'values':plain(values.ravel()),'softening':0,'qualification':'Fixed axisymmetric density of converged action-DF halo; no response, no particle granularity; unsoftened Newtonian mean versus live Plummer field is an explicit confound.'}
    rng=np.random.default_rng(20261015);n=4000;rr=np.exp(rng.uniform(np.log(.02),np.log(2000),n));ct=rng.uniform(-1,1,n);pt=np.c_[rr*np.sqrt(1-ct*ct),rr*0,rr*ct]
    pp,ff=hermite(table,pt);truth=pot.force(pt)*conversion**2;rel=np.linalg.norm(ff-truth,axis=1)/np.linalg.norm(truth,axis=1);q=np.abs(pp/(pot.potential(pt)*conversion**2)-1)
    table['validation']={'seed':20261015,'testPoints':n,'radiusRangeKpc':[.02,2000],'forceRelativePercentiles':plain(np.quantile(rel,[.5,.9,.99,1])),'potentialRelativePercentiles':plain(np.quantile(q,[.5,.9,.99,1])),'reference':'actual AGAMA final-halo Multipole evaluated at independent random meridional positions','GmatchFactor':conversion/KM_S_TO_INTERNAL}
    save(out/'halo-fixed-grid.json',table)
    save(out/'halo-grid-validation-points.json',{'positions':plain(pt),'acceleration':plain(truth),'potential':plain(pot.potential(pt)*conversion**2)})
    return table['validation']

def gaussian(out,snapshot):
    d=json.loads(snapshot.read_text(encoding='utf8'));pos=np.array(d['positions']).reshape(-1,3);vel=np.array(d['velocities']).reshape(-1,3);labels=np.array(d['components']);rng=np.random.default_rng(2026+9010);new=np.empty_like(vel);stats=[]
    # Fix every position and particle mass. Replace local empirical phase-space
    # shape with a Gaussian full covariance. This is a contrast, not GALIC/Jeans.
    for c in range(3):
        ids=np.flatnonzero(labels==c)[::2];x=pos[ids];v=vel[ids];R=np.hypot(x[:,0],x[:,1]);cp=x[:,0]/R;sp=x[:,1]/R
        cyl=np.c_[v[:,0]*cp+v[:,1]*sp,-v[:,0]*sp+v[:,1]*cp,v[:,2]]
        # Dimensionless logarithmic meridional distance; prescription retained.
        coordinate=np.c_[np.log1p(R),np.arcsinh(np.abs(x[:,2])/.3)]
        _,neighbors=cKDTree(coordinate).query(coordinate,k=min(64,len(ids)))
        for row,i in enumerate(ids):
            local=cyl[neighbors[row]].copy();local[:,2]*=np.sign(x[row,2])*np.sign(x[neighbors[row],2])
            mean=local.mean(axis=0);cov=np.cov(local,rowvar=False);vals,vec=np.linalg.eigh(cov)
            if min(vals)<-1e-12:raise RuntimeError('Invalid Gaussian covariance')
            draw=mean+vec@(np.sqrt(np.maximum(vals,0))*rng.standard_normal(3))
            new[i]=[draw[0]*cp[row]-draw[1]*sp[row],draw[0]*sp[row]+draw[1]*cp[row],draw[2]];new[i+1]=-new[i]
        stats.append({'component':c,'independentPairs':len(ids),'neighbours':min(64,len(ids))})
    p=agama.Potential(str(out/'potential-final.ini'));audit=json.loads((out/'preparation.json').read_text());conv=audit['velocityConversion'];energy=.5*np.sum((new/conv)**2,axis=1)+p.potential(pos)
    d['velocities']=plain(new.ravel());d['meta']['method']='same-density-gaussian-control';d['meta']['realizationId']+='-gaussian';d['meta']['initialization']='Local full-covariance Gaussian contrast at identical positions/masses';d['meta']['gaussianControl']={'seed':11036,'statistics':stats,'unboundUnclipped':int(np.sum(energy>=0)),'qualification':'Empirical local Gaussian approximation, 64 independent neighbour pairs in (log1p R,asinh |z|/.3). Not the historical Jeans initializer; tests velocity-shape/correlation changes, not an isolated causal attribution of every legacy error.'}
    save(snapshot.with_name(snapshot.stem+'-gaussian.json'),d)

def frozen_orbits(out,snapshot):
    data=json.loads(snapshot.read_text());audit=json.loads((out/'preparation.json').read_text());conv=audit['velocityConversion'];xv=np.c_[np.array(data['positions']).reshape(-1,3),np.array(data['velocities']).reshape(-1,3)/conv]
    potential=agama.Potential(str(out/'potential-final.ini'));t0=time.perf_counter()
    # One orbit per antipodal pair; reflection is an exact symmetry of this field.
    result=agama.orbit(potential=potential,ic=xv[::2],time=1000*conv,trajsize=501,accuracy=1e-9,dtype=float)
    records=[]
    for T,index in [(0,0),(20,10),(200,100),(1000,500)]:
        phase=np.vstack([r[1][index] for r in result]);full=np.empty_like(xv);full[::2]=phase;full[1::2]=-phase;full[:,3:]*=conv
        record={'schema':'nbody-frozen-state-v1','units':data['units'],'timeMyr':T,'n':data['n'],'positions':plain(full[:,:3].ravel()),'velocities':plain(full[:,3:].ravel()),'accelerations':plain((potential.force(full[:,:3])*conv**2).ravel()),'specificPotential':plain(potential.potential(full[:,:3])*conv**2),'masses':data['masses'],'components':data['components'],'meta':data['meta']}
        path=out/f'{snapshot.stem}-frozen-{T}.json';save(path,record);records.append({'timeMyr':T,'file':path.name,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
    save(out/(snapshot.stem+'-frozen-protocol.json'),{'schema':'frozen-orbit-control-v1','snapshot':snapshot.name,'records':records,'wallSeconds':time.perf_counter()-t0,'integrator':'AGAMA orbit, adaptive DOP853, accuracy=1e-9, unsoftened frozen TOTAL converged potential; not a self-gravitating KDK run','timeConversion':conv,'trajsize':501,'seeds':data['meta']['seed'],'qualification':'Tests action-DF stationarity in its own continuum field; excludes live self-response and granularity of all components. Cannot substitute for free N-body tests.'})

def main():
    p=argparse.ArgumentParser();p.add_argument('--out',type=Path,required=True);p.add_argument('--threads',type=int,default=4);p.add_argument('--skip-frozen',action='store_true');a=p.parse_args();out=a.out.resolve();audit=json.loads((out/'preparation.json').read_text());agama.setUnits(length=1,velocity=1,mass=1)
    with agama.setNumThreads(a.threads):
        print('grid validation',grid(out,audit),flush=True)
        paths=[out/'c20-agama-n10000-nb1500-nd4500-nh4000-s2026-h2026.json',out/'c20-agama-n10000-nb1500-nd4500-nh4000-s2027-h2027.json']
        gaussian(out,paths[0]);print('Gaussian contrast prepared',flush=True)
        if not a.skip_frozen:
            for path in paths:frozen_orbits(out,path);print('frozen',path.name,flush=True)

if __name__=='__main__':main()
