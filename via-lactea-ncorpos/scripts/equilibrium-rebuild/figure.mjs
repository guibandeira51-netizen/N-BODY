// Standalone scientific SVG; straight guides only, explicit gaps and real-point tooltips.
const escape=x=>String(x).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const colors=['#25765e','#d17425','#3e70bd','#9b4c91','#6d741f'];
export function auditFigure(series,{title,xLabel,yLabel,logY=false}={}){
 const valid=p=>Number.isFinite(p[0])&&Number.isFinite(p[1])&&(!logY||p[1]>0),points=series.flatMap(s=>s.points.filter(valid));
 if(!points.length)return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 360"><rect width="960" height="360" fill="white"/><text x="30" y="45" font-family="Arial">${escape(title)} — componente ausente neste controle</text></svg>`;
 const values=points.map(p=>logY?Math.log10(p[1]):p[1]);let xmin=Math.min(...points.map(p=>p[0])),xmax=Math.max(...points.map(p=>p[0])),ymin=Math.min(...values),ymax=Math.max(...values);if(xmax===xmin)xmax=xmin+1;if(ymax===ymin){const pad=Math.max(1e-10,Math.abs(ymin)*.05);ymin-=pad;ymax+=pad;}
 const X=x=>100+805*(x-xmin)/(xmax-xmin),Y=y=>360-255*((logY?Math.log10(y):y)-ymin)/(ymax-ymin),height=480+24*Math.ceil(series.length/2);
 let body=`<rect width="960" height="${height}" fill="white"/><g font-family="Arial,sans-serif" fill="#173039" font-size="13"><text x="30" y="34" font-size="21">${escape(title)}</text><text x="100" y="65" fill="#667b80">Candidato experimental sem certificação de equilíbrio</text>`;
 for(let k=0;k<=5;k++){const u=k/5,x=xmin+u*(xmax-xmin),yv=ymin+u*(ymax-ymin),yp=360-u*255;body+=`<path d="M100 ${yp}H905" stroke="#dce5e7"/><text x="90" y="${yp+4}" text-anchor="end">${(logY?10**yv:yv).toPrecision(4)}</text><text x="${X(x)}" y="383" text-anchor="middle">${x.toPrecision(4)}</text>`;}
 body+=`<path d="M100 105V360H905" stroke="#49636c" fill="none"/><text x="500" y="410" text-anchor="middle">${escape(xLabel)}</text><text transform="translate(24 240) rotate(-90)" text-anchor="middle">${escape(yLabel)}</text>`;
 series.forEach((s,i)=>{const color=colors[i%colors.length];let path='',open=false;for(const p of s.points){if(!valid(p)){open=false;continue;}path+=(open?'L':'M')+X(p[0]).toFixed(3)+' '+Y(p[1]).toFixed(3)+' ';open=true;}
  body+=`<path d="${path}" fill="none" stroke="${color}" stroke-width="1.6"/>`;for(const p of s.points.filter(valid))body+=`<circle cx="${X(p[0])}" cy="${Y(p[1])}" r="3.1" fill="${color}"><title>${escape(s.label)}: x=${p[0]}, y=${p[1]}</title></circle>`;
  const x=100+(i%2)*410,y=445+Math.floor(i/2)*24;body+=`<path d="M${x} ${y-4}h20" stroke="${color}" stroke-width="2"/><text x="${x+28}" y="${y}" fill="${color}" font-size="12">${escape(s.label)}</text>`;
 });
 body+=`<text x="100" y="${height-13}" fill="#657b81" font-size="11">Fonte: estados integrados e perfis-alvo · Guilherme Aleixo Bandeira · UEMS</text></g>`;
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 ${height}" role="img" aria-label="${escape(title)}"><desc>Marcadores: valores tabulados reais. Segmentos: guias retos. Lacunas não recebem valores artificiais. Perfis-alvo são previsões do modelo, não observações.</desc>${body}</svg>`;
}
