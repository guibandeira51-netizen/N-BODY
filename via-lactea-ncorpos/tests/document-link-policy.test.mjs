import test from 'node:test';import assert from 'node:assert/strict';import {readFile,readdir,stat} from 'node:fs/promises';
import {documentLinkAction,cleanDocumentLinksHTML} from '../src/document-link-policy.js';
test('raw text documents are removed including query strings, fragments and encoded paths',()=>{
 for(const href of ['./PARAMETROS_E_FONTES.md','notes.txt?download=1','/REPORT.MD#section','https://example.org/doc.markdown','./a%2Emd','./doc.rst'])assert.equal(documentLinkAction(href),'remove');
 for(const href of ['#title','./index.html','./fig.svg','./fig.png','./paper.pdf','./data.zip','https://doi.org/10.123/abc'])assert.equal(documentLinkAction(href),'keep');
 for(const href of ['./data.json','./data.csv?x=1','./code.sha256','./model.ini'])assert.equal(documentLinkAction(href),'download');
});
test('static cleanup removes document links and empty document-only groups, preserving scientific text',()=>{
 const html='<section><h2>Relatórios</h2><nav><a href="./a.md">Relatório</a> · <a href="b.txt">Texto</a></nav></section><p>Limitação científica que deve permanecer.</p><a href="./paper.pdf">Artigo</a>';
 const result=cleanDocumentLinksHTML(html);assert(!result.includes('Relatórios'));assert(!result.includes('href="./a.md"'));assert(result.includes('Limitação científica'));assert(result.includes('paper.pdf'));
});
test('empty runtime mounts survive cleanup and numeric datasets download instead of navigating',()=>{
 const html='<div id="comparison106"></div><div id="archive-list"></div><nav data-download106="1"></nav><a href="./data.json">Dados</a><a download href="./data.csv">CSV</a>';
 const result=cleanDocumentLinksHTML(html);for(const mount of ['<div id="comparison106"></div>','<div id="archive-list"></div>','<nav data-download106="1"></nav>'])assert(result.includes(mount));assert(result.includes('<a download href="./data.json">'));assert.equal((result.match(/\bdownload/g)||[]).length,3);
 assert.equal(cleanDocumentLinksHTML(result),result);
});
test('all public site pages have no raw-document anchors and load the dynamic-link policy',async()=>{
 const root=new URL('../',import.meta.url),pages=(await readdir(root)).filter(n=>n.endsWith('.html'));
 for(const page of pages){const html=await readFile(new URL(page,root),'utf8');for(const m of html.matchAll(/<a\b[^>]*\bhref\s*=\s*(["'])(.*?)\1/gi))assert.notEqual(documentLinkAction(m[2]),'remove',page+': '+m[2]);assert(html.includes('src="./src/document-link-policy.js"'),page);}
 assert((await stat(new URL('PARAMETROS_E_FONTES.md',root))).size>0);
});
test('link cleanup preserves historical empty mounts and applies to regenerated pages',async()=>{
 const root=new URL('../',import.meta.url),before=new URL('../reports/interface-text-links/before/',import.meta.url);
 for(const name of (await readdir(before)).filter(n=>n.endsWith('.html'))){const old=await readFile(new URL(name,before),'utf8'),current=cleanDocumentLinksHTML(old);for(const mount of old.matchAll(/<(div|nav|ul|ol)\b[^>]*\bid=["']([^"']+)["'][^>]*>\s*<\/\1>/gi))assert(current.includes('id="'+mount[2]+'"')||current.includes("id='"+mount[2]+"'"),name+': '+mount[2]);}
 const generator=await readFile(new URL('scripts/interface-106/site.mjs',root),'utf8'),build=await readFile(new URL('scripts/build.mjs',root),'utf8');assert(generator.includes('await cleanSiteDocumentLinks(root)'));assert(build.includes('await cleanSiteDocumentLinks(root)'));
});
