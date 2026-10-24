"""Verified CasaOS update. World replacement is opt-in and always backed up first."""
import argparse,fcntl,hashlib,json,os,pathlib,socket,subprocess,sys,time,traceback,urllib.request

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--background',action='store_true')
parser.add_argument('--reset-world',action='store_true')
parser.add_argument('--pregenerate-radius',type=int,default=0)
options=parser.parse_args()
assert 0<=options.pregenerate_radius<=10000
assert not options.pregenerate_radius or options.reset_world,'Pregeneration here requires an explicitly reset world'
if options.background:
    log=pathlib.Path.home()/'quiby-640-install.log'
    with log.open('a') as output:
        process=subprocess.Popen([sys.executable,'-u',str(pathlib.Path(__file__).resolve()),*[a for a in sys.argv[1:] if a!='--background']],
            stdin=subprocess.DEVNULL,stdout=output,stderr=subprocess.STDOUT,start_new_session=True)
    print('Installer started, PID',process.pid,'Log:',log)
    raise SystemExit(0)

assert socket.gethostname().split('.')[0]=='clorexserver','Wrong host'
os.umask(0o077)
root=pathlib.Path.home()/'quiby-releases/6.1.40';root.mkdir(parents=True,exist_ok=True)
lockfile=(root/'install.lock').open('w');fcntl.flock(lockfile,fcntl.LOCK_EX|fcntl.LOCK_NB)
base=os.environ.get('QUIBY_TRANSFER_BASE','https://github.com/cl0rex1/quiby-modpacks/releases/download/v6.1.40')
GAME='/crafty/servers/827910b5-67f5-459f-8e6d-8b8e4b34367b'
ARCHIVE_SHA='647197178eb9d42f174bd4e70fbfa2a293fbe638d901504585abd4c902d592e0'

def run(args,**kw):return subprocess.run(args,check=True,**kw)
def container(code):return subprocess.check_output(['docker','exec','-u','1000','big-bear-crafty','python3','-c',code],text=True)
def post(name,value):
    (root/(name+'.json')).write_text(json.dumps(value,ensure_ascii=False,indent=2))
    if base=='http://192.168.18.18:18740':
        try:
            request=urllib.request.Request(base+'/'+name+'640',data=json.dumps(value).encode(),method='POST')
            urllib.request.urlopen(request,timeout=8).read()
        except Exception as error:print('Progress transfer unavailable:',type(error).__name__,flush=True)

POLICY_JS="""const s=require('sqlite3'),c=require('crypto'),d=new s.Database('/app/data/quiby.sqlite',s.OPEN_READONLY);
const all=q=>new Promise((resolve,reject)=>d.all(q,(e,r)=>e?reject(e):resolve(r)));
(async()=>{const access=await all('SELECT * FROM launcher_access ORDER BY id'),users=await all('SELECT discord_id,is_whitelisted,launcher_access_exempt FROM users ORDER BY discord_id');
console.log(JSON.stringify({closed:Boolean(access[0]?.closed),exceptions:users.filter(x=>x.launcher_access_exempt).length,sha256:c.createHash('sha256').update(JSON.stringify({access,users})).digest('hex')}));d.close()})().catch(e=>{console.error(e.message);process.exitCode=1});"""
def policy():return json.loads(subprocess.check_output(['docker','exec','quiby-core-api','node','-e',POLICY_JS],text=True))

FIND_JVM=f'''import pathlib,json
p=pathlib.Path({GAME!r});jvms=[]
for candidate in pathlib.Path('/proc').iterdir():
 try:
  if candidate.name.isdigit() and (candidate/'exe').resolve().name=='java' and (candidate/'cwd').resolve()==p:jvms.append(candidate)
 except (OSError,PermissionError):pass
assert len(jvms)==1,'Expected exactly one Minecraft JVM'
'''
def command(text):
    assert '\n' not in text
    return container(FIND_JVM+f"with (jvms[0]/'fd/0').open('w') as out:out.write({(text+chr(10))!r});out.flush()\n")

def log_tail():return container(f"import pathlib;print(pathlib.Path({(GAME+'/logs/latest.log')!r}).read_text(errors='replace')[-200000:])")

try:
    before=policy();post('progress',{'stage':'staging','access':before})
    archive=root/'quiby-server-6.1.40.zip'
    if not archive.exists() or hashlib.sha256(archive.read_bytes()).hexdigest()!=ARCHIVE_SHA:
        with urllib.request.urlopen(base+'/quiby-server-6.1.40.zip',timeout=180) as response,archive.open('wb') as output:
            downloaded=0
            while data:=response.read(4*1024*1024):
                output.write(data);downloaded+=len(data);print('Downloaded',round(downloaded/1048576,1),'MiB',flush=True)
    assert hashlib.sha256(archive.read_bytes()).hexdigest()==ARCHIVE_SHA,'Wrong archive'
    print('SERVER_640_ARCHIVE_VERIFIED',flush=True)
    run(['docker','cp',str(archive),'big-bear-crafty:/tmp/quiby-server-6.1.40.zip'])

    apply_code=r'''import pathlib,subprocess,tarfile,shutil,time,os,json,hashlib,re
game=pathlib.Path.cwd();stage=game/'.quiby-release-6.1.40'
assert game==pathlib.Path('/crafty/servers/827910b5-67f5-459f-8e6d-8b8e4b34367b')
for proc in pathlib.Path('/proc').iterdir():
 try:
  if proc.name.isdigit() and (proc/'exe').resolve().name=='java' and (proc/'cwd').resolve()==game:raise RuntimeError('JVM still running; refusing replacement')
 except (FileNotFoundError,PermissionError):pass
state=json.loads((game/'quiby-640-restart.json').read_text());log=game/'logs/latest.log'
text=log.read_bytes()[state['logOffset']:].decode(errors='replace')
assert log.stat().st_mtime>=state['announcedAt'] and 'Stopping server' in text and 'All dimensions are saved' in text,'Fresh completed world save is required'
save_proof={'oldPid':state['oldPid'],'announcedAt':state['announcedAt'],'savedAt':log.stat().st_mtime,'completedSave':True}
(game/'quiby-640-save-proof.json').write_text(json.dumps(save_proof))
stamp=time.strftime('%Y%m%dT%H%M%SZ',time.gmtime());backups=pathlib.Path('/crafty/backups').resolve()
backup=backups/('quiby-pre-640-'+stamp+'.tar.gz')
with tarfile.open(backup,'w:gz',compresslevel=1) as output:
 for file in game.iterdir():
  if file.name in ['libraries','cache','.pg-native','logs','quiby-backups','create_radar_debug'] or file.name.startswith('.quiby-release-') or file.name.endswith(('.zip','.log','.jar')):continue
  output.add(file,arcname=file.name)
backup.chmod(0o600)
properties=game/'server.properties';props=properties.read_text();level=next((x.split('=',1)[1] for x in props.splitlines() if x.startswith('level-name=')),'world')
world=(game/level).resolve();assert world.is_relative_to(game) and world!=game and world.is_dir() and (world/'level.dat').is_file()
with tarfile.open(backup,'r:gz') as check:
 assert check.extractfile(level+'/level.dat').read()==(world/'level.dat').read_bytes(),'Backup verification failed'
old_level_hash=hashlib.sha256((world/'level.dat').read_bytes()).hexdigest();old_world=None
if __RESET_WORLD__:
 old_world=backups/('quiby-world-before-640-'+stamp)
 assert old_world.parent==backups and not old_world.exists()
 shutil.move(str(world),str(old_world))
 assert not world.exists() and (old_world/'level.dat').is_file(),'World rotation failed'
 props=re.sub(r'^level-seed=.*$', 'level-seed=',props,flags=re.M);properties.write_text(props)
subprocess.run(['python3',str(stage/'prepare.py'),'--pack',str(stage),'--data',str(game)],check=True)
for name in ['start.sh','restart_wait.py','prepare.py','config-policy.json','server-pack.json']:shutil.copyfile(stage/name,game/name)
if __RESET_WORLD__:
 shutil.copyfile(stage/'pregenerate640.py',game/'pregenerate640.py')
 start=game/'start.sh';lines=start.read_text().splitlines()
 lines.insert(3,'if [[ -f "$PACK_DIR/quiby-pregen640-pending.json" ]]; then python3 "$PACK_DIR/pregenerate640.py" >> "$PACK_DIR/quiby-pregen640.log" 2>&1 & fi')
 start.write_text('\n'.join(lines)+'\n')
shutil.copytree(stage/'config-templates',game/'config-templates',dirs_exist_ok=True)
lock=json.loads((game/'server-pack.json').read_text())
for item in lock['mods']:assert hashlib.sha256((game/'mods'/item['file']).read_bytes()).hexdigest()==item['sha256'],item['file']
report={'version':'6.1.40','backup':str(backup),'backupSha256':hashlib.sha256(backup.read_bytes()).hexdigest(),'oldWorld':str(old_world) if old_world else None,'oldLevelSha256':old_level_hash,'resetWorld':__RESET_WORLD__,'verifiedAllMods':True,'saveProof':save_proof}
(game/'quiby-update-640.ok').write_text(json.dumps(report))
print('QUIBY_640_INSTALLED',json.dumps(report),flush=True)
'''.replace('__RESET_WORLD__',str(options.reset_world))

    setup=r'''import pathlib,subprocess,json,os,zipfile,time
GAME=pathlib.Path('/crafty/servers/827910b5-67f5-459f-8e6d-8b8e4b34367b');assert GAME.is_dir() and GAME.resolve()==GAME
stage=GAME/'.quiby-release-6.1.40';stage.mkdir(exist_ok=True)
with zipfile.ZipFile('/tmp/quiby-server-6.1.40.zip') as archive:
 for name in archive.namelist():assert (stage/name).resolve().is_relative_to(stage.resolve())
 archive.extractall(stage)
uid,gid=GAME.stat().st_uid,GAME.stat().st_gid
for file in [stage,*stage.rglob('*')]:os.chown(file,uid,gid)
update=GAME/'quiby-apply-640.py';update.write_text(__APPLY_CODE__);update.chmod(0o700);os.chown(update,uid,gid)
start=GAME/'start.sh';old=start.read_text();backup=GAME/'start.pre-640.sh'
if backup.exists():raise RuntimeError('Already armed: inspect before repeating')
backup.write_text(old);os.chown(backup,uid,gid)
lines=old.splitlines();lines.insert(1,'set -e\npython3 "$(dirname -- "${BASH_SOURCE[0]}")/quiby-apply-640.py"\nexec /bin/bash "$(dirname -- "${BASH_SOURCE[0]}")/start.sh" "$@"');start.write_text('\n'.join(lines)+'\n');os.chown(start,uid,gid)
os.setgid(gid);os.setuid(uid)
candidates=[]
for proc in pathlib.Path('/proc').iterdir():
 try:
  if proc.name.isdigit() and (proc/'exe').resolve().name=='java' and (proc/'cwd').resolve()==GAME:candidates.append(proc)
 except (FileNotFoundError,PermissionError):pass
if len(candidates)!=1:start.write_text(old);raise RuntimeError('Expected one running Minecraft JVM')
(GAME/'quiby-640-restart.json').write_text(json.dumps({'oldPid':candidates[0].name,'announcedAt':time.time(),'seconds':15,'logOffset':(GAME/'logs/latest.log').stat().st_size}))
with (candidates[0]/'fd/0').open('w') as out:out.write('quiby restart 15\n');out.flush()
print('RESTART_15_ANNOUNCED',flush=True)
'''.replace('__APPLY_CODE__',repr(apply_code))
    run(['docker','exec','-u','0','-i','big-bear-crafty','python3','-'],input=setup,text=True)
    post('progress',{'stage':'restart-announced','seconds':15,'resetWorld':options.reset_world})
    verify=FIND_JVM+r'''
import hashlib,os
marker=p/'quiby-update-640.ok';report=json.loads(marker.read_text());lock=json.loads((p/'server-pack.json').read_text());assert lock['packVersion']=='6.1.40'
assert all(hashlib.sha256((p/'mods'/m['file']).read_bytes()).hexdigest()==m['sha256'] for m in lock['mods'])
files=[]
for fd in (jvms[0]/'fd').iterdir():
 try:files.append(str(fd.readlink()))
 except OSError:pass
assert str(p/'mods/quiby-1.21.1-1.1.33.jar') in files and any('Chunky-NeoForge-1.4.23.jar' in name for name in files)
log=p/'logs/latest.log';text=log.read_text(errors='replace');assert log.stat().st_mtime>marker.stat().st_mtime and 'Done (' in text
assert not any(error in text for error in ['Mixin apply failed','Persistent ragdoll cleanup suspended','Death corpse cleanup failed'])
assert 'voice_host=play.quiby.me:24454' in (p/'config/voicechat/voicechat-server.properties').read_text()
if report['resetWorld']:
 assert (p/'world/level.dat').stat().st_mtime>marker.stat().st_mtime
 assert hashlib.sha256((p/'world/level.dat').read_bytes()).hexdigest()!=report['oldLevelSha256']
assert json.loads((p/'config/chunky/config.json').read_text())['continueOnRestart'] is True
report.update(modsVerified=len(lock['mods']),pid=jvms[0].name,quiby='1.1.33',newJvmReady=True)
print(json.dumps(report))
'''
    deadline=time.monotonic()+600
    while time.monotonic()<deadline:
        time.sleep(5)
        probe=subprocess.run(['docker','exec','-u','1000','big-bear-crafty','python3','-c',verify],capture_output=True,text=True)
        if probe.returncode==0:game=json.loads(probe.stdout);break
    else:raise RuntimeError('New JVM did not finish verified startup')
    print('SERVER_640_ONLINE',json.dumps(game),flush=True)

    activate=r'''(async()=>{
const m=await(await fetch('https://github.com/cl0rex1/quiby-modpacks/releases/download/v6.1.40/manifest.json')).json();
if(m.version!=='6.1.40'||m.files.find(x=>x.modId==='quiby').modVersion!=='1.1.33')throw Error('Wrong public manifest');
const r=await fetch('http://127.0.0.1:3001/api/admin/modpack/publish',{method:'POST',headers:{'Content-Type':'application/json','x-admin-key':process.env.ADMIN_API_KEY},body:JSON.stringify(m)});if(!r.ok)throw Error('Manifest activation '+r.status);
const live=await(await fetch('http://127.0.0.1:3001/api/modpack/latest')).json();if(live.version!=='6.1.40')throw Error('Wrong active pack');
const h=await(await fetch('http://127.0.0.1:3001/api/health')).json();if(h.version!=='1.1.6'||h.minimumLauncherVersion!=='1.1.6')throw Error('Wrong API version');
console.log(JSON.stringify({pack:live.version,api:h.version}));
})().catch(e=>{console.error(e.message);process.exitCode=1});'''
    api=json.loads(subprocess.check_output(['docker','exec','quiby-core-api','node','-e',activate],text=True))
    assert policy()==before,'Access policy changed unexpectedly'
    proof={'pack':'6.1.40','game':game,'api':api,'access':before,'pregenerationRadius':options.pregenerate_radius}
    post('proof',proof)
    if options.reset_world:
        for text in ['setblock ~ ~ ~ minecraft:campfire','quiby opening prepare ~ ~ ~ 64','quiby opening status']:
            command(text)
        time.sleep(2)
        assert 'Подготовлено · граница 64.0' in log_tail(),'Opening preparation at the new spawn failed'
        proof['openingPrepared']=True
    if options.pregenerate_radius:
        started=time.time()
        state={'proof':proof,'radius':options.pregenerate_radius,'startedAt':started,'transfer':base}
        container(f"import pathlib,json;pathlib.Path({(GAME+'/quiby-pregen640-pending.json')!r}).write_text({json.dumps(state)!r})")
        for text in ['chunky world minecraft:overworld','chunky spawn','chunky shape circle',f'chunky radius {options.pregenerate_radius}','chunky pattern concentric','chunky quiet 10','chunky start']:
            command(text)
        run(['docker','exec','-d','-u','1000','big-bear-crafty','python3',GAME+'/pregenerate640.py'])
        post('progress',{'stage':'pregenerating','radius':options.pregenerate_radius,'shape':'circle','startedAt':started})
        while True:
            time.sleep(15)
            raw=container(f"import pathlib;file=pathlib.Path({(GAME+'/quiby-season-ready-640.json')!r});print(file.read_text() if file.exists() else '{{}}')")
            ready=json.loads(raw)
            if ready.get('finalWorldSaved') and ready.get('pregeneration',{}).get('complete'):
                proof=ready;break
    else:
        command('save-all flush');time.sleep(3)
        assert 'Saved the game' in log_tail(),'Final world save missing'
    assert policy()==before,'Access policy changed'
    proof['finalWorldSaved']=True
    post('proof',proof);post('progress',{'stage':'complete','proof':proof})
    print('DEPLOYMENT_640_COMPLETE',json.dumps(proof),flush=True)
except BaseException as failure:
    traceback.print_exc();post('progress',{'stage':'failed','error':str(failure)});raise
