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

/**
 * Parse `git -c core.quotePath=false status --porcelain -z` output. Entries are NUL-separated and never quoted, so
 * non-ASCII names survive. A rename or copy (`R`/`C`) is followed by an extra entry with the old path, which is skipped.
 */
export function parseStatusZ(output) {
  const parts = output.split('\u0000')
  const files = []
  for (let i = 0; i < parts.length; i++) {
    const entry = parts[i]
    if (entry.length < 4) continue
    files.push(entry.slice(3).replace(/\\/g, '/'))
    if (entry[0] === 'R' || entry[0] === 'C') i++
  }
  return files
}

/** Commands from every valid rule whose regex matches at least one file, deduped, in rule order. */
export function matchRules(files, rules = []) {
  const out = []
  for (const rule of Array.isArray(rules) ? rules : []) {
    if (!rule || typeof rule.paths !== 'string') continue
    if (!Array.isArray(rule.run) || !rule.run.every((c) => typeof c === 'string')) continue
    let re
    try { re = new RegExp(rule.paths) } catch { continue }
    if (!files.some((f) => re.test(f))) continue
    for (const cmd of rule.run) if (!out.includes(cmd)) out.push(cmd)
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
