from pathlib import Path
import json, argparse
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

def main():
 p=argparse.ArgumentParser();p.add_argument('--out',type=Path,required=True);a=p.parse_args();out=a.out;load=lambda n:json.loads((out/n).read_text(encoding='utf8'));cfg=load('preparation.json')['config'];density=load('density-profile-validation.json');profile=load('continuum-profiles.json')
 R=np.array(density['cylindricalRadiusKpc']);fig,ax=plt.subplots(2,2,figsize=(12,8),layout='constrained')
 for i,d in enumerate(cfg['disks']):
  target=d['mass']/(2*np.pi*d['radius']**2)*np.exp(-R/d['radius']);actual=np.array(density['surfaceDensityThinThickMsunKpc2'][i]);ax[0,0].semilogy(R,actual/1e6,label=d['name']+' DF final');ax[0,0].semilogy(R,target/1e6,'--',label=d['name']+' alvo exponencial');ax[0,1].plot(R,actual/target,label=d['name'])
  mean=np.array(profile['moments'][i+1]['meanVelocityXYZ']);v2=np.array(profile['moments'][i+1]['secondMomentsXXYYZZXYYZZX']);r=np.array(profile['momentRadiusKpc']);ax[1,0].plot(r,mean[:,1],label=r'$\langle v_\phi\rangle$ '+d['name']);ax[1,1].plot(r,np.sqrt(np.maximum(0,v2[:,0]-mean[:,0]**2)),label=r'$\sigma_R$ '+d['name']);ax[1,1].plot(r,np.sqrt(np.maximum(0,v2[:,2]-mean[:,2]**2)),'--',label=r'$\sigma_z$ '+d['name'])
 vc=np.array(profile['vcInternal'])/.001022712165;ax[1,0].plot(profile['radiusKpc'],vc,'k:',label=r'$v_c$ potencial total')
 for plot in ax.flat:plot.grid(alpha=.2);plot.legend(fontsize=8);plot.set_xlabel('R [kpc]');plot.set_xlim(.5,25)
 ax[0,0].set_ylabel(r'$\Sigma$ [$M_\odot$ pc$^{-2}$]');ax[0,0].set_ylim(.01,3000);ax[0,1].set_ylabel('DF final / alvo exponencial');ax[1,0].set_ylabel('Velocidade [km/s]');ax[1,1].set_ylabel('Dispersão [km/s]');ax[0,1].axhline(1,c='gray',lw=.5);ax[0,1].set_ylim(0,2);fig.suptitle('Modelo contínuo após iteração: perfis e cinemática efetivamente obtidos',fontsize=12);fig.savefig(out.parent/'initial-model.png',dpi=170);fig.savefig(out.parent/'initial-model.pdf');plt.close(fig)
 logs=load('iterations.json');fig,ax=plt.subplots(figsize=(7,4),layout='constrained');ax.semilogy([x['iteration'] for x in logs],[x['maxRelativeForceChange'] for x in logs],marker='o',label='Máxima nos pontos de controle');ax.semilogy([x['iteration'] for x in logs],[x['medianRelativeForceChange'] for x in logs],marker='.',label='Mediana');ax.axhline(cfg['potentialTolerance'],c='gray',ls='--',label='Critério numérico de iteração');ax.set(xlabel='Iteração SCM',ylabel='Variação relativa da força');ax.legend();ax.grid(alpha=.2);fig.savefig(out.parent/'scm-convergence.png',dpi=170);plt.close(fig)

if __name__=='__main__':main()
