import test from 'node:test'
import assert from 'node:assert/strict'
import { assertActionAllowed, isActionAllowed, parseAllowedActions, setAllowedActions } from './actions.js'

test('missing allowlist leaves all actions open', () => {
  const actions = parseAllowedActions(undefined)
  assert.equal(isActionAllowed('browser_click', {}, actions), true)
  assert.equal(isActionAllowed('browser_devtools', { action: 'console' }, actions), true)
})

test('empty allowlist denies every action', () => {
  const actions = parseAllowedActions(' , ')
  assert.equal(isActionAllowed('browser_read', { what: 'snapshot' }, actions), false)
})

test('read-only allowlist distinguishes snapshots from writes', () => {
  const actions = parseAllowedActions('snapshot,read,screenshot,devtools,tab-read')
  assert.equal(isActionAllowed('browser_read', { what: 'snapshot' }, actions), true)
  assert.equal(isActionAllowed('browser_read', { what: 'text' }, actions), true)
  assert.equal(isActionAllowed('browser_tabs', { action: 'list' }, actions), true)
  assert.equal(isActionAllowed('browser_tabs', { action: 'close' }, actions), false)
  assert.equal(isActionAllowed('browser_click', {}, actions), false)
})

test('legacy dsh-chrome-use action names stay compatible', () => {
  const actions = parseAllowedActions('snapshot,tabs,click')
  assert.equal(isActionAllowed('browser_tabs', { action: 'close' }, actions), true)
  assert.equal(isActionAllowed('browser_click', {}, actions), true)
  assert.equal(isActionAllowed('browser_input', {}, actions), false)
})

test('browser status remains available even with an empty allowlist', () => {
  assert.equal(isActionAllowed('browser_status', {}, parseAllowedActions('')), true)
})

test('denied action throws before tool execution', () => {
  assert.throws(
    () => assertActionAllowed('browser_nav', {}, parseAllowedActions('snapshot')),
    /action allowlist/,
  )
})

test('allowlist configured by apply() is used when the call site forgets to pass it', () => {
  // 1.2.0 的回归：defineTool 里调 assertActionAllowed 漏了第三个参数，
  // 于是每个工具一进来就 `undefined.has`，只剩 browser_status 能用。
  setAllowedActions(parseAllowedActions('snapshot,read'))
  assert.equal(isActionAllowed('browser_read', { what: 'snapshot' }), true)
  assert.equal(isActionAllowed('browser_click', {}), false)
  assert.throws(() => assertActionAllowed('browser_click', {}), /action allowlist/)
  // 用完还原成默认，免得影响后面的用例
  setAllowedActions(parseAllowedActions(undefined))
})

test('non-Set allowlist fails loudly instead of throwing an opaque TypeError', () => {
  assert.throws(() => isActionAllowed('browser_click', {}, null), /allowlist 未初始化/)
  assert.throws(() => isActionAllowed('browser_click', {}, ['*']), /allowlist 未初始化/)
})
