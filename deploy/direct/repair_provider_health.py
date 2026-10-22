"""Remove the API image's unrelated HTTP healthcheck from the existing frpc container."""
import copy
import http.client
import json
import os
import pathlib
import socket
import subprocess


class Docker(http.client.HTTPConnection):
    def connect(self):
        self.sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        self.sock.settimeout(30)
        self.sock.connect('/var/run/docker.sock')


def repair():
    name = 'quiby-direct-provider'
    before = json.loads(subprocess.check_output(['docker', 'inspect', name]))[0]
    health = before['Config'].get('Healthcheck', {})
    if health.get('Test') == ['NONE']:
        print('Provider already has no inherited API healthcheck')
        return
    assert '/api/health' in str(health) and '3001' in str(health), 'Unexpected healthcheck; inspect manually'
    assert before['HostConfig']['NetworkMode'] == 'host' and before['HostConfig']['ReadonlyRootfs']
    assert before['State']['Running'], 'Provider must be running before this repair'
    backup = pathlib.Path.home() / 'quiby-releases/1.1.3/direct-provider-before.json'
    backup.parent.mkdir(parents=True, exist_ok=True)
    backup.write_text(json.dumps(before))
    backup.chmod(0o600)
    spec = copy.deepcopy(before['Config'])
    spec['Image'] = before['Image']
    spec['Healthcheck'] = {'Test': ['NONE']}
    spec['HostConfig'] = before['HostConfig']
    client = Docker('localhost')
    temporary, previous = name + '-next-113', name + '-pre-113'
    client.request('POST', '/containers/create?name=' + temporary, json.dumps(spec), {'Content-Type': 'application/json'})
    response = client.getresponse()
    content = json.loads(response.read())
    assert response.status == 201, 'Could not create provider clone: ' + str(content.get('message', response.status))
    client.close()
    run = lambda *args: subprocess.run(['docker', *args], check=True, stdout=subprocess.DEVNULL)
    run('stop', name)
    run('rename', name, previous)
    try:
        run('rename', temporary, name)
        run('start', name)
        after = json.loads(subprocess.check_output(['docker', 'inspect', name]))[0]
        assert after['State']['Running'] and after['Config']['Healthcheck']['Test'] == ['NONE']
        for key in ['NetworkMode', 'Binds', 'ReadonlyRootfs', 'CapDrop', 'SecurityOpt', 'Memory']:
            assert after['HostConfig'][key] == before['HostConfig'][key], 'Changed provider setting: ' + key
        for key in ['User', 'Env', 'Cmd', 'Entrypoint', 'WorkingDir']:
            assert after['Config'][key] == before['Config'][key], 'Changed provider config: ' + key
    except BaseException:
        subprocess.run(['docker', 'stop', name], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        subprocess.run(['docker', 'rename', name, temporary + '-failed'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        run('rename', previous, name)
        run('start', name)
        raise
    print('Provider inherited API healthcheck removed; network, authorization files and permissions preserved; previous container retained stopped')


if __name__ == '__main__':
    os.umask(0o077)
    repair()
