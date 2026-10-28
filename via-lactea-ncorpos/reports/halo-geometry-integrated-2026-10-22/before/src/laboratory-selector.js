// Navigation only: does not change an active realization, backend or force law.
const selector=document.getElementById('investigation-area'),link=document.getElementById('open-geometry-lab');
if(selector&&link)selector.addEventListener('change',()=>{link.hidden=selector.value!=='geometry';});
