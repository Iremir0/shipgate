// Guards the public repo against leaking names from the private project this pipeline came from.
// The list is base64-encoded so this file does not itself contain the terms.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const TERMS = JSON.parse(Buffer.from('WyJ2ZXJzYXkiLCJhaGwgcGF5IiwiYWhscGF5IiwiaGFzb251ciIsImVtaXJ0dWZla2NpIiwiZW1hdGVjaCIsInZlcmlkeWVuIiwia3V5dW0iLCJpbmZvQCJd', 'base64').toString('utf8'))
const TICKET_KEY = /\bVER-\d+/

test('tracked files contain no private project terms', () => {
  const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8' })
    .split('\n').filter((f) => f && !f.endsWith('.png'))
  const hits = []
  for (const f of files) {
    let text
    try { text = readFileSync(f, 'utf8').toLowerCase() } catch { continue }
    for (const t of TERMS) if (text.includes(t)) hits.push(`${f}: ${t}`)
    if (TICKET_KEY.test(readFileSync(f, 'utf8'))) hits.push(`${f}: ticket key`)
  }
  assert.deepEqual(hits, [])
})
