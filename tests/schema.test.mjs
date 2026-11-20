import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), 'utf8'))
const FIELDS = ['tracker', 'keyPattern', 'commands', 'verifyOnStop', 'risk', 'models', 'parallel', 'loopLimit', 'autoMerge', 'baseBranch', 'worktreeDir']

test('template has the documented defaults', () => {
  const t = read('plugins/shipgate/templates/pipeline.json')
  assert.ok(['github', 'jira'].includes(t.tracker.type))
  assert.equal(t.loopLimit, 3)
  assert.equal(t.autoMerge, true)
  assert.equal(t.parallel, 2)
})

test('schema declares every top-level field', () => {
  const s = read('schema/pipeline.schema.json')
  for (const f of FIELDS) assert.ok(s.properties[f], `missing ${f}`)
  assert.deepEqual(s.properties.tracker.properties.type.enum, ['github', 'jira'])
})

test('template only uses fields the schema declares', () => {
  const s = read('schema/pipeline.schema.json')
  const t = read('plugins/shipgate/templates/pipeline.json')
  for (const k of Object.keys(t)) if (k !== '$schema') assert.ok(s.properties[k], `undeclared ${k}`)
})

test('plugin manifests agree on name and version', () => {
  const p = read('plugins/shipgate/.claude-plugin/plugin.json')
  const m = read('.claude-plugin/marketplace.json')
  assert.equal(m.plugins[0].name, p.name)
  assert.equal(m.plugins[0].version, p.version)
})
