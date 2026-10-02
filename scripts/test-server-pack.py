import contextlib
import importlib.util
import io
import json
import pathlib
import tempfile
import tomllib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("prepare", ROOT / "deploy/minecraft/prepare.py")
prepare = importlib.util.module_from_spec(spec)
spec.loader.exec_module(prepare)


class ServerPackTests(unittest.TestCase):
    def test_merge_preserves_other_keys_and_tables(self):
        text = '# comment\nroot = 123\n[ragdoll]\nminDamage = 2 # old\nextra = true\n[next]\nminDamage = 3\n'
        result = prepare.merge_toml(text, {"ragdoll": {"minDamage": 9.0, "onDamage": True}})
        data = tomllib.loads(result)
        self.assertEqual(data['root'], 123)
        self.assertEqual(data['ragdoll'], {'minDamage': 9.0, 'extra': True, 'onDamage': True})
        self.assertEqual(data['next']['minDamage'], 3)
        self.assertIn('# comment', result)
        self.assertEqual(prepare.merge_toml(result, {"ragdoll": {"minDamage": 9.0, "onDamage": True}}), result)

    def test_existing_world_and_config_are_merged_idempotently(self):
        with tempfile.TemporaryDirectory() as directory:
            pack = pathlib.Path(directory) / 'pack'
            data = pathlib.Path(directory) / 'data'
            (pack / 'config-templates/explosionoverhaul').mkdir(parents=True)
            (pack / 'mods').mkdir()
            (pack / 'server-pack.json').write_text(json.dumps({'mods': []}))
            (pack / 'config-policy.json').write_text((ROOT / 'deploy/minecraft/config-policy.json').read_text())
            (pack / 'server.properties.example').write_text('level-name=world\nonline-mode=false\n')
            for filename in json.loads((pack / 'config-policy.json').read_text())['toml']:
                src = pack / 'config-templates' / filename
                src.parent.mkdir(parents=True, exist_ok=True)
                src.write_text('')
            data.mkdir()
            (data / 'server.properties').write_text('level-name=custom-world\nonline-mode=true\n')
            world = data / 'custom-world/serverconfig'
            world.mkdir(parents=True)
            (world / 'quiby-server.toml').write_text('[ragdoll]\nminDamage = 1.0\ncustom = 42\n')
            (data / 'config/explosionoverhaul').mkdir(parents=True)
            (data / 'config/explosionoverhaul/ExplosionSourceBlacklist.json').write_text('{"other:source":"CUSTOM"}')
            with contextlib.redirect_stdout(io.StringIO()):
                prepare.prepare(pack, data)
            result = tomllib.loads((world / 'quiby-server.toml').read_text())
            self.assertEqual(result['ragdoll']['minDamage'], 9.0)
            self.assertEqual(result['ragdoll']['custom'], 42)
            self.assertEqual(json.loads((data / 'config/explosionoverhaul/ExplosionSourceBlacklist.json').read_text())['other:source'], 'CUSTOM')
            self.assertIn('online-mode=true', (data / 'server.properties').read_text())
            self.assertEqual((data / 'eula.txt').read_text().splitlines()[-1], 'eula=false')
            backups = list((data / 'quiby-backups').iterdir())
            with contextlib.redirect_stdout(io.StringIO()):
                prepare.prepare(pack, data)
            self.assertEqual(list((data / 'quiby-backups').iterdir()), backups)

    def test_rejects_world_path_escape(self):
        with tempfile.TemporaryDirectory() as directory:
            root = pathlib.Path(directory).resolve()
            for relative in ['../world', str(root.parent / 'outside')]:
                with self.assertRaises(ValueError):
                    prepare.safe_path(root, relative)

    def test_all_config_templates_parse(self):
        for file in (ROOT / 'deploy/minecraft/config-templates').rglob('*.toml'):
            with self.subTest(file=file.name):
                tomllib.loads(file.read_text())


if __name__ == '__main__':
    unittest.main()
