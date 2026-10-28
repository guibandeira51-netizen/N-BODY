"""Solve f_i(J[Phi_eps]) -> rho_i -> Plummer mean Phi_eps, then sample.

The original action-space DFs and their independently integrated masses are
held fixed. The native AGAMA SCM step supplies physical DF density estimates;
its Newtonian output potential is then convolved before the NEXT DF evaluation.
Setting scm.potential invalidates the native action finder (verified in AGAMA
interface_python.cpp); no DF iteration ever proceeds in the discarded field.
This is initialization only. No evolved velocity, height or stability objective
enters this solver. The previous density/kinematic priors are compared explicitly.
"""
from pathlib import Path
from types import SimpleNamespace
import argparse,hashlib,json,sys,time,platform
import numpy as np
import agama
from plummer_mean import soften_native,PlummerMean
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'scripts/equilibrium'))
from generate_agama import build,sample,save,plain,digest

def grid_stats(pot,densities,conversion):
    from scipy.integrate import cumulative_trapezoid
    r=np.geomspace(.05,1000,128);xyz=np.c_[r,0*r,0*r];f=pot.force(xyz);h=r*1e-3
    omega=lambda R:-pot.force(np.c_[R,0*R,0*R])[:,0]/R
    k2=4*omega(r)+r*(omega(r+h)-omega(r-h))/(2*h)
    prof={'radiusKpc':plain(r),'vcInternal':plain(np.sqrt(np.maximum(0,-r*f[:,0]))*conversion),'kappaPerMyr':plain(np.sqrt(np.maximum(0,k2))*conversion),'potentialInternal':plain(pot.potential(xyz)*conversion**2),'densityMsunKpc3':[plain(d.density(xyz)) for d in densities],'enclosedMassMsun':[plain(d.enclosedMass(r)) for d in densities],'densityConvention':'Physical DF density, not effective Poisson density W_eps*rho.'}
    heights=np.r_[0,np.geomspace(1e-4,50,800)]
    at=np.c_[np.full(len(heights),8.122),np.zeros(len(heights)),heights]
    stats=[]
    for i,d in enumerate(densities):
        rho=d.density(at);integral=cumulative_trapezoid(rho,heights,initial=0)
        stats.append({'population':i,'medianAbsZAtSolarKpc':float(np.interp(integral[-1]/2,integral,heights)),'solarSurfaceDensityMsunKpc2':float(2*integral[-1]),'gridDensityTotalMassMsun':float(d.totalMass())})
    prof['solarPopulationDensity']=stats
    return prof

def main():
    p=argparse.ArgumentParser();p.add_argument('--out',type=Path,default=ROOT/'reports/v1.0.2/corrected');p.add_argument('--epsilon',type=float,default=.1);p.add_argument('--iterations',type=int,default=14);p.add_argument('--threads',type=int,default=4);p.add_argument('--counts',nargs=3,type=int,default=[150,450,400]);p.add_argument('--seeds',nargs='+',type=int,default=[2026,2027,2028]);p.add_argument('--resume',action='store_true');p.add_argument('--sample-only',action='store_true');args=p.parse_args();out=args.out.resolve();out.mkdir(parents=True,exist_ok=True)
    original=ROOT/'reports/v1.0.0/agama-calibrated';cfg=json.loads((original/'preparation.json').read_text())['config'];start=time.perf_counter()
    with agama.setNumThreads(args.threads):
        old,dfs,targets,audit,oldprofile,conversion=build(cfg,original,True)
        original_masses=list(audit['dfMassesMsun']);source_dens=[agama.Density(str(original/f'density-{i}-final.ini')) for i in range(4)]
        component_grids=[dict(rminSph=.005,rmaxSph=25,sizeRadialSph=30,lmaxAngularSph=6)]+[dict(RminCyl=.02,RmaxCyl=60,sizeRadialCyl=25,zminCyl=.03,zmaxCyl=20,sizeVerticalCyl=20)]*2+[dict(rminSph=.02,rmaxSph=2000,sizeRadialSph=35,lmaxAngularSph=6)]
        if args.resume and (out/'iterations.json').exists():
            trace=json.loads((out/'iterations.json').read_text());current=agama.Potential(str(out/'potential-final.ini'));dens=[agama.Density(str(out/f'density-{i}-final.ini')) for i in range(4)]
        else:
            trace=[];current,_=soften_native(agama,old.potential,args.epsilon);dens=source_dens
        scm=agama.SelfConsistentModel(**cfg['grids']);scm.potential=current
        for i,df in enumerate(dfs):scm.components.append(agama.Component(df=df,density=dens[i],disklike=i in (1,2),**component_grids[i]))
        R,z=np.meshgrid([.1,.25,.5,1,2,4,6,8.122,10,12,16,20],[0,.05,.1,.2,.5,1,2]);disc_probe=np.c_[R.ravel(),0*R.ravel(),z.ravel()]
        radii=np.geomspace(.1,1000,81);global_probe=np.vstack([np.c_[radii,0*radii,0*radii],np.c_[radii,0*radii,.2*radii]])
        probe=np.vstack([disc_probe,global_probe]);streak=0;last=current.force(probe)
        save(out/'protocol.json',{'schema':'softened-scm-protocol-102','createdBeforeFreeEvolution':True,'epsilonKpc':args.epsilon,'fixedDFDefinition':'Original calibrated functions f_i(J), with original action-space masses and observational priors; actions recomputed in the iterated softened potential.','closure':'rho_i=integral f_i(J[Phi_eps]) d3v; Phi_eps=W_eps*Phi_Newton[sum rho_i]','sourceConfig':cfg,'sourcePotentialSHA256':digest(original/'potential-final.ini'),'originalDFMassesMsun':original_masses,'numericalConvergenceTolerance':cfg['potentialTolerance'],'quadratureOrders':[24,8,16],'qualification':'SCM numerical tolerance is not a structural-stability acceptance threshold.'})
        for it in range(len(trace),len(trace) if args.sample_only else args.iterations):
            t=time.perf_counter();scm.potential=current;scm.iterate()
            # Densities have just been evaluated in current (softened) Phi.
            # Do not feed scm.potential (Newtonian) into another DF update.
            newtonian=scm.potential;dens=[c.density for c in scm.components]
            corrected,ops=soften_native(agama,newtonian,args.epsilon)
            f=corrected.force(probe);err=np.linalg.norm(f-last,axis=1)/np.maximum(np.linalg.norm(f,axis=1),1e-20)
            row={'iteration':it+1,'wallSeconds':time.perf_counter()-t,'maxRelativeForceChange':float(max(err)),'medianRelativeForceChange':float(np.median(err)),'maxDiscRelativeForceChange':float(max(err[:len(disc_probe)])),'gridDensityMassesMsun':[float(d.totalMass()) for d in dens],'DFMassesMsun':original_masses};trace.append(row)
            current=corrected;last=f;current.export(str(out/'potential-final.ini'));newtonian.export(str(out/'physical-density-newtonian.ini'))
            for i,d in enumerate(dens):d.export(str(out/f'density-{i}-final.ini'))
            save(out/'iterations.json',trace);print('SOFTENED SCM',row,flush=True)
            streak=streak+1 if max(err)<cfg['potentialTolerance'] else 0
            if streak>=2:break
        converged=len(trace)>=2 and max(x['maxRelativeForceChange'] for x in trace[-2:])<cfg['potentialTolerance']
        profile=grid_stats(current,dens,conversion);profile['iterationConverged']=converged;profile['iterations']=trace;save(out/'continuum-profiles.json',profile)
        # Masses of f(J) are invariant because its coefficients never changed.
        if not np.array_equal(np.asarray([d.totalMass() for d in dfs]),np.asarray(original_masses)):raise RuntimeError('Action-space DF masses changed')
        audit['legacyPreparation']=dict(config=audit['config'],software=audit['software'],iterationConverged=audit['iterationConverged'])
        audit['config']=dict(cfg,id='C20-NFW-plummer-mean-v1-eps'+str(args.epsilon),method='Fixed action DFs + Plummer mean-field self-consistent iteration')
        audit['software']={'agama':str(agama.__version__),'python':sys.version,'numpy':np.__version__,'platform':platform.platform(),'generatorSHA256':digest(Path(__file__)),'operatorSHA256':digest(Path(__file__).with_name('plummer_mean.py'))}
        audit['samplingSoftware']=audit['software'];audit['iterationConverged']=converged;audit['lastForceChange']=trace[-1]['maxRelativeForceChange'];audit['softeningKpc']=args.epsilon;audit['wallSeconds']=time.perf_counter()-start
        audit['qualification']='New softened-mean action-DF candidate. Numerical fixed-point convergence and physical density fidelity must be checked separately; no equilibrium certification on import.';save(out/'preparation.json',audit)
        if not converged:raise RuntimeError('Softened SCM not converged; snapshots NOT admitted. Resume the same fixed DFs or inspect residuals.')
        model=SimpleNamespace(potential=current,af=agama.ActionFinder(current));manifest=[]
        old_manifest=json.loads((out/'snapshots.json').read_text()) if (out/'snapshots.json').exists() else []
        for seed in args.seeds:
            row=sample(model,dfs,targets,audit,profile,conversion,args.counts,seed,seed,out)
            path=out/row['file'];data=json.loads(path.read_text());data['meta']['initialization']='AGAMA action DF in self-consistent Plummer mean field';data['meta']['softenedMean']={'epsilonKpc':args.epsilon,'protocol':'protocol.json','converged':converged,'densityConvention':'physical DF density; Poisson density is convolved','evolution':'Unmodified pairwise Plummer KDK; no cooling or live correction'};save(path,data);row['sha256']=digest(path);manifest.append(row);print('SNAPSHOT',row['file'],flush=True)
        save(out/'snapshots.json',[r for r in old_manifest if r['file'] not in {x['file'] for x in manifest}]+manifest)
        points=np.c_[np.linspace(.5,20,24),np.zeros((24,2))];moments=[]
        for df in dfs:
            rho,v,v2=agama.GalaxyModel(current,df,model.af).moments(points,dens=True,vel=True,vel2=True);moments.append({'densityMsunKpc3':plain(rho),'meanXYZKmS':plain(v),'secondMoments':plain(v2)})
        save(out/'kinematic-moments.json',{'radiusKpc':plain(points[:,0]),'populations':moments,'velocityConvention':'AGAMA km/s, multiply by same nominal-G conversion for exported browser velocities'})
        print('COMPLETED',time.perf_counter()-start,'seconds',flush=True)

if __name__=='__main__':main()
