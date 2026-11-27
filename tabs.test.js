import test from 'node:test'
import assert from 'node:assert/strict'
import { pickFallbackTab } from './tabs.js'

const tab = (id, agentWindow) => ({ id, agentWindow })

test('no tab in the work window', () => {
  assert.equal(pickFallbackTab([]).kind, 'none')
  assert.equal(pickFallbackTab([tab(1, false), tab(2, false)]).kind, 'none')
  // 宿主没给 agentWindow（老扩展）时不算「干活窗口里的页」，宁可报错也不碰用户的页
  assert.equal(pickFallbackTab([{ id: 3 }]).kind, 'none')
})

test('exactly one tab in the work window is reused', () => {
  const r = pickFallbackTab([tab(1, false), tab(7, true)])
  assert.equal(r.kind, 'one')
  assert.equal(r.tab.id, 7)
})

test('several tabs in the work window: no guessing', () => {
  const r = pickFallbackTab([tab(7, true), tab(8, true), tab(1, false)])
  assert.equal(r.kind, 'ambiguous')
  assert.deepEqual(r.tabs.map((t) => t.id), [7, 8])
})

test('bad input does not throw', () => {
  assert.equal(pickFallbackTab(undefined).kind, 'none')
  assert.equal(pickFallbackTab([null, tab(5, true)]).kind, 'one')
})
