const ACTIONS_BY_TOOL = {
  browser_tabs: args => ['tabs', args.action === 'list' || args.action === 'find' ? 'tab-read' : 'tab-write'],
  browser_read: args => [args.what === 'snapshot' ? 'snapshot' : 'read'],
  browser_click: ['click'],
  browser_input: ['input'],
  browser_nav: ['nav'],
  browser_screenshot: ['screenshot'],
  browser_eval: ['eval'],
  browser_wait: ['wait'],
  browser_dialog: ['dialog'],
  browser_drag: ['drag'],
  browser_download: ['download'],
  browser_devtools: ['devtools'],
}

export function parseAllowedActions(value) {
  if (value === undefined) return new Set(['*'])
  const parsed = new Set(String(value).split(',').map(action => action.trim()).filter(Boolean))
  return parsed.size === 0 ? new Set(['__deny_all__']) : parsed
}

export function actionsFor(toolName, args) {
  const entry = ACTIONS_BY_TOOL[toolName]
  return typeof entry === 'function' ? entry(args || {}) : (entry || [])
}

/**
 * apply() 时把最终白名单记在这里。工具执行时就算忘了把白名单当参数传下来，
 * 也还是按配置校验——1.2.0 的 bug 就是 defineTool 里漏传了第三个参数，
 * 让每个工具一进来就撞上 `undefined.has`，只有不查白名单的 browser_status 还能用。
 */
let configuredAllowedActions = new Set(['*'])

export function setAllowedActions(allowedActions) {
  configuredAllowedActions = allowedActions instanceof Set ? allowedActions : parseAllowedActions(allowedActions)
  return configuredAllowedActions
}

export function isActionAllowed(toolName, args, allowedActions = configuredAllowedActions) {
  // 白名单一定是 Set。传丢或传错类型时明确报错，别让它变成「undefined.has」这种看不懂的 TypeError，
  // 也别默默放行——配置读错时静默放开比报错危险得多。
  if (!(allowedActions instanceof Set)) {
    throw new Error('dsh-chrome-suite: action allowlist 未初始化（应传入 parseAllowedActions 的结果）')
  }
  if (toolName === 'browser_status') return true
  const actions = actionsFor(toolName, args)
  return allowedActions.has('*') || actions.some(action => allowedActions.has(action))
}

export function assertActionAllowed(toolName, args, allowedActions) {
  if (!isActionAllowed(toolName, args, allowedActions)) {
    const actions = actionsFor(toolName, args)
    throw new Error(`Blocked by dsh-chrome-suite action allowlist (${actions.join(', ') || toolName})`)
  }
}
