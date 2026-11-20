#!/usr/bin/env node
// Stop hook: before Claude ends a turn, run the checks that `.claude/pipeline.json` -> `verifyOnStop`
// maps to the uncommitted files. A failure blocks the turn and hands the output back to Claude.
// No config, no matching files, or PIPELINE_SKIP_VERIFY=1 -> exit quietly. Config errors never block.
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadConfig, matchRules, parseStatus } from './lib.mjs'

if (process.env.PIPELINE_SKIP_VERIFY === '1') process.exit(0)

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd()
const cacheFile = join(root, '.claude', '.cache', 'verify-on-stop.json')

let input = {}
try { input = JSON.parse(readFileSync(0, 'utf8') || '{}') } catch { /* no stdin */ }

const config = loadConfig(root)
if (!config || !Array.isArray(config.verifyOnStop)) process.exit(0)

const status = spawnSync('git', ['status', '--porcelain', '--untracked-files=all'], { cwd: root, encoding: 'utf8' })
if (status.status !== 0) process.exit(0)
const files = parseStatus(status.stdout)
const commands = matchRules(files, config.verifyOnStop)
if (commands.length === 0) process.exit(0)

// Fingerprint only files some rule cares about (the cache file itself must not change the fingerprint).
const relevant = files.filter((f) => matchRules([f], config.verifyOnStop).length > 0)
const h = createHash('sha256').update(commands.join('\n'))
for (const f of relevant.sort()) {
  h.update(f)
  try { const s = statSync(join(root, f)); h.update(`${s.size}:${s.mtimeMs}`) } catch { h.update('deleted') }
}
const fp = h.digest('hex')

let cache = {}
try { if (existsSync(cacheFile)) cache = JSON.parse(readFileSync(cacheFile, 'utf8')) } catch { /* re-verify */ }
const save = (next) => {
  try { mkdirSync(join(root, '.claude', '.cache'), { recursive: true }); writeFileSync(cacheFile, JSON.stringify({ ...next, at: new Date().toISOString() })) } catch { /* ignore */ }
}

if (cache.passed === fp) process.exit(0)
// Claude stopped again without changing code after a block: don't loop forever.
if (input.stop_hook_active === true && cache.failed === fp) process.exit(0)

for (const cmd of commands) {
  // One string + shell: works for npm .cmd shims on Windows and avoids Node's DEP0190 warning.
  const r = spawnSync(cmd, { cwd: root, encoding: 'utf8', shell: true, maxBuffer: 32 * 1024 * 1024 })
  if (r.status !== 0) {
    const output = `${r.stdout || ''}\n${r.stderr || ''}${r.error ? `\n${r.error.message}` : ''}`.split('\n').slice(-60).join('\n')
    save({ failed: fp })
    process.stdout.write(JSON.stringify({
      decision: 'block',
      reason: `Verification failed: \`${cmd}\`. Fix the root cause (do not suppress the error or weaken the test), then run it again.\n\n${output}`,
    }))
    process.exit(0)
  }
}

save({ passed: fp })
process.exit(0)
