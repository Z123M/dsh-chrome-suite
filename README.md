# Chrome 浏览器套件

> **非官方分支。** 本包基于 [OrderG-X 的 dsh-chrome-bridge](https://github.com/OrderG-X/dsh-chrome-bridge)（MIT）修改，与上游、与 DeepSeek Harness 官方均无隶属或背书关系。包内 Chrome 扩展已更名为 **Chrome Suite Bridge**，并拥有**独立的原生宿主名（`com.chromesuite.bridge`）与扩展 ID**，因此不会与上游互相覆盖安装。来源、改动与授权见 [NOTICE](/Users/yp-21006/Desktop/dsh-chrome-suite/NOTICE)。

统一的 DSH Chrome 浏览器工具：页面快照与文本、真实点击和输入、导航、截图、标签管理、下载，以及 DevTools Console/Network 读取。连接状态、活动标签页、最近操作、暂停和全部放开都集中在 Chrome 扩展面板与 DSH 插件设置卡中。


## 权限与连接

插件通过 Chrome Native Messaging 和 CDP 连接，不开 TCP 监听端口。需要在 Chrome 安装 **Chrome Suite Bridge** 扩展（包内自带，用“加载已解压”装）；本分支带自己的扩展 ID，宿主只放行包内这份扩展，上游商店版连不上我们。扩展使用 `debugger` 权限和 `<all_urls>`，因此连接后可读取并操作 Chrome 中的普通网页，包括已登录的页面；这不是 DSH 桌面窗口控制器。

连接沿用 dsh-chrome-bridge 的 Native Messaging 实现，但身份是独立的：原生宿主名 `com.chromesuite.bridge`，宿主落在 `~/.dsh/chrome-suite-bridge`，扩展副本在 `~/chrome-suite-bridge-extension`，扩展 ID 由包内自己的公钥推导。因此本套件和上游 bridge 的安装互不覆盖，可以并存安装；只是两者都会往同一个 Chrome 附加调试器，**不建议同时启用**。

标签页归属：省略 `tab` 时，先用手上这个会话**自己打开或点名操作过**的那一页；一条都没记过、干活窗口里又只有一个页时，就用那一页——所以 `cb open` 打开的页和 `browser_tabs open` 打开的页共用同一个默认页。干活窗口里多于一个页就不猜，报错列出候选 id。用户自己窗口里的页永远不是候选。

Chrome 扩展面板的“允许 DSH 控制浏览器”是人工暂停开关。DSH 侧只提供暂停和放开标签页，不允许模型自行重新启用控制。新标签页默认进入单独的 Chrome 窗口；插件不会默认选中正在浏览的页面，必须显式指定 `tab: "active"` 才会操作当前活动页。页面文字、截图、Console 和 Network 响应等工具结果会进入当前 DSH 会话，并可能随对话发送给你配置的模型服务；请勿让模型读取密码、支付信息或其他敏感页面内容。

默认开放全部工具，与用户选择的操作模式一致。可在 profile 的 `cordis.patch.yml` 限制动作；支持 `*`、逗号分隔的动作名，也兼容 `DSH_CHROME_USE_ALLOWED_ACTIONS` 环境变量。显式配置优先于环境变量；空白白名单会拒绝全部动作。

```yaml
- id: chrome-suite
  name: dsh-chrome-suite
  config:
    locale: zh
    allowedActions: tabs,snapshot,read,screenshot,wait,devtools
```

可用动作名：`tabs`、`tab-read`、`tab-write`、`snapshot`、`read`、`click`、`input`、`nav`、`screenshot`、`eval`、`wait`、`dialog`、`drag`、`download`、`devtools`。`tabs` 覆盖全部标签页操作；`tab-read` 只允许列出和查找标签页，`tab-write` 允许打开、关闭和切换标签页。`snapshot` 单独控制结构化页面快照，`read` 控制文本、HTML、属性和页面信息。

## 工具

插件还会往系统提示里注入一小段路由规则：零散操作、看页面、精确点元素用 `browser_*`；批量、循环、脚本、定时任务用 `cb`；当前会话没有工具时用 `cb`。规则只约束模型的选择，不改变两条入口共用的宿主与权限。

- `browser_status`：读取桥宿主、Chrome 扩展、暂停状态与受控标签页数量；不读取网页内容，且不受动作白名单限制。
- `browser_tabs`：列出、查找、打开、关闭和切换标签页。
- `browser_read`：结构化快照、文本、HTML、属性和页面信息。
- `browser_click` / `browser_input` / `browser_nav`：点击、输入、表单操作、滚动和导航。
- `browser_screenshot` / `browser_wait` / `browser_drag`：截图、等待页面条件、拖拽。
- `browser_eval` / `browser_dialog`：执行页面脚本、处理 alert/confirm/prompt。
- `browser_download`：下载网页文件。
- `browser_devtools`：Console、未捕获 JS 错误、Network 请求、响应内容和清理诊断记录。

## 安装

在 DSH「插件」→「添加插件」中选择本地目录 `dsh-chrome-suite`，安装后重启 DSH。默认走包内扩展：在 `chrome://extensions` 开启开发者模式 → 「加载已解压的扩展程序」→ 选 `~/chrome-suite-bridge-extension`（插件设置卡会帮你打开页面并复制路径）。上游商店版的那份不属于本包，也连不上本包的宿主。连接成功后设置卡会显示宿主、扩展版本和受控标签页。

**不建议同时启用 `dsh-chrome-bridge`、`dsh-chrome-use` 或 `@shallbay/dsh-bridge-browser`。**本包现在有独立的宿主名和扩展 ID，安装不再互相覆盖，但几套工具都会在同一个 Chrome 上附加调试器、注册同名的 `browser_*` 工具，同时启用仍会造成工具名冲突与标签页归属混乱。要用本包时，先停用其他浏览器桥。

## 与其他浏览器插件的差异

本套件面向“借用你正在用的那台 Chrome”，不做观察窗。与 `dsh-browser-cdp`（1.15.1，README/registry 信息，未在本机运行验证）的差异：

| 能力 | 本套件 | dsh-browser-cdp |
|---|---|---|
| 驱动已登录、正在使用的 Chrome 窗口 | 是，扩展 + Native Messaging，无需另开 profile | 需 Chrome 以调试端口启动后附着，或改用其受管运行时 |
| 网络监听端口 | 无（私有原生消息管道） | 本地 CDP 调试端口 |
| 页面内可见光标、进入截图 | 是 | 无，改用观察窗 |
| Console / 未捕获 JS 错误 / 网络响应体 | 专用 `browser_devtools` | 需 `bcdp_cdp` 原始 CDP 或 `bcdp_script` 自行实现 |
| 模型无法自行恢复的暂停闸门 | 是，只能在 Chrome 扩展面板恢复 | 无等价设计 |
| 实时观察窗、面板接管、元素点选引用 | 无 | 有 |
| 登录态导入、验证码检测、多任务空间 | 无 | 有 |
| 工具注入成本 | 13 个工具常驻 | 懒加载，默认只常驻 1 个 |
| 安装体积 | 轻量，无内置浏览器 | 含受管 Chromium 运行时 |

结论：需要“看得见、能随时接管”的专用浏览器选 dsh-browser-cdp；需要直接操作自己已登录的 Chrome、且在意不新开调试端口，选本套件。

## 来源与兼容性

此包以 [dsh-chrome-bridge](https://github.com/OrderG-X/dsh-chrome-bridge) 1.20.0（MIT）为连接与浏览器工具基座，合并了可配置动作白名单和统一的设置说明；没有复制另外两个包的 WebSocket/配对传输，以免多个后端争抢同一个浏览器。第三方的兼容性元数据记录 `dsh-chrome-use` 0.16.1 要求 DSH `>=0.2.1-rc.2`；该版本基座声明支持 Chrome 116+、macOS/Windows/Linux。实际 DSH 运行时安装及 Chrome 配对尚未在本机验证。
