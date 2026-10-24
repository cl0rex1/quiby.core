"""Install the independent game access policy without touching Minecraft or access settings.

Run as the existing CasaOS owner; the payload contains compiled API code, admin
assets and the six changed source files, never credentials or a database.
"""
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tarfile
import time
from datetime import datetime, timezone
from pathlib import Path

API = 'quiby-core-api'
GAME = 'big-bear-crafty'
REPO = Path('/home/cl0rex1/quiby.core')
POLICY = r"""
const sqlite=require('sqlite3'),crypto=require('crypto'),fs=require('fs');
const db=new sqlite.Database('/app/data/quiby.sqlite');
const all=sql=>new Promise((resolve,reject)=>db.all(sql,(e,r)=>e?reject(e):resolve(r)));
(async()=>{
  if(process.argv[1]){fs.mkdirSync('/app/data/backups',{recursive:true});await new Promise((resolve,reject)=>db.exec("VACUUM INTO '"+process.argv[1]+"'",e=>e?reject(e):resolve()));}
  const access=await all('SELECT * FROM launcher_access ORDER BY id');
  const users=await all('SELECT discord_id,is_whitelisted,launcher_access_exempt FROM users ORDER BY discord_id');
  const pack=await all('SELECT version_id,is_active FROM modpack_versions ORDER BY id');
  console.log(JSON.stringify({hash:crypto.createHash('sha256').update(JSON.stringify({access,users,pack})).digest('hex'),launcherClosed:Boolean(access[0]?.closed),players:users.length}));
  db.close();
})().catch(e=>{console.error(e.message);db.close();process.exitCode=1});
"""


def run(*args, capture=False):
    return subprocess.check_output(args, text=True).strip() if capture else subprocess.run(args, check=True)


def inspect(name):
    return json.loads(run('docker', 'inspect', name, capture=True))[0]


def snapshot(backup=''):
    return json.loads(run('docker', 'exec', API, 'node', '-e', POLICY, *([backup] if backup else []), capture=True))


def main():
    os.umask(0o077)
    payload = Path(sys.argv[1]).resolve()
    assert hashlib.sha256(payload.read_bytes()).hexdigest() == sys.argv[2], 'Wrong payload'
    before_api, before_game = inspect(API), inspect(GAME)
    assert before_api['State']['Running'] and before_game['State']['Running']
    labels = before_api['Config']['Labels']
    assert labels['com.docker.compose.service'] == 'api'
    configs = [Path(p).resolve() for p in labels['com.docker.compose.project.config_files'].split(',')]
    assert configs[0] == REPO / 'deploy/casaos/docker-compose.yml'
    assert len(configs) == 2 and configs[1].is_relative_to(Path('/home/cl0rex1/quiby-releases'))
    assert configs[1].name == 'api.override.json'
    override = json.loads(configs[1].read_text())
    assert set(override['services']) == {'api'}
    stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    work = Path('/home/cl0rex1/quiby-releases') / ('minecraft-access-' + stamp)
    work.mkdir()
    # Only our own generated bundle is accepted, and no links or paths may escape.
    with tarfile.open(payload) as archive:
        for item in archive.getmembers():
            target = (work / item.name).resolve()
            assert target.is_relative_to(work) and (item.isfile() or item.isdir())
        archive.extractall(work)
    assert (work / 'dist/services/gameAccess.js').is_file()
    base_tag = 'quiby-core-api:pre-minecraft-access-' + stamp.lower()
    new_tag = 'quiby-core-api:minecraft-access-' + stamp.lower()
    run('docker', 'tag', before_api['Image'], base_tag)
    (work / 'Dockerfile').write_text(f'FROM {base_tag}\nCOPY --chown=node:node dist /app/apps/server/dist\nCOPY --chown=node:node public /app/apps/server/public\n')
    run('docker', 'build', '--pull=false', '-t', new_tag, str(work))
    run('docker', 'run', '--rm', '--network', 'none', '-e', 'NODE_ENV=test',
        '-e', 'DB_PATH=/tmp/access-check.sqlite', '-e', 'STORAGE_PATH=/tmp/access-check', new_tag,
        'node', '-e', "(async()=>{const d=require('./apps/server/dist/models/db');const a=require('./apps/server/dist/services/gameAccess');await d.initDatabase();if((await a.getGameAccess()).closed)throw Error('Default closed');await a.setGameAccess(true,'Maintenance');if(!(await a.getGameAccess()).closed)throw Error('Closure failed');await d.closeDatabase();console.log('LINUX_GAME_ACCESS_CHECK_OK')})().catch(e=>{console.error(e.message);process.exit(1)})")
    backup = '/app/data/backups/pre-minecraft-access-' + stamp + '.sqlite'
    original_policy = snapshot(backup)
    shutil.copy2(configs[1], work / 'api.override.before.json')
    compose = ['docker', 'compose', '--project-directory', labels['com.docker.compose.project.working_dir'], '-p', labels['com.docker.compose.project']]
    for config in configs:
        compose += ['-f', str(config)]
    override['services']['api']['image'] = new_tag
    configs[1].write_text(json.dumps(override, indent=2) + '\n')
    try:
        run(*compose, 'up', '-d', '--no-deps', '--no-build', 'api')
        for attempt in range(60):
            try:
                status = json.loads(run('docker', 'exec', API, 'node', '-e',
                    "(async()=>{const h=await fetch('http://127.0.0.1:3001/api/health');const a=await fetch('http://127.0.0.1:3001/api/game/access');if(!h.ok||!a.ok)throw Error('API unavailable');console.log(JSON.stringify(await a.json()))})().catch(()=>process.exit(1))", capture=True))
                assert status['closed'] is False
                break
            except (subprocess.CalledProcessError, ValueError, KeyError, AssertionError):
                if attempt == 59:
                    raise
                time.sleep(1)
        assert snapshot() == original_policy, 'Existing access or active modpack changed'
        after_game = inspect(GAME)
        assert after_game['Id'] == before_game['Id'] and after_game['State']['StartedAt'] == before_game['State']['StartedAt']
        assert after_game['State']['Running'], 'Minecraft container changed'
    except Exception:
        shutil.copy2(work / 'api.override.before.json', configs[1])
        run(*compose, 'up', '-d', '--no-deps', '--no-build', 'api')
        raise
    # Keep the host checkout consistent with the image; back up overwritten sources.
    for source in (work / 'source').rglob('*'):
        if not source.is_file():
            continue
        relative = source.relative_to(work / 'source')
        assert relative.parts[:2] == ('apps', 'server')
        target = REPO / relative
        if target.exists():
            saved = work / 'source-before' / relative
            saved.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(target, saved)
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)
    proof = {'stage': 'installed', 'image': new_tag, 'databaseBackup': backup, 'policyPreserved': True,
             'minecraftContainerUnchanged': True, 'minecraftAccessClosed': status['closed'], 'launcherClosed': original_policy['launcherClosed']}
    (work / 'proof.json').write_text(json.dumps(proof, indent=2) + '\n')
    print(json.dumps(proof), flush=True)


if __name__ == '__main__':
    main()
