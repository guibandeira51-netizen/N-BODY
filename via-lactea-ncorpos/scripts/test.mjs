import {readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {spawn} from 'node:child_process';
const root=resolve(import.meta.dirname,'..');
const files=(await readdir(resolve(root,'tests'))).filter(n=>n.endsWith('.test.mjs')).sort().map(n=>resolve(root,'tests',n));
if(!files.length)throw Error('Nenhum arquivo de teste encontrado.');
const child=spawn(process.execPath,['--test',...files],{cwd:root,stdio:'inherit'});
child.on('error',e=>{console.error(e);process.exitCode=1;});
child.on('exit',code=>{process.exitCode=code??1;});
