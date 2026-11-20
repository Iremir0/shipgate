// The Claude plugin directory accepts, from unverified publishers, only Markdown, text, JSON, YAML and raster images,
// no hooks and no `#!` files. plugins/shipgate is the folder submitted there, so it must stay within those rules.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', 'plugins/shipgate/'], { encoding: 'utf8' })
  .split('\n').filter(Boolean)

test('submitted plugin folder holds only allowed file types', () => {
  const bad = files.filter((f) => !/(\.md|\.json|\.png|\/LICENSE)$/.test(f))
  assert.deepEqual(bad, [])
})

test('submitted plugin folder has no hooks and no shebang files', () => {
  assert.deepEqual(files.filter((f) => /(^|\/)hooks(\/|\.json$)/.test(f)), [])
  assert.deepEqual(files.filter((f) => !f.endsWith('.png') && readFileSync(f, 'utf8').startsWith('#!')), [])
})

test('submitted plugin has a README of at least 40 words and a license', () => {
  const words = readFileSync('plugins/shipgate/README.md', 'utf8').replace(/```[\s\S]*?```/g, '').split(/\s+/).filter(Boolean)
  assert.ok(words.length >= 40)
  assert.ok(files.includes('plugins/shipgate/LICENSE'))
})

test('marketplace lists both plugins with matching versions', () => {
  const m = JSON.parse(readFileSync('.claude-plugin/marketplace.json', 'utf8'))
  for (const p of m.plugins) {
    const manifest = JSON.parse(readFileSync(`${p.source}/.claude-plugin/plugin.json`, 'utf8'))
    assert.equal(manifest.name, p.name)
    assert.equal(manifest.version, p.version)
  }
})
