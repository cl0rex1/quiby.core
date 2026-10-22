"""Simple Voice Chat 2.6 public UDP ping; checks the matching nonce, not just an open port."""
import argparse
import socket
import struct
import time
import uuid


def ping(host, port=24454, timeout=3):
    payload = uuid.uuid4().bytes + struct.pack('>q', time.time_ns() // 1_000_000)
    request = b'\xff' + uuid.UUID('58bc9ae9-c7a8-45e4-a11c-efbb67199425').bytes + b'\x18' + payload
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
        sock.settimeout(timeout)
        sock.connect((host, port))
        start = time.perf_counter()
        sock.send(request)
        if sock.recv(512) != payload:
            raise ValueError('Voice server returned a mismatched ping')
        return (time.perf_counter() - start) * 1000


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('host')
    parser.add_argument('--port', type=int, default=24454)
    args = parser.parse_args()
    for attempt in range(3):
        print(f'Voice UDP {args.host}:{args.port}: {ping(args.host, args.port):.1f} ms', flush=True)
