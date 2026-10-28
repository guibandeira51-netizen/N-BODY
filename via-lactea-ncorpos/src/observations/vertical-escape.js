// Numerical facts transcribed from the original published tables/text, not
// digitized from figures. Metadata and original precision travel with exports.
const verticalRows=[
 [4.63,217.6,41.5],[4.68,230.6,36.8],[6.71,84.2,18.5],[4.77,209.0,33.2],
 [4.59,194.7,38.6],[5.04,180.5,29.2],[5.22,179.0,25.6],[4.68,211.4,33.7],
 [7.38,62.2,11.2],[6.53,97.5,18.0],[6.62,109.8,12.9],[6.66,119.0,12.9],
 [5.08,176.8,30.1],[7.42,61.7,11.0],[6.53,115.9,14.8],[7.11,92.0,7.5],
 [6.71,121.9,10.9],[6.53,96.1,18.0],[7.20,77.3,11.8],[7.20,95.2,9.3],
 [6.34,146.3,11.5],[6.79,101.2,13.4],[7.29,84.9,9.1],[7.29,88.5,7.4],
 [7.02,98.7,8.2],[6.57,100.8,17.1],[7.56,74.5,8.1],[6.75,114.3,11.7],
 [6.84,108.4,9.4],[5.54,168.6,20.9],[7.29,87.2,9.6],[6.57,140.1,12.4],
 [5.67,170.6,19.5],[7.70,72.8,8.0],[7.88,62.4,8.2],[7.70,73.9,7.8],
 [6.08,147.4,17.7],[6.57,113.2,14.9],[7.92,69.2,6.8],[8.55,53.4,4.7],
 [7.20,101.3,9.4],[6.03,132.4,18.8],[4.82,206.2,35.7]
];
export const BOVY_RIX_2013=Object.freeze({citation:'Bovy & Rix (2013)',url:'https://arxiv.org/abs/1309.0809v3',doi:'10.1088/0004-637X/779/2/115',table:'Table 3, PDF page 17 (zero-based page 16), columns R, KZ, deltaKZ',zKpc:1.1,solarRadiusKpc:8,units:'KZ/(2πG) in Msun pc^-2; force-equivalent surface density, not actual column density',qualification:'43 inferred vertical forces from SEGUE mono-abundance populations. Published marginal uncertainties; no complete covariance or systematic band provided here. R0=8 kpc retained without silent coordinate shifts.',rows:Object.freeze(verticalRows.map(([R_kpc,value,error])=>Object.freeze({R_kpc,value,error})))});
export const ROCHE_2024=Object.freeze({citation:'Roche et al. (2024)',url:'https://arxiv.org/html/2402.00108v2#S5.SS2',doi:'10.3847/1538-4357/ad58d7',source:'Section V.2, first paragraph reporting final 8–9 kpc results; v2 checked 2026-10-23',boundary:'2 R200c in Section VI.1; model boundary must be stated',qualification:'SEPL and 2PL are alternative inferences from the SAME Gaia DR3 sample, not independent measurements. Only explicitly tabulated-in-text values retained; no profile digitization.',rows:Object.freeze([
 Object.freeze({method:'SEPL',R_kpc:8.5,R_min_kpc:8,R_max_kpc:9,value:486,minus:5,plus:10}),
 Object.freeze({method:'2PL',R_kpc:8.5,R_min_kpc:8,R_max_kpc:9,value:539,minus:34,plus:69})
])});
