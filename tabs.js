/**
 * 「省略 tab 时用哪一页」的判定，单独放这里是为了能单测——index.js 里的 resolveTab 直接挂在
 * CDP/宿主上，测不了。规则只有一条：候选只限 DSH 干活窗口（agentWindow），用户自己窗口里的页
 * 永远不进候选。
 */

/**
 * @param {Array<{id:number, agentWindow?:boolean}>} tabs 宿主返回的标签页列表
 * @returns {{kind:'none'} | {kind:'one', tab:object} | {kind:'ambiguous', tabs:Array}}
 */
export function pickFallbackTab(tabs) {
  const own = (Array.isArray(tabs) ? tabs : []).filter((tb) => tb && tb.agentWindow)
  if (own.length === 0) return { kind: 'none' }
  if (own.length === 1) return { kind: 'one', tab: own[0] }
  return { kind: 'ambiguous', tabs: own }
}
