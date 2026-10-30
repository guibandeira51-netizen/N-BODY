// Display ticks only: never round, resample or modify measured values.
const superscript=value=>String(value).replace(/[-0-9]/g,c=>'⁻⁰¹²³⁴⁵⁶⁷⁸⁹'['-0123456789'.indexOf(c)]);
export function axisLabel(value,step=1){
 if(Math.abs(value)<Math.abs(step)*1e-9)value=0;
 if(value===0)return '0';
 const a=Math.abs(value);
 if(a<1e-3||a>=1e7){const exponent=Math.floor(Math.log10(a)),mantissa=value/10**exponent,decimals=Math.max(0,Math.min(12,Math.ceil(-Math.log10(Math.abs(step)/10**exponent))+1));return `${Number(mantissa.toFixed(decimals)).toLocaleString('pt-BR',{maximumFractionDigits:12})} × 10${superscript(exponent)}`;}
 const decimals=Math.max(0,Math.min(12,Math.ceil(-Math.log10(Math.abs(step)))+1));
 return value.toLocaleString('pt-BR',{maximumFractionDigits:decimals});
}
export function linearAxis(min,max,{count=4,expand=true}={}){
 if(!Number.isFinite(min)||!Number.isFinite(max)){min=0;max=1;}
 if(max<=min)max=min+Math.max(1e-6,Math.abs(min)*.1);
 const raw=(max-min)/count,power=10**Math.floor(Math.log10(raw)),fraction=raw/power;
 const step=([1,2,2.5,5,10].find(x=>x>=fraction*(1-1e-6))??10)*power;
 const lower=expand?Math.min(min,Math.floor(min/step+1e-6)*step):min,upper=expand?Math.max(max,Math.ceil(max/step-1e-6)*step):max;
 const ticks=[];for(let k=Math.ceil(lower/step-1e-9);k<=Math.floor(upper/step+1e-9);k++)ticks.push(Number((k*step).toPrecision(14)));
 return{min:lower,max:upper,step,ticks};
}
export function logTicks(min,max){
 const ticks=[];for(let e=Math.floor(Math.log10(min));e<=Math.ceil(Math.log10(max));e++)for(const m of [1,2,5]){const x=m*10**e;if(x>=min&&x<=max)ticks.push(x);}return ticks;
}
