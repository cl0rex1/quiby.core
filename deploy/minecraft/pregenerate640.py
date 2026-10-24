"""One-off progress/save guard; also resumes monitoring after the daily host restart."""
import fcntl,hashlib,json,pathlib,time,urllib.request

game=pathlib.Path(__file__).resolve().parent
assert game==pathlib.Path('/crafty/servers/827910b5-67f5-459f-8e6d-8b8e4b34367b')
pending=game/'quiby-pregen640-pending.json'
lock=(game/'quiby-pregen640.lock').open('w')
try:fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
except BlockingIOError:raise SystemExit(0)
if not pending.exists():raise SystemExit(0)
state=json.loads(pending.read_text());proof=state['proof']

def post(stage,extra):
    value={'stage':stage,'radius':state['radius'],'shape':'circle',**extra}
    (game/'quiby-pregen640-progress.json').write_text(json.dumps(value,ensure_ascii=False,indent=2))
    if state.get('transfer')=='http://192.168.18.18:18740':
        try:
            request=urllib.request.Request(state['transfer']+'/progress640',data=json.dumps(value).encode(),method='POST')
            urllib.request.urlopen(request,timeout=8).read()
        except Exception:pass

def jvm():
    found=[]
    for candidate in pathlib.Path('/proc').iterdir():
        try:
            if candidate.name.isdigit() and (candidate/'exe').resolve().name=='java' and (candidate/'cwd').resolve()==game:found.append(candidate)
        except (OSError,PermissionError):pass
    return found[0] if len(found)==1 else None

def command(text):
    proc=jvm()
    if proc is None:return False
    with (proc/'fd/0').open('w') as output:output.write(text+'\n');output.flush()
    return True

try:
    while pending.exists():
        log=game/'logs/latest.log'
        text=log.read_text(errors='replace') if log.exists() else ''
        lines=[line for line in text.splitlines() if '[Chunky]' in line]
        if any('Task finished for ' in line and '100.00%' in line for line in lines[-6:]):
            proc=jvm()
            if proc is None:
                time.sleep(15);continue
            lockdata=json.loads((game/'server-pack.json').read_text());assert lockdata['packVersion']=='6.1.40'
            assert all(hashlib.sha256((game/'mods'/m['file']).read_bytes()).hexdigest()==m['sha256'] for m in lockdata['mods'])
            opened=[]
            for fd in (proc/'fd').iterdir():
                try:opened.append(str(fd.readlink()))
                except OSError:pass
            assert str(game/'mods/quiby-1.21.1-1.1.33.jar') in opened
            offset=log.stat().st_size
            assert command('save-all flush')
            deadline=time.monotonic()+180
            while time.monotonic()<deadline:
                time.sleep(2)
                fresh=log.read_bytes()[offset:].decode(errors='replace')
                if 'Saved the game' in fresh:break
            else:raise RuntimeError('Fresh final save did not complete')
            proof['game']['pid']=proc.name
            proof['pregeneration']={'radius':state['radius'],'shape':'circle','complete':True,'last':lines[-6:],'elapsedSeconds':round(time.time()-state['startedAt'])}
            proof['finalWorldSaved']=True
            (game/'quiby-season-ready-640.json').write_text(json.dumps(proof,ensure_ascii=False,indent=2))
            pending.unlink()
            post('complete',{'proof':proof})
            break
        import shutil
        free=shutil.disk_usage(game).free
        if free<15*1024**3:
            command('chunky pause');raise RuntimeError('Paused: less than 15 GiB disk free')
        post('pregenerating',{'last':lines[-6:],'elapsedSeconds':round(time.time()-state['startedAt']),'freeBytes':free})
        time.sleep(15)
except BaseException as error:
    post('failed',{'error':str(error)});raise
