# Ghostty Playground

A browser-based terminal using the Ghostty rendering engine and a BrowserPod Linux sandbox. It aims to look and behave like a desktop Ghostty terminal, within the constraints of what a browser can do.

**This is a work in progress.** Many Ghostty features either have no browser equivalent or are not yet implemented. See [docs/keybinds.md](docs/keybinds.md) for a full breakdown of what works, what is planned, and what cannot be supported in a browser.

## Credits

- **[ghostty-web](https://github.com/crunchloop/ghostty-web)** (`@crunchloop/ghostty-web`) — the official Ghostty terminal engine compiled to WebAssembly, by Crunchloop. This project is a fork of their repository.
- **[BrowserPod](https://leaningtech.com/browserpod/)** (`@leaningtech/browserpod`) — the in-browser Linux sandbox, by Leaning Technologies.
- **[WebLLM](https://github.com/mlc-ai/web-llm)** (`@mlc-ai/web-llm`) — WebGPU model loading and local inference using models hosted on Hugging Face.
- **[Vexi](https://github.com/Elomami1976/vexi)** — provider detection, streaming provider adapters, and agent command-loop ideas adapted for the browser.
- **[ghostty-config](https://github.com/zerebos/ghostty-config)** — a visual Ghostty config editor by zerebos, which the config panel in this project is based on.
- **[tree-sitter-ghostty](https://github.com/bezhermoso/tree-sitter-ghostty)** — the Tree-sitter grammar for Ghostty config syntax, used for config file syntax highlighting.

## Architecture

There are two completely separate systems bridged together:

**Rendering — `@crunchloop/ghostty-web`**
The official Ghostty terminal engine compiled to WebAssembly. It handles VT/escape sequence parsing, the screen buffer, cursor, SGR attributes, and painting to a canvas element. This is the same parser and renderer as the desktop app.

**Compute — BrowserPod (`@leaningtech/browserpod`)**
A full Linux environment running in-browser via WebAssembly. BrowserPod boots a real bash shell inside the browser tab over a pseudo-terminal. It requires a paid API key and makes network calls to Leaning Technologies' infrastructure on startup.

**The bridge — `main.js`**
BrowserPod exposes a custom terminal with `onOutput` (bytes from the PTY) and `readData` (bytes into the PTY). Ghostty exposes `term.write()` and `term.onData()`. `main.js` wires them together and handles newline translation (`\n` → `\r\n`) since the pod PTY emits bare newlines.

Config is parsed from `ghostty-config` (same key=value format as the desktop app) and passed to the Ghostty Terminal constructor at boot. The visual panel previews appearance changes without rebuilding terminals; Apply merges only edited settings into the existing config and reloads when persistence or process creation requires it.

**Ghostty AI — Vexi-style harness + WebLLM**
The `ghostty-ai` terminal command uses a browser-friendly version of Vexi's provider harness. It can stream from OpenAI-compatible APIs, Anthropic's Messages API, OpenRouter, Groq, Gemini, or the local WebGPU models loaded through WebLLM. The shell bridge keeps streamed model output ordered with the BrowserPod prompt. When an agent response includes file artifacts, Ghostty can write them into the BrowserPod filesystem after confirmation. It does not install packages or start servers for you.

## Current limitations

Some of these are fundamental browser constraints, others are features not yet built:

- **Native compositor effects** — background opacity and images are reproduced with browser layers, but the page cannot reproduce operating-system blur or desktop content behind a native window.
- **Terminal resize** — BrowserPod's custom terminal locks its PTY dimensions at creation. Each pane is fitted once before its shell starts; resizing a tab or split keeps that grid fixed and clips or scrolls the canvas instead of desynchronizing the renderer and PTY.
- **Pane shutdown** — closing a pane sends Ctrl-C followed by `exit` and detaches its renderer. BrowserPod exposes process completion but no kill primitive, so shutdown is best-effort if a process ignores terminal input.
- **`shell-prompt`** — sets `PS1` via the `env` option on `pod.run()`; it only applies to the initial shell, not subshells.
- **Multiple windows** — each browser tab boots its own independent BrowserPod instance. There is no way to share a running pod across tabs, so `new_window` cannot be supported.
- **Many keybind actions** — the Ghostty keybind action list includes OS-level and window-management actions that have no browser equivalent. See [docs/keybinds.md](docs/keybinds.md) for the full picture.
- **Search** — in-terminal search is not yet implemented.
- **Jump to prompt keybinds** — OSC 133 prompt integration is present for click-to-move, but ghostty-web does not expose the stored prompt positions needed for scrollback navigation.
- **Local model resources** — model downloads range from roughly 350 MB to 4.7 GB and require WebGPU, a secure context (HTTPS or localhost), sufficient GPU memory, and a browser/device capable of running the selected model. One model and one generation are active across all panes at a time.
- **API agent keys** — provider calls are made directly from the browser with bring-your-own API keys stored in `localStorage`. This is convenient for local use, but the page origin can read the key. Some providers or browsers may also block direct browser API calls.
- **Agent file writes** — Ghostty can detect file artifacts and write confirmed files to `/home/user`. Package installation and server startup are left to the visible terminal.

## Getting started

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. A BrowserPod API key is required in a `.env` file:

```env
VITE_BP_APIKEY=your_key_here
```

## Ghostty AI agents and local models

Configure an API provider from inside any terminal pane:

```bash
ghostty-ai setup openai
ghostty-ai use anthropic
ghostty-ai model claude-sonnet-4-5
ghostty-ai ask Explain this error
ghostty-ai write Create a README for this project
```

The setup prompt stores your key in browser `localStorage`. Provider detection follows Vexi's key-prefix rules for Anthropic, OpenRouter, Groq, Gemini and OpenAI. The same `ghostty-ai ask` command works with local models once a model is loaded.

List and load a model from inside any terminal pane:

```bash
ghostty-ai models
ghostty-ai load 5
ghostty-ai ask Explain why a shell pipeline can deadlock
```

`ghostty-ai ask` is normal chat. Local WebGPU models are chat-only. `ghostty-ai write` is the API-provider file-writing mode; it asks before writing artifacts to BrowserPod and reports each written path. None of these commands install packages or start servers.

The shorter `ghostty-ai <prompt>` form also starts a conversation. Conversation history is kept separately for each pane and is cleared when the provider or loaded local model changes.

```bash
ghostty-ai providers
ghostty-ai status
ghostty-ai clear
ghostty-ai unload
ghostty-ai reset
```

Downloads are cached by WebLLM in browser storage. `Ctrl-C` interrupts generation; model loading itself is not safely interruptible. The available models are:

| Model | Approximate download |
| --- | ---: |
| Hermes 2 Pro Llama 3 8B | 4.7 GB |
| Llama 3.2 3B Instruct | 1.9 GB |
| Llama 3.2 1B Instruct | 700 MB |
| Qwen 2.5 1.5B Instruct | 950 MB |
| Qwen 2.5 0.5B Instruct | 350 MB |
| Gemma 2 2B Instruct | 1.5 GB |

## Configuration

Edit `ghostty-config` directly, or right-click the terminal and choose **Edit Config**. Cmd/Ctrl+Enter applies (reloads the page). The last-applied config is saved in `localStorage` — if the bundled `ghostty-config` file changes, localStorage is cleared automatically on next load.

Supported keys:

```ini
font-size = 14
font-family = monospace
font-family-bold = monospace
font-family-italic = monospace
font-family-bold-italic = monospace
font-thicken = false
font-thicken-strength = 255

cursor-style = block          # block | bar | underline | block_hollow
cursor-style-blink = true
cursor-opacity = 1

bold-color = bright
faint-opacity = 0.5
minimum-contrast = 1

scrollback-limit = 10000000  # bytes; native Ghostty default is 10 MB
smooth-scroll-duration = 200  # ms; 0 disables smooth scroll
preserve-scroll-on-write = false
mouse-scroll-multiplier = precision:1,discrete:3
mouse-hide-while-typing = false
cursor-click-to-move = true
focus-follows-mouse = false

background-opacity = 1
background-image = https://example.com/background.png
background-image-opacity = 1
background-image-position = center
background-image-fit = contain
background-image-repeat = false

window-padding-x = 2
window-padding-y = 2
window-width = 80
window-height = 24
window-theme = auto
window-decoration = auto

clipboard-read = ask
clipboard-write = allow
clipboard-trim-trailing-spaces = true
copy-on-select = true

shell-prompt = user@host ~ %  # sets PS1

theme = TokyoNight             # any name from public/themes/ (516 themes)

# color overrides — applied on top of any named theme
background = #1a1b26
foreground = #c0caf5
cursor-color = #c0caf5
selection-background = #283457
selection-foreground = #c0caf5
palette = 0=#15161e            # indices 0–15
```

Browser-local background files selected in the visual panel are stored in
`localStorage` as data URLs so they remain available after Apply reloads the
page.

### Themes

516 themes from the official Ghostty catalogue are bundled in `public/themes/`. The theme name is the filename exactly:

```ini
theme = Catppuccin Mocha
theme = Dark Modern
theme = Dracula
theme = Solarized Dark
```

Individual color keys in the config are merged on top of the named theme, so you can use a theme as a base and override specific colors.

## Project structure

```
main.js             — Terminal constructor, BrowserPod bridge, tabs, splits, and UI setup
src/config-panel.js — Visual config editor for settings implemented by the playground
src/config-utils.js — Config merging and native scrollback-unit conversion
src/split-tree.js   — Split pane state, navigation, resizing, and zoom
src/split-layout.js — Split pane DOM layout and draggable dividers
src/config-highlight.js — Syntax highlighting for the config editor
src/ghost-animation.js  — Pre-generated ghost animation frames
src/local-models.js — WebLLM model catalogue, loading, and streamed inference
ghostty-config      — Default config (key=value, same format as ~/.config/ghostty/config)
index.html          — UI shell: terminal container, tab bar, config dialog, inspector, context menu
docs/
  keybinds.md       — Full keybind action reference: implemented, planned, and unsupported
public/
  themes/           — 516 Ghostty theme files (plain key=value, fetched at boot if theme= is set)
  tree-sitter-ghostty.wasm  — Compiled Tree-sitter grammar for Ghostty config syntax
  tree-sitter.wasm          — Tree-sitter runtime
  coi-serviceworker.js      — Injects COOP/COEP headers for hosts that cannot set them
vite.config.js      — Sets COOP/COEP headers for dev server; targets esnext for top-level await
```

## Build and deploy

```bash
npm run build
```

Output goes to `dist/`. The host must send these headers on every response:

```http
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Opener-Policy: same-origin
```

These are required for `SharedArrayBuffer`, which BrowserPod uses for its worker communication. If the host cannot set custom headers (e.g. GitHub Pages), the bundled `coi-serviceworker.js` adds them at runtime via a service worker — it is already wired into `index.html`.

## Right-click menu

- **Copy / Paste**
- **About** — shows the ghost animation and project info
- **Open Inspector** — live view of terminal grid, cursor position, VT modes, colour palette, I/O stream log
- **Edit Config** — raw Ghostty config editor
- **Config Panel** — visual editor limited to settings implemented by the playground
- **Set Title** — changes the tab title
- **Reset** — reloads the page and reboots the pod
