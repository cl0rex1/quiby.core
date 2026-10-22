"""Package an electron-builder Linux directory locally, without publishing.

The Debian archive uses standard ar + tar.gz containers, so this step also
works on Windows without a Linux-only FPM executable.
"""
import hashlib
import io
import json
import pathlib
import tarfile
import time

ROOT = pathlib.Path(__file__).resolve().parents[1]
APP = ROOT / "apps/launcher"
OUTPUT = APP / "release/linux"
SOURCE = OUTPUT / "linux-unpacked"
VERSION = json.loads((APP / "package.json").read_text("utf-8"))["version"]
NAME = f"quiby.core-{VERSION}-linux-x64"
ICON = APP / "src/renderer/src/assets/quiby_q_logo.png"
DESKTOP = b"""[Desktop Entry]
Name=quiby.core
Comment=Quiby Season VI Minecraft Launcher
Exec=/opt/quiby.core/quiby-core %U
Icon=quiby-core
Terminal=false
Type=Application
Categories=Game;
StartupWMClass=quiby.core
"""


def add_bytes(archive, name, data, mode=0o644):
    info = tarfile.TarInfo(name)
    info.size, info.mode, info.mtime = len(data), mode, int(time.time())
    archive.addfile(info, io.BytesIO(data))


def add_app(archive, prefix, installed=False):
    for file in sorted(SOURCE.rglob("*")):
        relative = file.relative_to(SOURCE).as_posix()
        info = archive.gettarinfo(str(file), prefix + "/" + relative)
        info.uid = info.gid = 0
        info.uname = info.gname = "root"
        if file.is_dir():
            info.mode = 0o755
            archive.addfile(info)
        else:
            with file.open("rb") as stream:
                info.mode = 0o755 if stream.read(4) == b"\x7fELF" or relative == "chrome_crashpad_handler" else 0o644
                if installed and relative == "chrome-sandbox":
                    info.mode = 0o4755
                stream.seek(0)
                archive.addfile(info, stream)


def ar_member(output, name, data):
    header = f"{name + '/':<16}{int(time.time()):<12}{0:<6}{0:<6}{'100644':<8}{len(data):<10}`\n".encode("ascii")
    assert len(header) == 60
    output.write(header)
    output.write(data)
    if len(data) % 2:
        output.write(b"\n")


def main():
    binary = (SOURCE / "quiby-core").read_bytes()[:20]
    assert binary[:5] == b"\x7fELF\x02" and binary[18:20] == b"\x3e\x00", "Expected Linux x86-64 ELF"
    assert (SOURCE / "resources/app.asar").is_file(), "Missing packaged application"
    portable = OUTPUT / (NAME + ".tar.gz")
    with tarfile.open(portable, "w:gz") as archive:
        add_app(archive, NAME)
        add_bytes(archive, NAME + "/README.txt", (
            "quiby.core " + VERSION + " (Linux x64)\n\n"
            "Run ./quiby-core from a desktop session as your regular user.\n"
            "On Debian/Ubuntu the .deb installs dependencies and the sandbox.\n"
            "The portable archive requires Chromium/Electron desktop libraries\n"
            "and enabled unprivileged user namespaces for the sandbox.\n"
            "Do not run as root or disable the Chromium sandbox.\n"
            "Java 21 is detected or downloaded by the launcher.\n"
            "Automatic launcher updates and direct transport are Windows-only\n"
            "in this version; Linux uses the normal Minecraft server route.\n"
        ).encode())
    payload = OUTPUT / "data.tar.gz"
    with tarfile.open(payload, "w:gz") as archive:
        add_app(archive, "./opt/quiby.core", installed=True)
        add_bytes(archive, "./usr/share/applications/quiby-core.desktop", DESKTOP)
        add_bytes(archive, "./usr/share/pixmaps/quiby-core.png", ICON.read_bytes())
        add_bytes(archive, "./usr/bin/quiby-core", b'#!/bin/sh\nexec /opt/quiby.core/quiby-core "$@"\n', 0o755)
    control = io.BytesIO()
    installed_size = (sum(f.stat().st_size for f in SOURCE.rglob("*") if f.is_file()) + 1023) // 1024
    with tarfile.open(fileobj=control, mode="w:gz") as archive:
        add_bytes(archive, "./control", (
            f"Package: quiby-core\nVersion: {VERSION}\nArchitecture: amd64\n"
            "Maintainer: Quiby Team\nSection: games\nPriority: optional\n"
            f"Installed-Size: {installed_size}\n"
            "Depends: libgtk-3-0, libnotify4, libnss3, libxss1, libxtst6, xdg-utils, libatspi2.0-0, libuuid1, libsecret-1-0, libgbm1, libasound2 | libasound2t64\n"
            "Description: Quiby Season VI Minecraft Launcher\n"
            " Private local Linux build of the Quiby desktop launcher.\n"
        ).encode())
    deb = OUTPUT / (NAME + ".deb")
    with deb.open("wb") as output:
        output.write(b"!<arch>\n")
        ar_member(output, "debian-binary", b"2.0\n")
        ar_member(output, "control.tar.gz", control.getvalue())
        ar_member(output, "data.tar.gz", payload.read_bytes())
    payload.unlink()
    for artifact in [deb, portable]:
        with artifact.open("rb") as stream:
            digest = hashlib.file_digest(stream, "sha256").hexdigest()
        artifact.with_name(artifact.name + ".sha256").write_text(digest + "  " + artifact.name + "\n")
        print(artifact)


if __name__ == "__main__":
    main()
