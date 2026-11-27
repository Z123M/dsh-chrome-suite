# DSH Chrome 工具套件

给 DeepSeek Harness 用的 Chrome 浏览器工具集：读页面、点元素、截图、管标签页、看 Console 和 Network。
走 Chrome 扩展 + Native Messaging，直接借你**已经登录的那台 Chrome**，不另开用户目录、不开调试端口。

仓库：https://github.com/Z123M/dsh-chrome-suite

## 它是什么

13 个 `browser_*` 工具常驻给模型用：

| 工具 | 能做什么 |
|---|---|
| `browser_status` | 宿主、扩展、暂停状态、受控标签页数量；不读网页内容 |
| `browser_tabs` | 列出、查找、打开、关闭、切换标签页 |
| `browser_read` | 结构化快照（带元素编号）、可见文本、HTML、单个属性、页面信息 |
| `browser_click` | 真实鼠标点击，可按编号、选择器、文字或坐标，支持双击 |
| `browser_input` | 输入、按键与组合键、下拉选择、上传文件（限会话工作目录或系统临时目录、不含隐藏文件）、聚焦、悬停、滚动 |
| `browser_nav` | 跳转、后退、前进、刷新 |
| `browser_screenshot` | 当前视口、整页、单个元素 |
| `browser_eval` | 在页面里执行 JS 并取回结果 |
| `browser_wait` | 等元素出现/消失、等文字、等 URL |
| `browser_dialog` | 处理 alert / confirm / prompt |
| `browser_drag` | 拖拽排序、滑块、拖文件进框 |
| `browser_download` | 把链接指向的文件下载到本机，带登录态 |
| `browser_find` | 按可见文字或选择器找元素，返回与快照同一套编号，可直接用于点击/输入 |
| `browser_scrape` | 按「一行一个选择器」抓表格/列表/卡片，返回结构化 JSON 行 |
| `browser_assert` | 断言页面状态（文字/选择器/数量/值/网址/标题），失败时带实际值 |
| `browser_wait_response` | 等指定网络响应出现，可连响应体一起取，替代点击后盲等 |
| `browser_devtools` | Console、未捕获 JS 错误、Network 请求与响应体、清空记录 |

另有一个同宿主的命令行 `cb`，一次调用可连做多步：批量、循环、脚本和定时任务用它更省 token。
两者的权限、宿主和扩展是同一份，只是入口不同。

## 安装

```bash
git clone https://github.com/Z123M/dsh-chrome-suite.git
```

1. DSH「插件」→「添加插件」→ 选本地目录 `dsh-chrome-suite`，装完重启 DSH。
2. 装扩展：设置卡会打开 `chrome://extensions` 并把路径复制到剪贴板；开启开发者模式 →「加载已解压的扩展程序」→
   选 `~/chrome-suite-bridge-extension`。
3. 连接成功后设置卡显示宿主、扩展版本和受控标签页数量。

扩展使用 `debugger` 权限和 `<all_urls>`，所以能读能改你 Chrome 里的普通网页，包括已登录的页面。
它不是 DSH 桌面窗口控制器，看不到浏览器以外的窗口。

**不要和其它 `browser_*` 插件同时启用。** 它们都会往同一个 Chrome 附加调试器、注册同名工具，
同时启用会造成工具名冲突和标签页归属混乱。要用本套件时先停用其它浏览器桥。

## 权限与连接

- 不开 TCP 监听端口：扩展与宿主之间走 Chrome Native Messaging，DSH 与宿主之间走本地 socket（Windows 走命名管道）。
- 设置卡路由 `GET/POST /dsh-chrome-suite/panel`，只收本机连接、跨站 Origin 一律拒、POST 必须是 JSON。

连没连上、宿主在跑没有、扩展什么版本，直接调一次 `browser_status` 就清楚了，不用翻日志。

## 标签页归属

- **不传 `tab`**：先接用本会话自己打开或点名操作过的页；一条都没记过、干活窗口里又只有一个页时，用那一页
  （所以 `cb open` 开的页和 `browser_tabs open` 开的页共用同一个默认页）。
- 干活窗口里多于一个页时不猜，报错列出候选 id —— 选错页改错数据的代价比多问一句大。
- **用户自己窗口里的页永远不是候选。** 要动你正在看的那一页，必须显式传 `tab: "active"`。
- 新标签页默认开进单独的干活窗口、在后台，不抢你的焦点。

## 暂停与安全闸门

Chrome 扩展面板里的「允许 DSH 控制浏览器」是人工开关，**只有你能恢复**：

- 设置卡里能做的：暂停、释放全部受控标签页、页内光标开关、新页开窗模式、重新走安装引导
- 恢复控制只能去 Chrome 的扩展面板点 —— 这条路模型摸不到，插件也不开放，避免它自己把自己放出来
- 暂停时会顺手松开所有已附加的标签页；此后任何操作都会被拒，直到你手动恢复

## 记录与清空

扩展会记三份账：最近操作、正在用浏览器的对话、扩展日志。**都只在内存里，不写磁盘**，关掉扩展或重启 Chrome 就没了。

- 自动过期：最近操作保留 24 小时、最多 80 条；日志保留 24 小时、最多 400 条
- 弹窗里「最近操作」右侧有 **清空**：一次清掉这三份账本，但不动正在受控的标签页（那是真实状态，不是记录）
- 弹窗里 **记录操作明细** 开关：关掉后只记动作名和时间，不记页面文字、标签页标题和报错详情，旧记录里的提示也会一起擦掉
- 输入的内容从来不记录，只记「打了多少个字」
- **清空和这个开关只有你能点**：工具栏弹窗之外的通道（模型、`cb` 命令行）调不动它们，避免模型自己擦痕迹

宿主侧的日志和 token 在 `/tmp/chrome-suite-bridge-<uid>/`，可以直接删，下一次启动会重建。

**这部分插件管不到**：DSH 会话历史里仍然留着每次工具调用的参数和返回结果（比如查过的商户号、页面快照）。要少留痕得在新会话里干，或者删会话。

## 动作白名单

默认全开。要收紧就改 profile 的 `cordis.patch.yml`，或设环境变量 `DSH_CHROME_USE_ALLOWED_ACTIONS`
（显式配置优先；空名单拒绝全部动作）：

```yaml
- id: chrome-suite
  name: dsh-chrome-suite
  config:
    locale: zh
    allowedActions: tabs,snapshot,read,screenshot,wait,devtools
```

可用动作名：`tabs`、`tab-read`、`tab-write`、`snapshot`、`read`、`click`、`input`、`nav`、
`screenshot`、`eval`、`wait`、`dialog`、`drag`、`download`、`devtools`。
`tab-read` 只允许列出和查找，`tab-write` 才允许开、关、切；`snapshot` 单独控制结构化快照。
`browser_status` 不受白名单限制 —— 它是诊断工具，不碰网页内容。

## 设计取舍

- **只借你正在用的 Chrome**：不新开 profile、不导入登录态，因为绝大多数要办的事都在已登录的页面里。
- **不开调试端口**：Native Messaging + 扩展内 CDP，本机不监听 TCP；代价是需要装上这个扩展。
- **13 个工具常驻**：模型不用先查工具清单再调用，代价是常驻工具描述占一点上下文。
- **保守的默认目标**：宁可报错要你指定标签页，也不猜；改错页面的代价远大于多输一个 id。

## 语言

给模型看的工具描述、参数说明和报错文案支持 `zh` / `en` / `ru`（`config.locale`，认不出回落 `zh`）；
DSH 设置卡跟 DSH 的界面语言走，Chrome 扩展弹窗跟 Chrome 的界面语言走，两者也都是中 / 英 / 俄三份。

## 开发

```bash
node --test actions.test.js tabs.test.js
```

## 许可

MIT，全文见 [LICENSE](LICENSE)。衍生部分的说明见 [NOTICE](NOTICE)。
