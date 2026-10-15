import {createGalaxy as legacyGalaxy,seededRandom} from './initial-legacy.js';
import {axisymmetricMoments} from './jeans-axisymmetric.js';
import {analyticPotential} from './models.js';
export {seededRandom,sampleDisk,sampleHalo,sampleHernquist,componentCounts} from './initial-legacy.js';

/** Candidate replaces spherical-monopole moments of bulge/halo. It is neither
 * GALIC nor AGAMA, and is not a proven stationary DF. Historical default retained. */
export function createGalaxy(options={}) {
  const method=options.initialization??'legacy';
  if(!['legacy','axisymmetric-jeans'].includes(method))throw Error('Inicializador desconhecido.');
  const state=legacyGalaxy(options);state.meta.method=method;
  if(method==='legacy')return state;
  const rng=seededRandom((state.meta.seed^0x51C3A729)>>>0),normal=()=>Math.sqrt(-2*Math.log(Math.max(1e-15,rng())))*Math.cos(2*Math.PI*rng());
  const withHalo=options.withHalo!==false;let offset=0;
  for(let c=0;c<3;c++){
    const count=state.meta.counts[c];
    if(c!==1)for(let j=0;j<count;j++){
      const i=offset+j,k=3*i;
      if(j%2){for(let a=0;a<3;a++)state.velocities[k+a]=-state.velocities[k-3+a];continue;}
      const pos=Array.from(state.positions.subarray(k,k+3),(x,a)=>x+state.meta.centerShift[a]),R=Math.hypot(pos[0],pos[1]),phi=Math.atan2(pos[1],pos[0]);
      const mom=axisymmetricMoments(c,R,pos[2],withHalo,options.jeansQuadrature??256);
      if(!(mom.sigma2>=0&&mom.azimuthalSecondMoment>=0))throw Error(`Jeans axisimétrico sem momentos positivos: componente ${c}, R=${R}, z=${pos[2]}. Candidato rejeitado, sem recorte silencioso.`);
      const vr=Math.sqrt(mom.sigma2)*normal(),vp=Math.sqrt(mom.azimuthalSecondMoment)*normal(),vz=Math.sqrt(mom.sigma2)*normal();
      state.velocities.set([vr*Math.cos(phi)-vp*Math.sin(phi),vr*Math.sin(phi)+vp*Math.cos(phi),vz],k);
    }
    offset+=count;
  }
  const mean=[0,0,0],mass=state.masses.reduce((a,b)=>a+b,0);
  for(let i=0;i<state.n;i++)for(let a=0;a<3;a++)mean[a]+=state.masses[i]*state.velocities[3*i+a]/mass;
  for(let i=0;i<state.n;i++)for(let a=0;a<3;a++)state.velocities[3*i+a]-=mean[a];
  let unbound=0;for(let i=0;i<state.n;i++){const k=3*i,p=Array.from(state.positions.subarray(k,k+3),(x,a)=>x+state.meta.centerShift[a]);if(0.5*state.velocities.subarray(k,k+3).reduce((s,v)=>s+v*v,0)+analyticPotential(...p,withHalo)>0)unbound++;}
  state.meta={...state.meta,initialization:'Candidato: Jeans axisimétrico no potencial completo para bojo/halo; disco histórico Satoh k=1; Gaussianas aproximadas',unbound,velocityFrameShift:mean,jeansQuadrature:options.jeansQuadrature??256,equilibriumValidated:false,qualification:'Momentos de segunda ordem; função de distribuição estacionária não demonstrada. Parâmetros e posições preservados.'};
  return state;
}
