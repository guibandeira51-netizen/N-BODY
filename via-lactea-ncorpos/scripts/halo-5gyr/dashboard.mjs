import {readFile,writeFile} from 'node:fs/promises';
const original=JSON.parse(await readFile('reports/resolution-decision/session-export-original.json')),samples=original.laboratory.samples.filter(s=>s.timeMyr<=5000.001).map(s=>({timeMyr:s.timeMyr,h50Kpc:s.diskFrame.instant.h50}));
await writeFile('reports/halo-5gyr/baseline-series.json',JSON.stringify({realizationId:original.laboratory.realizationId,counts:original.laboratory.initial.counts,samples,qualification:'Historical captured session. No new baseline integration. Actual retained epochs, no interpolation.'}));
