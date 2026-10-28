"""Offline preparation with the actual AGAMA library. Never evolves/cools live ICs.

Usage: python generate_agama.py --out reports/v1.0.0/agama --counts 1500 4500 4000
Set PYTHONPATH to the compiled official AGAMA module and scipy if needed.
Uses physical kpc, km/s, Msun during preparation; exports the browser's units.
"""
from pathlib import Path
import argparse, hashlib, json, platform, sys, time, math
import numpy as np
from scipy.integrate import quad
import agama

ROOT=Path(__file__).resolve().parents[2]
KM_S_TO_INTERNAL=1000*(1e6*365.25*86400)/(1000*149597870700*648000/math.pi)
G_APP=1.3271244e20*1e10*(1e6*365.25*86400)**2/(1000*149597870700*648000/math.pi)**3
def save(path,data):
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(data,ensure_ascii=False,allow_nan=False,indent=2),encoding='utf8')
def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def plain(a):return np.asarray(a).tolist()

def build(config,out,reuse=False):
    agama.setUnits(length=1,velocity=1,mass=1)
    g_agama=float(agama.G)
    v_conversion=KM_S_TO_INTERNAL*math.sqrt(G_APP/(g_agama*1e10*KM_S_TO_INTERNAL**2))
    h=config['halo']; b=config['bulge']; disks=config['disks']
    # Integral of the SAME finite NFW profile used by the DF; no infinite-NFW DF.
    shape=lambda r: (r/h['scaleRadius'])**-1*(1+r/h['scaleRadius'])**-2*np.exp(-(r/h['cutoffRadius'])**h['cutoffStrength'])
    enclosed_shape=4*np.pi*quad(lambda r:r*r*shape(r),0,h['referenceRadius'],epsabs=1e-7,epsrel=1e-10)[0]
    norm=h['massWithinReferenceRadius']/enclosed_shape
    halo_mass=4*np.pi*quad(lambda r:r*r*shape(r)*norm,0,np.inf,epsabs=1,epsrel=1e-9)[0]
    hp=dict(type='Spheroid',gamma=1,beta=3,alpha=1,scaleRadius=h['scaleRadius'],outerCutoffRadius=h['cutoffRadius'],cutoffStrength=h['cutoffStrength'],densityNorm=norm)
    bp=dict(type='Spheroid',gamma=0,beta=b['alpha'],alpha=1,scaleRadius=b['r0'],outerCutoffRadius=b['cutoff'],cutoffStrength=2,mass=b['mass'])
    dp=[dict(type='Disk',mass=d['mass'],scaleRadius=d['radius'],scaleHeight=d['referenceExponentialHeight']) for d in disks]
    densities=[agama.Density(**bp)]+[agama.Density(**p) for p in dp]+[agama.Density(**hp)]
    initial=agama.Potential(*[agama.Potential(**p) for p in [bp]+dp+[hp]])
    targets=[b['mass']]+[d['mass'] for d in disks]+[halo_mass]
    # Freeze DFs in action space throughout SCM; frequencies are initialized once.
    dfs=[agama.DistributionFunction(type='QuasiSpherical',density=densities[0],potential=initial)]
    for d in disks:
        dfs.append(agama.DistributionFunction(type='QuasiIsothermal',potential=initial,mass=d['mass'],Rdisk=d['radius'],Hdisk=d['dfHdisk'],sigmar0=d['sigmaRsolar']*np.exp(config['solarRadius']/d['sigmaScaleRadius']),Rsigmar=d['sigmaScaleRadius'],sigmamin=1,coefJr=1,coefJz=.25))
    dfs.append(agama.DistributionFunction(type='QuasiSpherical',density=densities[-1],potential=initial))
    df_masses=[float(df.totalMass()) for df in dfs]
    if reuse:
        from types import SimpleNamespace
        audit=json.loads((out/'preparation.json').read_text(encoding='utf8'))
        profile=json.loads((out/'continuum-profiles.json').read_text(encoding='utf8'))
        pot=agama.Potential(str(out/'potential-final.ini'))
        audit['samplingSoftware']={'generatorSHA256':digest(Path(__file__)),'agama':str(agama.__version__),'numpy':np.__version__}
        if max(abs(a/b-1) for a,b in zip(df_masses,audit['dfMassesMsun']))>1e-10:raise RuntimeError('Recreated fixed DFs differ from prepared ones')
        return SimpleNamespace(potential=pot,af=agama.ActionFinder(pot)),dfs,targets,audit,profile,v_conversion
    # Numerical mass integration has finite accuracy. Do not silently rescale velocities
    # or add missing mass after solving Poisson. Record the mismatch and gate sampling.
    mass_errors=[(m/t-1) for m,t in zip(df_masses,targets)]
    audit={'config':config,'targetMassesMsun':targets,'dfMassesMsun':df_masses,'dfMassRelativeErrors':mass_errors,'finiteHaloTotalMsun':halo_mass,'haloInitialMassWithinReferenceRadiusMsun':h['massWithinReferenceRadius'],'GAgamaKpcKmS2PerMsun':g_agama,'GAppKpc3Myr2Per1e10Msun':G_APP,'velocityConversion':v_conversion,'standardKmSToInternal':KM_S_TO_INTERNAL,'gravitationalConventionVelocityFactor':v_conversion/KM_S_TO_INTERNAL,'GConvention':'single constant conversion matches nominal solar GM of historical KDK; not fitted to stability','createdUTC':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'software':{'agama':str(agama.__version__),'agamaFile':str(agama.__file__),'python':sys.version,'numpy':np.__version__,'platform':platform.platform(),'generatorSHA256':digest(Path(__file__)),'configSHA256':hashlib.sha256(json.dumps(config,sort_keys=True).encode()).hexdigest()}}
    save(out/'mass-audit-before-sampling.json',audit)
    if max(abs(x) for x in mass_errors)>0.005:
        raise RuntimeError('DF integrated mass differs >0.5% from target; preparation rejected, see audit. Numerical gate, not observational tolerance.')
    model=agama.SelfConsistentModel(**config['grids']);model.potential=initial
    component_grids=[dict(rminSph=.005,rmaxSph=25,sizeRadialSph=30,lmaxAngularSph=6)]+[dict(RminCyl=.02,RmaxCyl=60,sizeRadialCyl=25,zminCyl=.03,zmaxCyl=20,sizeVerticalCyl=20)]*2+[dict(rminSph=.02,rmaxSph=2000,sizeRadialSph=35,lmaxAngularSph=6)]
    for i,df in enumerate(dfs):model.components.append(agama.Component(df=df,density=densities[i],disklike=i in (1,2),**component_grids[i]))
    radii=np.geomspace(.1,1000,81); probe=np.vstack([np.c_[radii,0*radii,0*radii],np.c_[radii,0*radii,radii*.2]])
    last=np.asarray(initial.force(probe));logs=[]
    for it in range(config['iterations']):
        t=time.perf_counter();model.iterate();force=np.asarray(model.potential.force(probe))
        changes=np.linalg.norm(force-last,axis=1)/np.maximum(np.linalg.norm(force,axis=1),1e-30)
        logs.append({'iteration':it+1,'wallSeconds':time.perf_counter()-t,'maxRelativeForceChange':float(max(changes)),'medianRelativeForceChange':float(np.median(changes)),'gridDensityMassesMsun':[float(c.density.totalMass()) for c in model.components]})
        save(out/'iterations.json',logs);last=force
        print('SCM',logs[-1],flush=True)
    convergence=max(x['maxRelativeForceChange'] for x in logs[-2:])<=config['potentialTolerance']
    # Save actual library objects in a portable text representation where supported.
    model.potential.export(str(out/'potential-final.ini'))
    for i,c in enumerate(model.components):c.density.export(str(out/f'density-{i}-final.ini'))
    r=np.geomspace(.05,1000,128); xyz=np.c_[r,0*r,0*r]
    force=model.potential.force(xyz)
    vc=np.sqrt(-r*force[:,0]);dr=r*1e-3
    omega2=lambda R:-model.potential.force(np.c_[R,0*R,0*R])[:,0]/R
    k2=4*omega2(r)+r*(omega2(r+dr)-omega2(r-dr))/(2*dr)
    profile={'radiusKpc':plain(r),'vcInternal':plain(vc*v_conversion),'kappaPerMyr':plain(np.sqrt(np.maximum(0,k2))*v_conversion),'potentialInternal':plain(model.potential.potential(xyz)*v_conversion**2),'densityMsunKpc3':[plain(c.density.density(xyz)) for c in model.components],'enclosedMassMsun':[plain(c.density.enclosedMass(r)) for c in model.components],'sphericalMassQualification':'enclosedMass is spherical, not cylindrical; disks are flattened','iterationConverged':convergence,'iterations':logs}
    # AGAMA moments are in observed Cartesian axes; at (R,0,0), X=R,Y=phi,Z=z.
    moment_radius=np.linspace(.5,25,50);points=np.c_[moment_radius,0*moment_radius,0*moment_radius]
    moments=[]
    for df in dfs:
        rho,vel,vel2=agama.GalaxyModel(model.potential,df,model.af).moments(points,dens=True,vel=True,vel2=True)
        moments.append({'densityMsunKpc3':plain(rho),'meanVelocityXYZ':plain(vel),'secondMomentsXXYYZZXYYZZX':plain(vel2),'velocityUnit':'km/s before nominal GM conversion; at (R,0,0), XYZ corresponds to R,phi,z'})
    profile['momentRadiusKpc']=plain(moment_radius);profile['moments']=moments
    save(out/'continuum-profiles.json',profile)
    audit['iterationConverged']=convergence;audit['lastForceChange']=logs[-1]['maxRelativeForceChange'];save(out/'preparation.json',audit)
    return model,dfs,targets,audit,profile,v_conversion

def sample(model,dfs,targets,audit,profile,v_conversion,counts,seed,halo_seed,out):
    if any(n<2 or n%2 for n in counts):raise ValueError('Counts must be positive even integers for antipodal sampling')
    nb,nd,nh=counts
    thin=int(round(nd*targets[1]/sum(targets[1:3])/2))*2; thin=max(2,min(nd-2,thin))
    allocation=[nb,thin,nd-thin,nh]
    states=[];masses=[];labels=[];subpop=[];checks=[]
    for i,(df,n,M) in enumerate(zip(dfs,allocation,targets)):
        # Component-specific seeds keep the stellar realization unchanged across Nh.
        sub_seed=(halo_seed if i==3 else seed)+i*100003
        agama.setRandomSeed(sub_seed);np.random.seed(sub_seed%(2**32))
        pool=max(4096,n//2)
        xv,rawmass=agama.GalaxyModel(model.potential,df,model.af).sample(pool)
        xv=xv[np.random.permutation(pool)[:n//2]]
        if not np.isfinite(xv).all():raise RuntimeError('Non-finite phase-space sample')
        full=np.empty((n,6));full[::2]=xv;full[1::2]=-xv
        # The sampler's own mass is a Monte Carlo estimate. Use the independently
        # integrated, fixed DF mass so changing Nh/seed never changes physical M.
        total=audit['dfMassesMsun'][i];mi=np.full(n,total/n)
        actions=model.af(xv);values=np.asarray(df(actions))
        bound=.5*np.sum(xv[:,3:]**2,axis=1)+model.potential.potential(xv[:,:3])
        check={'component':i,'n':n,'seed':sub_seed,'samplePool':pool,'sampleMassMsun':total,'samplerMonteCarloMassMsun':float(np.sum(rawmass)),'normalization':'fixed independent action-space DF integral; equal M/N weights','targetMassMsun':M,'massRelativeError':total/M-1,'negativeDF':int(np.sum(values<0)),'nonFiniteDF':int(np.sum(~np.isfinite(values))),'unboundInContinuum':int(np.sum(bound>=0))*2,'DFmin':float(np.min(values)),'DFmax':float(np.max(values))}
        if check['negativeDF'] or check['nonFiniteDF'] or check['unboundInContinuum']:raise RuntimeError('DF admissibility/binding gate failed: '+str(check))
        checks.append(check);full[:,3:]*=v_conversion
        states.append(full);masses.append(mi/1e10);labels.extend([0 if i==0 else 2 if i==3 else 1]*n);subpop.extend([i]*n)
    state=np.vstack(states);m=np.concatenate(masses)
    ident=f"c20-agama-n{nb+nd+nh}-nb{nb}-nd{nd}-nh{nh}-s{seed}-h{halo_seed}"
    total_masses=[checks[0]['sampleMassMsun'],sum(x['sampleMassMsun'] for x in checks[1:3]),checks[3]['sampleMassMsun']]
    physical={'id':audit['config']['id'],'componentMassesMsun':total_masses,'componentModels':['C20 sphericalized bulge DF','AGAMA thin+thick QuasiIsothermal DFs','finite tapered NFW action DF'],'source':'MASSAS_VIA_LACTEA_1_0.md; Cautun et al. 2020 uncontracted NFW reference; explicit reduced model','reference':audit['config']['reference'],'config':audit['config'],'haloOuterRadiusKpc':None,'haloExtent':'Gaussian cutoff, noncompact support; no hard radius','initialOrbitTable':{k:profile[k] for k in ['radiusKpc','vcInternal','kappaPerMyr']}}
    meta={'method':'agama-action-df','initialization':'AGAMA real: QuasiIsothermal + QuasiSpherical, SCM','equilibriumValidated':False,'qualification':'Candidate; successful DF preparation is not N-body stability validation','realizationId':ident,'withHalo':True,'seed':seed,'haloSeed':halo_seed,'counts':counts,'subpopulationCounts':allocation,'quietStart':'antipodal (x,v) -> (-x,-v), independent pairs; N/2 independent draws','physicalModel':physical,'preparation':{'software':audit['software'],'samplingSoftware':audit.get('samplingSoftware',audit['software']),'iterationConverged':audit['iterationConverged'],'admissibility':checks},'units':'kpc,Myr,1e10 nominal Msun','gravityConventionFactor':v_conversion/KM_S_TO_INTERNAL}
    physical['preparationPotentialSHA256']=digest(out/'potential-final.ini')
    meta['realizationId']=ident+'-p'+physical['preparationPotentialSHA256'][:12]
    result={'schema':'nbody-initial-v2','units':'kpc,Myr,1e10 nominal Msun','n':len(m),'positions':plain(state[:,:3].ravel()),'velocities':plain(state[:,3:].ravel()),'masses':plain(m),'components':labels,'subpopulations':subpop,'meta':meta}
    path=out/(ident+'.json');save(path,result)
    return {'id':ident,'file':path.name,'sha256':digest(path),'n':len(m),'counts':counts,'seed':seed,'haloSeed':halo_seed,'admissibility':checks,'status':'candidate-not-validated'}

def main():
    p=argparse.ArgumentParser();p.add_argument('--config',type=Path,default=Path(__file__).with_name('model-c20.json'));p.add_argument('--out',type=Path,required=True);p.add_argument('--counts',nargs=3,type=int,default=[1500,4500,4000]);p.add_argument('--seed',type=int,default=2026);p.add_argument('--halo-seed',type=int,default=2026);p.add_argument('--suite',action='store_true');p.add_argument('--reuse-prepared',action='store_true');p.add_argument('--threads',type=int,default=4)
    a=p.parse_args();out=a.out.resolve();out.mkdir(parents=True,exist_ok=True);config=json.loads(a.config.read_text(encoding='utf8'))
    with agama.setNumThreads(a.threads):
        model,dfs,targets,audit,profile,conversion=build(config,out,a.reuse_prepared)
        runs=[(a.counts,a.seed,a.halo_seed)] if not a.suite else [([1500,4500,nh],s,h) for nh in [4000,8000,20000] for s,h in [(2026,2026),(2026,2027),(2027,2027)]]+[([7500,22500,20000],2026,2026)]
        old_manifest=json.loads((out/'snapshots.json').read_text(encoding='utf8')) if a.reuse_prepared and not a.suite and (out/'snapshots.json').exists() else []
        manifest=[]
        for counts,s,h in runs:
            manifest.append(sample(model,dfs,targets,audit,profile,conversion,counts,s,h,out));merged=[x for x in old_manifest if x['id'] not in {m['id'] for m in manifest}]+manifest;save(out/'snapshots.json',merged);print(manifest[-1]['id'],flush=True)

if __name__=='__main__':main()
