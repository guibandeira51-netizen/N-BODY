import {energyChartsView,renderEnergyPanels} from './energy-charts.js';
import {energyPanelsData} from './energy-chart-data.js';
const record=await fetch('../reports/energy-charts/recorded-80000.json').then(r=>r.json());
const data=energyPanelsData(record.samples,record.references,record.context),root=document.querySelector('#preview');
root.innerHTML=energyChartsView();
const draw=()=>renderEnergyPanels(root,data);draw();
for(const select of root.querySelectorAll('select'))select.addEventListener('change',draw);
new ResizeObserver(draw).observe(root);
for(const button of root.querySelectorAll('[data-save-chart]')){button.disabled=false;button.onclick=()=>{const svg=document.getElementById(button.dataset.saveChart).querySelector('svg'),a=document.createElement('a');a.href=URL.createObjectURL(new Blob([svg.outerHTML],{type:'image/svg+xml'}));a.download=button.dataset.saveChart+'.svg';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);};}
document.querySelector('#source').textContent=record.qualification+' SHA-256: '+record.sourceSHA256;
if(new URLSearchParams(location.search).get('layout')==='mobile')document.querySelector('main').style.maxWidth='390px';
