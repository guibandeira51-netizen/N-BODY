import {EILERS_2019} from './observations/eilers2019.js';
const colors=['#23856a','#c47b22','#347fba','#b34e55','#7049a0'];
const labels=['Disco','Bojo','Halo','Disco + bojo','Total'];
const keys=['disk','bulge','halo','diskBulge','total'];
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');

// Read-only comparison: published observations stay fixed while the measured
// particle field changes. No fitting, force change or observational interpolation.
export function componentRotationPlot(field){
 const rows=field?.rows??[],observed=EILERS_2019.rows;
 const series=keys.map(key=>rows.map(r=>[r.R_kpc,r.vc_km_s[key]])),values=series.flat().filter(p=>Number.isFinite(p[1]));
 const xmin=Math.min(...observed.map(r=>r.R_kpc),...rows.map(r=>r.R_kpc)),xmax=Math.max(xmin+1,...observed.map(r=>r.R_kpc),...rows.map(r=>r.R_kpc));
 const ymax=Math.max(50,Math.ceil(Math.max(0,...values.map(p=>p[1]),...observed.map(r=>r.vc_km_s+r.stat_plus_km_s))/50)*50);
 const L=80,R=640,T=92,B=252,X=x=>L+(R-L)*(x-xmin)/(xmax-xmin),Y=y=>B-(B-T)*y/ymax;
 const title='Curvas de rotação · componentes';
 let body=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 366" role="img" aria-label="${title} e Eilers et al. (2019)"><desc>Linhas: campo gravitacional atual do modelo. Pontos pretos: 38 velocidades circulares publicadas por Eilers et al. (2019). Barras: erros estatísticos assimétricos; incertezas sistemáticas não incluídas.</desc><rect width="680" height="366" fill="white"/><g font-family="Arial,sans-serif" font-size="11" fill="#1b3036"><text x="18" y="24" font-size="16">${title}</text>`;
 keys.forEach((key,j)=>body+=`<text x="${L+j*112}" y="49" fill="${colors[j]}">${labels[j]}</text>`);
 body+=`<a href="${EILERS_2019.url}" target="_blank" rel="noopener noreferrer"><title>${escape(EILERS_2019.inference+' '+EILERS_2019.comparison)}</title><circle cx="84" cy="69" r="3" fill="#202c33"/><text x="95" y="73">Eilers et al. (2019) · 38 pontos observacionais</text></a>`;
 for(let i=0;i<=4;i++){const x=xmin+(xmax-xmin)*i/4,y=ymax*i/4;body+=`<path d="M${L} ${Y(y)}H${R}" stroke="#e1e8e9"/><text x="${L-8}" y="${Y(y)+4}" text-anchor="end">${y.toFixed(0)}</text><text x="${X(x)}" y="274" text-anchor="middle">${x.toFixed(1)}</text>`;}
 body+=`<path d="M${L} ${T}V${B}H${R}" fill="none" stroke="#456"/><text x="350" y="297" text-anchor="middle">Raio R [kpc]</text><text transform="translate(20 172) rotate(-90)" text-anchor="middle">Velocidade circular [km/s]</text>`;
 series.forEach((points,j)=>{let path='',open=false;for(const[x,y]of points){if(!Number.isFinite(y)){open=false;continue;}path+=`${open?'L':'M'}${X(x).toFixed(2)} ${Y(y).toFixed(2)} `;open=true;}
  body+=`<path data-model-series="${keys[j]}" d="${path}" fill="none" stroke="${colors[j]}" stroke-width="${j===4?2.7:1.7}"/>`;
  for(const[x,y]of points)if(Number.isFinite(y))body+=`<circle data-model-point="${keys[j]}" cx="${X(x)}" cy="${Y(y)}" r="2.1" fill="${colors[j]}"><title>${escape(labels[j])}: R=${x} kpc; vc=${y} km/s</title></circle>`;
 });
 for(const row of observed){const x=X(row.R_kpc),y=Y(row.vc_km_s),low=Y(row.vc_km_s-row.stat_minus_km_s),high=Y(row.vc_km_s+row.stat_plus_km_s);
  const tip=`Eilers et al. (2019), Tabela 1: R=${row.R_kpc} kpc; vc=${row.vc_km_s} km/s; erro estatístico −${row.stat_minus_km_s}/+${row.stat_plus_km_s} km/s. Sistemáticos não incluídos. Dado observacional fixo, independente do tempo simulado.`;
  body+=`<g data-observation="eilers2019" data-radius-kpc="${row.R_kpc}"><title>${escape(tip)}</title><path data-observation-error="statistical" d="M${x} ${high}V${low}M${x-2.5} ${high}H${x+2.5}M${x-2.5} ${low}H${x+2.5}" fill="none" stroke="#202c33" stroke-width="1.1"/><circle data-observation-point="eilers2019" cx="${x}" cy="${y}" r="3.1" fill="#202c33" stroke="white" stroke-width=".8" tabindex="0" aria-label="${escape(tip)}"/></g>`;
 }
 body+=`<text x="${L}" y="319" fill="#61757e">${rows.length?`${field.haloRepresentation==='geometry'?'Bariões vivos + halo NFW contínuo':'Campo das partículas'} · t=${Number(field.timeMyr).toFixed(2)} Myr · ${field.azimuthSamples} azimutes por raio`:'Inicie a simulação para medir as contribuições gravitacionais do modelo.'}</text>`;
 body+=`<text x="${L}" y="336" fill="#61757e" font-size="10">Fonte: Eilers et al. (2019), Tabela 1 · pontos fixos entre 5,27 e 24,82 kpc.</text><text x="${L}" y="351" fill="#61757e" font-size="10">Barras: erros estatísticos publicados; incertezas sistemáticas não incluídas.</text></g>`;
 const metadata={schema:'live-component-rotation-comparison-v1',units:{radius:'kpc',speed:'km/s'},field:field??null,observations:EILERS_2019,observationInterpolation:false,modelFittedToObservations:false};
 return body+`<metadata id="rotation-comparison-data">${escape(JSON.stringify(metadata))}</metadata></svg>`;
}
