"""Apply the pack defaults and required Quiby settings before Minecraft starts."""
import argparse
import datetime
import hashlib
import json
import pathlib
import re
import shutil


def merge_toml(text, sections):
    """Merge primitive policy keys without rewriting unrelated settings/comments."""
    lines = text.splitlines(keepends=True)
    for section, values in sections.items():
        header = "[" + section + "]"
        start = 0
        end = len(lines)
        if section:
            matches = [i for i, line in enumerate(lines) if line.strip().split("#", 1)[0].strip() == header]
            if len(matches) > 1:
                raise ValueError("Duplicate TOML section: " + section)
            if not matches:
                if lines and not lines[-1].endswith("\n"):
                    lines[-1] += "\n"
                lines.extend(["\n", header + "\n"])
                start = len(lines)
            else:
                start = matches[0] + 1
        end = next((i for i in range(start, len(lines)) if lines[i].lstrip().startswith("[")), len(lines))
        for key, value in values.items():
            pattern = re.compile(r"^(\s*)" + re.escape(key) + r"\s*=")
            matches = [i for i in range(start, end) if pattern.match(lines[i])]
            if len(matches) > 1:
                raise ValueError("Duplicate TOML key: " + section + "." + key)
            replacement = key + " = " + json.dumps(value, ensure_ascii=False) + "\n"
            if matches:
                i = matches[0]
                lines[i] = pattern.match(lines[i]).group(1) + replacement
            else:
                lines.insert(end, replacement)
                end += 1
    return "".join(lines)


def safe_path(root, relative):
    target = (root / relative).resolve()
    if target == root or root not in target.parents:
        raise ValueError("Path outside server directory: " + str(relative))
    return target


def prepare(pack, data):
    pack = pack.resolve()
    data = data.resolve()
    data.mkdir(parents=True, exist_ok=True)
    lock = json.loads((pack / "server-pack.json").read_text(encoding="utf-8"))
    policy = json.loads((pack / "config-policy.json").read_text(encoding="utf-8"))
    backup = data / "quiby-backups" / datetime.datetime.now().strftime("%Y%m%d-%H%M%S-%f")
    changed = []

    def write(relative, content):
        target = safe_path(data, relative)
        if target.exists() and target.read_bytes() == content:
            return
        if target.exists():
            destination = backup / relative
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(target, destination)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(content)
        changed.append(str(relative))

    # Verify everything before changing an existing installation.
    for item in lock["mods"]:
        src = safe_path(pack, "mods/" + item["file"])
        if hashlib.sha256(src.read_bytes()).hexdigest() != item["sha256"]:
            raise ValueError("Mod checksum mismatch: " + item["file"])
    previous_path = data / "quiby-installed-mods.json"
    previous = json.loads(previous_path.read_text()) if previous_path.exists() else []
    current = [item["file"] for item in lock["mods"]]
    for filename in previous:
        if filename not in current:
            target = safe_path(data, "mods/" + filename)
            if target.exists():
                destination = backup / "mods" / filename
                destination.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(target, destination)
                target.unlink()
                changed.append("removed previous pack mod: " + filename)
    for item in lock["mods"]:
        src = pack / "mods" / item["file"]
        write(pathlib.Path("mods") / item["file"], src.read_bytes())
    write(pathlib.Path("quiby-installed-mods.json"), (json.dumps(current, indent=2) + "\n").encode())

    for src in sorted((pack / "config-templates").rglob("*")):
        if src.is_file():
            relative = pathlib.Path("config") / src.relative_to(pack / "config-templates")
            if not safe_path(data, relative).exists():
                write(relative, src.read_bytes())
    properties = data / "server.properties"
    if not properties.exists():
        write(pathlib.Path("server.properties"), (pack / "server.properties.example").read_bytes())
    properties_text = properties.read_text(encoding="utf-8")
    level = next((line.split("=", 1)[1].strip() for line in properties_text.splitlines()
                  if line.strip().startswith("level-name=")), "world")
    if not level or "\\" in level or ":" in level:
        raise ValueError("Unsupported level-name: " + level)
    world = safe_path(data, level)
    directories = [data / "config", data / "defaultconfigs"]
    if world.exists():
        directories.append(world / "serverconfig")
    # NeoForge 21.1 reads server configs from config/. Also update legacy world
    # overrides, including custom level-name, and defaults for a future world.
    for filename, sections in policy["toml"].items():
        for directory in directories if filename.endswith("-server.toml") else directories[:1]:
            target = safe_path(data, (directory / filename).relative_to(data))
            seed = pack / "config-templates" / filename
            text = target.read_text(encoding="utf-8-sig") if target.exists() else seed.read_text(encoding="utf-8-sig")
            write(target.relative_to(data), merge_toml(text, sections).encode("utf-8"))
    for filename, values in policy["json"].items():
        target = safe_path(data, pathlib.Path("config") / filename)
        value = json.loads(target.read_text(encoding="utf-8-sig")) if target.exists() else {}
        value.update(values)
        write(target.relative_to(data), (json.dumps(value, indent=2) + "\n").encode())
    if not (data / "eula.txt").exists():
        write(pathlib.Path("eula.txt"), b"# https://aka.ms/MinecraftEULA\neula=false\n")
    print("Quiby configuration: " + (", ".join(changed) if changed else "already up to date"))
    if backup.exists():
        print("Backup: " + str(backup))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pack", type=pathlib.Path, default=pathlib.Path(__file__).parent)
    parser.add_argument("--data", type=pathlib.Path, default=pathlib.Path(__file__).parent)
    args = parser.parse_args()
    prepare(args.pack, args.data)
