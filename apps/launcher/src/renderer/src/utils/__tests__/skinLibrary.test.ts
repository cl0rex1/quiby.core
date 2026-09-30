import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getSavedSkinLibrary, renameSavedSkin } from '../skinLibrary';

test('skin captions persist without changing the source name or texture', () => {
  const entries = new Map<string, string>();
  const original = { id: 'skin1', name: 'source.png', dataUri: 'texture', chibiPreviewUri: 'preview', bodyType: 'steve', createdAt: 123 };
  entries.set('quiby_skin_library', JSON.stringify([original]));
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => entries.set(key, value),
  } });
  try {
    renameSavedSkin('skin1', '  Мой   скин  ');
    assert.deepEqual(getSavedSkinLibrary()[0], { ...original, caption: 'Мой скин' });
    renameSavedSkin('skin1', 'я'.repeat(40));
    assert.equal(getSavedSkinLibrary()[0].caption?.length, 24);
    const before = entries.get('quiby_skin_library');
    assert.throws(() => renameSavedSkin('skin1', '   '));
    assert.equal(entries.get('quiby_skin_library'), before);
  } finally {
    Reflect.deleteProperty(globalThis, 'localStorage');
  }
});
