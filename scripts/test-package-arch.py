"""Validate the final zstd package, including its mtree and application bytes."""
import gzip
import hashlib
import importlib.util
import pathlib
import shutil
import subprocess
import tarfile
import tempfile

spec = importlib.util.spec_from_file_location("arch_package", pathlib.Path(__file__).with_name("package-arch.py"))
package = importlib.util.module_from_spec(spec)
spec.loader.exec_module(package)
tar = shutil.which("bsdtar") or shutil.which("tar")
with package.OUTPUT.open("rb") as stream:
    assert stream.read(4) == b"\x28\xb5\x2f\xfd", "Missing zstd compression"
with tempfile.TemporaryDirectory(prefix=".arch-check-", dir=package.linux.OUTPUT) as temp:
    assert pathlib.Path(temp).resolve().is_relative_to(package.linux.OUTPUT.resolve())
    raw, regenerated = pathlib.Path(temp) / "package.tar", pathlib.Path(temp) / "mtree"
    subprocess.run([tar, "--format=pax", "-cf", str(raw), "@" + str(package.OUTPUT)], check=True)
    with tarfile.open(raw) as archive:
        files = archive.getmembers()
        assert files[0].name == ".PKGINFO"
        assert all(not f.name.startswith("/") and ".." not in pathlib.PurePosixPath(f.name).parts for f in files)
        info = archive.extractfile(".PKGINFO").read().decode()
        for line in ["pkgname = quiby-core", f"pkgver = {package.linux.VERSION}-1", "arch = x86_64", "xdata = pkgtype=pkg"]:
            assert line + "\n" in info
        for dependency in package.DEPENDENCIES:
            assert "depend = " + dependency + "\n" in info
        assert archive.getmember("opt/quiby.core").isdir()
        assert archive.getmember("opt/quiby.core/quiby-core").mode == 0o755
        sandbox = archive.getmember("opt/quiby.core/chrome-sandbox")
        assert sandbox.uid == 0 and sandbox.mode == 0o4755
        assert archive.getmember("usr/bin/quiby-core").mode == 0o755
        assert archive.extractfile("usr/share/applications/quiby-core.desktop").read() == package.linux.DESKTOP
        expected_mtree = gzip.decompress(archive.extractfile(".MTREE").read())
        for relative in ["quiby-core", "chrome-sandbox", "resources/app.asar"]:
            expected = hashlib.sha256((package.linux.SOURCE / relative).read_bytes()).digest()
            assert hashlib.sha256(archive.extractfile("opt/quiby.core/" + relative).read()).digest() == expected
        assert not any(f.name.endswith((".exe", ".dll")) for f in files)
    subprocess.run([tar, "--format=mtree", "--exclude", ".MTREE", "--options", "!all,use-set,type,uid,gid,mode,time,size,sha256,link", "-cf", str(regenerated), "@" + str(raw)], check=True)
    assert regenerated.read_bytes() == expected_mtree, "Package file metadata/hashes do not match .MTREE"
with package.OUTPUT.open("rb") as stream:
    assert hashlib.file_digest(stream, "sha256").hexdigest() == package.OUTPUT.with_name(package.OUTPUT.name + ".sha256").read_text().split()[0]
print("Arch package: zstd, PKGINFO/dependencies, all mtree hashes/metadata, application bytes and sandbox permissions PASS")
