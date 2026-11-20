import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { parseStatus, parseStatusZ, matchRules, loadConfig } from '../hooks/lib.mjs'

const HOOK = fileURLToPath(new URL('../hooks/verify-on-stop.mjs', import.meta.url))

test('parseStatus handles modified, quoted, untracked and renamed paths', () => {
  assert.deepEqual(parseStatus(' M src/a.ts\n?? "b c.ts"\nR  x.ts -> y.ts\n'), ['src/a.ts', 'b c.ts', 'y.ts'])
})

test('parseStatus normalises backslashes to forward slashes', () => {
  assert.deepEqual(parseStatus(' M src\\win\\a.ts\n'), ['src/win/a.ts'])
})

test('matchRules returns deduped commands in rule order', () => {
  const rules = [{ paths: '^src/', run: ['npm test'] }, { paths: '^docs/', run: ['npm test', 'lint'] }]
  assert.deepEqual(matchRules(['src/a.ts', 'docs/x.md'], rules), ['npm test', 'lint'])
})

test('matchRules ignores rules with no matching file and invalid regexes', () => {
  const rules = [{ paths: '^lib/', run: ['a'] }, { paths: '([', run: ['b'] }]
  assert.deepEqual(matchRules(['src/a.ts'], rules), [])
})

test('loadConfig returns null when the file is missing', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ccp-'))
  assert.equal(loadConfig(dir), null)
})

test('loadConfig returns null on malformed JSON', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ccp-'))
  mkdirSync(join(dir, '.claude'))
  writeFileSync(join(dir, '.claude', 'pipeline.json'), '{bad')
  assert.equal(loadConfig(dir, () => {}), null)
})

function repo(config) {
  const dir = mkdtempSync(join(tmpdir(), 'ccp-'))
  spawnSync('git', ['init', '-q'], { cwd: dir })
  mkdirSync(join(dir, '.claude'))
  if (config) writeFileSync(join(dir, '.claude', 'pipeline.json'), JSON.stringify(config))
  mkdirSync(join(dir, 'src'))
  writeFileSync(join(dir, 'src', 'a.ts'), 'x')
  return dir
}
const runHook = (dir, input = {}) => spawnSync(process.execPath, [HOOK], {
  cwd: dir, input: JSON.stringify(input), encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: dir },
})

test('hook exits 0 silently without a pipeline.json', () => {
  const r = runHook(repo(null))
  assert.equal(r.status, 0)
  assert.equal(r.stdout, '')
})

test('hook blocks the turn when a matched command fails', () => {
  const r = runHook(repo({ tracker: { type: 'github' }, commands: {}, verifyOnStop: [{ paths: '^src/', run: ['node -e "process.exit(3)"'] }] }))
  assert.equal(r.status, 0)
  const out = JSON.parse(r.stdout)
  assert.equal(out.decision, 'block')
  assert.match(out.reason, /node -e/)
})

test('hook passes and caches when commands succeed', () => {
  const dir = repo({ tracker: { type: 'github' }, commands: {}, verifyOnStop: [{ paths: '^src/', run: ['node -e "0"'] }] })
  assert.equal(runHook(dir).stdout, '')
  const again = runHook(dir)
  assert.equal(again.stdout, '')
})

test('hook does not re-block an unchanged failure while stop_hook_active', () => {
  const dir = repo({ tracker: { type: 'github' }, commands: {}, verifyOnStop: [{ paths: '^src/', run: ['node -e "process.exit(1)"'] }] })
  assert.match(runHook(dir).stdout, /block/)
  assert.equal(runHook(dir, { stop_hook_active: true }).stdout, '')
})

test('parseStatusZ handles NUL-separated output with non-ASCII and renames', () => {
  assert.deepEqual(parseStatusZ(' M src/ü.ts\0R  y.ts\0x.ts\0?? b c.ts\0'), ['src/ü.ts', 'y.ts', 'b c.ts'])
})

test('matchRules skips rules whose run is not an array of strings', () => {
  const rules = [{ paths: '^src/', run: 'npm test' }, { paths: '^src/', run: ['ok', 3] }, { paths: '^src/', run: ['good'] }]
  assert.deepEqual(matchRules(['src/a.ts'], rules), ['good'])
})

test('hook re-verifies a changed non-ASCII file instead of trusting the cache', () => {
  const dir = repo({ tracker: { type: 'github' }, commands: {}, verifyOnStop: [{ paths: '^src/', run: ['node -e "process.exit(require(\'fs\').readFileSync(\'src/ü.ts\',\'utf8\')===\'bad\'?1:0)"'] }] })
  writeFileSync(join(dir, 'src', 'ü.ts'), 'good')
  assert.equal(runHook(dir).stdout, '')
  writeFileSync(join(dir, 'src', 'ü.ts'), 'bad')
  assert.match(runHook(dir).stdout, /block/)
})
