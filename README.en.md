# DSH Chrome Tool Suite

Chrome browser tools for DeepSeek Harness: read pages, click elements, take screenshots, manage tabs,
inspect Console and Network. It goes through a Chrome extension and Native Messaging to drive the
**Chrome you are already signed in to** — no separate profile, no debug port.

Repository: https://github.com/Z123M/dsh-chrome-suite

## What it is

13 resident `browser_*` tools for the model:

| Tool | What it does |
|---|---|
| `browser_status` | Host, extension, pause state, controlled tab count; reads no page content |
| `browser_tabs` | List, find, open, close, activate tabs |
| `browser_read` | Structured snapshot (with element numbers), visible text, HTML, one attribute, page info |
| `browser_click` | Real mouse click by ref, selector, text or coordinates; double-click |
| `browser_input` | Type, keys and chords, select, upload (session working directory or system temp only, no hidden files), focus, hover, scroll |
| `browser_nav` | Go, back, forward, reload |
| `browser_screenshot` | Viewport, full page, single element |
| `browser_eval` | Run JS in the page and get the result back |
| `browser_wait` | Wait for an element, text, or URL — or for it to go away |
| `browser_dialog` | Handle alert / confirm / prompt |
| `browser_drag` | Reorder lists, sliders, drag files into a drop zone |
| `browser_download` | Download a link target with the browser's signed-in state |
| `browser_find` | Locate elements by visible text or selector; refs match the snapshot and work in click/input |
| `browser_scrape` | Extract tables, lists and cards one selector per row into structured JSON rows |
| `browser_assert` | Assert page state (text, selector, count, value, URL, title), failing with the actual value |
| `browser_wait_response` | Wait for a specific network response, optionally with its body, instead of sleeping |
| `browser_devtools` | Console, uncaught JS errors, Network requests and response bodies, clear records |

A sibling CLI `cb` shares the same host for multi-step, batched, scripted and scheduled work, which
uses fewer tokens than one tool call per step. Permissions, host and extension are the same for both
entries; only the calling surface differs.

## Install

```bash
git clone https://github.com/Z123M/dsh-chrome-suite.git
```

1. In DSH open **Plugins** > **Add plugin**, pick the local directory `dsh-chrome-suite`, then restart DSH.
2. Install the extension: the settings card opens `chrome://extensions` and copies the path. Enable
   Developer mode, click **Load unpacked**, choose `~/chrome-suite-bridge-extension`.
3. Once connected, the card shows the host, extension version and controlled tab count.

The extension uses Chrome's `debugger` permission and `<all_urls>`, so it can read and act on ordinary
Chrome pages, including signed-in ones. It does not control the DSH desktop window itself.

**Do not run it alongside other `browser_*` plugins.** They all attach a debugger to the same Chrome
and register overlapping tool names; running both breaks tool lookup and tab ownership. Disable the
other browser bridges first.

## Permissions and transport

- No TCP listening port: the extension and host use Chrome Native Messaging, DSH and the host use a
  local socket (a named pipe on Windows).
- Settings route `GET/POST /dsh-chrome-suite/panel` accepts local connections only, rejects
  cross-site Origins, and requires JSON POST bodies.

To check whether it is connected, whether the host is running, and which extension version is in use,
just call `browser_status` — no log digging needed.

## Tab targeting

- **No `tab` given**: reuse the tab this session opened or named before. If this session has not used
  one yet and the work window holds exactly one tab, use that tab — so `cb open` and
  `browser_tabs open` share the same default target.
- With several tabs in the work window it does not guess: it errors and lists the candidate ids.
  Acting on the wrong tab costs more than asking for an id.
- **Tabs in your own window are never candidates.** To act on the page you are looking at, pass
  `tab: "active"` explicitly.
- New tabs open in a separate work window, in the background, without stealing focus.

## Pause and safety gate

The "Allow DSH to control the browser" switch in the Chrome extension popup is a human gate, and
**only you can restore it**:

- From the settings card you can: pause, release all controlled tabs, toggle the in-page cursor, set
  the new-tab window mode, and re-run the install helper.
- Resuming control is only possible in the Chrome extension popup. The model cannot reach that path,
  and the plugin does not expose it, so the model cannot let itself back in.
- Pausing also detaches every attached tab. After that every action is refused until you resume.

## Records and clearing them

The extension keeps three ledgers: recent actions, conversations using the browser, and an extension
log. **All in memory only, nothing on disk** — closing the extension or restarting Chrome clears them.

- Automatic expiry: recent actions keep 24 hours / at most 80 entries; the log keeps 24 hours / at most 400 lines.
- **Clear** next to "Recent actions" in the popup wipes all three ledgers but leaves controlled tabs
  alone — those are real state, not records.
- The **Record action details** switch: when off, only action names and timestamps are kept — no page
  text, no tab titles, no error details, and hints in existing records are erased too.
- Typed text is never recorded, only a word count.
- **Only you can hit Clear or flip that switch**: nothing outside the toolbar popup (the model, the
  `cb` CLI) can reach them, so the model cannot wipe its own traces.

Host logs and the token live in `/tmp/chrome-suite-bridge-<uid>/` and can be deleted directly; they are
recreated on the next start.

**Out of scope for this plugin**: the DSH session history still keeps every tool call's arguments and
results (merchant ids you looked up, page snapshots). To leave less behind, work in a fresh session or
delete the session.

## Action allowlist

Everything is allowed by default. To narrow it, edit the profile's `cordis.patch.yml` or set
`DSH_CHROME_USE_ALLOWED_ACTIONS` (explicit config wins; an empty list denies every action):

```yaml
- id: chrome-suite
  name: dsh-chrome-suite
  config:
    locale: en
    allowedActions: tabs,snapshot,read,screenshot,wait,devtools
```

Action names: `tabs`, `tab-read`, `tab-write`, `snapshot`, `read`, `click`, `input`, `nav`,
`screenshot`, `eval`, `wait`, `dialog`, `drag`, `download`, `devtools`.
`tab-read` allows listing and finding only; `tab-write` allows open/close/activate; `snapshot`
controls the structured snapshot separately. `browser_status` is exempt from the allowlist because it
is a diagnostic tool that reads no page content.

## Design trade-offs

- **Borrow the Chrome you already use**: no new profile, no login import — nearly everything worth
  doing lives in pages you are already signed in to.
- **No debug port**: Native Messaging plus in-extension CDP, so nothing listens on TCP; the cost is
  that you have to install the extension.
- **13 resident tools**: the model does not have to look up the tool list first; the cost is a little
  context spent on tool descriptions.
- **Conservative default target**: erroring and asking for a tab id beats guessing, because acting on
  the wrong page costs far more than typing one id.

## Languages

Tool descriptions, parameter docs and error messages shown to the model support `zh` / `en` / `ru` via
`config.locale` (unknown values fall back to `zh`). The DSH settings card follows DSH's UI language and the
Chrome popup follows Chrome's; both ship Chinese, English and Russian.

## Development

```bash
node --test actions.test.js tabs.test.js
```

## License

MIT, see [LICENSE](LICENSE). Third-party code and changes are documented in [NOTICE](NOTICE).
