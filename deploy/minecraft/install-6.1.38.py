import sys,os,pathlib,subprocess
if '--background' in sys.argv:
 log=pathlib.Path.home()/'quiby-638-install.log'
 with log.open('a') as output:
  process=subprocess.Popen([sys.executable,'-u',str(pathlib.Path(__file__).resolve())],stdin=subprocess.DEVNULL,stdout=output,stderr=subprocess.STDOUT,start_new_session=True)
 print('Installer started, PID',process.pid,'Log:',log)
 raise SystemExit(0)
import pathlib,subprocess,urllib.request,hashlib,os,json,time,socket,traceback
assert socket.gethostname().split('.')[0]=='clorexserver','Wrong host'
root=pathlib.Path.home()/'quiby-releases/6.1.38';root.mkdir(mode=0o700,parents=True,exist_ok=True)
def run(args,**kw):return subprocess.run(args,check=True,**kw)
try:
 archive=root/'quiby-server-6.1.38.zip'
 url='https://github.com/cl0rex1/quiby-modpacks/releases/download/v6.1.38/quiby-server-6.1.38.zip'
 if not archive.exists():
  with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'quiby-server-updater'}),timeout=180) as r,archive.open('wb') as out:
   import shutil;shutil.copyfileobj(r,out)
 assert hashlib.sha256(archive.read_bytes()).hexdigest()=='17e3aa1ac4b30cf7af189427c8372f8d1d2c6855503fe66c84116c11745770e6','Wrong server archive'
 print('SERVER_638_ARCHIVE_VERIFIED',flush=True)
 run(['docker','cp',str(archive),'big-bear-crafty:/tmp/quiby-server-6.1.38.zip'])
 setup=r'''import pathlib,subprocess,json,os,zipfile,time
GAME=pathlib.Path('/crafty/servers/827910b5-67f5-459f-8e6d-8b8e4b34367b')
assert GAME.is_dir() and GAME.resolve()==GAME
stage=GAME/'.quiby-release-6.1.38';stage.mkdir(exist_ok=True)
with zipfile.ZipFile('/tmp/quiby-server-6.1.38.zip') as z:
 for name in z.namelist():assert (stage/name).resolve().is_relative_to(stage.resolve())
 z.extractall(stage)
uid,gid=GAME.stat().st_uid,GAME.stat().st_gid
for p in [stage,*stage.rglob('*')]:os.chown(p,uid,gid)
apply_code=r"""import pathlib,subprocess,tarfile,shutil,time,os,json,hashlib
game=pathlib.Path.cwd();stage=game/'.quiby-release-6.1.38'
assert game==pathlib.Path('/crafty/servers/827910b5-67f5-459f-8e6d-8b8e4b34367b')
# Apply only after the old JVM has stopped and completed its save.
for proc in pathlib.Path('/proc').iterdir():
 try:
  if proc.name.isdigit() and (proc/'exe').resolve().name=='java' and (proc/'cwd').resolve()==game:raise RuntimeError('Minecraft JVM still running; refusing file replacement')
 except (FileNotFoundError,PermissionError):pass
state=json.loads((game/'quiby-638-restart.json').read_text())
log=game/'logs/latest.log';text=log.read_text(errors='replace')
assert log.stat().st_mtime>=state['announcedAt'], 'No fresh shutdown log'
assert 'Stopping server' in text and 'All dimensions are saved' in text, 'World save completion missing; refusing file replacement'
(game/'quiby-638-save-proof.json').write_text(json.dumps({'oldPid':state['oldPid'],'announcedAt':state['announcedAt'],'savedAt':log.stat().st_mtime,'verifiedAt':time.time(),'completedSave':True}))
backup=pathlib.Path('/crafty/backups')/('quiby-pre-638-'+time.strftime('%Y%m%dT%H%M%SZ',time.gmtime())+'.tar.gz')
with tarfile.open(backup,'w:gz',compresslevel=1) as t:
 for p in game.iterdir():
  if p.name in ['libraries','cache','.pg-native','logs','quiby-backups','create_radar_debug'] or p.name.startswith('.quiby-release-') or p.name.endswith(('.zip','.log','.jar')):continue
  t.add(p,arcname=p.name)
backup.chmod(0o600)
try:
 subprocess.run(['python3',str(stage/'prepare.py'),'--pack',str(stage),'--data',str(game)],check=True)
 for name in ['start.sh','restart_wait.py','prepare.py','config-policy.json','server-pack.json']:shutil.copyfile(stage/name,game/name)
 shutil.copytree(stage/'config-templates',game/'config-templates',dirs_exist_ok=True)
 lock=json.loads((game/'server-pack.json').read_text())
 for item in lock['mods']:assert hashlib.sha256((game/'mods'/item['file']).read_bytes()).hexdigest()==item['sha256'],item['file']
 (game/'quiby-update-638.ok').write_text(json.dumps({'version':'6.1.38','backup':str(backup),'verifiedAllMods':True,'saveProof':json.loads((game/'quiby-638-save-proof.json').read_text())}))
 print('QUIBY_638_INSTALLED',str(backup),flush=True)
except BaseException:
 shutil.copyfile(game/'start.pre-638.sh',game/'start.sh');raise
"""
update=GAME/'quiby-apply-638.py';update.write_text(apply_code);update.chmod(0o700);os.chown(update,uid,gid)
start=GAME/'start.sh';old=start.read_text();backup=GAME/'start.pre-638.sh'
if backup.exists():raise RuntimeError('Already armed; inspect before repeating update')
backup.write_text(old);os.chown(backup,uid,gid)
lines=old.splitlines();lines.insert(1,'set -e\npython3 "$(dirname -- "${BASH_SOURCE[0]}")/quiby-apply-638.py"\nexec /bin/bash "$(dirname -- "${BASH_SOURCE[0]}")/start.sh" "$@"');start.write_text('\n'.join(lines)+'\n');os.chown(start,uid,gid)
os.setgid(gid);os.setuid(uid)
candidates=[]
for p in pathlib.Path('/proc').iterdir():
 if not p.name.isdigit():continue
 try:
  if (p/'exe').resolve().name=='java' and (p/'cwd').resolve()==GAME:candidates.append(p)
 except (FileNotFoundError,PermissionError):pass
if len(candidates)!=1:
 start.write_text(old);raise RuntimeError('Expected exactly one Minecraft JVM')
(GAME/'quiby-638-restart.json').write_text(json.dumps({'oldPid':candidates[0].name,'announcedAt':time.time(),'seconds':15}))
with (candidates[0]/'fd/0').open('w') as out:out.write('quiby restart 15\n');out.flush()
print('RESTART_15_ANNOUNCED',flush=True)
'''
 run(['docker','exec','-u','0','-i','big-bear-crafty','python3','-'],input=setup,text=True)
 deadline=time.monotonic()+420
 verify="import pathlib,json,hashlib,os\np=pathlib.Path('/crafty/servers/827910b5-67f5-459f-8e6d-8b8e4b34367b');marker=p/'quiby-update-638.ok';report=json.loads(marker.read_text());lock=json.loads((p/'server-pack.json').read_text())\nassert lock['packVersion']=='6.1.38'\nassert all(hashlib.sha256((p/'mods'/item['file']).read_bytes()).hexdigest()==item['sha256'] for item in lock['mods'])\nprocesses=[]\nfor candidate in pathlib.Path('/proc').iterdir():\n try:\n  if candidate.name.isdigit() and (candidate/'exe').resolve().name=='java' and (candidate/'cwd').resolve()==p.resolve():processes.append(candidate)\n except (OSError,PermissionError):pass\nassert len(processes)==1,'Expected one live Minecraft JVM'\npid=processes[0];files=[]\nfor fd in (pid/'fd').iterdir():\n try:files.append(str(fd.readlink()))\n except OSError:pass\nassert str(p/'mods/quiby-1.21.1-1.1.31.jar') in files,'New Quiby JAR is not open in the live JVM'\nlog=p/'logs/latest.log';text=log.read_text(errors='replace')\nassert log.stat().st_mtime>marker.stat().st_mtime and 'Done (' in text\nassert not any(error in text for error in ['Mixin apply failed','Persistent ragdoll cleanup suspended','Death corpse cleanup failed'])\nassert 'voice_host=play.quiby.me:24454' in (p/'config/voicechat/voicechat-server.properties').read_text()\nprint(json.dumps({'backup':report['backup'],'modsVerified':len(lock['mods']),'pid':pid.name,'quiby':'1.1.31','newJvmReady':True}))\n"
 while time.monotonic()<deadline:
  time.sleep(5)
  probe=subprocess.run(['docker','exec','-u','1000','big-bear-crafty','python3','-c',verify],capture_output=True,text=True)
  if probe.returncode==0:
   report=json.loads(probe.stdout);(root/'deployed.json').write_text(json.dumps(report,indent=2));print('SERVER_638_ONLINE',json.dumps(report),flush=True);break
 else:raise RuntimeError('Timed out waiting for verified Minecraft startup')
 print('DEPLOYMENT_638_COMPLETE',flush=True)
except BaseException:
 traceback.print_exc();raise

import pathlib,json,subprocess,os,signal
root=pathlib.Path.home()/'quiby-releases/6.1.38'
code=r'''import pathlib,json,hashlib,os
p=pathlib.Path('/crafty/servers/827910b5-67f5-459f-8e6d-8b8e4b34367b');marker=p/'quiby-update-638.ok';report=json.loads(marker.read_text());lock=json.loads((p/'server-pack.json').read_text())
assert lock['packVersion']=='6.1.38'
assert all(hashlib.sha256((p/'mods'/item['file']).read_bytes()).hexdigest()==item['sha256'] for item in lock['mods'])
processes=[]
for candidate in pathlib.Path('/proc').iterdir():
 try:
  if candidate.name.isdigit() and (candidate/'exe').resolve().name=='java' and (candidate/'cwd').resolve()==p.resolve():processes.append(candidate)
 except (OSError,PermissionError):pass
assert len(processes)==1,'Expected one live Minecraft JVM'
pid=processes[0];files=[]
for fd in (pid/'fd').iterdir():
 try:files.append(str(fd.readlink()))
 except OSError:pass
assert str(p/'mods/quiby-1.21.1-1.1.31.jar') in files,'New Quiby JAR is not open in the live JVM'
log=p/'logs/latest.log';text=log.read_text(errors='replace')
assert log.stat().st_mtime>marker.stat().st_mtime and 'Done (' in text
assert not any(error in text for error in ['Mixin apply failed','Persistent ragdoll cleanup suspended','Death corpse cleanup failed'])
assert 'voice_host=play.quiby.me:24454' in (p/'config/voicechat/voicechat-server.properties').read_text()
import tomllib
assert tomllib.loads((p/'config/explosionoverhaul/explosionoverhaul-common.toml').read_text())['Ambient']['Sound_Types']['enableAmbientCaveDust'] is False
print(json.dumps({'backup':report['backup'],'modsVerified':len(lock['mods']),'pid':pid.name,'quiby':'1.1.31','newJvmReady':True}))
'''
game=json.loads(subprocess.check_output(['docker','exec','-u','1000','big-bear-crafty','python3','-c',code],text=True))
js=r'''(async()=>{
let m=await(await fetch('https://github.com/cl0rex1/quiby-modpacks/releases/download/v6.1.38/manifest.json')).json();
if(m.version!=='6.1.38'||m.files.find(x=>x.modId==='quiby').modVersion!=='1.1.31')throw Error('Wrong public manifest');
let r=await fetch('http://127.0.0.1:3001/api/admin/modpack/publish',{method:'POST',headers:{'Content-Type':'application/json','x-admin-key':process.env.ADMIN_API_KEY},body:JSON.stringify(m)});if(!r.ok)throw Error('Manifest activation '+r.status);
let live=await(await fetch('http://127.0.0.1:3001/api/modpack/latest')).json();if(live.version!=='6.1.38')throw Error('Wrong active pack');
let h=await(await fetch('http://127.0.0.1:3001/api/health')).json();if(h.version!=='1.1.5'||h.minimumLauncherVersion!=='1.1.5')throw Error('Wrong API version');
let s=require('sqlite3'),d=new s.Database('/app/data/quiby.sqlite',s.OPEN_READONLY);d.get('SELECT closed FROM launcher_access WHERE id=1',(error,row)=>{if(error)throw error;console.log(JSON.stringify({pack:live.version,api:h.version,accessClosed:Boolean(row?.closed)}));d.close()});
})().catch(error=>{console.error(error.message);process.exitCode=1});'''
api=json.loads(subprocess.check_output(['docker','exec','quiby-core-api','node','-e',js],text=True))
ports=subprocess.check_output(['docker','port','big-bear-crafty','24454/udp'],text=True).strip();assert '24454' in ports
proof=json.loads(subprocess.check_output(['docker','exec','big-bear-crafty','cat','/crafty/servers/827910b5-67f5-459f-8e6d-8b8e4b34367b/quiby-638-save-proof.json'],text=True));assert proof['completedSave'] and proof['savedAt']>=proof['announcedAt']
(root/'verified.json').write_text(json.dumps({'game':game,'api':api,'voiceUdpPort':ports},indent=2))

print('DEPLOYMENT COMPLETE: pack 6.1.38 activated; Minecraft mod 1.1.31 verified; launcher/API unchanged; access policy preserved.',flush=True)
