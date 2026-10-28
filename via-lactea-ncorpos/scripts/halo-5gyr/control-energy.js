// Scalar evaluated from the very same rounded polynomial used by the existing
// fixed-field GPU extension. No half factor belongs to external potential.
export function polynomialPotential(data,x,y,z,G){const [nu,nv,du,dv,rs,zs,m]=data,R=Math.hypot(x,y),fu=Math.log1p(R/rs)/du,fv=Math.log1p(Math.abs(z)/zs)/dv;if(fu>nu-1||fv>nv-1)return -G*m/Math.hypot(R,z);const i=Math.min(nu-2,Math.floor(fu)),j=Math.min(nv-2,Math.floor(fv)),a=fu-i,b=fv-j,base=8+16*(i*(nv-1)+j);let phi=0;for(let p=0;p<4;p++)for(let q=0;q<4;q++)phi+=data[base+4*p+q]*a**p*b**q;return phi;}
