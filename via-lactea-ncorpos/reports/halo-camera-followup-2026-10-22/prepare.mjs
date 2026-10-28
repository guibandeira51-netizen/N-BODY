import {readFile,writeFile} from 'node:fs/promises';
const edit=async(file,transform)=>{const before=await readFile(file,'utf8'),after=transform(before);if(before===after)throw Error('No change: '+file);await writeFile(file,after);};
await edit('experimento-ncorpos.html',s=>s.replace(/<label class="field-help geometry-visual-toggle"><input id="geometry-fixed-camera".*?<\/p>/,'<div class="field"><label for="geometry-projection">Projeção da visualização</label><select id="geometry-projection"><option value="orthographic" selected>Ortográfica · comparação de alturas</option><option value="perspective">Perspectiva</option></select></div><label class="field-help geometry-visual-toggle"><input id="geometry-fixed-camera" type="checkbox" checked aria-describedby="geometry-camera-note"><span>Manter câmera fixa ao comparar amplificações</span></label><p id="geometry-camera-note" class="field-help">A comparação começa ortográfica e com câmera fixa. Desmarque para girar, aproximar ou escolher outra projeção; depois trave novamente. Travar preserva a projeção atual. Alterar a amplificação nunca ajusta a câmera: valores altos podem sair da tela. Em perspectiva, a profundidade também afeta a aparência da malha.</p><p id="geometry-camera-state" class="field-help" role="status">Câmera ortográfica · comparação fixa ao iniciar.</p>'));
await edit('scripts/build.mjs',s=>s.replace("'halo-amplification-2026-10-22']","'halo-amplification-2026-10-22','halo-camera-followup-2026-10-22']"));
await edit('tests/halo-amplification.test.mjs',s=>s.replace("assert.equal(before.projection,'orthographic')","assert.equal(before.projection,'perspective')").replace('camera.setComparisonLocked(true);const m=',"camera.setProjection('orthographic');camera.setComparisonLocked(true);const m=")+`
test('locking and unlocking preserve each selected projection and all matrices',()=>{
 const camera=new OrbitCamera(canvas(),{distance:180});
 for(const mode of ['perspective','orthographic']){
  camera.setProjection(mode);const before=camera.snapshot();camera.setComparisonLocked(true);const locked=camera.snapshot();
  for(const key of ['position','target','projection','distance','fov','near','far','zoom','viewMatrix','projectionMatrix','viewProjectionMatrix'])assert.deepEqual(locked[key],before[key],key);
  camera.setProjection(mode==='perspective'?'orthographic':'perspective');assert.equal(camera.snapshot().projection,mode);
  camera.setComparisonLocked(false);const after=camera.snapshot();for(const key of ['viewMatrix','projectionMatrix','viewProjectionMatrix'])assert.deepEqual(after[key],before[key]);
 }
 camera.dispose();
});
test('particle eye depth is independent of perspective/orthographic homogeneous w',()=>{
 const camera=new OrbitCamera(canvas(),{target:[1,2,3],distance:180}),point=[12,-5,1];camera.matrix();const perspectiveDepth=camera.depthRow().slice();
 camera.setProjection('orthographic');camera.matrix();assert.deepEqual(camera.depthRow(),perspectiveDepth);
 const eyeDepth=perspectiveDepth[0]*point[0]+perspectiveDepth[1]*point[1]+perspectiveDepth[2]*point[2]+perspectiveDepth[3];assert(eyeDepth>100);
 assert.equal(camera.matrix()[15],1);assert.notEqual(eyeDepth,1);camera.dispose();
});
`);
let harness=await readFile('reports/halo-amplification-2026-10-22/check.js','utf8');
harness=harness.replace('camera.setComparisonLocked(true,900,600);',"camera.setProjection('orthographic');camera.setComparisonLocked(true,900,600);")
 .replaceAll('{showGeometry:true,amplification:8}','{showGeometry:true,amplification:8,eyeDepth:camera.depthRow()}')
 .replaceAll('{showGeometry:true,amplification:50}','{showGeometry:true,amplification:50,eyeDepth:camera.depthRow()}');
harness=harness.replace('const energy=s=>directEnergy',`const pixels=[];
for(const projection of ['orthographic','perspective']){
 camera.setComparisonLocked(false);camera.setProjection(projection);camera.setComparisonLocked(true,900,600);
 const camBefore=camera.snapshot(900,600);
 renderer.context.configure({device:backend.device,format:renderer.format,alphaMode:'opaque',usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.COPY_SRC});
 renderer.draw(camera.matrix(900,600),[true,true,false],undefined,{showGeometry:false,amplification:8,eyeDepth:camera.depthRow()});const image8=await readPixels(renderer);
 renderer.draw(camera.matrix(900,600),[true,true,false],undefined,{showGeometry:false,amplification:50,eyeDepth:camera.depthRow()});const image50=await readPixels(renderer);
 let changedBytes=0;for(let i=0;i<image8.length;i++)changedBytes+=image8[i]!==image50[i];
 pixels.push({projection,width:renderer.canvas.width,height:renderer.canvas.height,bytes:image8.length,changedBytes,cameraExact:equal(camBefore,camera.snapshot(900,600)),eyeDepth:Array.from(camera.depthRow())});
}
camera.setComparisonLocked(false);camera.setProjection('orthographic');camera.setComparisonLocked(true,900,600);
renderer.draw(camera.matrix(900,600),[true,true,false],undefined,{showGeometry:true,amplification:50,eyeDepth:camera.depthRow()});
const energy=s=>directEnergy`)
 .replace('mode,n:backend.n,vertices:','mode,n:backend.n,pixels,vertices:')
 .replace('r.energyExact);','r.energyExact&&r.pixels.every(p=>p.changedBytes===0&&p.cameraExact));');
harness+=`
async function readPixels(renderer){const {device,context,canvas}=renderer,width=canvas.width,height=canvas.height,bytesPerRow=Math.ceil(width*4/256)*256,buffer=device.createBuffer({size:bytesPerRow*height,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});try{const encoder=device.createCommandEncoder();encoder.copyTextureToBuffer({texture:context.getCurrentTexture()},{buffer,bytesPerRow,rowsPerImage:height},{width,height});device.queue.submit([encoder.finish()]);await buffer.mapAsync(GPUMapMode.READ);const mapped=new Uint8Array(buffer.getMappedRange()),out=new Uint8Array(width*height*4);for(let y=0;y<height;y++)out.set(mapped.subarray(y*bytesPerRow,y*bytesPerRow+width*4),y*width*4);return out;}finally{buffer.unmap();buffer.destroy();}}
`;
await writeFile('reports/halo-camera-followup-2026-10-22/check.js',harness);
await writeFile('reports/halo-camera-followup-2026-10-22/check.html',(await readFile('reports/halo-amplification-2026-10-22/check.html','utf8')).replaceAll('Amplificação vertical · vértices e câmera','Amplificação vertical · câmera, partículas e vértices'));
console.log('Prepared UI, regression tests and independent GPU pixel comparison.');
