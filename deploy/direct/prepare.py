"""Create a private, two-hour frp trial. Nothing is uploaded or enabled automatically."""
import argparse
import hashlib
import ipaddress
import json
import os
import pathlib
import re
import secrets
import shutil
import subprocess
import tarfile
import urllib.request
import zipfile

VERSION = '0.71.1'
ASSETS = {
    'linux_amd64.tar.gz': '1d9875210972a5d1a62b2dc4c48df45ab0af05d3ca1b5e494a014428259df803',
    'windows_amd64.zip': 'b90074b2b6a1d792a7a40f085ac6d276bcab2d1bc60201f8a86ca53ce65ce821',
}


def checked_bytes(data, expected):
    if hashlib.sha256(data).hexdigest() != expected:
        raise ValueError('Official frp archive checksum mismatch')
    return data


def configurations(server, port, target, target_port, local_port, token, secret):
    auth = {'method': 'token', 'token': token, 'additionalScopes': ['HeartBeats', 'NewWorkConns']}
    log = {'to': 'console', 'level': 'info', 'disablePrintColor': True}
    coordinator = {
        'bindAddr': '0.0.0.0', 'bindPort': port, 'proxyBindAddr': '127.0.0.1',
        'maxPortsPerClient': 2, 'allowPorts': [{'single': 1}], 'auth': auth, 'log': log,
        'transport': {'maxPoolCount': 1, 'tls': {'force': True, 'certFile': 'server.crt', 'keyFile': 'server.key'}},
    }
    common = {
        'serverAddr': server, 'serverPort': port, 'natHoleStunServer': 'stun.easyvoip.com:3478',
        'auth': auth, 'log': log,
        'transport': {'tls': {'enable': True, 'serverName': 'quiby-direct-test', 'trustedCaFile': 'server.crt'}},
    }
    provider = {**common, 'user': 'quiby-host', 'proxies': [
        {'name': name, 'type': kind, 'localIP': target, 'localPort': target_port,
         'secretKey': secret, 'allowUsers': ['quiby-visitor'], 'transport': {'useEncryption': True}}
        for name, kind in [('minecraft-direct', 'xtcp'), ('minecraft-relay', 'stcp')]]
    }
    visitor_common = {
        'serverUser': 'quiby-host', 'secretKey': secret, 'bindAddr': '127.0.0.1',
        'transport': {'useEncryption': True},
    }
    visitor = {**common, 'user': 'quiby-visitor', 'visitors': [
        {**visitor_common, 'name': 'fallback', 'type': 'stcp', 'serverName': 'minecraft-relay', 'bindPort': -1},
        {**visitor_common, 'name': 'direct', 'type': 'xtcp', 'serverName': 'minecraft-direct',
         'bindPort': local_port, 'fallbackTo': 'fallback', 'fallbackTimeoutMs': 4000,
         'keepTunnelOpen': True, 'minRetryInterval': 30, 'maxRetriesAnHour': 30},
    ]}
    return coordinator, provider, visitor


def private_write(path, text, executable=False):
    path.write_text(text, encoding='utf-8', newline='\n')
    path.chmod(0o700 if executable else 0o600)


def extract_binaries(archive, platform, destinations):
    prefix = f'frp_{VERSION}_{platform}/'
    if platform == 'windows_amd64':
        with zipfile.ZipFile(archive) as source:
            for name, target in destinations.items():
                target.write_bytes(source.read(prefix + name))
    else:
        with tarfile.open(archive) as source:
            for name, target in destinations.items():
                member = source.getmember(prefix + name)
                if not member.isfile():
                    raise ValueError('Expected a regular executable in the official archive')
                target.write_bytes(source.extractfile(member).read())
                target.chmod(0o700)


def prepare(output, server, port, target, target_port, local_port, openssl):
    try:
        san = 'IP:' + str(ipaddress.ip_address(server))
    except ValueError:
        if not re.fullmatch(r'[A-Za-z0-9](?:[A-Za-z0-9.-]{0,251}[A-Za-z0-9])?', server):
            raise ValueError('Expected a server IP address or DNS name')
        san = 'DNS:' + server
    if any(not 1 <= p <= 65535 for p in [port, target_port, local_port]):
        raise ValueError('Port out of range')
    output.mkdir(mode=0o700, parents=True, exist_ok=False)
    private_write(output / '.gitignore', '*\n')
    vps, home, player = [output / name for name in ['vps', 'home', 'player']]
    for folder in [vps, home, player]:
        folder.mkdir(mode=0o700)
    configs = configurations(server, port, target, target_port, local_port, secrets.token_hex(32), secrets.token_hex(32))
    for folder, config in zip([vps, home, player], configs):
        private_write(folder / ('frps.json' if folder == vps else 'frpc.json'), json.dumps(config, indent=2))
    subprocess.run([openssl, 'req', '-x509', '-newkey', 'rsa:2048', '-sha256', '-nodes',
                    '-keyout', str(vps / 'server.key'), '-out', str(vps / 'server.crt'), '-days', '7',
                    '-subj', '/CN=quiby-direct-test', '-addext', 'subjectAltName=DNS:quiby-direct-test,' + san],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    (vps / 'server.key').chmod(0o600)
    for folder in [home, player]:
        shutil.copyfile(vps / 'server.crt', folder / 'server.crt')
    for suffix, expected in ASSETS.items():
        name = f'frp_{VERSION}_{suffix}'
        archive = output / name
        with urllib.request.urlopen(f'https://github.com/fatedier/frp/releases/download/v{VERSION}/{name}', timeout=40) as response:
            data = response.read(24 * 1024 * 1024 + 1)
        archive.write_bytes(checked_bytes(data, expected))
        if suffix.startswith('windows'):
            extract_binaries(archive, 'windows_amd64', {'frpc.exe': player / 'frpc.exe', 'LICENSE': player / 'LICENSE'})
        else:
            extract_binaries(archive, 'linux_amd64', {'frps': vps / 'frps', 'frpc': home / 'frpc', 'LICENSE': home / 'LICENSE'})
            shutil.copyfile(home / 'LICENSE', vps / 'LICENSE')
    private_write(home / 'start.sh', '#!/bin/sh\nset -eu\ncd -- "$(dirname -- "$0")"\nexec timeout 7200 ./frpc -c frpc.json\n', True)
    private_write(player / 'start.cmd', '@echo off\r\ncd /d "%~dp0"\r\necho Quiby direct test - keep this window open while playing.\r\nfrpc.exe -c frpc.json\r\npause\r\n')
    private_write(player / 'README.txt', f'Quiby direct test\nRun start.cmd and keep it open.\nLaunch Minecraft with the usual Quiby launcher, then connect to 127.0.0.1:{local_port}.\nThe private trial coordinator expires after two hours.\nDo not share this folder publicly: it contains temporary trial credentials.\n')
    start = '''#!/bin/sh
set -eu
cd -- "$(dirname -- "$0")"
[ "$(id -u)" = 0 ] || { echo 'Run on the VPS as root'; exit 1; }
if systemctl is-active --quiet quiby-direct443-test; then echo 'An existing trial is active; stop it before rotating its files'; exit 1; fi
install -d -m 700 /var/lib/quiby-direct-test
install -d -m 755 /opt/quiby-direct-test
install -m 755 frps /opt/quiby-direct-test/frps
install -m 600 frps.json server.key /var/lib/quiby-direct-test/
install -m 644 server.crt /var/lib/quiby-direct-test/
exec systemd-run --unit=quiby-direct443-test --collect --property=RuntimeMaxSec=2h \\
 --property=StateDirectory=quiby-direct-test --property=StateDirectoryMode=0700 \\
 --property=WorkingDirectory=/var/lib/quiby-direct-test --property=DynamicUser=yes \\
 --property=AmbientCapabilities=CAP_NET_BIND_SERVICE --property=CapabilityBoundingSet=CAP_NET_BIND_SERVICE \\
 --property=NoNewPrivileges=yes --property=ProtectSystem=strict --property=ProtectHome=yes \\
 --property=PrivateTmp=yes --property=MemoryMax=128M --property=TasksMax=64 \\
 /opt/quiby-direct-test/frps -c /var/lib/quiby-direct-test/frps.json
'''
    private_write(vps / 'start.sh', start, True)
    if os.name == 'nt':
        for folder, binary in [(vps, 'frps'), (home, 'frpc'), (player, 'frpc')]:
            # Only the Windows build can be run here; the other roles use the same verified JSON schema.
            verifier = output / 'frps-verify.exe' if folder == vps else player / 'frpc.exe'
            if folder == vps:
                extract_binaries(output / f'frp_{VERSION}_windows_amd64.zip', 'windows_amd64', {'frps.exe': verifier})
            subprocess.run([str(verifier), 'verify', '-c', str(folder / ('frps.json' if folder == vps else 'frpc.json'))], cwd=folder, check=True)
    shutil.make_archive(str(output / 'quiby-direct-player'), 'zip', player)
    print('Private trial prepared:', output)
    print('No credentials printed, uploaded, or activated. Player archive:', output / 'quiby-direct-player.zip')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--server', required=True)
    parser.add_argument('--port', type=int, default=443)
    parser.add_argument('--target', default='127.0.0.1')
    parser.add_argument('--target-port', type=int, default=25565)
    parser.add_argument('--local-port', type=int, default=25575)
    parser.add_argument('--output', type=pathlib.Path, required=True)
    parser.add_argument('--openssl', default=shutil.which('openssl') or 'C:/Program Files/Git/usr/bin/openssl.exe')
    args = parser.parse_args()
    prepare(args.output.resolve(), args.server, args.port, args.target, args.target_port, args.local_port, args.openssl)
