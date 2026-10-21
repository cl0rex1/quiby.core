"""Prepare a private, authenticated frp installation. Does not deploy or change networking."""
import argparse
import json
import pathlib
import secrets
import shutil
import subprocess
import urllib.request
from prepare import VERSION, ASSETS, checked_bytes, extract_binaries, private_write


def prepare(output, server, plugin_url, openssl):
    if not plugin_url.startswith('https://'):
        raise ValueError('Use the public HTTPS API for the frps authorization plugin')
    from urllib.parse import urlsplit
    endpoint = urlsplit(plugin_url)
    if endpoint.username or endpoint.password or endpoint.query or endpoint.fragment:
        raise ValueError('Expected a clean HTTPS API URL')
    output.mkdir(parents=True, exist_ok=False, mode=0o700)
    private_write(output / '.gitignore', '*\n')
    vps, home = output / 'vps', output / 'home'
    for folder in (vps, home):
        folder.mkdir(mode=0o700)
    key = secrets.token_hex(32)
    subprocess.run([openssl, 'req', '-x509', '-newkey', 'rsa:2048', '-sha256', '-nodes',
                    '-keyout', str(vps / 'server.key'), '-out', str(vps / 'server.crt'), '-days', '730',
                    '-subj', '/CN=quiby-direct', '-addext', 'subjectAltName=DNS:quiby-direct'],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    (vps / 'server.key').chmod(0o600)
    shutil.copyfile(vps / 'server.crt', home / 'server.crt')
    ca = (vps / 'server.crt').read_text(encoding='ascii')
    private_write(output / 'api.env.json', json.dumps({'DIRECT_SERVER': server, 'DIRECT_PORT': '443',
                  'DIRECT_CA': ca, 'DIRECT_PROVIDER_KEY': key}, indent=2))
    coordinator = {
        'bindAddr': '0.0.0.0', 'bindPort': 443, 'proxyBindAddr': '127.0.0.1',
        'maxPortsPerClient': 2, 'allowPorts': [{'single': 1}], 'detailedErrorsToClient': False,
        'transport': {'tcpMux': False, 'maxPoolCount': 1, 'tls': {'force': True, 'certFile': 'server.crt', 'keyFile': 'server.key'}},
        'httpPlugins': [{'name': 'quiby-access', 'addr': 'https://' + endpoint.netloc,
                         'path': endpoint.path.rstrip('/') + '/api/direct/authorize',
                         'ops': ['Login', 'Ping', 'NewProxy']}],
        'log': {'to': 'console', 'level': 'warn'},
    }
    provider = {
        'serverAddr': server, 'serverPort': 443, 'user': 'quiby-host', 'metadatas': {'providerKey': key},
        'loginFailExit': False, 'natHoleStunServer': 'stun.easyvoip.com:3478',
        'transport': {'tcpMux': False, 'tls': {'enable': True, 'serverName': 'quiby-direct', 'trustedCaFile': 'server.crt'},
                      'heartbeatInterval': 15, 'heartbeatTimeout': 45},
        'proxies': [{'name': name, 'type': kind, 'localIP': '127.0.0.1', 'localPort': 25565,
                     'secretKey': '', 'allowUsers': ['quiby-player'], 'transport': {'useEncryption': True}}
                    for name, kind in [('minecraft-direct', 'xtcp'), ('minecraft-relay', 'stcp')]],
        'log': {'to': 'console', 'level': 'warn'},
    }
    for folder, config, binary in [(vps, coordinator, 'frps'), (home, provider, 'frpc')]:
        private_write(folder / (binary + '.json'), json.dumps(config, indent=2))
    asset = f'frp_{VERSION}_linux_amd64.tar.gz'
    with urllib.request.urlopen(f'https://github.com/fatedier/frp/releases/download/v{VERSION}/{asset}', timeout=40) as response:
        data = response.read(32 * 1024 * 1024 + 1)
    archive = output / asset
    archive.write_bytes(checked_bytes(data, ASSETS['linux_amd64.tar.gz']))
    extract_binaries(archive, 'linux_amd64', {'frps': vps / 'frps', 'frpc': home / 'frpc', 'LICENSE': home / 'LICENSE'})
    shutil.copyfile(home / 'LICENSE', vps / 'LICENSE')
    for folder, binary in [(vps, 'frps'), (home, 'frpc')]:
        unit = 'quiby-direct-coordinator' if binary == 'frps' else 'quiby-direct-provider'
        # Root-only files: the provider key and TLS key never enter a public package.
        private_write(folder / 'install.sh', f'''#!/bin/sh
set -eu
[ "$(id -u)" = 0 ] || {{ echo 'Run as root'; exit 1; }}
cd -- "$(dirname -- "$0")"
./{binary} verify -c {binary}.json
dest=/opt/{unit}
if [ -e "$dest" ]; then echo "$dest already exists; inspect before updating"; exit 1; fi
mkdir -m 700 "$dest"
cp {binary} {binary}.json server.crt LICENSE "$dest/"
''' + ('cp server.key "$dest/"\n' if binary == 'frps' else '') + f'''
chmod 600 "$dest"/*
chmod 700 "$dest/{binary}"
cat > /etc/systemd/system/{unit}.service <<'UNIT'
[Unit]
Description=Quiby automatic game transport
After=network-online.target
Wants=network-online.target
[Service]
WorkingDirectory=/opt/{unit}
ExecStart=/opt/{unit}/{binary} -c /opt/{unit}/{binary}.json
Restart=always
RestartSec=5
MemoryMax=128M
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
CapabilityBoundingSet={'CAP_NET_BIND_SERVICE' if binary == 'frps' else ''}
[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable --now {unit}
systemctl is-active {unit}
''', True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', required=True, type=pathlib.Path)
    parser.add_argument('--server', default='185.146.157.76')
    parser.add_argument('--api', required=True)
    parser.add_argument('--openssl', default='openssl')
    args = parser.parse_args()
    prepare(args.output, args.server, args.api, args.openssl)
    print('Private installation prepared. Keep api.env.json and server.key out of releases.')
