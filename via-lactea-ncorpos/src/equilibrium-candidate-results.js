const $=id=>document.getElementById(id),base='./reports/equilibrium-rebuild/';
try{
 const response=await fetch(base+'index.json');if(!response.ok)throw Error('Índice dos resultados indisponível');const data=await response.json();
 function render(){
  const global=data.globalMetrics?.[$('metric').value];for(const id of ['generator','control','seed'])$(id).disabled=!!global;
  if(global){const source=base+global.figure;$('figure').src=source;$('figure').hidden=false;$('figure').alt=$('metric').selectedOptions[0].textContent;$('save').href=source;$('save').hidden=false;$('metadata').textContent=global.metadata;$('caption').textContent=global.caption;$('run-links').replaceChildren();return;}
  const generator=$('generator').value,control=$('control').value,seed=Number($('seed').value),metric=$('metric').value,row=data.selections.find(r=>r.generator===generator&&r.control===control&&r.seed===seed);if(!row)throw Error('Combinação não medida');
  const source=base+row.figures[metric];$('figure').src=source;$('figure').hidden=false;$('figure').alt=data.metrics[metric][0];$('save').href=source;$('save').hidden=false;
  $('metadata').textContent=`${data.controlLabels[control]} · semente ${seed} · N-base=400${control==='disk-live'?' (180 integradas)':''} · dt=0,1 Myr · ε=0,1 kpc · 200 Myr · CPU direta Float64`;
  $('caption').textContent='Resultados efetivamente calculados. Candidato experimental sem demonstração de equilíbrio; selecione outra semente para examinar a variabilidade.';
  $('run-links').replaceChildren();for(const id of row.runIDs){const run=data.runs.find(r=>r.id===id),li=document.createElement('li'),a=document.createElement('a');a.href='./'+run.path;a.download=id+'.json';a.textContent=(run.config.generator==='legacy'?'Legado':'Candidato')+' · estados medidos e configuração JSON';li.append(a);$('run-links').append(li);}
 }
 for(const id of ['generator','control','seed','metric'])$(id).addEventListener('change',()=>{try{render();}catch(e){$('metadata').textContent=e.message;$('figure').hidden=true;$('save').hidden=true;}});render();
}catch(e){$('metadata').textContent='Resultados não carregados: '+e.message;}
