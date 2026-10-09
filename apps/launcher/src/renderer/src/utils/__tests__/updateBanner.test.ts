import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LauncherUpdateBanner } from '../../components/LauncherUpdateBanner';

test('an offline updater error never advertises a stale or current version as a new update', () => {
  for (const latestVersion of [undefined, '1.0.1-beta.21']) {
    const html = renderToStaticMarkup(React.createElement(LauncherUpdateBanner, {
      state: { status: 'error', currentVersion: '1.0.1-beta.21', latestVersion, message: 'net::ERR_NAME_NOT_RESOLVED' },
    }));
    assert.match(html, /Проверьте подключение к интернету/);
    assert.match(html, /Повторить проверку/);
    assert.doesNotMatch(html, /Доступна новая версия|Скачать обновление|ERR_NAME_NOT_RESOLVED/);
  }
  const current = renderToStaticMarkup(React.createElement(LauncherUpdateBanner, { state: { status: 'current', currentVersion: '1.0.1-beta.21' } }));
  assert.equal(current, '');
});
