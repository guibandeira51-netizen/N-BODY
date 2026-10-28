import {readFile,writeFile,readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {cleanDocumentLinksHTML,documentLinkAction} from '../../src/document-link-policy.js';
export async function cleanSiteDocumentLinks(root){
 const results=[];
 for(const name of (await readdir(root)).filter(n=>n.endsWith('.html')).sort()){
  const path=resolve(root,name),before=await readFile(path,'utf8');let after=cleanDocumentLinksHTML(before);
  if(!after.includes('src="./src/document-link-policy.js"'))after=after.replace(/<\/body>/i,'<script type="module" src="./src/document-link-policy.js"></script></body>');
  const links=[...before.matchAll(/<a\b[^>]*\bhref\s*=\s*(["'])(.*?)\1/gi)].map(m=>m[2]);
  if(after!==before)await writeFile(path,after);
  results.push({page:name,removedLinks:links.filter(h=>documentLinkAction(h)==='remove'),downloadLinks:links.filter(h=>documentLinkAction(h)==='download'),changed:after!==before});
 }
 return results;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(await cleanSiteDocumentLinks(resolve(import.meta.dirname,'../..')),null,2));
