import { test } from 'node:test';
import assert from 'node:assert/strict';
import { allVisibleSelected, toggleVisibleSelection } from '../contentSelection';

test('select-all preserves hidden selections and does not mistake an equal count for the visible set', () => {
  assert.equal(allVisibleSelected(['hidden', 'one'], ['one', 'two']), false);
  const selected = toggleVisibleSelection(['hidden', 'one'], ['one', 'two']);
  assert.deepEqual(selected, ['hidden', 'one', 'two']);
  assert.deepEqual(toggleVisibleSelection(selected, ['one', 'two']), ['hidden']);
  assert.deepEqual(toggleVisibleSelection(['hidden'], []), ['hidden']);
  assert.equal(allVisibleSelected([], []), false);
});
