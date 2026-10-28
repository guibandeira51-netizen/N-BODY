import {validateExternalGrid} from './external-grid.js';
const H=[[1,0,-3,2],[0,0,3,-2],[0,1,-2,1],[0,0,-1,1]];
/** Convert the SAME Hermite scalar into per-cell polynomial coefficients in
 * Float64, then round once. GPU derivatives never subtract large Phi constants.
 * No change of physical density, softening or interpolation polynomial.
 */
export function polynomialGrid(t){
 validateExternalGrid(t);const out=new Float32Array(8+16*(t.nu-1)*(t.nv-1));out.set([t.nu,t.nv,t.du,t.dv,t.rscale,t.zscale,t.massInternal,0]);
 for(let i=0;i<t.nu-1;i++)for(let j=0;j<t.nv-1;j++){
  const c=new Float64Array(16);
  for(let p=0;p<4;p++)for(let q=0;q<4;q++){const value=t.values[4*((i+p%2)*t.nv+j+q%2)+(p>=2?1:0)+(q>=2?2:0)]*(p>=2?t.du:1)*(q>=2?t.dv:1);for(let a=0;a<4;a++)for(let b=0;b<4;b++)c[4*a+b]+=H[p][a]*value*H[q][b];}
  out.set(c,8+16*(i*(t.nv-1)+j));
 }
 return out;
}
export function polynomialGradientAt(data,x,y,z){
 const [nu,nv,du,dv,rs,zs]=data,R=Math.hypot(x,y),fu=Math.log1p(R/rs)/du,fv=Math.log1p(Math.abs(z)/zs)/dv;if(fu>nu-1||fv>nv-1)throw Error('Outside polynomial grid');const i=Math.min(nu-2,Math.floor(fu)),j=Math.min(nv-2,Math.floor(fv)),a=fu-i,b=fv-j,base=8+16*(i*(nv-1)+j);let dU=0,dV=0;
 for(let p=0;p<4;p++)for(let q=0;q<4;q++){const c=data[base+4*p+q];if(p)dU+=p*c*a**(p-1)*b**q/du;if(q)dV+=q*c*a**p*b**(q-1)/dv;}
 const fR=-dU/(R+rs),fz=z===0?0:-Math.sign(z)*dV/(Math.abs(z)+zs);return [R?fR*x/R:0,R?fR*y/R:0,fz];
}
