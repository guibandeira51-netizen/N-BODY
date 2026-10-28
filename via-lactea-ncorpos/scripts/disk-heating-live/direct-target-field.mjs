// Direct Float64 probe evaluation; never evolves or edits the snapshot.
export function directTargetField(state,ids,{G,epsilonSquared,unsoftenedControl=false},onProgress=()=>{}){
 const {n,positions:p,masses:m}=state,out=[];
 if(!(G>0)||!(epsilonSquared>=0)||!Number.isFinite(G)||!Number.isFinite(epsilonSquared))throw Error('Invalid gravitational parameters');
 for(let at=0;at<ids.length;at++){
  const id=ids[at];if(!Number.isSafeInteger(id)||id<0||id>=n)throw Error('Invalid target ID');
  const k=3*id,x=p[k],y=p[k+1],z=p[k+2];let phi=0,pc=0,ax=0,ay=0,az=0,az0=0;const phiByComponent=[0,0,0],azByComponent=[0,0,0];
  for(let j=0;j<n;j++){
   if(j===id||m[j]===0)continue;const b=3*j,dx=p[b]-x,dy=p[b+1]-y,dz=p[b+2]-z,r2=dx*dx+dy*dy+dz*dz,den=r2+epsilonSquared;
   if(!(den>0))throw Error('Coincident particles require positive softening');
   const inv=1/Math.sqrt(den),term=-G*m[j]*inv,corrected=term-pc,next=phi+corrected;pc=(next-phi)-corrected;phi=next;
   const factor=G*m[j]*inv*inv*inv;ax+=factor*dx;ay+=factor*dy;az+=factor*dz;
   const component=state.components[j];phiByComponent[component]+=term;azByComponent[component]+=factor*dz;
   if(unsoftenedControl){if(!(r2>0))throw Error('Coincident particles in unsoftened force control');az0+=G*m[j]*dz/(r2*Math.sqrt(r2));}
  }
  out.push({id,phi,ax,ay,az,azUnsoftened:unsoftenedControl?az0:null,phiByComponent,azByComponent});
  if(at%256===0)onProgress(at+1,ids.length);
 }
 return out;
}
