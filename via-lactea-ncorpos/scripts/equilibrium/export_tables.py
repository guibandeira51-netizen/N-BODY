"""Mass-weighted CSV views of complete run records; raw JSON remains authoritative."""
from pathlib import Path
import json,csv,argparse,math
import numpy as np

def write(path,rows):
 if not rows:return
 fields=list(dict.fromkeys(k for r in rows for k in r))
 with path.open('w',encoding='utf-8-sig',newline='') as f:w=csv.DictWriter(f,fieldnames=fields);w.writeheader();w.writerows(rows)
def main():
 p=argparse.ArgumentParser();p.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[2]);a=p.parse_args();out=a.root/'reports/v1.0.0';tables=out/'tables';tables.mkdir(exist_ok=True);components=[];profiles=[];rings=[];cohorts=[];migration=[];frozen=[];conservation=[];global_disk=[]
 for file in sorted((out/'runs').glob('*.json')):
  run=json.loads(file.read_text(encoding='utf8'));
  if run.get('status')!='completed':continue
  for s in run['samples']:
   tag={'run':run['id'],'model':s['modelId'],'time_Myr':s['timeMyr']}
   d=s['conservation'];row={**tag,'energy':d['energy'],'kinetic':d['kinetic'],'potential':d['potential'],'energy_approximate':d['energyApproximate'],'mass_1e10_Msun':d['mass'],'relative_energy_error':s['errors']['energy'],'scaled_momentum_error':s['errors']['momentum'],'scaled_angular_momentum_error':s['errors']['angularMomentum']}
   for key in ['momentum','angularMomentum','centerOfMass']:
    row.update({key+'_'+axis:value for axis,value in zip('xyz',d[key])})
   conservation.append(row);disk=s['disk'];global_disk.append({**tag,'h50_fixed_kpc':disk['fixed']['h50'],'h50_instant_kpc':disk['instant']['h50'],'sigma_normal_kpc_Myr':disk['instant']['sigmaNormal'],'tilt_degrees':disk['plane']['tiltDegrees'],**{'plane_normal_'+axis:v for axis,v in zip('xyz',disk['plane']['normal'])}})
   for c in s['structure']['components']:
    L=c['angularMomentum'];norm=math.hypot(*L);row={**tag,'component':c['id'],'count':c['count'],'mass_Msun':c['mass']*1e10,'particle_min_Msun':c['particleMass']['minimum']*1e10,'particle_max_Msun':c['particleMass']['maximum']*1e10,'r50_kpc':c['r50'],'R50_kpc':c['R50'],'h50_fixed_kpc':c['massMedianAbsZ'],'sigma_R_kpc_Myr':c['velocity']['dispersion'][0],'sigma_phi_kpc_Myr':c['velocity']['dispersion'][1],'sigma_z_kpc_Myr':c['velocity']['dispersion'][2],'mean_vphi_kpc_Myr':c['velocity']['mean'][1],'L_tilt_deg':math.degrees(math.acos(max(-1,min(1,L[2]/norm)))) if norm else None,'W_virial':c['virial']['W'],'twiceK_over_minusW':c['virial']['twiceKOverNegativeW']};components.append(row)
    if c.get('profiles'):
     for kind in ['spherical','cylindrical','vertical']:
      for b in c['profiles'][kind]['bins']:profiles.append({**tag,'component':c['id'],'kind':kind,'lower_kpc':b['lower'],'upper_kpc':b['upper'],'count':b['count'],'mass_1e10_Msun':b['mass'],'density':b['density'],'density_unit':c['profiles'][kind]['densityUnit'],'measure':b['measure']})
   for ring in s['disk']['rings']:
    row={**tag,'lower_kpc':ring['lower'],'upper_kpc':ring['upper'],'count':ring['count'],'mass_Msun':ring['mass']*1e10,'surface_density_Msun_kpc2':ring['surfaceDensity']*1e10,'mean_vR_kpc_Myr':ring['meanRadialVelocity'],'mean_vphi_kpc_Myr':ring['meanAzimuthalVelocity'],'sigma_R_kpc_Myr':ring['sigmaR'],'sigma_phi_kpc_Myr':ring['sigmaPhi'],'sigma_normal_kpc_Myr':ring['globalPlane']['sigmaNormal'],'h50_global_plane_kpc':ring['globalPlane']['h50'],'h50_local_plane_kpc':(ring['localPlane'] or {}).get('h50'),'warp_median_height_kpc':ring['globalPlane']['medianSignedHeight'],'local_tilt_degrees':(ring['localPlane'] or {}).get('tiltFromGlobalDegrees'),'initial_vc_kpc_Myr':ring['orbit']['vc'],'initial_kappa_per_Myr':ring['orbit']['kappa'],'Q_conditional':ring['Qconditional']}
    for mode in ring['modes']:
     m=mode['m'];row.update({f'A{m}':mode['amplitude'],f'phase{m}_rad':mode['phaseRadians'],f'noise_RMS{m}':mode['inferenceRms'],f'conditional_P{m}':mode['approximateNullP']})
    rings.append(row)
   for i,c in enumerate(s['cohorts']['cohortStats']):
    cohorts.append({**tag,**c})
    for j,m in enumerate(s['cohorts']['initialRingToCurrentRingMass'][i]):migration.append({**tag,'initial_ring_index':i,'current_ring_index':j,'overflow_column':s['cohorts']['overflowColumn'],'mass_Msun':m*1e10})
 for name,rows in [('components.csv',components),('profiles.csv',profiles),('rings.csv',rings),('cohorts.csv',cohorts),('migration.csv',migration),('conservation.csv',conservation),('disk-global.csv',global_disk)]:write(tables/name,rows)
 for dataset in ['agama','agama-calibrated']:
  folder=out/dataset
  for file in folder.glob('*-frozen-analysis.json'):
   d=json.loads(file.read_text(encoding='utf8'));start=d['samples'][0]
   for s in d['samples']:frozen.append({'dataset':dataset,'snapshot':d['protocol']['snapshot'],'time_Myr':s['timeMyr'],'h50_instant_kpc':s['disk']['instant']['h50'],'h50_instant_change_percent':100*(s['disk']['instant']['h50']/start['disk']['instant']['h50']-1),'sigma_normal_kpc_Myr':s['disk']['instant']['sigmaNormal'],'sigma_normal_change_percent':100*(s['disk']['instant']['sigmaNormal']/start['disk']['instant']['sigmaNormal']-1),'energy_error_orbital':s['errors']['energy'],'integrator':'AGAMA adaptive DOP853, frozen total continuum potential'})
  file=folder/'continuum-profiles.json'
  if file.exists():
   d=json.loads(file.read_text(encoding='utf8'));rows=[]
   for j,R in enumerate(d['radiusKpc']):rows.append({'radius_kpc':R,'vc_kpc_Myr':d['vcInternal'][j],'kappa_per_Myr':d['kappaPerMyr'][j],**{f'rho_component_{c}_Msun_kpc3':d['densityMsunKpc3'][c][j] for c in range(4)},**{f'enclosed_spherical_mass_component_{c}_Msun':d['enclosedMassMsun'][c][j] for c in range(4)}})
   write(tables/(dataset+'-continuum.csv'),rows);rows=[]
   for c,m in enumerate(d['moments']):
    v=np.array(m['meanVelocityXYZ']);v2=np.array(m['secondMomentsXXYYZZXYYZZX']);disp=np.sqrt(np.maximum(0,v2[:,:3]-v*v))
    for j,R in enumerate(d['momentRadiusKpc']):rows.append({'subpopulation':c,'radius_kpc':R,'density_Msun_kpc3':m['densityMsunKpc3'][j],'mean_vR_km_s':v[j,0],'mean_vphi_km_s':v[j,1],'mean_vz_km_s':v[j,2],'sigma_R_km_s':disp[j,0],'sigma_phi_km_s':disp[j,1],'sigma_z_km_s':disp[j,2]})
   write(tables/(dataset+'-DF-moments.csv'),rows)
 write(tables/'frozen-continuum.csv',frozen)
 (tables/'README.md').write_text('# Tabelas científicas 1.0\n\nSomente ensaios concluídos. JSON bruto e metadados são a fonte completa. Massas são ponderadas; frequência de partícula não substitui massa. `upper` vazio denota overflow, com densidade indefinida. Q e P de modos são condicionais. `h50_global_plane` usa o plano instantâneo global; `h50_local_plane` usa o plano local. Coortes retêm a seleção radial inicial, enquanto rings usa seleções instantâneas. Energia dos ensaios GPU é diagnosticada por Barnes–Hut e é aproximada; frozen-continuum contém energia orbital no potencial total congelado e outro integrador. Unidades constam dos cabeçalhos.\n',encoding='utf8')
 print({'componentRows':len(components),'ringRows':len(rings),'profileRows':len(profiles),'cohortRows':len(cohorts),'migrationRows':len(migration),'frozenRows':len(frozen)})

if __name__=='__main__':main()
