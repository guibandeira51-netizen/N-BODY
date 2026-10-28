"""Independent Python/NumPy audit: no production physics function is imported.
Uses adaptive Simpson quadrature of the declared density, analytic metric
derivatives, RK4 and KDK written here, and numpy.linalg.eigh for plane fits.
"""
import json, math, pathlib, csv, hashlib
import numpy as np
F=pathlib.Path(__file__).resolve().parent
d=json.loads((F/'inputs.json').read_text(encoding='utf-8'))
C=d['constants']; P=C['MODEL']; G=C['G']; rs=P['haloScale']; ms=P['haloMassScale']; c=C['LIGHT_SPEED']; r200=C['R200']; outer=C['HALO_OUTER_RADIUS']
def quad(f,a,b,tol=2e-11):
    if b<=a:return 0.
    m=(a+b)/2;fa,fm,fb=f(a),f(m),f(b);whole=(b-a)*(fa+4*fm+fb)/6
    def rec(a,b,fa,fm,fb,s,tol,depth):
        m=(a+b)/2;l=(a+m)/2;r=(m+b)/2;fl,fr=f(l),f(r);sl=(m-a)*(fa+4*fl+fm)/6;sr=(b-m)*(fm+4*fr+fb)/6
        if depth<=0 or abs(sl+sr-s)<=15*tol:return sl+sr+(sl+sr-s)/15
        return rec(a,m,fa,fl,fm,sl,tol/2,depth-1)+rec(m,b,fm,fr,fb,sr,tol/2,depth-1)
    return rec(a,b,fa,fm,fb,whole,tol,24)
def taper(s):
    if s>=outer:return 0.
    if s<=r200:return 1.
    u=(s-r200)/(outer-r200);return 1-10*u**3+15*u**4-6*u**5
def shell_mass(s):return ms*s/rs**2/(1+s/rs)**2*taper(s)
def shell_potential(s):return ms/rs**2/(1+s/rs)**2*taper(s)
def integrate(f,a,b):
    edges=sorted(set([a,b]+[x for x in [rs,r200,outer] if a<x<b]));return math.fsum(quad(f,x,y) for x,y in zip(edges,edges[1:]))
def mass_density(r):return integrate(shell_mass,0,min(r,outer))
def phi_density(r):return -G*((mass_density(r)/r if r else 0)+integrate(shell_potential,r,outer))
def density(r):return shell_mass(r)/(4*math.pi*r*r)
def target(p,field,gravity=G):
    # Independently evaluate specified piecewise enclosed mass and integrate
    # its linear taper analytically, without haloGeometryAt or haloTable code.
    p=np.asarray(p,dtype=float);dr=p-np.asarray(field['center']);r=float(np.linalg.norm(dr));scale=field['massScale'];a=field['rs'];rr=field['radius'];mm=field['mass']
    if r<=field['r200']:
        x=r/a
        f=math.fsum(((-1)**k)*(k-1)/k*x**k for k in range(2,20)) if x<.02 else math.log1p(x)-x/(1+x)
        mass=scale*f
    elif r>=field['outerRadius']:mass=field['totalMass']
    else:mass=float(np.interp(r,rr,mm))
    def seg(lo,hi,i):
        slope=(mm[i+1]-mm[i])/(rr[i+1]-rr[i]);A=mm[i]-slope*rr[i]
        return A*(1/lo-1/hi)+slope*math.log(hi/lo)
    if r>=field['outerRadius']:integ=field['totalMass']/r
    else:
        integ=field['totalMass']/field['outerRadius']
        for i in range(len(rr)-1):
            lo=max(r,rr[i]);hi=rr[i+1]
            if hi>lo:integ+=seg(lo,hi,i)
        if r<field['r200']:
            inner=scale/a if not r else scale*math.log1p(r/a)/r
            integ+=inner-scale*math.log1p(field['r200']/a)/field['r200']
    return (-gravity*mass/r**3*dr if r else np.zeros(3)),-gravity*integ
Mtotal=mass_density(outer)
profile=[]
for s in d['samples']:
    r=s['r'];M=mass_density(r);phi=phi_density(r);acc=-G*M/r**2 if r else 0
    profile.append({'r_kpc':r,'mass_density_integral':M,'mass_production':s['enclosedMass'],'phi_density_integral':phi,'phi_production':s['potential'],'a_density':acc,'a_production':s['acceleration'][0],'relative_mass_error':abs(s['enclosedMass']-M)/M if M else None,'relative_phi_error':abs(s['potential']-phi)/abs(phi),'absPhi_c2':abs(phi)/c**2})
gradient=[]
for q in d['gradients']:
    fd=-(q['hi']['potential']-q['lo']['potential'])/(2*q['h']);a=q['at']['acceleration'][0];gradient.append({'r':q['r'],'relative_error':abs((fd-a)/a)})
# Numerically verify Poisson / linearized G00 in the smooth NFW interior.
poisson=[]
for r in [.01,.1,1,8,25,100]:
    h=r*1e-4
    def flux(x):return G*mass_density(x)
    lap=(flux(r+h)-flux(r-h))/(2*h*r*r);rhs=4*math.pi*G*density(r)
    poisson.append({'r':r,'laplacian_phi':lap,'four_pi_G_rho':rhs,'relative_error':abs(lap-rhs)/abs(rhs),'linear_G00':2*lap/c**2,'source_8piG_rho_c2':2*rhs/c**2})
metric=[]
for r in [0,.1,1,8,25,100,outer,1000]:
    phi=phi_density(r);u=phi/c**2
    phi_b=-G*P['bulgeMass']/(r+P['bulgeScale']);phi_d=-G*P['diskMass']/math.sqrt(r*r+(P['diskA']+P['diskB'])**2)
    metric.append({'r':r,'phi':phi,'u_abs':abs(u),'g00':-(1+2*u),'g11':1-2*u,'total_analytic_absPhi_c2':abs(phi+phi_b+phi_d)/c**2,'newtonian_vc_km_s':math.sqrt(G*mass_density(r)/r)/(1000*C['MYR_SECONDS']/C['KPC_METERS']) if r else 0})
# Separate continuum Plummer bias from finite sampling. Angular integral of
# the Plummer potential of each spherical shell is analytic.
def softened_phi(r,eps):
    def integrand(s):
        plus=math.sqrt((r+s)**2+eps**2);minus=math.sqrt((r-s)**2+eps**2)
        # stable square-root difference =4rs/(plus+minus)
        return shell_potential(s)*4*r*s/(plus+minus)
    edges=sorted(set([0,r,rs,r200,outer]));return -G/(2*r)*math.fsum(quad(integrand,a,b,2e-10) for a,b in zip(edges,edges[1:]) if a<outer and b<=outer)
smooth=[]
for r in [4,8,16,30]:
    h=r*1e-4;a0=-G*mass_density(r)/r**2;ae=-(softened_phi(r+h,.1)-softened_phi(r-h,.1))/(2*h)
    smooth.append({'r':r,'a_unsoftened':a0,'a_plummer_continuum':ae,'fractional_softening_bias':(ae-a0)/abs(a0)})
discrete=[]
for entry in d['discrete']:
    p=np.array(entry['positions']).reshape(-1,3);m=np.array(entry['masses']);center=np.array(entry['center']);errs=[];err_un=[];az=[]
    for R in [4,8,16,30]:
        for z in [0,1]:
            r=math.hypot(R,z);a0=-G*mass_density(r)/r**2
            h=r*1e-4;ae=-(softened_phi(r+h,.1)-softened_phi(r-h,.1))/(2*h)
            measured=[]
            for theta in np.linspace(0,2*math.pi,16,endpoint=False):
                n=np.array([R*math.cos(theta),R*math.sin(theta),z])/r;q=center+n*r;delta=p-q
                a=np.sum(G*m[:,None]*delta/(np.sum(delta*delta,axis=1)+np.float32(.01))[:,None]**1.5,axis=0)
                measured.append(a.tolist());err_un.append(float(np.linalg.norm(a-a0*n)/abs(a0)));errs.append(float(np.linalg.norm(a-ae*n)/abs(ae)))
            mean=np.mean(measured,axis=0)
            # Radial cylindrical and vertical components use projection before averaging.
            radial=[];vertical=[]
            for theta,a in zip(np.linspace(0,2*math.pi,16,endpoint=False),measured):radial.append(a[0]*math.cos(theta)+a[1]*math.sin(theta));vertical.append(a[2])
            az.append({'R':R,'z':z,'mean_aR':float(np.mean(radial)),'mean_az':float(np.mean(vertical)),'smooth_aR':ae*R/r,'smooth_az':ae*z/r,'unsoftened_aR':a0*R/r,'unsoftened_az':a0*z/r})
    discrete.append({'seed':entry['seed'],'factor':entry['factor'],'n':len(m),'mass_f32':float(np.sum(m)),'rms_relative_to_softened':float(np.sqrt(np.mean(np.array(errs)**2))),'rms_relative_to_unsoftened':float(np.sqrt(np.mean(np.array(err_un)**2))),'azimuth_means':az})
out={'mass_integral':Mtotal,'mass_production':C['HALO_TOTAL_MASS'],'relative_total_mass_error':abs(C['HALO_TOTAL_MASS']-Mtotal)/Mtotal,'profile':profile,'gradient':gradient,'poisson':poisson,'metric':metric,'softening':smooth,'discrete':discrete,'boundaries':d['boundaries']}
out['effectiveParticleHaloMass4096x4']=d.get('effectiveParticleHaloMass4096x4')
if 'energyFixture' in d:
    fixture=d['energyFixture'];s=fixture['state'];parameters=fixture['parameters'];pos=np.array(s['positions'],dtype=float).reshape(-1,3);vel=np.array(s['velocities'],dtype=float).reshape(-1,3);m=np.array(s['masses']);gravity=parameters['G'];eps2=parameters['epsilonSquared'];field=parameters['haloField']
    kinetic=math.fsum(.5*mi*float(np.dot(v,v))for mi,v in zip(m,vel));pairs=math.fsum(-gravity*m[i]*m[j]/math.sqrt(float(np.dot(pos[i]-pos[j],pos[i]-pos[j]))+eps2)for i in range(len(m))for j in range(i+1,len(m)));external=math.fsum(mi*target(p,field,gravity)[1]for mi,p in zip(m,pos));expected=kinetic+pairs+external
    out['energy_fixture']={'independent_K':kinetic,'independent_U_pairs':pairs,'independent_U_external':external,'independent_E':expected,'production_E':fixture['productionEnergy']['energy'],'absolute_difference':abs(expected-fixture['productionEnergy']['energy'])}
    out['initialFloat32BaryonEquality']=d['initialFloat32BaryonEquality']
    force=[]
    for i in range(len(m)):
        a=target(pos[i],field,gravity)[0]
        for j in range(len(m)):
            if i!=j:
                dr=pos[j]-pos[i];a+=gravity*m[j]*dr/(float(np.dot(dr,dr))+eps2)**1.5
        measured=np.array(s['accelerations'][3*i:3*i+3]);force.append(float(np.linalg.norm(measured-a)/np.linalg.norm(a)))
    out['fixture_force_max_relative']=max(force)
gpu_path=F/'gpu-results.json'
if gpu_path.exists():
    gpu=json.loads(gpu_path.read_text(encoding='utf-8'));out['gpu_computedUTC']=gpu['computedUTC']
    probe=gpu['probes'];s=probe['state'];field=probe['parameters']['haloField'];gravity=probe['parameters']['G'];res=[]
    for i in range(s['n']):
        p=s['positions'][3*i:3*i+3];expected,_=target(p,field,gravity);obtained=np.array(s['accelerations'][3*i:3*i+3]);norm=np.linalg.norm(expected);res.append({'r':float(np.linalg.norm(p)),'expected':expected.tolist(),'obtained':obtained.tolist(),'relative':float(np.linalg.norm(obtained-expected)/norm) if norm else None})
    out['gpu_probes']=res
    out['source_removal_exact']=gpu['sourceRemoval'][0]['initial']==gpu['sourceRemoval'][1]['initial'] and gpu['sourceRemoval'][0]['final']==gpu['sourceRemoval'][1]['final']
    out['velocity_acceleration_exact']=gpu['velocityControl']['slow']['accelerations']==gpu['velocityControl']['fast']['accelerations']
    out['visual_state_exact']=gpu['visualControl']['at8']==gpu['visualControl']['at12']
    def acc_all(pos,field,gravity):return np.array([target(p,field,gravity)[0] for p in pos])
    def rk4(pos,vel,h,field,gravity):
        a1=acc_all(pos,field,gravity);p2=pos+h/2*vel;v2=vel+h/2*a1;a2=acc_all(p2,field,gravity);p3=pos+h/2*v2;v3=vel+h/2*a2;a3=acc_all(p3,field,gravity);p4=pos+h*v3;v4=vel+h*a3;a4=acc_all(p4,field,gravity)
        return pos+h/6*(vel+2*v2+2*v3+v4),vel+h/6*(a1+2*a2+2*a3+a4)
    orbits=[]
    for run in gpu['orbits']:
        field=run['parameters']['haloField'];gravity=run['parameters']['G'];dt=run['parameters']['dt'];initial=run['rows'][0];p0=np.array(initial['positions'],dtype=float).reshape(-1,3);v0=np.array(initial['velocities'],dtype=float).reshape(-1,3);p=p0.copy();v=v0.copy();now=0.;rows=[]
        for snapshot in run['rows']:
            end=snapshot['time'];steps=round((end-now)/dt);a=acc_all(p,field,gravity)
            for _ in range(steps):v+=dt/2*a;p+=dt*v;a=acc_all(p,field,gravity);v+=dt/2*a
            gp=np.array(snapshot['positions']).reshape(-1,3);gv=np.array(snapshot['velocities']).reshape(-1,3)
            rows.append({'time':end,'position_error_kpc':np.linalg.norm(gp-p,axis=1).tolist(),'velocity_error_kpc_Myr':np.linalg.norm(gv-v,axis=1).tolist()});now=end
        cpu_final=p.copy();refs=[]
        for hmax in [.02,.01]:
            p=p0.copy();v=v0.copy();steps=math.ceil(now/hmax);h=now/steps
            for _ in range(steps):p,v=rk4(p,v,h,field,gravity)
            refs.append((p,v))
        gp=np.array(run['rows'][-1]['positions']).reshape(-1,3);gv=np.array(run['rows'][-1]['velocities']).reshape(-1,3)
        outpos=np.linalg.norm(gp-refs[-1][0],axis=1);rkdiff=np.linalg.norm(refs[-1][0]-refs[-2][0],axis=1)
        energy0=np.array([.5*np.dot(v,v)+target(p,field,gravity)[1] for p,v in zip(p0,v0)]);energy=np.array([.5*np.dot(v,v)+target(p,field,gravity)[1] for p,v in zip(gp,gv)]);L0=np.cross(p0,v0);L=np.cross(gp,gv)
        orbits.append({'dt':run['dt'],'same_dt_comparison':rows,'cpu_KDK_vs_RK4_final_kpc':np.linalg.norm(cpu_final-refs[-1][0],axis=1).tolist(),'gpu_vs_RK4_final_kpc':outpos.tolist(),'RK4_halving_difference_kpc':rkdiff.tolist(),'final_relative_specific_energy':((energy-energy0)/abs(energy0)).tolist(),'final_relative_L':(np.linalg.norm(L-L0,axis=1)/np.linalg.norm(L0,axis=1)).tolist()})
    out['orbits']=orbits
    # Independent plane fit uses NumPy eigensolver, not JS Jacobi implementation.
    def medloc(x,w):
        order=np.argsort(x);x=x[order];w=w[order];cs=np.cumsum(w);half=np.sum(w)/2;i=int(np.searchsorted(cs,half-8*np.finfo(float).eps*np.sum(w)))
        return float((x[i]+x[i+1])/2 if abs(cs[i]-half)<=8*np.finfo(float).eps*np.sum(w) and i+1<len(x) else x[i])
    def wmedian(x,w):
        order=np.argsort(x);return float(x[order][np.searchsorted(np.cumsum(w[order]),.5*np.sum(w)-8*np.finfo(float).eps*np.sum(w))])
    def plane_measure(record):
        pos=np.array(record['positions']).reshape(-1,3);vel=np.array(record['velocities']).reshape(-1,3);w=np.array(record['masses']);geo=np.array([medloc(pos[:,k],w) for k in range(3)])
        for _ in range(24):
            weights=w/np.maximum(1e-12,np.linalg.norm(pos-geo,axis=1));new=np.sum(pos*weights[:,None],axis=0)/np.sum(weights);change=np.linalg.norm(new-geo);geo=new
            if change<1e-10:break
        mask=np.linalg.norm(pos-geo,axis=1)<20;pc=pos[mask];wc=w[mask];weights=wc.copy()
        for _ in range(6):
            center=np.sum(pc*weights[:,None],axis=0)/np.sum(weights);q=pc-center;cov=np.einsum('ni,nj,n->ij',q,q,weights)/np.sum(weights);eig,vec=np.linalg.eigh(cov);normal=vec[:,0]
            if normal[2]<0:normal=-normal
            heights=abs(q@normal);scale=max(1e-10,wmedian(heights,wc)/.67448975);weights=wc*np.minimum(1,2.5*scale/np.maximum(1e-30,heights))
        offset=medloc((pc-geo)@normal,wc);center=geo+offset*normal;h=abs((pos-center)@normal);vn=vel@normal;mean=np.sum(vn*w)/sum(w)
        return {'h50':wmedian(h,w),'sigmaNormal':float(np.sqrt(np.sum(w*(vn-mean)**2)/sum(w))),'normal':normal.tolist(),'center':center.tolist()}
    campaign=[]
    for run in gpu['campaign']:
        rows=[]
        for row in run['rows']:
            independent=plane_measure(row['disk']);rows.append({'time':row['time'],'reported_h50':row['analysis']['instant']['h50'],'independent':independent,'rings':[{'lo':r['lower'],'hi':r['upper'],'h50':r['globalPlane']['h50'],'sigma':r['globalPlane']['sigmaNormal'],'count':r['count']}for r in row['analysis']['rings']]})
        campaign.append({'mode':run['mode'],'n':run['n'],'counts':run['counts'],'initializationMs':run['initializationMs'],'computeMs':run['computeMs'],'diagnosticMs':run['diagnosticMs'],'wallMs':run['wallMs'],'rows':rows,'max_sampled_h50':max(r['reported_h50'] for r in rows),'max_independent_difference':max(abs(r['reported_h50']-r['independent']['h50']) for r in rows)})
    out['campaign']=campaign
(F/'independent-results.json').write_text(json.dumps(out,indent=2),encoding='utf-8')
for name,rows in [('profile',profile),('metric',metric),('softening',smooth),('gradient',gradient),('discrete-summary',[{k:v for k,v in r.items() if k!='azimuth_means'}for r in discrete])]:
    with (F/(name+'.csv')).open('w',encoding='utf-8',newline='')as fp:w=csv.DictWriter(fp,fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)
print(json.dumps({'mass_integral':Mtotal,'relative_total_mass_error':out['relative_total_mass_error'],'max_phi_density_error':max(r['relative_phi_error']for r in profile),'max_gradient_error':max(r['relative_error']for r in gradient),'max_poisson_error':max(r['relative_error']for r in poisson),'gpu_available':gpu_path.exists()},indent=2))
