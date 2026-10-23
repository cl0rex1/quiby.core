import os
PAYLOAD={'base': 'https://github.com/cl0rex1/quiby-modpacks/releases/download/v6.1.39', 'files': {'quiby-api-1.1.6.tar.gz': 'a976cbf7d00550104b1cfd1bf873184cc831128adb7b515f2cebcdbe1009280a'}}
PAYLOAD['base']=os.environ.get('QUIBY_TRANSFER_BASE',PAYLOAD['base'])
import pathlib,subprocess,json,os,tarfile,time,socket,ssl,urllib.request,hashlib,shutil,sys
os.umask(0o077)
assert socket.gethostname().split('.')[0]=='clorexserver'
root=pathlib.Path.home()/'quiby-releases/1.1.6';root.mkdir(mode=0o700,parents=True,exist_ok=True)
def run(args,**kwargs):return subprocess.run(args,check=True,**kwargs)
def stage():
 for name,digest in PAYLOAD['files'].items():
  target=root/name
  if not target.exists() or hashlib.sha256(target.read_bytes()).hexdigest()!=digest:
   with urllib.request.urlopen(PAYLOAD['base']+'/'+name,timeout=120) as response,target.open('wb') as output:shutil.copyfileobj(response,output)
  assert hashlib.sha256(target.read_bytes()).hexdigest()==digest,'Bad file '+name
 source=root/'api-runtime';source.mkdir(exist_ok=True)
 with tarfile.open(root/'quiby-api-1.1.6.tar.gz') as archive:archive.extractall(source,filter='data')
 api=json.loads(subprocess.check_output(['docker','inspect','quiby-core-api']))[0]
 before=root/'api-before.json';before.write_text(json.dumps(api))
 env=dict(value.split('=',1) for value in api['Config']['Env'] if '=' in value)
 old_image=subprocess.check_output(['docker','image','inspect','quiby-core-api:1.1.5','--format','{{.Id}}'],text=True).strip();assert old_image==api['Image'],'Unexpected base image'
 run(['docker','build','-t','quiby-core-api:1.1.6',str(source)])
 (root/'api.override.json').write_text(json.dumps({'services':{'api':{'image':'quiby-core-api:1.1.6','environment':env}}}))
 (root/'api.rollback.json').write_text(json.dumps({'services':{'api':{'image':api['Image'],'environment':env}}}))
 envfile=root/'stage.env';envfile.write_text('\n'.join(k+'='+v.replace('\n','\\n') for k,v in env.items())+'\n')
 run(['docker','run','-d','--name','quiby-api-stage-116','--network','none','--env-file',str(envfile),'-e','DB_PATH=/tmp/quiby-stage.sqlite','-e','STORAGE_PATH=/tmp/quiby-stage','quiby-core-api:1.1.6'])
 try:
  for attempt in range(30):
   check=subprocess.run(['docker','exec','quiby-api-stage-116','node','-e',"fetch('http://127.0.0.1:3001/api/health').then(r=>r.json()).then(x=>{if(x.version!=='1.1.6'||x.minimumLauncherVersion!=='1.1.6')process.exitCode=1}).catch(()=>process.exitCode=1)"],capture_output=True)
   if check.returncode==0:break
   time.sleep(2)
  else:raise RuntimeError('API staging failed')
 finally:run(['docker','rm','-f','quiby-api-stage-116']);envfile.unlink()
 (root/'staged.ok').write_text('API 1.1.6 staging verified')
 print('STAGED_116_OK',flush=True)
def activate():
 assert (root/'staged.ok').exists()
 before=json.loads((root/'api-before.json').read_text());labels=before['Config']['Labels'];base=labels['com.docker.compose.project.config_files'].split(',')[0];cwd=labels['com.docker.compose.project.working_dir']
 stamp=time.strftime('%Y%m%dT%H%M%SZ',time.gmtime())
 run(['docker','exec','quiby-core-api','node','-e',"const s=require('sqlite3');let d=new s.Database('/app/data/quiby.sqlite');let b=d.backup('/app/data/backups/pre-116-"+stamp+".sqlite');b.step(-1,e=>{if(e)throw e;b.finish(e=>{if(e)throw e;d.close()})})"])
 def compose(override):run(['docker','compose','--project-directory',cwd,'-f',base,'-f',str(root/override),'up','-d','--no-deps','--no-build','api'])
 try:
  compose('api.override.json')
  for attempt in range(30):
   check=subprocess.run(['docker','exec','quiby-core-api','node','-e',"fetch('http://127.0.0.1:3001/api/health').then(r=>r.json()).then(x=>{if(x.version!=='1.1.6'||x.minimumLauncherVersion!=='1.1.6')process.exitCode=1}).catch(()=>process.exitCode=1)"],capture_output=True)
   if check.returncode==0:break
   time.sleep(2)
  else:raise RuntimeError('API health failed')
 except BaseException:compose('api.rollback.json');raise
 (root/'activated.ok').write_text(stamp);print('API_116_ACTIVE',flush=True)
if __name__=='__main__':
 if sys.argv[-1]=='stage':stage()
 elif sys.argv[-1]=='activate':activate()
 else:raise RuntimeError('Expected stage or activate')
