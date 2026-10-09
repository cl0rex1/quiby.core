"""Build the complete dedicated server bundle from the verified launcher mods."""
import argparse
import hashlib
import io
import json
import os
import pathlib
import tomllib
import urllib.request
import zipfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
TEMPLATES = ROOT / "deploy/minecraft"
INSTALLER = "neoforge-21.1.250-installer.jar"
INSTALLER_SHA256 = "0e47a91ba2139a8db4bf7627af081f7b5789b508bb039ee8dea1272b79693d60"
INSTALLER_URL = "https://maven.neoforged.net/releases/net/neoforged/neoforge/21.1.250/" + INSTALLER


def inspect_jar(raw):
    modules, dependencies = [], []
    with zipfile.ZipFile(io.BytesIO(raw)) as jar:
        for name in ("META-INF/neoforge.mods.toml", "META-INF/mods.toml"):
            if name in jar.namelist():
                meta = tomllib.loads(jar.read(name).decode("utf-8-sig"))
                modules.extend(m["modId"] for m in meta.get("mods", []))
                for entries in meta.get("dependencies", {}).values():
                    dependencies.extend(d["modId"] for d in entries if d.get("type") == "required"
                                        and d.get("side", "BOTH") != "CLIENT")
                break
        if "META-INF/jarjar/metadata.json" in jar.namelist():
            for child in json.loads(jar.read("META-INF/jarjar/metadata.json"))["jars"]:
                ids, deps = inspect_jar(jar.read(child["path"]))
                modules.extend(ids)
                dependencies.extend(deps)
    return modules, dependencies


def build(source, output, quiby_jar):
    lock = json.loads((TEMPLATES / "server-pack.json").read_text(encoding="utf-8"))
    pack_version = json.loads((ROOT / "modpacks/quiby-s6/manifest.json").read_text(encoding="utf-8"))["version"]
    if pack_version != lock["packVersion"]:
        raise ValueError("Server mod lock must be reviewed for the new pack version")
    entries = {}
    included, required = {"minecraft", "neoforge", "javafml"}, set()
    expected = {item.get("sourceFile", item["file"]) for item in lock["mods"]} | {item["file"] for item in lock["mods"] + lock["excluded"]}
    unexpected = {p.name for p in (source / "mods").glob("*.jar")} - expected
    if unexpected:
        raise ValueError("Unreviewed mods in source: " + ", ".join(sorted(unexpected)))
    for item in lock["mods"]:
        source_file = quiby_jar if item.get("builtQuiby") else source / "mods" / item["file"]
        if item.get("importedArtifact"):
            storage = (ROOT / "apps/server/storage/files").resolve()
            source_file = (storage / item["importedArtifact"]).resolve()
            if not source_file.is_relative_to(storage):
                raise ValueError("Unsafe imported artifact path")
        raw = source_file.read_bytes()
        if hashlib.sha256(raw).hexdigest() != item["sha256"]:
            raise ValueError("Installed mod differs from lock: " + item["file"])
        modules, dependencies = inspect_jar(raw)
        included.update(modules)
        required.update(dependencies)
        entries["mods/" + item["file"]] = raw
    missing = required - included
    if missing:
        raise ValueError("Missing server dependencies: " + ", ".join(sorted(missing)))
    for file in sorted(TEMPLATES.rglob("*")):
        if file.is_file() and "__pycache__" not in file.parts:
            name = file.relative_to(TEMPLATES).as_posix()
            raw = file.read_bytes()
            # All deployment templates are text. Normalize Windows checkouts too.
            entries[name] = raw.replace(b"\r\n", b"\n")
    installer_path = source / "temp" / INSTALLER
    if installer_path.exists():
        installer = installer_path.read_bytes()
    else:
        with urllib.request.urlopen(INSTALLER_URL, timeout=120) as response:
            installer = response.read()
    if hashlib.sha256(installer).hexdigest() != INSTALLER_SHA256:
        raise ValueError("NeoForge installer checksum mismatch")
    entries[INSTALLER] = installer
    output.parent.mkdir(parents=True, exist_ok=True)
    # Stable order, timestamps and Unix permissions make the archive reproducible.
    with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
        for name, raw in sorted(entries.items()):
            info = zipfile.ZipInfo(name, (2026, 10, 2, 0, 0, 0))
            info.create_system = 3
            info.external_attr = (0o100755 if name.endswith(".sh") else 0o100644) << 16
            info.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(info, raw)
    checksum = hashlib.sha256(output.read_bytes()).hexdigest()
    output.with_suffix(output.suffix + ".sha256").write_text(checksum + "  " + output.name + "\n")
    print(json.dumps({"archive": str(output), "mods": len(lock["mods"]), "excluded": len(lock["excluded"]),
                      "sizeMiB": round(output.stat().st_size / 1048576, 1), "sha256": checksum}, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=pathlib.Path,
                        default=pathlib.Path(os.environ.get("APPDATA", pathlib.Path.home())) / ".quiby-launcher")
    parser.add_argument("--output", type=pathlib.Path, default=ROOT / "temp/quiby-server-6.1.19.zip")
    parser.add_argument("--quiby-jar", type=pathlib.Path, default=ROOT.parent / "quiby.mod/build/libs/quiby-1.21.1-1.1.14.jar")
    args = parser.parse_args()
    build(args.source, args.output, args.quiby_jar)
