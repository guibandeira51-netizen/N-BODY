const colors=['#23856a','#c47b22','#347fba','#b34e55','#7049a0'];
const labels=['Disco','Bojo','Halo','Disco + bojo','Total'];
const keys=['disk','bulge','halo','diskBulge','total'];
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
export function componentRotationPlot(field){
 const rows=field?.rows??[],series=keys.map(key=>rows.map(r=>[r.R_kpc,r.vc_km_s[key]])),values=series.flat().filter(p=>Number.isFinite(p[1]));
 const title='Curvas de rotação · componentes',head=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 320" role="img" aria-label="${title}"><rect width="680" height="320" fill="white"/><g font-family="Arial,sans-serif" font-size="11" fill="#1b3036"><text x="18" y="24" font-size="16">${title}</text>`;
 if(!rows.length)return head+'<text x="30" y="155">Inicie a simulação para medir as contribuições gravitacionais.</text></g></svg>';
 const xmin=rows[0].R_kpc,xmax=Math.max(xmin+1,rows.at(-1).R_kpc),ymax=Math.max(50,Math.ceil(Math.max(0,...values.map(p=>p[1]))/50)*50),X=x=>80+560*(x-xmin)/(xmax-xmin),Y=y=>235-165*y/ymax;
 let body=head;
 for(let i=0;i<=4;i++){const x=xmin+(xmax-xmin)*i/4,y=ymax*i/4;body+=`<path d="M80 ${Y(y)}H640" stroke="#e1e8e9"/><text x="72" y="${Y(y)+4}" text-anchor="end">${y.toFixed(0)}</text><text x="${X(x)}" y="255" text-anchor="middle">${x.toFixed(1)}</text>`;}
 body+='<path d="M80 70V235H640" fill="none" stroke="#456"/><text x="350" y="276" text-anchor="middle">Raio R [kpc]</text><text transform="translate(20 160) rotate(-90)" text-anchor="middle">Contribuição circular [km/s]</text>';
 series.forEach((points,j)=>{let path='',open=false;for(const[x,y]of points){if(!Number.isFinite(y)){open=false;continue;}path+=`${open?'L':'M'}${X(x).toFixed(2)} ${Y(y).toFixed(2)} `;open=true;}
  body+=`<text x="${80+j*112}" y="49" fill="${colors[j]}">${labels[j]}</text><path d="${path}" fill="none" stroke="${colors[j]}" stroke-width="${j===4?2.7:1.7}"/>`;
  for(const[x,y]of points)if(Number.isFinite(y))body+=`<circle cx="${X(x)}" cy="${Y(y)}" r="2.1" fill="${colors[j]}"><title>${escape(labels[j])}: R=${x} kpc; vc=${y} km/s</title></circle>`;
 });
 body+=`<text x="80" y="299" fill="#61757e">Campo das partículas · t=${Number(field.timeMyr).toFixed(2)} Myr · ${field.azimuthSamples} azimutes por raio</text></g></svg>`;return body;
}
