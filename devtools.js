/**
 * 控制台 / 网络 / 返回内容 —— 调试网页用（browser_devtools）。
 *
 * 记录都在扩展里（console + JS 报错 + 浏览器日志一个环形缓冲，网络请求一个），这里只负责取和排版。
 * 只记得到调试器接上之后的事；不过接上那一刻 V8 会把之前的 console 和报错补发一遍，
 * 所以看 console 前先 attach 一下就能拿到「打开页面以来」的输出。网络请求没有补发，要 reload。
 */

import { tt } from './i18n/index.js'

const time = (ms) => new Date(ms).toTimeString().slice(0, 8)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const LEVELS = {
  error: ['error', 'assert'],
  warning: ['error', 'assert', 'warning', 'warn'],
}

/** "http://x.com/static/app.js?v=3:12" → "app.js?v=3:12" */
const shortWhere = (w) => {
  const m = /([^/]+)$/.exec(String(w || ''))
  return m ? m[1].slice(0, 60) : ''
}

export async function consoleLog(call, tabId, { level = 'all', filter, limit = 40 } = {}) {
  await call('attach', { tabId })
  await sleep(300) // 等 V8 补发完旧消息
  const r = await call('console', { tabId, limit: 300 })
  let items = r.items || []
  if (LEVELS[level]) items = items.filter((c) => LEVELS[level].includes(c.level))
  if (filter) {
    const f = String(filter).toLowerCase()
    items = items.filter((c) => `${c.level} ${c.text} ${c.where || ''}`.toLowerCase().includes(f))
  }
  const total = items.length
  items = items.slice(-limit)
  if (!items.length) return level === 'all' && !filter ? tt('res.devtools.consoleEmpty') : tt('res.devtools.consoleNoMatch')
  const lines = items.map((c) => {
    const tag = c.kind === 'exception' ? tt('res.devtools.uncaught') : c.kind && c.kind !== 'console' ? `[${c.kind}] ` : ''
    const where = c.where ? `  (${shortWhere(c.where)})` : ''
    return `${time(c.at)} ${String(c.level).padEnd(7)} ${tag}${c.text}${where}`
  })
  const head = total > items.length
    ? tt('res.devtools.consoleHead', { shown: items.length, total })
    : tt('res.devtools.consoleCount', { n: items.length })
  return `${head}\n${lines.join('\n')}`
}

export async function networkLog(call, tabId, { filter, reload = false, limit = 40 } = {}) {
  const r = await call('network', { tabId, limit: 400, reload: !!reload, waitMs: 2500 }, 30000)
  let items = r.items || []
  if (filter) {
    const f = String(filter).toLowerCase()
    items = items.filter((n) => `${n.method} ${n.status} ${n.type} ${n.url}`.toLowerCase().includes(f))
  }
  const total = items.length
  items = items.slice(-limit)
  if (!items.length) {
    return filter ? tt('res.devtools.netEmptyFiltered') : tt('res.devtools.netEmpty')
  }
  const hasId = items.some((n) => n.id)
  const lines = items.map((n) => {
    const status = n.failed ? `✗ ${n.failed}` : String(n.status ?? '…')
    const ms = n.ms !== undefined ? `${n.ms}ms` : ''
    const url = n.url.length > 150 ? n.url.slice(0, 149) + '…' : n.url
    return `${hasId ? `#${n.id} ` : ''}${n.method} ${status} ${String(n.type || '').toLowerCase()} ${ms} ${url}`
  })
  const head =
    (total > items.length
      ? tt('res.devtools.netHead', { shown: items.length, total })
      : tt('res.devtools.netCount', { n: items.length })) +
    (hasId ? tt('res.devtools.netHintResponse') : tt('res.devtools.netHintOldExt'))
  return `${head}\n${lines.join('\n')}`
}

export async function responseBody(call, tabId, requestId, limit = 6000) {
  if (!requestId) throw new Error(tt('err.devtools.requestNeeded'))
  const id = String(requestId).replace(/^#/, '')
  let r
  try {
    r = await call('cdp', { tabId, method: 'Network.getResponseBody', params: { requestId: id } })
  } catch (e) {
    if (/No resource|No data found|identifier/i.test(e.message)) {
      throw new Error(tt('err.devtools.noBody'))
    }
    throw e
  }
  const { body = '', base64Encoded } = r.result || {}
  if (base64Encoded) {
    return tt('res.devtools.binary', { size: `${Math.round((body.length * 3) / 4 / 1024)}KB` })
  }
  let text = body
  const t = body.trim()
  if (t.startsWith('{') || t.startsWith('[')) {
    try { text = JSON.stringify(JSON.parse(t), null, 2) } catch {}
  }
  return text.length > limit
    ? text.slice(0, limit) + tt('res.devtools.truncated', { n: text.length })
    : text || tt('res.devtools.empty')
}

export async function clearLogs(call, tabId) {
  await call('console', { tabId, clear: true })
  await call('network', { tabId, clear: true })
  return tt('res.devtools.cleared')
}

/**
 * 等某个网络响应出现 —— 比「点完 sleep 两秒再看」靠谱，尤其是提交表单、搜索、翻页之后。
 * 网络记录在扩展的环形缓冲里，这里轮询比对；只在第一轮按需 reload，避免把页面刷成循环。
 * @param call - socket 调用
 * @param tabId - 标签页
 * @param options.url - URL 子串（必填，避免匹配到任意请求）
 * @param options.method - 方法，例如 POST
 * @param options.status - 期望状态码
 * @param options.timeoutMs - 超时，默认 15000
 * @param options.reload - 先刷新一次页面再抓（提交后需要整页重载时用）
 * @param options.body - 命中后是否连响应体一起取回
 * @returns 给模型看的文本
 */
export async function waitResponse(call, tabId, { url, method, status, timeoutMs = 15000, reload = false, body = false } = {}) {
  if (!url) throw new Error(tt('err.waitResponseNeedsUrl'))
  const ms = Math.min(Math.max(Number(timeoutMs) || 15000, 1000), 120000)
  await call('attach', { tabId })
  const deadline = Date.now() + ms
  let reloaded = !reload
  while (Date.now() < deadline) {
    const first = !reloaded
    const r = await call('network', { tabId, limit: 400, reload: first, waitMs: first ? 2500 : 0 }, 30000)
    reloaded = true
    const hit = [...(r.items || [])].reverse().find((n) =>
      String(n.url || '').includes(String(url))
      && (!method || String(n.method || '').toUpperCase() === String(method).toUpperCase())
      && (status === undefined || Number(n.status) === Number(status)))
    if (hit) {
      const head = tt('res.waitResponse.hit', {
        method: hit.method || 'GET', status: hit.status ?? '?', url: String(hit.url || '').slice(0, 160),
        ms: hit.ms ?? '?',
      })
      if (!body) return head
      let payload
      try { payload = await responseBody(call, tabId, hit.id, 4000) } catch (e) { return `${head}\n${tt('res.waitResponse.noBody', { e: e.message })}` }
      return `${head}\n${payload}`
    }
    await sleep(400)
  }
  throw new Error(tt('err.waitResponseTimeout', { url, ms }))
}
