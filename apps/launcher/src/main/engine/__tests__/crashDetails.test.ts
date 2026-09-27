import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readCrashDetails } from '../crashDetails';

test('crash notification includes the complete new Minecraft report', () => {
  const gameDir = fs.mkdtempSync(path.join(os.tmpdir(), 'quiby-crash-'));
  try {
    const reportDir = path.join(gameDir, 'crash-reports');
    fs.mkdirSync(reportDir);
    fs.writeFileSync(path.join(reportDir, 'crash-new.txt'), 'Root cause: java.lang.IllegalStateException\n  at example.Mod.run(Mod.java:42)');
    const detail = readCrashDetails(gameDir, Date.now(), -1, ['partial log']);
    assert.match(detail, /Root cause: java\.lang\.IllegalStateException/);
    assert.match(detail, /at example\.Mod\.run\(Mod\.java:42\)/);
    assert.match(detail, /crash-new\.txt/);
  } finally {
    fs.rmSync(gameDir, { recursive: true, force: true });
  }
});

test('crash notification falls back to recent output when no report exists', () => {
  const gameDir = fs.mkdtempSync(path.join(os.tmpdir(), 'quiby-crash-'));
  try {
    const detail = readCrashDetails(gameDir, Date.now(), 1, ['Caused by: missing dependency']);
    assert.match(detail, /Caused by: missing dependency/);
    assert.match(detail, /кодом 1/);
  } finally {
    fs.rmSync(gameDir, { recursive: true, force: true });
  }
});

test('crash notification includes latest.log if Minecraft did not write a report', () => {
  const gameDir = fs.mkdtempSync(path.join(os.tmpdir(), 'quiby-crash-'));
  try {
    const logs = path.join(gameDir, 'logs');
    fs.mkdirSync(logs);
    fs.writeFileSync(path.join(logs, 'latest.log'), 'Caused by: missing dependency\nFull stack trace line');
    const detail = readCrashDetails(gameDir, Date.now(), 1, ['partial output']);
    assert.match(detail, /Full stack trace line/);
    assert.match(detail, /latest\.log/);
  } finally {
    fs.rmSync(gameDir, { recursive: true, force: true });
  }
});
