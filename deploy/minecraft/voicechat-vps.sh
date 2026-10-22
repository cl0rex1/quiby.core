#!/bin/sh
# Run as root on the existing Quiby WireGuard VPS. Does not change Minecraft TCP.
set -eu
[ "$(id -u)" = 0 ]
ip -4 address show wg0 | grep -q '10.77.0.1/'
command -v ufw >/dev/null
ufw status | grep -q 'Status: active'
wan=$(ip -4 route get 1.1.1.1 | sed -n 's/.* dev \([^ ]*\).*/\1/p' | head -1)
[ -n "$wan" ]
backup=/root/quiby-voice-backup-$(date -u +%Y%m%dT%H%M%SZ)
mkdir -m 700 "$backup"
cp /etc/ufw/before.rules /etc/ufw/sysctl.conf "$backup/"
iptables-save > "$backup/iptables.v4"
if ! grep -q '# quiby-voicechat-udp' /etc/ufw/before.rules; then
    cat >> /etc/ufw/before.rules <<EOF

# quiby-voicechat-udp
*nat
:PREROUTING ACCEPT [0:0]
:POSTROUTING ACCEPT [0:0]
-A PREROUTING -i $wan -p udp --dport 24454 -j DNAT --to-destination 10.77.0.2:24454
-A POSTROUTING -o wg0 -p udp -d 10.77.0.2 --dport 24454 -j SNAT --to-source 10.77.0.1
COMMIT
EOF
fi
iptables-restore --test < /etc/ufw/before.rules
if ! grep -q '^net/ipv4/ip_forward=1$' /etc/ufw/sysctl.conf; then
    printf '\nnet/ipv4/ip_forward=1\n' >> /etc/ufw/sysctl.conf
fi
ufw route allow in on "$wan" out on wg0 proto udp to 10.77.0.2 port 24454 comment 'Quiby voice chat'
sysctl -w net.ipv4.ip_forward=1
ufw reload
printf 'VOICECHAT_VPS_READY; backup: %s\n' "$backup"
iptables-save | grep -- '--dport 24454'
