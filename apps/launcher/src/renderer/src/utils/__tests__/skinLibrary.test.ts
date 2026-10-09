import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getSavedSkinLibrary, renameSavedSkin, getSkinDisplayName, getDefaultSkinCaption, renameDefaultSkin, type SavedSkinItem } from '../skinLibrary';

test('skin captions persist without changing the source name or texture', () => {
  const entries = new Map<string, string>();
  const original = { id: 'skin1', name: 'source.png', dataUri: 'texture', chibiPreviewUri: 'preview', bodyType: 'steve', createdAt: 123 };
  entries.set('quiby_skin_library', JSON.stringify([original]));
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => entries.set(key, value),
  } });
  try {
    assert.equal(getDefaultSkinCaption('Steve'), 'Steve');
    renameDefaultSkin('Steve', '  Мой   персонаж ');
    assert.equal(getDefaultSkinCaption('Steve'), 'Мой персонаж');
    assert.equal(getDefaultSkinCaption('Alex'), 'Alex');
    assert.throws(() => renameDefaultSkin('Other', 'Имя'));
    renameSavedSkin('skin1', '  Мой   скин  ');
    assert.deepEqual(getSavedSkinLibrary()[0], { ...original, caption: 'Мой скин' });
    assert.equal(getSkinDisplayName(getSavedSkinLibrary(), 'source.png', 'texture'), 'Мой скин');
    renameSavedSkin('skin1', 'я'.repeat(40));
    assert.equal(getSavedSkinLibrary()[0].caption?.length, 24);
    const before = entries.get('quiby_skin_library');
    assert.throws(() => renameSavedSkin('skin1', '   '));
    assert.equal(entries.get('quiby_skin_library'), before);
  } finally {
    Reflect.deleteProperty(globalThis, 'localStorage');
  }
});

test('caption lookup distinguishes skins with the same filename and keeps unnamed skins usable', () => {
  const library = [
    { name: 'skin', dataUri: 'first', caption: 'Первый' },
    { name: 'skin', dataUri: 'second', caption: 'Второй' },
  ] as SavedSkinItem[];
  assert.equal(getSkinDisplayName(library, 'skin', 'second'), 'Второй');
  assert.equal(getSkinDisplayName(library, 'old-skin'), 'old-skin');
  assert.equal(getSkinDisplayName(library, null), null);
});
