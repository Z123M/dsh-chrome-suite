# Chrome browser suite

> **Unofficial fork.** This package is derived from [OrderG-X's dsh-chrome-bridge](https://github.com/OrderG-X/dsh-chrome-bridge) (MIT). It is not affiliated with or endorsed by that project or by DeepSeek Harness. The bundled Chrome extension is renamed to **Chrome Suite Bridge**, but the native host name `com.dsh.bridge` and the extension identity are shared with upstream, so it **must not be enabled together with the upstream plugin**. See [NOTICE](/Users/yp-21006/Desktop/dsh-chrome-suite/NOTICE) for provenance, changes and licensing.

Unified DSH tools for Chrome: structured page snapshots and text, real clicks and input, navigation, screenshots, tab management, downloads, and DevTools Console/Network inspection. Connection status, controlled tabs, recent actions, pause and release controls are available in the Chrome extension popup and DSH plugin settings card.


## Permissions and connection

The plugin connects through Chrome Native Messaging and CDP; it does not open a TCP listening port. Install the **Chrome Suite Bridge** extension in Chrome (the bundled copy, loaded unpacked). This fork ships its own extension ID, and its host accepts only the bundled extension, so the upstream store copy cannot connect to it. The extension uses Chrome's `debugger` permission and `<all_urls>`, so when connected it can read and operate ordinary Chrome pages, including signed-in sites. It does not control the DSH desktop application's own window.

The transport follows dsh-chrome-bridge, but the identity is independent: the native host is `com.chromesuite.bridge`, installed at `~/.dsh/chrome-suite-bridge` (under the user's DSH directory on Windows), with the extension copy at `~/chrome-suite-bridge-extension` and an extension ID derived from this package's own public key. Installing this suite therefore does not overwrite the upstream bridge; running both is still discouraged because they attach a debugger to the same Chrome.

The extension's “Allow DSH to control the browser” switch is a human-operated pause control. DSH can pause and release tabs, but cannot re-enable browser control itself. New tabs open in a separate Chrome window by default. The plugin does not target the current page implicitly; specify `tab: "active"` to operate the currently active tab. Page text, screenshots, Console output, Network responses and other tool results enter the current DSH session and may be sent with the conversation to your configured model service; do not ask the model to read passwords, payment details or other sensitive page content.

All actions are enabled by default, as selected for this setup. Restrict them in the profile's `cordis.patch.yml`. The setting accepts `*` or comma-separated action names and is compatible with `DSH_CHROME_USE_ALLOWED_ACTIONS`. An explicit config value takes precedence over the environment variable; an explicitly empty allowlist denies all actions.

```yaml
- id: chrome-suite
  name: dsh-chrome-suite
  config:
    locale: en
    allowedActions: tabs,snapshot,read,screenshot,wait,devtools
```

Actions: `tabs`, `tab-read`, `tab-write`, `snapshot`, `read`, `click`, `input`, `nav`, `screenshot`, `eval`, `wait`, `dialog`, `drag`, `download`, `devtools`. `tabs` allows all tab operations; `tab-read` allows listing and searching tabs only; `tab-write` allows opening, closing, and switching tabs. `snapshot` controls structured snapshots, while `read` controls text, HTML, attributes, and page metadata.

## Tools

The plugin also injects a short routing rule into the system prompt: use `browser_*` for ad-hoc actions, inspecting a page, or clicking an exact element; use `cb` for bulk work, loops, scripts and scheduled jobs; use `cb` when the session has no `browser_*` tools. The rule shapes the model's choice only; both entry points share one host and one permission set.

- `browser_status`: inspect the local host, Chrome extension, pause state and controlled tab count without reading page content; this diagnostic is not subject to the action allowlist.
- `browser_tabs`: list, find, open, close, and switch tabs.
- `browser_read`: structured snapshots, text, HTML, attributes, and page information.
- `browser_click`, `browser_input`, `browser_nav`: click, type, form actions, scrolling, and navigation.
- `browser_screenshot`, `browser_wait`, `browser_drag`: screenshots, page-condition waits, and drag operations.
- `browser_eval`, `browser_dialog`: run page JavaScript and handle alert/confirm/prompt dialogs.
- `browser_download`: download files from pages.
- `browser_devtools`: console output, uncaught JS errors, network requests, response bodies, and clearing diagnostic records.

## Install

In DSH, open **Plugins** > **Add plugin** and select the local directory `dsh-chrome-suite`; restart DSH after installation. The default path uses the bundled extension: open `chrome://extensions`, enable Developer mode, click **Load unpacked**, and choose `~/chrome-suite-bridge-extension` (the settings card opens the page and copies the path for you). The upstream store copy is a different package and cannot reach this host. The card reports host and extension status and controlled tabs.

**Enabling `dsh-chrome-bridge`, `dsh-chrome-use`, or `@shallbay/dsh-bridge-browser` at the same time is not recommended.** This package now has its own host name and extension ID, so installations no longer overwrite each other, but every bridge attaches a debugger to the same Chrome and registers overlapping `browser_*` tools. Disable the other bridges before using this one.

## Difference from other browser plugins

This suite targets "borrow the Chrome you already use" and ships no watch panel. Compared with `dsh-browser-cdp` 1.15.1 (README/registry facts only, not run on this machine):

| Capability | This suite | dsh-browser-cdp |
|---|---|---|
| Drive the signed-in Chrome window you already use | Yes, extension + Native Messaging, no extra profile | Needs Chrome started with a debug port, or its managed runtime |
| Listening network port | None (private native messaging pipe) | Local CDP debug port |
| Visible in-page cursor captured in screenshots | Yes | No, uses a watch panel instead |
| Console / uncaught JS errors / response bodies | Dedicated `browser_devtools` | Via raw `bcdp_cdp` or `bcdp_script` |
| Pause gate the model cannot re-enable | Yes, restored only in the Chrome extension popup | No equivalent |
| Live watch panel, takeover, element picking | No | Yes |
| Login import, captcha detection, task spaces | No | Yes |
| Tool schema cost | 13 resident tools | Lazy tiers, 1 resident by default |
| Install size | Light, no bundled browser | Bundles a managed Chromium runtime |

Choose dsh-browser-cdp for a dedicated, watchable, takeover-able agent browser; choose this suite to act directly in your own signed-in Chrome without opening a debug port.

## Provenance and compatibility

This package uses [dsh-chrome-bridge](https://github.com/OrderG-X/dsh-chrome-bridge) 1.20.0 (MIT) as its transport and browser-tool base, adding a configurable action allowlist and consolidated documentation. It does not copy the other packages' WebSocket/pairing transports, which would compete for the same browser. The cached metadata for `dsh-chrome-use` 0.16.1 declares DSH `>=0.2.1-rc.2`; the upstream base claims Chrome 116+ and macOS/Windows/Linux support. Installation and live Chrome pairing have not been verified on this machine.
