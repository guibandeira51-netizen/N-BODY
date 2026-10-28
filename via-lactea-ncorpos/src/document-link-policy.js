// Interface policy only. Scientific reports and numeric datasets remain on disk.
export function documentLinkAction(href){
 if(!href||href.trim().startsWith('#'))return 'keep';
 let path;try{const url=new URL(href,'https://site.invalid/');if(!/^https?:$/.test(url.protocol))return 'keep';path=decodeURIComponent(url.pathname).toLowerCase();}catch{return 'keep';}
 if(/\.(md|markdown|txt|rst)$/.test(path))return 'remove';
 if(/\.(json|csv|tsv|sha256|log|tap|ini|js|mjs|py|wgsl|css|yaml|yml|toml|xml)$/.test(path))return 'download';
 return 'keep';
}
export function cleanDocumentLinksHTML(html){
 let result=html.replace(/<a\b([^>]*\bhref\s*=\s*(["'])(.*?)\2[^>]*)>[\s\S]*?<\/a\s*>/gi,(anchor,attributes,quote,href)=>{
  const action=documentLinkAction(href.replaceAll('&amp;','&'));
  if(action==='remove')return '<!--raw-document-link-removed-->';
  if(action==='download'&&!/\bdownload(?:\s|=|$)/i.test(attributes))return anchor.replace(/^<a\b/i,'<a download');
  return anchor;
 });
 const marker='<!--raw-document-link-removed-->';
 for(let pass=0;pass<5;pass++)result=result.replace(/<(nav|ul|ol|li|div)\b[^>]*>((?:\s|·|\||↗|<!--raw-document-link-removed-->)*?)<\/\1\s*>/gi,(block,tag,body)=>body.includes(marker)?marker:block).replace(/<section\b[^>]*>\s*<h[23]\b[^>]*>[^<]*<\/h[23]>((?:\s|·|\||<!--raw-document-link-removed-->)*?)<\/section>/gi,(block,body)=>body.includes(marker)?marker:block);
 return result.replaceAll(marker,'');
}
export function applyDocumentLinkPolicy(root){
 const anchors=[...(root.matches?.('a[href]')?[root]:[]),...(root.querySelectorAll?.('a[href]')??[])];
 for(const a of anchors){const action=documentLinkAction(a.getAttribute('href'));if(action==='remove')a.remove();else if(action==='download')a.setAttribute('download','');}
}
if(typeof document!=='undefined'){
 applyDocumentLinkPolicy(document);
 const observer=new MutationObserver(records=>{for(const record of records){if(record.type==='attributes')applyDocumentLinkPolicy(record.target);else for(const node of record.addedNodes)if(node.nodeType===1)applyDocumentLinkPolicy(node);}});
 observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['href']});
}
