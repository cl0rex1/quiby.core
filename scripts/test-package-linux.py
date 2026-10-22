"""Check the real Debian and portable artifacts produced by package-linux.py."""
import hashlib
import io
import pathlib
import tarfile
import importlib.util

spec = importlib.util.spec_from_file_location("linux_package", pathlib.Path(__file__).with_name("package-linux.py"))
package = importlib.util.module_from_spec(spec)
spec.loader.exec_module(package)

deb = package.OUTPUT / (package.NAME + ".deb")
members = {}
with deb.open("rb") as stream:
    assert stream.read(8) == b"!<arch>\n"
    while header := stream.read(60):
        assert len(header) == 60 and header[-2:] == b"`\n"
        name, size = header[:16].decode().strip().rstrip("/"), int(header[48:58])
        members[name] = stream.read(size)
        assert len(members[name]) == size
        if size % 2:
            assert stream.read(1) == b"\n"
assert list(members) == ["debian-binary", "control.tar.gz", "data.tar.gz"]
assert members["debian-binary"] == b"2.0\n"
with tarfile.open(fileobj=io.BytesIO(members["control.tar.gz"])) as control:
    text = control.extractfile("./control").read().decode()
    assert "Architecture: amd64\n" in text and f"Version: {package.VERSION}\n" in text
with tarfile.open(fileobj=io.BytesIO(members["data.tar.gz"])) as data:
    binary = data.getmember("./opt/quiby.core/quiby-core")
    assert binary.mode == 0o755 and data.extractfile(binary).read(5) == b"\x7fELF\x02"
    sandbox = data.getmember("./opt/quiby.core/chrome-sandbox")
    assert sandbox.mode == 0o4755 and sandbox.uid == 0
    assert data.getmember("./usr/bin/quiby-core").mode == 0o755
    assert data.extractfile("./usr/share/applications/quiby-core.desktop").read() == package.DESKTOP
    assert data.extractfile("./usr/share/pixmaps/quiby-core.png").read() == package.ICON.read_bytes()
    packaged_asar = hashlib.sha256(data.extractfile("./opt/quiby.core/resources/app.asar").read()).digest()
    assert all(not f.name.endswith((".exe", ".dll")) for f in data.getmembers())
with tarfile.open(package.OUTPUT / (package.NAME + ".tar.gz")) as portable:
    assert portable.getmember(package.NAME + "/quiby-core").mode == 0o755
    assert hashlib.sha256(portable.extractfile(package.NAME + "/resources/app.asar").read()).digest() == packaged_asar
with (package.SOURCE / "resources/app.asar").open("rb") as stream:
    assert hashlib.file_digest(stream, "sha256").digest() == packaged_asar
print("Linux x64 Debian metadata, ELF, executable/sandbox permissions, desktop/icon, portable archive and app content: PASS")
