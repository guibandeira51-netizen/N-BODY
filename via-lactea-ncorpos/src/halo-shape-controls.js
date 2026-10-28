import{haloShapeOptions}from'./physics/halo-ellipsoid.js';
const $=id=>document.getElementById(id);
export function selectedHaloShape(){return haloShapeOptions({type:$('halo-shape').value,p:Number($('halo-p').value),q:Number($('halo-q').value),yaw:Number($('halo-yaw').value),pitch:Number($('halo-pitch').value),roll:Number($('halo-roll').value),order:64});}
export function updateHaloShapeControls(reset=false){
 const continuous=$('model').value==='halo'&&$('halo-representation').value==='geometry',type=$('halo-shape').value;
 $('halo-shape-controls').hidden=!continuous;
 if(reset){const defaults={spherical:[1,1],oblate:[1,.8],prolate:[1,1.25],triaxial:[.85,.7]}[type];$('halo-p').value=defaults[0];$('halo-q').value=defaults[1];}
 const locked=$('mode').disabled;$('halo-shape').disabled=locked;$('halo-p').disabled=locked||type!=='triaxial';$('halo-q').disabled=locked||type==='spherical';
 for(const id of ['halo-yaw','halo-pitch','halo-roll'])$(id).disabled=locked||type==='spherical';
}
