"""Measure application round trips through the trial or the existing Minecraft address."""
import argparse
import json
import secrets
import socket
import statistics
import struct
import time


def varint(value):
    result = bytearray()
    while value >= 128:
        result.append((value & 127) | 128)
        value >>= 7
    result.append(value)
    return bytes(result)


def exact(sock, count):
    data = bytearray()
    while len(data) < count:
        chunk = sock.recv(count - len(data))
        if not chunk:
            raise ConnectionError('Connection closed before a complete reply')
        data.extend(chunk)
    return bytes(data)


def read_varint(sock):
    value = 0
    for shift in range(0, 35, 7):
        byte = exact(sock, 1)[0]
        value |= (byte & 127) << shift
        if not byte & 128:
            return value
    raise ValueError('Invalid VarInt')


def packet(sock):
    length = read_varint(sock)
    if not 1 <= length <= 1024 * 1024:
        raise ValueError('Invalid Minecraft status packet size')
    return exact(sock, length)


def measure(host, port, echo=False):
    with socket.create_connection((host, port), timeout=8) as sock:
        sock.settimeout(8)
        if echo:
            payload = b'QUIBY_DIRECT_PROBE:' + secrets.token_bytes(16)
            started = time.perf_counter()
            sock.sendall(payload)
            if exact(sock, len(payload)) != payload:
                raise ValueError('Diagnostic nonce mismatch')
        else:
            address = host.encode('utf8')
            handshake = b'\0' + varint(767) + varint(len(address)) + address + struct.pack('!H', port) + b'\1'
            sock.sendall(varint(len(handshake)) + handshake + b'\1\0')
            if packet(sock)[0] != 0:
                raise ValueError('Expected Minecraft status reply')
            nonce = secrets.token_bytes(8)
            started = time.perf_counter()
            sock.sendall(b'\x09\x01' + nonce)
            if packet(sock) != b'\1' + nonce:
                raise ValueError('Minecraft pong mismatch')
        return round((time.perf_counter() - started) * 1000, 2)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('host')
    parser.add_argument('port', type=int)
    parser.add_argument('--echo', action='store_true')
    parser.add_argument('--count', type=int, default=6)
    args = parser.parse_args()
    if not 1 <= args.count <= 50 or not 1 <= args.port <= 65535:
        parser.error('Count must be 1–50; port must be 1–65535')
    values = [measure(args.host, args.port, args.echo) for _ in range(args.count)]
    print(json.dumps({'host': args.host, 'port': args.port, 'mode': 'echo' if args.echo else 'minecraft-pong',
                      'samples_ms': values, 'median_ms': statistics.median(values)}, indent=2))
