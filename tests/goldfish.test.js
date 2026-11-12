import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../scripts/goldfish.mjs', import.meta.url));
function run(cwd, response, ...args) {
  const mock = `
    import assert from 'node:assert/strict';
    globalThis.fetch = async (url, options) => {
      const packet = JSON.parse(options.body);
      assert.equal(url, 'http://127.0.0.1:11434/api/chat');
      assert.equal(options.redirect, 'error');
      assert.equal(packet.model, 'gpt-oss:20b');
      assert.equal(packet.tools, undefined);
      assert.deepEqual(packet.messages.map(({ role }) => role), ['system', 'user']);
      const inputs = JSON.parse(packet.messages[1].content);
      assert.equal(inputs.gate, 'spec');
      assert.deepEqual(inputs.documents.map(({ path }) => path), ['artifact.md', 'support.md']);
      assert.ok(!options.body.includes('UNRELATED SECRET'));
      return Response.json({ model: packet.model, created_at: '2026-01-01T00:00:00Z',
        message: { content: ${JSON.stringify(response)} } });
    };
  `;
  const preload = 'data:text/javascript;base64,' + Buffer.from(mock).toString('base64');
  return spawnSync(process.execPath, ['--import', preload, script, ...args], { cwd, encoding: 'utf8' });
}

test('Goldfish scopes each request and rejects invalid structured output and duplicate inputs', async (context) => {
  const root = await mkdtemp(join(tmpdir(), 'broadside-review-'));
  context.after(() => rm(root, { force: true, recursive: true }));
  await writeFile(join(root, 'artifact.md'), '# Artifact');
  await writeFile(join(root, 'support.md'), '# Explicit supporting input');
  await writeFile(join(root, 'unrelated.md'), 'UNRELATED SECRET');
  const args = ['spec', 'report.json', 'artifact.md', 'support.md'];
  const accepted = run(root, '{"findings":[]}', ...args);
  assert.equal(accepted.status, 0, accepted.stderr);
  const report = JSON.parse(await readFile(join(root, 'report.json'), 'utf8'));
  assert.equal(report.model, 'gpt-oss:20b');
  assert.equal(report.inputs[0].sha256.length, 64);
  const malformed = run(root, '{"findings":[{"severity":"unknown"}]}', 'spec', 'bad.json', 'artifact.md', 'support.md');
  assert.notEqual(malformed.status, 0);
  assert.match(malformed.stderr, /malformed findings/);
  await assert.rejects(readFile(join(root, 'bad.json')), { code: 'ENOENT' });
  const duplicate = run(root, '{"findings":[]}', ...args, './artifact.md');
  assert.notEqual(duplicate.status, 0);
  assert.match(duplicate.stderr, /inputs must be unique/);
});
