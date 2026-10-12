import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getSavedSkinLibrary, removeSkinFromLibrary, renameSavedSkin, getSkinDisplayName, getDefaultSkinCaption, type SavedSkinItem } from '../skinLibrary';

test('corrupt skin storage cannot crash the wardrobe or produce duplicate cards', () => {
  let raw = '';
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => raw } });
  const skin = { id: 'one', name: 'skin', dataUri: 'texture', chibiPreviewUri: 'preview', bodyType: 'steve', createdAt: 1 };
  try {
    for (const invalid of ['null', '{}', '12', '"text"', '{broken', '[null, 1, {}, "skin"]']) {
      raw = invalid; assert.deepEqual(getSavedSkinLibrary(), []);
    }
    raw = JSON.stringify([skin, skin, { ...skin, id: 'bad', caption: {} }]);
    assert.deepEqual(getSavedSkinLibrary(), [skin]);
    raw = JSON.stringify(Array.from({ length: 20 }, (_, i) => ({ ...skin, id: String(i) })));
    assert.equal(getSavedSkinLibrary().length, 6);
  } finally { Reflect.deleteProperty(globalThis, 'localStorage'); }
});

test('failed skin deletion reports persistence failure instead of claiming success', () => {
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: () => '[]', setItem: () => { throw new Error('QuotaExceededError'); },
  } });
  try { assert.throws(() => removeSkinFromLibrary('one'), /Не удалось сохранить/); }
  finally { Reflect.deleteProperty(globalThis, 'localStorage'); }
});

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
    entries.set('quiby_default_skin_captions', JSON.stringify({ Steve: 'Changed', Alex: 'Changed' }));
    assert.equal(getDefaultSkinCaption('Steve'), 'Steve');
    assert.equal(getDefaultSkinCaption('Alex'), 'Alex');
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
