# Ghostty Web

A browser-based terminal using the Ghostty rendering engine and a BrowserPod Linux sandbox. It looks and behaves like a desktop Ghostty terminal, within the constraints of what a browser can do.

## Architecture

There are two completely separate systems bridged together:

**Rendering — `@crunchloop/ghostty-web`**
The official Ghostty terminal engine compiled to WebAssembly. It handles VT/escape sequence parsing, the screen buffer, cursor, SGR attributes, and painting to a canvas element. This is the same parser and renderer as the desktop app.

**Compute — BrowserPod (`@leaningtech/browserpod`)**
A full Linux environment running in-browser via WebAssembly. BrowserPod boots a real bash shell inside the browser tab over a pseudo-terminal. It requires a paid API key and makes network calls to Leaning Technologies' infrastructure on startup.

**The bridge — `main.js`**
BrowserPod exposes a custom terminal with `onOutput` (bytes from the PTY) and `readData` (bytes into the PTY). Ghostty exposes `term.write()` and `term.onData()`. `main.js` wires them together and handles newline translation (`\n` → `\r\n`) since the pod PTY emits bare newlines.

Config is parsed from `ghostty-config` (same key=value format as the desktop app) and passed to the Ghostty Terminal constructor at boot. Changes require a page reload — applying theme or font changes live via the renderer API causes a blank canvas, so config is saved to `localStorage` and the page reloads.

## Limitations

These are real, not fixable without changes to the underlying libraries:

- **`bold-is-bright`** — not exposed in the `@crunchloop/ghostty-web` API
- **`minimum-contrast`** — not exposed
- **`window-opacity` / transparency effects** — `allow-transparency = true` is wired up but actual background opacity depends on CSS; there is no compositor
- **`working-directory`** — BrowserPod always starts in the pod's home directory; there is no API to set an initial working directory
- **Terminal resize** — BrowserPod's custom terminal locks its PTY dimensions at creation; there is no resize method, so the terminal is fixed at whatever size it fits to on boot
- **`shell-prompt`** sets `PS1` via the `env` option on `pod.run()` — it only applies to the initial shell, not subshells

## Getting started

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. You need a BrowserPod API key in a `.env` file:

```env
VITE_BP_APIKEY=your_key_here
```

## Configuration

Edit `ghostty-config` directly, or right-click the terminal and choose **Edit Config**. Cmd/Ctrl+Enter applies (reloads the page). The last-applied config is saved in `localStorage` — if the bundled `ghostty-config` file changes, localStorage is cleared automatically on next load.

Supported keys:

```ini
font-size = 14
font-family = monospace

cursor-style = block          # block | bar | underline
cursor-style-blink = true

scrollback-limit = 10000
smooth-scroll-duration = 200  # ms; 0 disables smooth scroll
preserve-scroll-on-write = false
mouse-scroll-multiplier = 3
allow-transparency = false

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
main.js           — Terminal constructor, BrowserPod bridge, config parsing, UI setup
ghostty-config    — Default config (key=value, same format as ~/.config/ghostty/config)
index.html        — UI shell: terminal container, config dialog, inspector panel, context menu
public/
  themes/         — 516 Ghostty theme files (plain key=value, fetched at boot if theme= is set)
  coi-serviceworker.js  — Injects COOP/COEP headers via service worker for hosts that can't set them
vite.config.js    — Sets COOP/COEP headers for dev server; targets esnext for top-level await
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

These are required for `SharedArrayBuffer`, which BrowserPod uses for its worker communication. If the host can't set custom headers (e.g. GitHub Pages), the bundled `coi-serviceworker.js` adds them at runtime via a service worker — it's already wired into `index.html`.

## Right-click menu

- **Copy / Paste**
- **Open Inspector** — live view of terminal grid, cursor position, VT modes, colour palette, I/O stream log
- **Edit Config** — in-page config editor; Cmd/Ctrl+Enter to apply, Escape to cancel
- **Set Title** — changes the tab title and header
- **Reset** — reloads the page and reboots the pod
