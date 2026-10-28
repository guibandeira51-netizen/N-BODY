const status=document.getElementById('stage102-status');
try{
 const response=await fetch('./reports/v1.0.2/assessment.json');if(!response.ok)throw Error('HTTP '+response.status);const data=await response.json();
 if(data.schema!=='softened-stage1-assessment-102'||data.milestone!==1)throw Error('Manifesto incompatível.');
 status.textContent=data.publicConclusion+' '+data.completedIntegrations+' integrações concluídas; sementes '+data.seeds.join(', ')+'.';
 const mean=data.gpuGrowthMeanPercent;document.getElementById('stage102-growth').textContent=mean.baseline.toFixed(2).replace('.',',')+'% → '+mean.corrected.toFixed(2).replace('.',',')+'%';
 const safe=path=>typeof path==='string'&&/^reports\/v1\.0\.2\/figures\/[a-z0-9-]+\.(png|svg|csv)$/.test(path)?'./'+path:null;
 for(const row of data.figures){const png=safe(row.path);if(!png)continue;const figure=document.createElement('figure'),img=document.createElement('img'),caption=document.createElement('figcaption'),title=document.createElement('strong'),note=document.createElement('p'),links=document.createElement('div');img.src=png;img.alt=row.title;img.loading='lazy';img.decoding='async';title.textContent='Figura '+row.requestedNumber+' · '+row.title;note.textContent=row.limitations;caption.append(title,note,links);for(const [path,label]of [[row.path,'PNG'],[row.svgPath,'SVG'],[row.dataPath,'Dados CSV']]){const href=safe(path);if(!href)continue;const a=document.createElement('a');a.href=href;a.download='';a.textContent=label;links.append(a);}figure.append(img,caption);document.getElementById('stage102-figures').append(figure);}
}catch(e){status.textContent='Evidências 1.0.2 indisponíveis ('+e.message+'). Consulte os arquivos e confirme o manifesto; não há certificação de estabilidade.';}
