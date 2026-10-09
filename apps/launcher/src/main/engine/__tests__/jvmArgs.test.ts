import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCustomJvmArgs } from '../../../shared/jvmArgs';

test('multiline Java arguments preserve quoted values and cannot replace the launch command', () => {
  assert.deepEqual(parseCustomJvmArgs('-Dlabel="hello world"\n-XX:+UseG1GC\t-Xlog:gc'), ['-Dlabel=hello world', '-XX:+UseG1GC', '-Xlog:gc']);
  assert.deepEqual(parseCustomJvmArgs('-Dpath="C:\\My Folder\\file"'), ['-Dpath=C:\\My Folder\\file']);
  assert.deepEqual(parseCustomJvmArgs(''), []);
  for (const value of ['-Xmx8G', '-Xms2G', '-cp other.jar', '-javaagent:other.jar', '@other.args', '-Dquiby.resourcePackHashes=other', 'other.Main', '-Dlabel="unfinished']) assert.throws(() => parseCustomJvmArgs(value));
});
