"""Build author-supplied GSL sources with their MSVC source lists; no MSBuild required."""
import os, sys, json, subprocess, shutil, collections
from pathlib import Path
import xml.etree.ElementTree as ET
base=Path(__file__).resolve().parent
root=base/'gsl-master'
tool=json.loads((base.parent/'v1-msvc/env.json').read_text())
env=os.environ.copy()
for k in ('INCLUDE','LIB','LIBPATH'): env[k]=';'.join(tool[k])
env['PATH']=';'.join(tool['PATH'])+';'+env['PATH']
for h in root.rglob('gsl_*.h'):
    if 'gsl' not in h.relative_to(root).parts[:-1]: shutil.copy2(h,root/'gsl'/h.name)
for projname,outname in [('cblaslib','cblas'),('gsllib','gsl')]:
    proj=root/'build.vc'/projname/(projname+'.vcxproj')
    files=[(proj.parent/e.attrib['Include']).resolve() for e in ET.parse(proj).iter() if e.tag.endswith('}ClCompile') and 'Include' in e.attrib]
    groups=collections.defaultdict(list)
    for f in files: groups[f.parent].append(f)
    objs=[]
    for folder,src in groups.items():
        dest=root/'portable-obj'/outname/folder.relative_to(root)
        dest.mkdir(parents=True,exist_ok=True)
        rsp=dest/'compile.rsp'
        opts=['/nologo','/c','/O2','/MT','/MP4','/DNDEBUG','/D_LIB','/DHAVE_CONFIG_H','/D_CRT_SECURE_NO_DEPRECATE',f'/I"{root}"',f'/I"{root / "build.vc"}"',f'/Fo"{dest.as_posix()}/"']
        rsp.write_text('\n'.join(opts+[f'"{f}"' for f in src]))
        subprocess.run([tool['CC'],'@'+str(rsp)],env=env,check=True,cwd=root)
        objs.extend(dest.glob('*.obj'))
    rsp=root/(outname+'-link.rsp')
    out=base/'Agama-master/extras/lib';out.mkdir(parents=True,exist_ok=True)
    rsp.write_text('\n'.join(['/nologo',f'/OUT:"{out / (outname+".lib")}"']+[f'"{f}"' for f in objs]))
    subprocess.run([tool['AR'],'@'+str(rsp)],env=env,check=True)
    print(outname,len(files),'sources',len(objs),'objects',flush=True)
shutil.copytree(root/'gsl',base/'Agama-master/extras/include/gsl',dirs_exist_ok=True)
