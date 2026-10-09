import { test } from 'node:test';
import assert from 'node:assert/strict';
import { upsertNotification, type NotificationItem } from '../notifications';

const card: NotificationItem = { id: 'review-a', title: 'Заявка', message: 'Ожидаем решения', timestamp: 1, read: true, modInfo: { hashSha1: 'a', reviewStage: 'pending' } };
test('unchanged polling preserves read state and order; decisions bump one card', () => {
  const previous = [{ ...card, id: 'other' }, card];
  assert.equal(upsertNotification(previous, { ...card, timestamp: 2, read: false }), previous);
  const updated = upsertNotification(previous, { ...card, timestamp: 3, read: false, modInfo: { ...card.modInfo, reviewStage: 'approved' } });
  assert.equal(updated.length, 2); assert.equal(updated[0].id, card.id);
  assert.equal(updated[0].read, false); assert.equal(updated[0].timestamp, 3);
});
test('explicit news rebroadcast refreshes the same card even when its text is identical', () => {
  const original = { ...card, id: 'news-a', modInfo: undefined, newsRevision: 'one' };
  const updated = upsertNotification([original], { ...original, newsRevision: 'two', read: false, timestamp: 2 });
  assert.equal(updated.length, 1); assert.equal(updated[0].read, false); assert.equal(updated[0].newsRevision, 'two');
});
