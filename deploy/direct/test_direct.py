import hashlib
import io
import socket
import struct
import threading
import unittest

from prepare import checked_bytes, configurations
from probe import exact, measure, packet, read_varint, varint


class Fragmented:
    def __init__(self, data):
        self.data = io.BytesIO(data)

    def recv(self, count):
        return self.data.read(min(count, 1))


class DirectTrialTests(unittest.TestCase):
    def test_hash_and_packet_boundaries(self):
        checked_bytes(b'official', hashlib.sha256(b'official').hexdigest())
        with self.assertRaises(ValueError):
            checked_bytes(b'tampered', hashlib.sha256(b'official').hexdigest())
        for value in [0, 127, 128, 767, 1048576]:
            self.assertEqual(read_varint(Fragmented(varint(value))), value)
        with self.assertRaises(ValueError):
            packet(Fragmented(varint(1024 * 1024 + 1)))
        with self.assertRaises(ConnectionError):
            exact(Fragmented(b'partial'), 20)

    def test_private_scope_and_certificate_verification(self):
        server, home, player = configurations('185.146.157.76', 443, '127.0.0.1', 25565, 25575, 'token', 'secret')
        self.assertTrue(server['transport']['tls']['force'])
        self.assertEqual(server['proxyBindAddr'], '127.0.0.1')
        self.assertNotIn('keyFile', player['transport']['tls'])
        self.assertEqual(player['transport']['tls']['trustedCaFile'], 'server.crt')
        self.assertEqual({p['localPort'] for p in home['proxies']}, {25565})
        self.assertEqual({p['bindAddr'] for p in player['visitors']}, {'127.0.0.1'})
        self.assertEqual(player['visitors'][1]['fallbackTo'], 'fallback')

    def test_real_status_handshake_and_ping(self):
        with socket.socket() as listener:
            listener.bind(('127.0.0.1', 0))
            listener.listen()
            errors = []

            def serve():
                try:
                    with listener.accept()[0] as client:
                        client.settimeout(3)
                        handshake = packet(client)
                        self.assertEqual(handshake[:3], b'\0' + varint(767))
                        self.assertEqual(packet(client), b'\0')
                        status = b'\0\x02{}'
                        client.sendall(varint(len(status)) + status)
                        pong = packet(client)
                        self.assertEqual(len(pong), 9)
                        for byte in varint(len(pong)) + pong:
                            client.sendall(bytes([byte]))
                except BaseException as error:
                    errors.append(error)

            worker = threading.Thread(target=serve)
            worker.start()
            self.assertGreaterEqual(measure('127.0.0.1', listener.getsockname()[1]), 0)
            worker.join(timeout=4)
            self.assertFalse(worker.is_alive())
            self.assertFalse(errors, errors)


if __name__ == '__main__':
    unittest.main()
