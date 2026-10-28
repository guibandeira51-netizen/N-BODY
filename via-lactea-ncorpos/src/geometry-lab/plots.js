export const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const num=x=>Math.abs(x)>0&&(Math.abs(x)<.001||Math.abs(x)>1e5)?x.toExponential(2):x.toLocaleString('pt-BR',{maximumSignificantDigits:4});
export function chartSVG({title,description,xLabel,yLabel,series,equalAxes=false,metadata={}}){
 const W=760,H=440,L=85,R=730,T=110,B=355,points=series.flatMap(s=>s.points).filter(p=>p.every(Number.isFinite));
 let xmin=Math.min(0,...points.map(p=>p[0])),xmax=Math.max(1,...points.map(p=>p[0])),ymin=Math.min(0,...points.map(p=>p[1])),ymax=Math.max(1,...points.map(p=>p[1]));
 if(equalAxes){const size=Math.max(Math.abs(xmin),Math.abs(xmax),Math.abs(ymin),Math.abs(ymax))*1.05;ymin=-size;ymax=size;const half=size*(R-L)/(B-T);xmin=-half;xmax=half;}else ymax*=1.07;
 const X=x=>L+(x-xmin)/(xmax-xmin)*(R-L),Y=y=>B-(y-ymin)/(ymax-ymin)*(B-T);
 let svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${escape(title)}"><title>${escape(title)}</title><desc>${escape(description)}</desc><metadata>${escape(JSON.stringify(metadata))}</metadata><rect width="760" height="440" fill="#102129"/><g fill="#d9eff0" font-family="Arial,sans-serif" font-size="12"><text x="22" y="30" font-size="18">${escape(title)}</text>`;
 series.forEach((s,i)=>svg+=`<path d="M25 ${52+i*20}h25" stroke="${s.color}" stroke-width="${s.width??2}" ${s.dashed?'stroke-dasharray="5 4"':''}/><text x="58" y="${56+i*20}">${escape(s.name)}</text>`);
 for(let i=0;i<=4;i++){const x=xmin+(xmax-xmin)*i/4,y=ymin+(ymax-ymin)*i/4;svg+=`<path d="M${L} ${Y(y)}H${R}" stroke="#29434c"/><text x="${L-9}" y="${Y(y)+4}" text-anchor="end">${num(y)}</text><text x="${X(x)}" y="${B+23}" text-anchor="middle">${num(x)}</text>`;}
 svg+=`<path d="M${L} ${T}V${B}H${R}" fill="none" stroke="#a9c5ca"/>`;
 series.forEach(s=>{let path='',open=false;for(const p of s.points){if(!p.every(Number.isFinite)){open=false;continue;}path+=`${open?'L':'M'}${X(p[0])} ${Y(p[1])} `;open=true;}
  svg+=`<path data-series="${escape(s.key)}" d="${path}" stroke="${s.color}" stroke-width="${s.width??2}" fill="none" ${s.dashed?'stroke-dasharray="5 4"':''}/>`;
  for(const p of s.points)if(p.every(Number.isFinite))svg+=`<circle cx="${X(p[0])}" cy="${Y(p[1])}" r="3" opacity="0" fill="${s.color}"><title>${escape(s.name)}: ${escape(xLabel)}=${p[0]}; ${escape(yLabel)}=${p[1]}. Valor calculado no modelo indicado.</title></circle>`;
 });
 return svg+`<text x="405" y="${H-35}" text-anchor="middle">${escape(xLabel)}</text><text transform="translate(20 232) rotate(-90)" text-anchor="middle">${escape(yLabel)}</text><text x="25" y="${H-12}" fill="#91acb5" font-size="10">Modelos teóricos · CPU Float64 · laboratório separado · sem ajuste observacional</text></g></svg>`;
}
export function figureData(report,kind,focus='baryons'){
 const series=(key,name,color,points,dashed=false)=>({key,name,color,points,dashed,width:key===focus?3:1.8});
 const metadata={schema:report.schema,computedUTC:report.computedUTC,configuration:report.configuration,parameters:report.parameters,assumptions:report.assumptions,sources:report.sources,codeIdentity:report.codeIdentity??null};
 if(kind==='rotation')return{title:'Curvas de rotação · fonte e geometria',description:'Bariônica newtoniana e RG na ordem dominante coincidem por construção da aproximação. A curva NFW inclui massa adicional; não é uma solução de vácuo.',xLabel:'R [kpc]',yLabel:'Velocidade circular [km/s]',metadata,
  series:[series('baryons','Bariônica newtoniana = RG na ordem dominante','#68c5a7',report.rotation.map(r=>[r.R_kpc,r.baryons_km_s])),series('total','Referência: bariônica + halo NFW material','#e9ae63',report.rotation.map(r=>[r.R_kpc,r.total_km_s]),true)]};
 if(kind==='lensing')return{title:'Deflexão da luz · RG em campo fraco',description:'Deflexão física assintótica calculada em Born; linha de visada z, disco de frente. Sem distâncias fonte/lente, não se calcula um ângulo de imagem observado.',xLabel:'Parâmetro de impacto b [kpc]',yLabel:'Deflexão física [arcsec]',metadata,
  series:[series('baryons','RG: fonte bariônica','#68c5a7',report.lensing.map(r=>[r.b_kpc,r.baryons_arcsec])),series('total','RG: fonte bariônica + halo material','#e9ae63',report.lensing.map(r=>[r.b_kpc,r.total_arcsec]),true)]};
 if(kind==='orbits')return{title:'Órbitas de teste · mesmo estado inicial',description:'Plano z=0; velocidade inicial circular no campo bariônico, idêntica nos dois casos. KDK Float64 em potenciais fixos; limite lento da RG, sem autogravidade ou geodésicas relativísticas completas.',xLabel:'x [kpc]',yLabel:'y [kpc]',equalAxes:true,metadata,
  series:report.orbits.map((o,i)=>series(i?'total':'baryons',i?'Referência com halo material':'Bariônica · ordem dominante da RG',i?'#e9ae63':'#68c5a7',o.rows.map(r=>[r.x_kpc,r.y_kpc]),i===1))};
 throw Error('Figura desconhecida.');
}
export function figureCSV(report,kind){
 const rows=kind==='rotation'?report.rotation:kind==='lensing'?report.lensing:kind==='source'?report.sourceChecks:report.orbits.flatMap(o=>o.rows.map(r=>({with_material_halo:o.withHalo,dt_Myr:o.dt_Myr,...r})));
 const keys=Object.keys(rows[0]),quote=v=>'"'+String(v).replaceAll('"','""')+'"';return keys.map(quote).join(',')+'\n'+rows.map(row=>keys.map(k=>quote(row[k])).join(',')).join('\n')+'\n';
}
