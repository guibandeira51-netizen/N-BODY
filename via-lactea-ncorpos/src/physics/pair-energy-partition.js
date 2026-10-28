// Every i<j belongs to exactly one row partition; no force approximation.
export function pairEnergyRange(positions,masses,n,first,last,G,eps2,onProgress){
 let total=0,correction=0;
 for(let i=first;i<last;i++){const a=3*i;for(let j=i+1;j<n;j++){const b=3*j,dx=positions[b]-positions[a],dy=positions[b+1]-positions[a+1],dz=positions[b+2]-positions[a+2],pair=-G*masses[i]*masses[j]/Math.sqrt(dx*dx+dy*dy+dz*dz+eps2),next=total+pair;correction+=Math.abs(total)>=Math.abs(pair)?(total-next)+pair:(pair-next)+total;total=next;}if(onProgress&&((i-first)%64===0||i===last-1))onProgress((i+1-first)*(2*n-first-i-2)/2);}
 return total+correction;
}
export function pairRowPartitions(n,count){const bounds=Array.from({length:count+1},(_,k)=>k===count?n-1:Math.floor((2*n-1-Math.sqrt((2*n-1)**2-4*k/count*n*(n-1)))/2));return bounds.slice(0,-1).map((first,k)=>[first,bounds[k+1]]);}
export function compensatedTotal(values){let total=0,c=0;for(const x of values){const next=total+x;c+=Math.abs(total)>=Math.abs(x)?(total-next)+x:(x-next)+total;total=next;}return total+c;}
