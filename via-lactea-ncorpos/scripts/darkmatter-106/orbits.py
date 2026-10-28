"""Matched test-particle counterfactual, independently checked by KDK."""
from model import *
from scipy.signal import find_peaks
from scipy.integrate import cumulative_trapezoid
if __name__=='__main__':
 start=time.perf_counter();pots=load_model();models=[agama.Potential(*pots[:3]),agama.Potential(*pots)];labels=['baryons','halo'];conv=1.0227121650537077e-3;duration=1200.;times=np.arange(0,duration+1);ics=[];names=[]
 for R in[5,8.122,15,22]:
  vc=np.sqrt(-R*models[1].force([R,0,0])[0]);ics.append([R,0,0,0,.9*vc,0]);names.append(f'R{R:g}')
 vc=np.sqrt(-8.122*models[1].force([8.122,0,0])[0]);ics.append([8.122,0,.3,12,.9*vc,18]);names.append('solar-inclined')
 ic=np.array(ics);protocol={'durationMyr':duration,'outputCadenceMyr':1,'integrator':'AGAMA DOP853 Float64 accuracy1e-10','verification':'DOP853 accuracy1e-12 plus independent KDK dt0.05 and0.025Myr, all same initial vectors','initialConditionsKmS':ics,'initialIds':names,'timeConversionKmSToKpcMyr':conv,'potentialHashes':json.loads((OUT/'model.json').read_text())['potentialSHA256'],'qualification':'Smooth fixed fields; zero test-particle self gravity; removing halo is a force counterfactual, not a self-consistent galaxy without DM. No velocity adjustment between potentials.'};dump('orbit-protocol.json',protocol)
 allruns=[];csvrows=[]
 with agama.setNumThreads(4):
  for label,pot in zip(labels,models):
   outputs=agama.orbit(potential=pot,ic=ic,time=duration*conv,trajsize=len(times),accuracy=1e-10,dtype=float,separateTime=False)
   tighter=agama.orbit(potential=pot,ic=ic,time=duration*conv,trajsize=len(times),accuracy=1e-12,dtype=float,separateTime=False)
   curves=np.array([o[1]for o in outputs]);ref=np.array([o[1]for o in tighter]);kdkchecks=[]
   for dt in[.05,.025]:
    h=dt*conv;q=ic[:,:3].copy();v=ic[:,3:].copy();a=pot.force(q);sample=[q.copy()];maxe=np.zeros(len(ic));e0=.5*np.sum(v*v,axis=1)+pot.potential(q)
    for k in range(round(duration/dt)):
     v+=.5*h*a;q+=h*v;a=pot.force(q);v+=.5*h*a
     if(k+1)%round(1/dt)==0:
      sample.append(q.copy());energy=.5*np.sum(v*v,axis=1)+pot.potential(q);maxe=np.maximum(maxe,abs((energy-e0)/e0))
    sampled=np.array(sample).transpose(1,0,2);kdkchecks.append({'dtMyr':dt,'positionReference':'DOP853 accuracy1e-12','maxPositionDifferenceKpcByOrbit':np.max(np.linalg.norm(sampled-ref[:,:,:3],axis=2),axis=1).tolist(),'maxSampledRelativeEnergyErrorByOrbit':maxe.tolist()})
   for j,name in enumerate(names):
    q=curves[j,:,:3];v=curves[j,:,3:];r=np.linalg.norm(q,axis=1);speed=np.linalg.norm(v,axis=1);energy=.5*speed**2+pot.potential(q);L=np.cross(q,v);normL=max(np.linalg.norm(L[0]),1e-30);emax=float(max(abs((energy-energy[0])/energy[0])));lzmax=float(max(abs(L[:,2]-L[0,2]))/max(abs(L[0,2]),1e-30));angle=np.unwrap(np.arctan2(q[:,1],q[:,0]));turnangles=np.arange(2*np.pi,angle[-1]+1e-12,2*np.pi);turns=np.interp(turnangles,angle-angle[0],times).tolist();periods=np.diff([0,*turns]);peaks=find_peaks(r,prominence=1e-5)[0];valleys=find_peaks(-r,prominence=1e-5)[0];record={'id':name,'field':label,'initialState':ics[j],'timesMyr':times.tolist(),'states':curves[j].tolist(),'rKpc':r.tolist(),'speedKmS':speed.tolist(),'specificEnergyKm2S2':energy.tolist(),'LzKpcKmS':L[:,2].tolist(),'summary':{'initialSpecificEnergyKm2S2':float(energy[0]),'boundByEnergy':bool(energy[0]<0),'sampledRminKpc':float(min(r)),'sampledRmaxKpc':float(max(r)),'pericentreKpc':float(np.mean(r[valleys]))if len(valleys)else None,'apocentreKpc':float(np.mean(r[peaks]))if len(peaks)and energy[0]<0 else None,'pericentreEvents':len(valleys),'apocentreEvents':len(peaks),'completedAzimuthTurns':len(turns),'measuredMeanAzimuthPeriodMyr':float(np.mean(periods))if len(periods)else None,'maxSampledRelativeEnergyError':emax,'maxRelativeLzError':lzmax,'maxPositionDifferenceTighterDOP853Kpc':float(np.max(np.linalg.norm(q-ref[j,:,:3],axis=1))),'independentKDK':[{**c,'orbitIndex':j}for c in kdkchecks],'extremaQualification':'Radial extrema of spherical galactocentric distance detected on1Myr samples; null means not observed/undefined. This is not an analytic apsis solver. Azimuth period uses completed turns, not partial-angle extrapolation.'}}
    allruns.append(record)
    for k,t in enumerate(times):csvrows.append(dict(orbit=name,field=label,time_Myr=float(t),x_kpc=float(q[k,0]),y_kpc=float(q[k,1]),z_kpc=float(q[k,2]),vx_km_s=float(v[k,0]),vy_km_s=float(v[k,1]),vz_km_s=float(v[k,2]),r_kpc=float(r[k]),speed_km_s=float(speed[k]),specific_energy_km2_s2=float(energy[k]),Lz_kpc_km_s=float(L[k,2])))
   print('Orbits complete',label,flush=True)
 dump('orbits.json',{'schema':'matched-orbits-106','protocol':protocol,'runs':allruns,'wallSeconds':time.perf_counter()-start});table('orbits.csv',csvrows);print('Orbit experiment complete',time.perf_counter()-start,flush=True)
