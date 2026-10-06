"""Package portable source and evidence, excluding credentials and runtime data."""
from pathlib import Path
import hashlib
import json
import os
import zipfile
root=Path(__file__).resolve().parents[1]
output=Path(os.environ.get('FORM_PACKAGE_PATH',str(root/'outputs'/'FORM_AI_Gym_Fitness_Assistant.zip')))
output.parent.mkdir(parents=True,exist_ok=True)
skip={'node_modules','.git','.venv','.wrangler','.sites-runtime','.next','.vinext','.pytest_cache','__pycache__','outputs','.agents','.codex','coverage','work','.pnpm-store'}
files=[]
for directory,dirs,names in os.walk(root):
    dirs[:]=sorted(d for d in dirs if d not in skip)
    for name in sorted(names):
        p=Path(directory)/name
        rel=p.relative_to(root)
        if name in {'.DS_Store','.iot-sequence.json','responsive-qa.html'} or name.startswith(('.dev.vars','.mqtt-queue')) or (name.startswith('.env') and name!='.env.example'): continue
        if p.is_symlink() or p.suffix in {'.pyc','.zip','.gz','.tsbuildinfo'} or rel.parts[0]=='dist': continue
        files.append(p)
manifest=[{'path':str(p.relative_to(root)),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in files]
with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
    for p in files: z.write(p,'FORM_AI_Gym_Fitness_Assistant/'+str(p.relative_to(root)))
    z.writestr('FORM_AI_Gym_Fitness_Assistant/PACKAGE_MANIFEST.json',json.dumps(manifest,indent=2))
with zipfile.ZipFile(output) as z: assert z.testzip() is None
print(json.dumps({'path':str(output),'files':len(files),'bytes':output.stat().st_size,'sha256':hashlib.sha256(output.read_bytes()).hexdigest()}))
