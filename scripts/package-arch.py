"""Build a local Arch Linux x86_64 package from the existing Linux app."""
import gzip
import hashlib
import importlib.util
import pathlib
import shutil
import subprocess
import tarfile
import tempfile
import time

spec = importlib.util.spec_from_file_location("linux_package", pathlib.Path(__file__).with_name("package-linux.py"))
linux = importlib.util.module_from_spec(spec)
spec.loader.exec_module(linux)
OUTPUT = linux.OUTPUT / f"quiby-core-{linux.VERSION}-1-x86_64.pkg.tar.zst"
DEPENDENCIES = ["gtk3", "libnotify", "nss", "libxss", "libxtst", "xdg-utils", "at-spi2-core", "libsecret", "alsa-lib", "mesa"]


def main():
    tar = shutil.which("bsdtar") or shutil.which("tar")
    if not tar or "bsdtar" not in subprocess.check_output([tar, "--version"], text=True):
        raise RuntimeError("libarchive bsdtar with zstd support is required")
    with (linux.SOURCE / "quiby-core").open("rb") as source:
        header = source.read(20)
    assert header[:5] == b"\x7fELF\x02" and header[18:20] == b"\x3e\x00", "Expected Linux x86_64 ELF"
    assert (linux.SOURCE / "resources/app.asar").is_file()
    with tempfile.TemporaryDirectory(prefix=".arch-", dir=linux.OUTPUT) as temp:
        assert pathlib.Path(temp).resolve().is_relative_to(linux.OUTPUT.resolve())
        raw, mtree = pathlib.Path(temp) / "package.tar", pathlib.Path(temp) / "mtree"
        with tarfile.open(raw, "w") as archive:
            folder = tarfile.TarInfo("opt/quiby.core")
            folder.type, folder.mode = tarfile.DIRTYPE, 0o755
            folder.uname = folder.gname = "root"
            archive.addfile(folder)
            linux.add_app(archive, "opt/quiby.core", installed=True)
            linux.add_bytes(archive, "usr/share/applications/quiby-core.desktop", linux.DESKTOP)
            linux.add_bytes(archive, "usr/share/pixmaps/quiby-core.png", linux.ICON.read_bytes())
            linux.add_bytes(archive, "usr/bin/quiby-core", b'#!/bin/sh\nexec /opt/quiby.core/quiby-core "$@"\n', 0o755)
        with tarfile.open(raw) as archive:
            size = sum(f.size for f in archive.getmembers() if f.isfile())
        info = (
            f"pkgname = quiby-core\npkgbase = quiby-core\npkgver = {linux.VERSION}-1\n"
            "pkgdesc = Quiby Season VI Minecraft Launcher\n"
            "url = https://github.com/cl0rex1/quiby.core\n"
            f"builddate = {int(time.time())}\npackager = Quiby Team\nsize = {size}\n"
            "arch = x86_64\nlicense = MIT\nxdata = pkgtype=pkg\n"
            + "".join(f"depend = {name}\n" for name in DEPENDENCIES)
        ).encode()
        # Put package metadata first, then copy the payload with its Unix permissions.
        payload = pathlib.Path(temp) / "payload.tar"
        raw.rename(payload)
        with tarfile.open(raw, "w") as archive, tarfile.open(payload) as source:
            linux.add_bytes(archive, ".PKGINFO", info)
            for entry in source:
                archive.addfile(entry, source.extractfile(entry) if entry.isfile() else None)
        subprocess.run([tar, "--format=mtree", "--options", "!all,use-set,type,uid,gid,mode,time,size,sha256,link", "-cf", str(mtree), "@" + str(raw)], check=True)
        with tarfile.open(raw, "a") as archive:
            linux.add_bytes(archive, ".MTREE", gzip.compress(mtree.read_bytes(), mtime=0))
        subprocess.run([tar, "--format=pax", "--zstd", "-cf", str(OUTPUT), "@" + str(raw)], check=True)
    with OUTPUT.open("rb") as stream:
        checksum = hashlib.file_digest(stream, "sha256").hexdigest()
    OUTPUT.with_name(OUTPUT.name + ".sha256").write_text(checksum + "  " + OUTPUT.name + "\n")
    print(OUTPUT)


if __name__ == "__main__":
    main()
