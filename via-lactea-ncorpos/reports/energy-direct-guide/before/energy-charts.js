import {ENERGY_UNITS,numericFormat as num,zoomDomain} from './energy-chart-data.js';
const esc=x=>String(x).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const exact=x=>Number.isFinite(x)?String(x):'indisponível';
const axisNum=x=>{if(x===0)return '0';const a=Math.abs(x),v=a<.001||a>=1e5?x.toExponential(2):x.toLocaleString('pt-BR',{maximumSignificantDigits:3,useGrouping:false});return (x>0?'+':'')+v.replace('.',',');};
const wrap=(text,max)=>{const words=text.split(' '),lines=[];let line='';for(const word of words){if(line.length+word.length+1>max&&line){lines.push(line);line=word;}else line+=(line?' ':'')+word;}if(line)lines.push(line);return lines;};
const percent=x=>Number.isFinite(x)?num(x,true)+'%':'indisponível';
const save=(id,name)=>`<div class="live-chart-actions"><button type="button" class="save-chart" data-save-chart="${id}" aria-label="Salvar gráfico ${name}" disabled>Salvar gráfico</button></div>`;
export const energyChartsView=()=>`<section id="live-energy" class="energy-charts" aria-label="Diagnóstico energético"><div class="energy-panels"><figure class="energy-panel"><div class="energy-mode energy-mode-placeholder" aria-hidden="true">Estimativa aproximada · atualização temporal</div><div id="live-energy-bh"></div>${save('live-energy-bh','da energia estimada Barnes–Hut')}</figure><figure class="energy-panel"><div class="energy-mode"><label for="energy-direct-mode">Referência direta</label><select id="energy-direct-mode"><option value="relative">Variação relativa [%]</option><option value="total">Energia total E(t)</option></select></div><div id="live-energy-direct"></div>${save('live-energy-direct','da energia direta Float64')}</figure><figure class="energy-panel energy-bias-panel"><div class="energy-mode"><label for="energy-bias-mode">Comparação no mesmo snapshot</label><select id="energy-bias-mode"><option value="absolute">B(t) = E_BH − E_dir</option><option value="instant">Erro instantâneo ε_BH [%]</option><option value="change">Variação do viés ΔB(t)</option><option value="common">Variação do viés η(t) [%]</option></select></div><div id="live-energy-bias"></div>${save('live-energy-bias','da diferença entre Barnes–Hut e Float64')}</figure></div></section>`;

function rowTooltip(row,kind){
 if(kind==='bias')return `Tempo físico: ${exact(row.timeMyr)} Myr\nE_BH: ${exact(row.BH.E)}\nE_direta: ${exact(row.direct.E)}\nB = E_BH − E_direta: ${exact(row.B)} ${ENERGY_UNITS}\nErro instantâneo do estimador: ${percent(row.epsilonPercent)}\nΔB = B − B(0): ${exact(row.deltaB)} ${ENERGY_UNITS}\nη (denominador comum): ${percent(row.etaPercent)}\nVariação BH / |E_dir(0)|: ${percent(row.bhChangeCommonPercent)}\nVariação direta / |E_dir(0)|: ${percent(row.directChangeCommonPercent)}\nMesmo snapshot; erro do estimador, não da integração.`;
 return `Tempo físico: ${exact(row.timeMyr)} Myr\nK: ${exact(row.K)}\nU: ${exact(row.U)}\nE: ${exact(row.E)}\nUnidades de energia: ${ENERGY_UNITS}\nErro relativo assinado: ${exact(row.relative?.signed)} (${percent(row.relative?.percent)})\nErro relativo absoluto: ${exact(row.relative?.absolute)}\nMétodo: ${row.method}\nForça: ${row.forceAlgorithm??'registrada no relatório'}\nTrajetória: ${row.trajectoryPrecision??'registrada no relatório'}\nAvaliação: ${row.evaluationPrecision??'Float64 CPU'}\nG: ${exact(row.G)}; ε²: ${exact(row.epsilonSquared)} kpc²`;
}

export function energyPanelSVG(data,kind,{directMode='relative',biasMode='absolute',compact=false}={}){
 const wide=kind==='bias',W=wide&&!compact?1040:560,H=400,L=100,R=W-22,T=132,B=285;
 let rows,color,titleLines,yLabel,info,summary,mode,relativeAxis=true,reference=0;
 if(kind==='bh'){
  mode='relative';color='#67c59e';titleLines=['Energia estimada — Barnes–Hut'];yLabel='Variação relativa da energia [%]';
  rows=data.estimated.map(r=>({...r,value:r.relative?.percent??null}));info='Aproximação monopolar · valores medidos, sem suavização';
  summary=`Maior |desvio|: ${percent(data.summary.bhMaxAbsolutePercent)} · último: ${percent(data.summary.bhLastPercent)}`;
 }else if(kind==='direct'){
  mode=directMode;color='#e9ab55';titleLines=['Conservação energética —','Referência direta Float64'];relativeAxis=mode!=='total';
  rows=data.direct.map(r=>({...r,value:relativeAxis?r.relative?.percent??null:r.E}));yLabel=relativeAxis?'Variação relativa da energia direta [%]':'E(t) [unid. internas]';
  info='Snapshots auditados · somente marcadores · zoom automático';summary=`Maior erro direto amostrado: ${percent(data.summary.directMaxAbsolutePercent)}`;reference=relativeAxis?0:data.directInitial?.energy;
 }else{
  mode=biasMode;color='#85a9df';titleLines=compact?['Erro de estimativa energética —','Barnes–Hut versus Float64']:['Erro de estimativa energética — Barnes–Hut versus Float64'];
  const fields={absolute:'B',instant:'epsilonPercent',change:'deltaB',common:'etaPercent'};
  rows=data.comparison.map(r=>({...r,value:r[fields[mode]??'B']}));relativeAxis=mode==='instant'||mode==='common';
  yLabel=mode==='instant'?'Erro instantâneo do estimador ε_BH [%]':mode==='common'?'η = 100 ΔB / |E_dir(0)| [%]':`${mode==='change'?'ΔB = B − B(0)':'B = E_BH − E_dir'} [unid. internas]`;
  info='Comparação no mesmo snapshot · mede o estimador, não a integração';
  summary='A árvore, o critério de abertura e a distribuição de partículas podem variar o viés.';
 }
 const valid=rows.filter(r=>Number.isFinite(r.value)),domain=zoomDomain(valid.map(r=>r.value),{includeZero:kind!=='direct'||relativeAxis,absoluteEnergy:kind==='direct'&&!relativeAxis});
 const [xmin,xmax]=data.xDomain,X=t=>L+(R-L)*(t-xmin)/(xmax-xmin),Y=v=>B-(B-T)*(v-domain.min)/(domain.max-domain.min);
 // For tightly clustered total energies, show an explicit affine axis offset.
 const axisOffset=kind==='direct'&&!relativeAxis&&Math.abs(reference)/(domain.max-domain.min)>1e5?reference:0;
 if(axisOffset)yLabel='E(t) − E₀ [unid. internas]';
 const meta={...data,plot:{kind,mode,color,xDomain:data.xDomain,yDomain:domain,axisOffset,referenceValue:reference,interpolated:kind==='bh'?'straight segments between retained measured samples':false,plottedTimes:valid.map(r=>r.timeMyr)}};
 let body=`<rect width="${W}" height="${H}" fill="#102127"/><style>.energy-point:hover,.energy-point:focus{stroke:#fff;stroke-width:1.5;outline:none}</style><g font-family="Arial,sans-serif" fill="#d2e1e6" font-size="13">`;
 titleLines.forEach((line,i)=>body+=`<text x="20" y="${27+i*24}" fill="${color}" font-size="${wide&&!compact?20:18}" font-weight="600">${esc(line)}</text>`);
 for(const [text,y] of [[info,78],[summary,101]])wrap(text,Math.floor((W-40)/6.2)).forEach((line,i)=>body+=`<text x="20" y="${y+i*14}" font-size="12">${esc(line)}</text>`);
 if(!valid.length){
  const hasMeasured=kind==='bh'?data.estimated.length:kind==='direct'?data.direct.length:data.comparison.length;
  const message=hasMeasured?'Normalização relativa indisponível: módulo da energia de referência inadequado.':kind==='bh'?'Aguardando estados medidos.':data.direct.length&&kind==='bias'?'Comparação indisponível: energias consistentes do mesmo snapshot não disponíveis.':'Aguardando referência direta Float64.';
  body+=`<text x="${L}" y="205" font-size="13">${esc(message)}</text>`;
 }else{
  for(let i=0;i<=4;i++){
   const value=domain.min+(domain.max-domain.min)*i/4,yy=Y(value),time=xmin+(xmax-xmin)*i/4;
   body+=`<path d="M${L} ${yy}H${R}" stroke="#30474f"/><text x="${L-9}" y="${yy+4}" text-anchor="end">${esc(axisNum(value-axisOffset))}</text><text x="${X(time)}" y="${B+23}" text-anchor="middle">${esc(num(time))}</text>`;
  }
  if(Number.isFinite(reference)&&reference>=domain.min&&reference<=domain.max)body+=`<line data-reference="${relativeAxis||kind!=='direct'?'zero':'initial-energy'}" x1="${L}" x2="${R}" y1="${Y(reference)}" y2="${Y(reference)}" stroke="#d1dfe3" stroke-width="1.4" stroke-dasharray="5 4"/><text x="${R-3}" y="${Math.max(T+12,Y(reference)-5)}" text-anchor="end" font-size="11">${kind==='direct'&&!relativeAxis?'E₀':'0'}</text>`;
  if(kind==='bh'){
   let path='',open=false;for(const row of rows){if(!Number.isFinite(row.value)){open=false;continue;}path+=`${open?'L':'M'}${X(row.timeMyr)} ${Y(row.value)} `;open=true;}
   body+=`<path data-series="bh" d="${path}" fill="none" stroke="${color}" stroke-width="2"/>`;
  }
  for(const row of valid)body+=`<circle class="energy-point" data-series="${kind}" data-time-myr="${row.timeMyr}" data-value="${row.value}" cx="${X(row.timeMyr)}" cy="${Y(row.value)}" r="${kind==='bh'?2.7:4}" fill="${color}" tabindex="0" aria-label="${esc(rowTooltip(row,kind))}"><title>${esc(rowTooltip(row,kind))}</title></circle>`;
  body+=`<path d="M${L} ${T}V${B}H${R}" fill="none" stroke="#91aab3"/>`;
 }
 body+=`<text x="${(L+R)/2}" y="330" text-anchor="middle" font-size="14">Tempo físico [Myr]</text><text transform="translate(19 210) rotate(-90)" text-anchor="middle" font-size="12">${esc(yLabel)}</text>`;
 const notes=[];
 if(axisOffset)notes.push(`E(t) = E₀ + eixo; E₀ = ${String(reference)}. Zero absoluto fora do zoom.`);
 else if(kind!=='bias')notes.push(`Normalização: ${relativeAxis?'energia inicial própria em t = 0':'energia absoluta; linha tracejada em E₀'}.`);
 else notes.push(mode==='common'?'Denominador comum |E_dir(0)|; não subtrai percentuais nativos.':'Viés do diagnóstico; não representa sozinho energia física perdida ou adquirida.');
 if(domain.minimal)notes.push(`Escala mínima de exibição: ${num(domain.minimumDisplaySpan)} ${relativeAxis?'%':ENERGY_UNITS}; não é incerteza.`);
 if(!relativeAxis)notes.push(`Unidades internas: ${ENERGY_UNITS}.`);
 const noteLines=notes.flatMap(note=>wrap(note,Math.floor((W-40)/5.5)));
 noteLines.forEach((note,i)=>body+=`<text x="20" y="${355+i*17}" font-size="11" fill="#9cb7c1">${esc(note)}</text>`);
 const finalH=Math.max(H,365+17*noteLines.length);
 body=body.replace(`height="${H}" fill="#102127"`,`height="${finalH}" fill="#102127"`);
 body+='</g>';
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${finalH}" role="img" aria-label="${esc(titleLines.join(' '))}" data-energy-kind="${kind}"><desc>${esc(info)}. Escalas verticais independentes. Valores e limites disponíveis nos metadados.</desc>${body}<metadata id="energy-${kind}-data">${esc(JSON.stringify(meta))}</metadata></svg>`;
}

export function renderEnergyPanels(root,data){
 root.querySelector('#live-energy-bh').innerHTML=energyPanelSVG(data,'bh');
 root.querySelector('#live-energy-direct').innerHTML=energyPanelSVG(data,'direct',{directMode:root.querySelector('#energy-direct-mode').value});
 root.querySelector('#live-energy-bias').innerHTML=energyPanelSVG(data,'bias',{biasMode:root.querySelector('#energy-bias-mode').value,compact:root.querySelector('#live-energy').clientWidth<681});
}
