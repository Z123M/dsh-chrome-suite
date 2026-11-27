import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeScrapeSpec } from './extract.js'

test('scrape spec accepts a bare selector string', () => {
  assert.deepEqual(normalizeScrapeSpec({ title: 'h3' }), { title: { selector: 'h3', attr: '' } })
})

test('scrape spec accepts selector plus attribute', () => {
  assert.deepEqual(
    normalizeScrapeSpec({ link: { selector: 'a', attr: 'href' } }),
    { link: { selector: 'a', attr: 'href' } },
  )
})

test('scrape spec rejects empty fields and malformed entries', () => {
  assert.throws(() => normalizeScrapeSpec({}), /fields/)
  assert.throws(() => normalizeScrapeSpec({ a: '   ' }), /a/)
  assert.throws(() => normalizeScrapeSpec({ a: {} }), /a/)
  assert.throws(() => normalizeScrapeSpec(null), /fields/)
})
