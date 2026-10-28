import {hernquistDensity,haloDensity,analyticAcceleration} from './models.js';
// Axisymmetric two-integral Jeans closure: sigma_R²=sigma_z², <vR vz>=0.
// P = integral_|z|^infinity rho dPhi/dz' dz'; <vphi²>=P/rho+R/rho*dP/dR+R*dPhi/dR.
// Positive moments do not establish a nonnegative stationary distribution function.
export function axisymmetricPressure(component,R,z,withHalo=true,points=256){
  if(![0,2].includes(component)||!Number.isInteger(points)||points<16||!Number.isFinite(R)||R<0||!Number.isFinite(z))throw Error('Invalid Jeans quadrature input');
  const density=component===0?hernquistDensity:haloDensity,lower=Math.abs(z),scale=Math.max(Math.hypot(R,lower),1e-5);let sum=0;
  for(let i=0;i<points;i++){
    const t=(i+0.5)/points,zz=lower+scale*t/(1-t),rho=density(Math.hypot(R,zz));
    sum+=rho*(-analyticAcceleration(R,0,zz,withHalo)[2])*scale/(1-t)**2/points;
  }
  return sum;
}
export function axisymmetricMoments(component,R,z,withHalo=true,points=256){
  const density=component===0?hernquistDensity:haloDensity,rho=density(Math.hypot(R,z)),pressure=axisymmetricPressure(component,R,z,withHalo,points);
  const h=Math.max(1e-7,R*1e-3),lo=Math.max(0,R-h),hi=R+h;
  const gradient=(axisymmetricPressure(component,hi,z,withHalo,points)-axisymmetricPressure(component,lo,z,withHalo,points))/(hi-lo);
  return {sigma2:pressure/rho,azimuthalSecondMoment:pressure/rho+R*gradient/rho-R*analyticAcceleration(R,0,z,withHalo)[0],pressure,gradient};
}
