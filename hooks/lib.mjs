// Pure helpers for the verify-on-stop hook. No dependencies.
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/** Turn `git status --porcelain` output into repo-relative paths with forward slashes. */
export function parseStatus(porcelain) {
  return porcelain
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => line.slice(3).split(' -> ').pop().replace(/^"|"$/g, '').replace(/\\/g, '/'))
}

/** Commands from every rule whose regex matches at least one file, deduped, in rule order. */
export function matchRules(files, rules = []) {
  const out = []
  for (const rule of rules) {
    let re
    try { re = new RegExp(rule.paths) } catch { continue }
    if (!files.some((f) => re.test(f))) continue
    for (const cmd of rule.run ?? []) if (!out.includes(cmd)) out.push(cmd)
  }
  return out
}

/** Read `<root>/.claude/pipeline.json`; null when missing or unreadable. */
export function loadConfig(root, warn = (m) => process.stderr.write(`${m}\n`)) {
  const file = join(root, '.claude', 'pipeline.json')
  if (!existsSync(file)) return null
  try {
    return JSON.parse(readFileSync(file, 'utf8'))
  } catch (err) {
    warn(`[shipgate] ignoring ${file}: ${err.message}`)
    return null
  }
}
