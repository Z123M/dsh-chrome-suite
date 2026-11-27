/**
 * 结构化提取与断言 —— browser_scrape / browser_assert。
 *
 * 两者都在页面里跑一段我们控制的 JS，只用宿主已有的 eval op，所以不改扩展：
 * 插件改了重启 DSH 就够了，不用让用户去 chrome://extensions 重新加载。
 */

import { tt } from './i18n/index.js'

/** 把 { name: 'css' } 或 { name: { selector, attr } } 统一成 { name: { selector, attr } }。 */
export function normalizeScrapeSpec(spec) {
  if (!spec || typeof spec !== 'object' || Array.isArray(spec)) throw new Error(tt('err.scrapeNeedsFields'))
  const fields = {}
  for (const [name, raw] of Object.entries(spec)) {
    if (typeof raw === 'string') {
      if (!raw.trim()) throw new Error(tt('err.scrapeBadField', { name }))
      fields[name] = { selector: raw, attr: '' }
      continue
    }
    if (!raw || typeof raw !== 'object') throw new Error(tt('err.scrapeBadField', { name }))
    const selector = typeof raw.selector === 'string' ? raw.selector.trim() : ''
    const attr = typeof raw.attr === 'string' ? raw.attr.trim() : ''
    if (!selector && !attr) throw new Error(tt('err.scrapeBadField', { name }))
    fields[name] = { selector, attr }
  }
  if (!Object.keys(fields).length) throw new Error(tt('err.scrapeNeedsFields'))
  return fields
}

const SCRAPE_JS = (item, fields, limit) => `(() => {
  const fields = ${JSON.stringify(fields)};
  const root = document.body;
  if (!root) return { error: 'root' };
  const item = ${JSON.stringify(String(item || ''))};
  let nodes;
  try { nodes = item ? [...root.querySelectorAll(item)] : [root] } catch (e) { return { error: 'item' } }
  const norm = (s) => (s || '').replace(/\\s+/g, ' ').trim();
  const rows = nodes.slice(0, ${Number(limit)}).map((node) => {
    const row = {};
    for (const [name, f] of Object.entries(fields)) {
      const target = f.selector ? (function () { try { return node.querySelector(f.selector) } catch { return null } })() : node;
      if (!target) { row[name] = null; continue }
      row[name] = f.attr ? (target.getAttribute(f.attr) ?? '') : norm(target.innerText || target.textContent);
    }
    return row;
  });
  return { total: nodes.length, rows };
})()`

/**
 * 按「一行一个选择器」的方式抓取重复结构（表格、列表、卡片）。
 * @param call - socket 调用
 * @param tabId - 标签页
 * @param options.item - 每一行的 CSS 选择器；省略则把整页当一行
 * @param options.fields - { 字段名: 选择器 | { selector, attr } }
 * @param options.limit - 最多几行
 * @returns 给模型看的文本（JSON 行）
 */
export async function scrape(call, tabId, { item, fields, limit = 50 } = {}) {
  const spec = normalizeScrapeSpec(fields)
  const r = await call('eval', { tabId, expression: SCRAPE_JS(item, spec, limit), userGesture: false })
  const v = r.value || {}
  if (v.error === 'item') throw new Error(tt('err.scrapeBadItem', { item }))
  const rows = v.rows || []
  if (!rows.length) return { text: tt('res.scrape.empty', { item: item || 'body' }) }
  return {
    text: [
      tt('res.scrape.head', { n: rows.length, total: v.total, item: item || 'body' }),
      ...rows.map((row, i) => `${i + 1}. ${JSON.stringify(row)}`),
      tt('res.scrape.tail'),
    ].join('\n'),
  }
}

const ASSERT_KINDS = new Set(['text', 'selector', 'count', 'value', 'url', 'title'])

const ASSERT_JS = (kind, selector, value) => `(() => {
  const kind = ${JSON.stringify(kind)};
  const sel = ${JSON.stringify(String(selector || ''))};
  const want = ${JSON.stringify(String(value ?? ''))};
  const norm = (s) => (s || '').replace(/\\s+/g, ' ').trim();
  if (kind === 'url') return { actual: location.href, pass: location.href.includes(want) };
  if (kind === 'title') return { actual: document.title, pass: document.title.includes(want) };
  if (kind === 'text') {
    const text = norm(document.body ? document.body.innerText : '');
    return { actual: text.slice(0, 200), pass: text.includes(want) };
  }
  let nodes;
  try { nodes = sel ? [...document.querySelectorAll(sel)] : [] } catch { return { error: 'selector' } }
  if (kind === 'selector') return { actual: nodes.length, pass: nodes.length > 0 };
  if (kind === 'count') return { actual: nodes.length, pass: nodes.length === Number(want) };
  const el = nodes[0];
  if (!el) return { actual: null, pass: false };
  const actual = el.type === 'password' ? '' : norm(el.value ?? el.innerText ?? '');
  return { actual: actual.slice(0, 200), pass: actual === want };
})()`

/**
 * 断言页面状态，用于「点完确认真的成功了」，而不是靠截图猜。
 * @param call - socket 调用
 * @param tabId - 标签页
 * @param options.kind - text / selector / count / value / url / title
 * @param options.selector - selector / count / value 时的目标
 * @param options.value - 期望值（count 时是数量）
 * @returns { pass, text } —— 文本里写清实际值，未通过时由调用方决定是继续还是停
 */
export async function assertPage(call, tabId, { kind, selector, value } = {}) {
  if (!ASSERT_KINDS.has(kind)) throw new Error(tt('err.assertBadKind', { kind }))
  if (['selector', 'count', 'value'].includes(kind) && !selector) throw new Error(tt('err.assertNeedsSelector'))
  if (['text', 'url', 'title', 'value', 'count'].includes(kind) && value === undefined) throw new Error(tt('err.assertNeedsValue'))
  const r = await call('eval', { tabId, expression: ASSERT_JS(kind, selector, value), userGesture: false })
  const v = r.value || {}
  if (v.error === 'selector') throw new Error(tt('err.noElement', { sel: selector }))
  const actual = v.actual === undefined ? '' : String(v.actual)
  return {
    pass: Boolean(v.pass),
    text: tt(v.pass ? 'res.assert.pass' : 'res.assert.fail', { kind, value: String(value ?? selector ?? ''), actual }),
  }
}
