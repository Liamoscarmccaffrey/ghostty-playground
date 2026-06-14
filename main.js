import { init, Terminal, FitAddon } from '@crunchloop/ghostty-web';
import { BrowserPod } from '@leaningtech/browserpod';
import { GHOST_FRAMES, FRAME_WIDTH, FRAME_HEIGHT } from './src/ghost-animation.js';
import { setupGame } from './src/extras.js';
import bundledConfigText from './ghostty-config?raw';
import { initHighlighter, highlight } from './src/config-highlight.js';
import { createConfigPanel } from './src/config-panel.js';
// Reset saved config if the bundled config has changed (e.g. after an update).
if (localStorage.getItem('ghostty-config-hash') !== btoa(bundledConfigText.slice(0, 64))) {
  localStorage.removeItem('ghostty-config');
  localStorage.setItem('ghostty-config-hash', btoa(bundledConfigText.slice(0, 64)));
}
const ghosttyConfigText = localStorage.getItem('ghostty-config') ?? bundledConfigText;

// Parse a Ghostty config file text into Terminal options.
// Supports the same key=value format as ~/.config/ghostty/config.
// Unknown keys are silently skipped so future config entries don't break anything.
// Parse keybind entries from config text.
// Returns array of { mods: Set<string>, key: string, action: string, rawAction: string }
function parseKeybinds(text) {
  const bindings = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const configKey = line.slice(0, eq).trim();
    if (configKey !== 'keybind') continue;
    const val = line.slice(eq + 1).trim();
    // val format: [modifier+...]key=action
    const actionEq = val.indexOf('=');
    if (actionEq === -1) continue;
    const combo = val.slice(0, actionEq);
    const action = val.slice(actionEq + 1);
    const parts = combo.split('+');
    const key = parts[parts.length - 1].toLowerCase();
    const mods = new Set(parts.slice(0, -1).map(m => m.toLowerCase()));
    bindings.push({ mods, key, action, raw: val });
  }
  return bindings;
}

// Map ghostty key names to event.key values
const GHOSTTY_KEY_MAP = {
  'enter': 'Enter', 'return': 'Enter',
  'escape': 'Escape', 'esc': 'Escape',
  'backspace': 'Backspace',
  'delete': 'Delete', 'del': 'Delete',
  'tab': 'Tab',
  'space': ' ',
  'arrow_up': 'ArrowUp', 'up': 'ArrowUp',
  'arrow_down': 'ArrowDown', 'down': 'ArrowDown',
  'arrow_left': 'ArrowLeft', 'left': 'ArrowLeft',
  'arrow_right': 'ArrowRight', 'right': 'ArrowRight',
  'home': 'Home',
  'end': 'End',
  'page_up': 'PageUp',
  'page_down': 'PageDown',
  'insert': 'Insert',
  'f1': 'F1', 'f2': 'F2', 'f3': 'F3', 'f4': 'F4',
  'f5': 'F5', 'f6': 'F6', 'f7': 'F7', 'f8': 'F8',
  'f9': 'F9', 'f10': 'F10', 'f11': 'F11', 'f12': 'F12',
  'minus': '-', 'equal': '=', 'plus': '+',
  'comma': ',', 'period': '.', 'slash': '/',
  'semicolon': ';', 'apostrophe': "'", 'grave': '`',
  'bracket_left': '[', 'bracket_right': ']', 'backslash': '\\',
  'zero': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4',
  'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9',
};

function ghosttyKeyToEventKey(k) {
  // Strip physical: prefix — we treat it as the same key
  const stripped = k.replace(/^physical:/, '');
  return GHOSTTY_KEY_MAP[stripped] ?? (stripped.length === 1 ? stripped : null);
}

// Translate kitty keyboard protocol CSI u sequences to traditional escape sequences.
// Bash/readline inside BrowserPod doesn't understand kitty protocol and prints raw bytes.
// Format: ESC [ <codepoint> ; <modifier> u  where modifier is 1+ctrl*4+alt*2+shift*1
function translateKittySequences(data) {
  // Fast path: no ESC or no 'u' terminator
  if (!data.includes('\x1b')) return data;
  return data.replace(/\x1b\[(\d+)(?:;(\d+))?u/g, (match, cpStr, modStr) => {
    const cp = parseInt(cpStr, 10);
    const mod = modStr ? parseInt(modStr, 10) : 1;
    const mods = mod - 1; // 0=none,1=shift,2=alt,3=shift+alt,4=ctrl,5=ctrl+shift,6=ctrl+alt,7=ctrl+alt+shift
    const ctrl = (mods & 4) !== 0;
    const alt  = (mods & 2) !== 0;
    const shift = (mods & 1) !== 0;
    let result = null;
    if (ctrl && !alt) {
      // Ctrl+letter: map to control character (standard VT encoding)
      if (cp >= 65 && cp <= 90) result = String.fromCharCode(cp & 0x1f);      // A-Z
      else if (cp >= 97 && cp <= 122) result = String.fromCharCode(cp & 0x1f); // a-z
    }
    if (result === null) return ''; // Drop unrecognised kitty sequences — bash prints them as raw text
    return alt ? '\x1b' + result : result;
  });
}

function eventMatchesBinding(e, binding) {
  const eKey = e.key;
  const bindKey = ghosttyKeyToEventKey(binding.key);
  if (!bindKey) return false;
  if (eKey.toLowerCase() !== bindKey.toLowerCase()) return false;
  const wantCtrl = binding.mods.has('ctrl');
  const wantAlt = binding.mods.has('alt');
  const wantShift = binding.mods.has('shift');
  const wantSuper = binding.mods.has('super');
  return e.ctrlKey === wantCtrl && e.altKey === wantAlt &&
    e.shiftKey === wantShift && e.metaKey === wantSuper;
}

function executeKeybindAction(action, term, refs, tabs) {
  if (action.startsWith('text:')) {
    const raw = action.slice(5)
      .replace(/\\x([0-9a-fA-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
      .replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t')
      .replace(/\\e/g, '\x1b');
    refs.podTerm?.readData(raw);
    return true;
  }
  if (action.startsWith('esc:')) {
    const seq = '\x1b' + action.slice(4);
    refs.podTerm?.readData(seq);
    return true;
  }
  if (action.startsWith('adjust_selection:')) {
    const dir = action.slice('adjust_selection:'.length);
    const dirMap = {
      up: () => term.scrollLines(-1),
      down: () => term.scrollLines(1),
      left: () => {},
      right: () => {},
      page_up: () => term.scrollPages(-1),
      page_down: () => term.scrollPages(1),
      home: () => term.scrollToTop(),
      end: () => term.scrollToBottom(),
    };
    dirMap[dir]?.();
    return true;
  }
  switch (action) {
    case 'copy_to_clipboard':
      if (term.hasSelection()) {
        navigator.clipboard.writeText(term.getSelection()).catch(() => {});
      }
      return true;
    case 'paste_from_clipboard':
      navigator.clipboard.readText().then(t => {
        if (t) term.paste(t);
        term.focus();
      }).catch(() => {});
      return true;
    case 'paste_from_selection': {
      const sel = window.getSelection()?.toString();
      if (sel) term.paste(sel);
      return true;
    }
    case 'select_all':
      term.selectAll();
      return true;
    case 'scroll_to_top':
      term.scrollToTop();
      return true;
    case 'scroll_to_bottom':
      term.scrollToBottom();
      return true;
    case 'scroll_page_up':
      term.scrollPages(-1);
      return true;
    case 'scroll_page_down':
      term.scrollPages(1);
      return true;
    case 'clear_screen':
      term.clear();
      return true;
    case 'reset_font_size':
      term.options.fontSize = 14;
      return true;
    case 'toggle_fullscreen':
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
      return true;
    case 'inspector:toggle':
      refs.toggleInspector?.();
      return true;
    case 'open_config':
      refs.openConfigDialog?.();
      return true;
    case 'reload_config':
      window.location.reload();
      return true;
    case 'new_tab':
      tabs?.newTab();
      return true;
    case 'next_tab':
      tabs?.nextTab();
      return true;
    case 'previous_tab':
      tabs?.previousTab();
      return true;
    case 'last_tab':
      tabs?.lastTab();
      return true;
    case 'close_tab':
      tabs?.closeTab();
      return true;
    case 'copy_to_clipboard:plain':
      if (term.hasSelection()) {
        navigator.clipboard.writeText(term.getSelection()).catch(() => {});
      }
      return true;
    case 'copy_title_to_clipboard': {
      const activeTab = tabs?.getActive?.();
      const label = activeTab?.label ?? document.title;
      navigator.clipboard.writeText(label).catch(() => {});
      return true;
    }
    case 'scroll_to_selection':
      term.scrollToBottom();
      return true;
    case 'reset':
      term.reset();
      return true;
    case 'ignore':
      return true;
    case 'close_surface':
    case 'close_window':
    case 'close_all_windows':
    case 'quit':
      window.close();
      return true;
    case 'toggle_maximize':
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
      return true;
    case 'inspector:show':
    case 'inspector:hide':
      refs.toggleInspector?.();
      return true;
    case 'toggle_background_opacity':
      refs.toggleBgOpacity?.();
      return true;
    case 'toggle_readonly':
      refs.readonlyMode = !refs.readonlyMode;
      return true;
    case 'write_selection_file:copy':
      if (term.hasSelection()) {
        navigator.clipboard.writeText(term.getSelection()).catch(() => {});
      }
      return true;
    case 'show_on_screen_keyboard': {
      let hiddenInput = document.getElementById('_soft-keyboard-trigger');
      if (!hiddenInput) {
        hiddenInput = document.createElement('input');
        hiddenInput.id = '_soft-keyboard-trigger';
        hiddenInput.style.cssText = 'position:fixed;opacity:0;width:1px;height:1px;top:0;left:0;';
        document.body.appendChild(hiddenInput);
      }
      hiddenInput.focus();
      return true;
    }
    default:
      if (action.startsWith('goto_tab:')) {
        const n = parseInt(action.split(':')[1], 10);
        if (!isNaN(n)) tabs?.gotoTab(n);
        return true;
      }
      if (action.startsWith('increase_font_size:')) {
        const n = parseFloat(action.split(':')[1]) || 1;
        term.options.fontSize = (term.options.fontSize ?? 14) + n;
        return true;
      }
      if (action.startsWith('decrease_font_size:')) {
        const n = parseFloat(action.split(':')[1]) || 1;
        term.options.fontSize = Math.max(4, (term.options.fontSize ?? 14) - n);
        return true;
      }
      if (action.startsWith('scroll_lines:')) {
        const n = parseInt(action.split(':')[1], 10) || 1;
        term.scrollLines(n);
        return true;
      }
      if (action.startsWith('scroll_page_lines:')) {
        const n = parseInt(action.split(':')[1], 10) || 1;
        term.scrollLines(n);
        return true;
      }
      if (action.startsWith('scroll_page_fractional:')) {
        const f = parseFloat(action.split(':')[1]) || 0.5;
        term.scrollLines(Math.round(term.rows * f));
        return true;
      }
      if (action.startsWith('set_font_size:')) {
        const n = parseFloat(action.split(':')[1]);
        if (!isNaN(n)) term.options.fontSize = Math.max(4, n);
        return true;
      }
      if (action.startsWith('csi:')) {
        refs.podTerm?.readData('\x1b[' + action.slice(4));
        return true;
      }
      return false;
  }
}

function setupKeybinds(termEl, getTerm, refs, configText, tabs) {
  const bindings = parseKeybinds(configText);
  if (!bindings.length) return;

  termEl.addEventListener('keydown', (e) => {
    for (const binding of bindings) {
      if (eventMatchesBinding(e, binding)) {
        const handled = executeKeybindAction(binding.action, getTerm(), refs, tabs);
        if (handled) {
          e.preventDefault();
          e.stopPropagation();
        }
        return;
      }
    }
  }, { capture: true });
}

function parseGhosttyConfig(text) {
  const theme = {};
  const opts = {};

  const COLOR_NAMES = {
    black: 'black', red: 'red', green: 'green', yellow: 'yellow',
    blue: 'blue', magenta: 'magenta', cyan: 'cyan', white: 'white',
    'bright-black': 'brightBlack', 'bright-red': 'brightRed',
    'bright-green': 'brightGreen', 'bright-yellow': 'brightYellow',
    'bright-blue': 'brightBlue', 'bright-magenta': 'brightMagenta',
    'bright-cyan': 'brightCyan', 'bright-white': 'brightWhite',
  };

  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const raw_val = line.slice(eq + 1).trim();
    const val = raw_val.replace(/^["']|["']$/g, '');

    switch (key) {
      case 'font-size':
        opts.fontSize = parseFloat(val);
        break;
      case 'font-family':
        opts.fontFamily = val;
        break;
      case 'cursor-style':
        if (val === 'block' || val === 'bar' || val === 'underline')
          opts.cursorStyle = val;
        break;
      case 'cursor-style-blink':
        opts.cursorBlink = val === 'true';
        break;
      case 'scrollback-limit':
        opts.scrollback = parseInt(val, 10);
        break;
      case 'shell-prompt':
        opts.shellPrompt = val;
        break;
      case 'theme':
        opts.themeName = val;
        break;
      case 'smooth-scroll-duration':
        opts.smoothScrollDuration = parseInt(val, 10);
        break;
      case 'preserve-scroll-on-write':
        opts.preserveScrollOnWrite = val === 'true';
        break;
      case 'allow-transparency':
        opts.allowTransparency = val === 'true';
        break;
      case 'mouse-scroll-multiplier':
        opts.mouseScrollMultiplier = parseFloat(val);
        break;
      case 'background':
        theme.background = val.startsWith('#') ? val : `#${val}`;
        break;
      case 'foreground':
        theme.foreground = val.startsWith('#') ? val : `#${val}`;
        break;
      case 'cursor-color':
        theme.cursor = val.startsWith('#') ? val : `#${val}`;
        break;
      case 'selection-background':
        theme.selectionBackground = val.startsWith('#') ? val : `#${val}`;
        break;
      case 'selection-foreground':
        theme.selectionForeground = val.startsWith('#') ? val : `#${val}`;
        break;
      default:
        // palette entries: e.g. palette = 0=#1a1b26
        if (key === 'palette') {
          const m = val.match(/^(\d+)=(.+)$/);
          if (m) {
            const idx = parseInt(m[1], 10);
            const colorNames = Object.values(COLOR_NAMES);
            if (idx < colorNames.length) {
              const color = m[2].startsWith('#') ? m[2] : `#${m[2]}`;
              theme[colorNames[idx]] = color;
            }
          }
        } else if (COLOR_NAMES[key]) {
          theme[COLOR_NAMES[key]] = val.startsWith('#') ? val : `#${val}`;
        }
    }
  }

  if (Object.keys(theme).length > 0) opts.theme = theme;
  return opts;
}

function cssColorToInt(hex) {
  if (!hex) return 0;
  const c = hex.replace('#', '');
  return parseInt(c.length === 3
    ? c[0]+c[0]+c[1]+c[1]+c[2]+c[2]
    : c, 16);
}

function applyTheme(term, theme) {
  if (!term.renderer || !term.wasmTerm) return;
  term.renderer.setTheme(theme);
  const paletteKeys = [
    'black','red','green','yellow','blue','magenta','cyan','white',
    'brightBlack','brightRed','brightGreen','brightYellow',
    'brightBlue','brightMagenta','brightCyan','brightWhite',
  ];
  term.wasmTerm.setColors({
    fgColor: cssColorToInt(theme.foreground),
    bgColor: cssColorToInt(theme.background),
    cursorColor: cssColorToInt(theme.cursor),
    palette: paletteKeys.map(k => cssColorToInt(theme[k])),
  });
  term.requestRender();
}

function loadGhosttyConfig() {
  try {
    return parseGhosttyConfig(ghosttyConfigText);
  } catch {
    return {};
  }
}

async function loadTheme(name) {
  try {
    const res = await fetch(`/themes/${encodeURIComponent(name)}`);
    if (!res.ok) return null;
    const text = await res.text();
    return parseGhosttyConfig(text).theme ?? null;
  } catch {
    return null;
  }
}

// The pod's PTY emits bare \n on a new line; ghostty needs \r\n to also
// return the cursor to column 0. Without this, each line starts under where
// the previous one ended, so the prompt walks rightward across the screen.
// Copies into a fresh array, which also detaches from the SharedArrayBuffer
// that backs the pod's output.
function toCrlf(buffer) {
  const view = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const out = [];
  for (let i = 0; i < view.length; i++) {
    if (view[i] === 0x0a && (i === 0 || view[i - 1] !== 0x0d)) {
      out.push(0x0d);
    }
    out.push(view[i]);
  }
  return new Uint8Array(out);
}

let hlQuery = null;
initHighlighter().then(q => {
  hlQuery = q;
}).catch(e => console.error('[highlight] init failed:', e));

function updateHighlight(text) {
  const overlay = document.getElementById('config-highlight');
  if (!overlay) return;
  const html = highlight(text, hlQuery);
  overlay.innerHTML = html;
}

function syncScroll(editor) {
  const overlay = document.getElementById('config-highlight');
  if (overlay) overlay.scrollTop = editor.scrollTop;
}

function setupConfigDialog(term, configOpts, cols, rows) {
  const dialog = document.getElementById('config-dialog');
  const editor = document.getElementById('config-editor');
  // Track the live text separately so the editor always shows current state.
  let liveConfigText = ghosttyConfigText;

  function openConfigDialog() {
    editor.value = liveConfigText;
    updateHighlight(liveConfigText);
    dialog.classList.add('visible');
    editor.focus();
  }

  function applyConfig() {
    localStorage.setItem('ghostty-config', editor.value);
    window.location.reload();
  }

  function cancelConfig() {
    dialog.classList.remove('visible');
    term.focus();
  }

  document.getElementById('config-apply').addEventListener('click', applyConfig);
  document.getElementById('config-cancel').addEventListener('click', cancelConfig);
  editor.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') cancelConfig();
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) applyConfig();
  });
  editor.addEventListener('input', () => updateHighlight(editor.value));
  editor.addEventListener('scroll', () => syncScroll(editor));
  let mousedownOnBackdrop = false;
  dialog.addEventListener('mousedown', (e) => {
    mousedownOnBackdrop = e.target === dialog;
  });
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog && mousedownOnBackdrop) cancelConfig();
  });

  return { openConfigDialog };
}

function setupContextMenu(term, configOpts, cols, rows, refs, openConfigDialog, openAbout) {
  const menu = document.getElementById('context-menu');
  const termEl = document.getElementById('terminals');
  let inspectorVisible = false;

  function hideMenu() {
    menu.classList.remove('visible');
  }

  function showMenu(e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    document.getElementById('menu-inspector-label').textContent =
      inspectorVisible ? 'Close Inspector' : 'Open Inspector';
    // Position at click point first, then clamp after making visible so offsetWidth is real.
    menu.style.left = `${e.clientX}px`;
    menu.style.top = `${e.clientY}px`;
    menu.classList.add('visible');
    const x = Math.min(e.clientX, window.innerWidth - menu.offsetWidth - 8);
    const y = Math.min(e.clientY, window.innerHeight - menu.offsetHeight - 8);
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    return false;
  }

  // term.open() creates the canvas synchronously and appends it to termEl.
  // Setting oncontextmenu as a property on both the container and canvas
  // is the only reliable way to suppress the browser's native canvas menu.
  termEl.oncontextmenu = showMenu;
  const canvas = termEl.querySelector('canvas');
  if (canvas) canvas.oncontextmenu = showMenu;

  document.addEventListener('click', hideMenu);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideMenu(); });

  document.getElementById('menu-copy').addEventListener('click', () => {
    hideMenu();
    const sel = window.getSelection()?.toString();
    if (sel) navigator.clipboard.writeText(sel).catch(() => {});
  });

  document.getElementById('menu-paste').addEventListener('click', () => {
    hideMenu();
    navigator.clipboard.readText().then((text) => {
      if (text) term.paste(text);
      term.focus();
    }).catch(() => {});
  });

  document.getElementById('menu-reset').addEventListener('click', () => {
    hideMenu();
    window.location.reload();
  });

  function closeInspector() {
    inspectorVisible = false;
    document.getElementById('inspector').classList.remove('visible');
    document.getElementById('menu-inspector-label').textContent = 'Open Inspector';
    stopInspectorUpdates();
    term.focus();
  }

  document.getElementById('menu-inspector').addEventListener('click', () => {
    hideMenu();
    toggleInspector();
  });

  document.getElementById('insp-close').addEventListener('click', closeInspector);

  document.getElementById('menu-config').addEventListener('click', () => {
    hideMenu();
    openConfigDialog();
  });

  // Rebuild all terminal instances with allowTransparency when a background image is set.
  // Terminal.allowTransparency can only be set at construction time, so we dispose and recreate.
  // outputRef indirection means the existing podTerm.onOutput closure keeps working.
  function rebuildTerminals(bgDataUrl) {
    refs.toggleBgOpacity = () => {
      const overlay = document.getElementById('bg-image-overlay');
      if (!overlay) return;
      refs.bgOpaque = !refs.bgOpaque;
      overlay.style.opacity = refs.bgOpaque ? '0' : '';
    };
    const transparent = !!bgDataUrl;
    const themeOverride = transparent
      ? { ...(configOpts.theme ?? {}), background: 'rgba(0,0,0,0)' }
      : (configOpts.theme ?? undefined);

    for (const tab of tabList) {
      const { termEl, podTerm, outputRef } = tab;

      tab.term.dispose();

      const term = new Terminal({
        fontSize: configOpts.fontSize ?? 14,
        cursorBlink: configOpts.cursorBlink ?? true,
        allowTransparency: transparent,
        ...(configOpts.cursorStyle ? { cursorStyle: configOpts.cursorStyle } : {}),
        ...(configOpts.fontFamily ? { fontFamily: configOpts.fontFamily } : {}),
        ...(configOpts.scrollback != null ? { scrollback: configOpts.scrollback } : {}),
        ...(themeOverride ? { theme: themeOverride } : {}),
      });

      const fit = new FitAddon();
      term.loadAddon(fit);
      term.open(termEl);
      fit.fit();

      // Redirect outputRef so the existing podTerm.onOutput closure writes to the new terminal
      outputRef.write = (buf) => term.write(toCrlf(buf));
      refs.wrapOutputRef?.(outputRef);

      if (podTerm) {
        term.onData((data) => { if (!refs.readonlyMode) podTerm.readData(translateKittySequences(data)); });
      }

      tab.term = term;
      tab.fit = fit;

      if (tab.id === activeTabId) {
        refs.podTerm = podTerm;
        term.focus();
      }
    }
  }

  // Config panel
  let configPanelEl = null;
  document.getElementById('menu-config-panel').addEventListener('click', (e) => {
    e.stopPropagation();
    hideMenu();
    if (!configPanelEl) {
      configPanelEl = createConfigPanel(
        ghosttyConfigText,
        (panelText) => {
          const panelLines = panelText.split('\n').filter(l => l.trim());
          const panelKeys = new Set(panelLines.map(l => l.split('=')[0].trim()));
          const baseLines = ghosttyConfigText.split('\n').filter(l => {
            const t = l.trim();
            if (!t || t.startsWith('#')) return true;
            const k = t.split('=')[0].trim();
            return !panelKeys.has(k);
          });
          const merged = [...baseLines, ...panelLines].join('\n');
          localStorage.setItem('ghostty-config', merged);
          window.location.reload();
        },
        (dataUrl) => rebuildTerminals(dataUrl),
      );
      document.body.appendChild(configPanelEl);
    }
    configPanelEl.classList.add('visible');
  });

  document.getElementById('menu-about').addEventListener('click', () => {
    hideMenu();
    openAbout();
  });

  document.getElementById('menu-title').addEventListener('click', () => {
    hideMenu();
    openTitleDialog();
  });

  function toggleInspector() {
    inspectorVisible = !inspectorVisible;
    const inspector = document.getElementById('inspector');
    inspector.classList.toggle('visible', inspectorVisible);
    document.getElementById('menu-inspector-label').textContent =
      inspectorVisible ? 'Close Inspector' : 'Open Inspector';
    if (inspectorVisible) startInspectorUpdates(term, configOpts);
    else stopInspectorUpdates();
    term.focus();
  }

  return { toggleInspector };
}

let inspectorInterval = null;
let ioPaused = false;
let ioWriteHooked = false;

function startInspectorUpdates(term, configOpts) {
  // Clear any stale palette so it rebuilds with current theme.
  const palette = document.getElementById('insp-palette');
  if (palette) palette.innerHTML = '';
  updateInspector(term, configOpts);
  inspectorInterval = setInterval(() => updateInspector(term, configOpts), 500);

  // Wire up IO log controls (idempotent — only attach once).
  if (!ioWriteHooked) {
    ioWriteHooked = true;
    const origWrite = term.write.bind(term);
    term.write = function(data, callback) {
      if (!ioPaused) {
        const log = document.getElementById('insp-io-log');
        if (log) {
          const inspector = document.getElementById('inspector');
          if (inspector && inspector.classList.contains('visible')) {
            const text = typeof data === 'string' ? data : new TextDecoder().decode(data);
            const escaped = text
              .replace(/\x1b/g, '<span style="color:#bb9af7">ESC</span>')
              .replace(/[\x00-\x1f\x7f]/g, c => `<span style="color:#e0af68">^${String.fromCharCode(c.charCodeAt(0) + 64)}</span>`);
            const entry = document.createElement('div');
            entry.style.borderBottom = '1px solid #1e1f2e';
            entry.style.padding = '1px 0';
            entry.style.wordBreak = 'break-all';
            entry.innerHTML = escaped;
            log.appendChild(entry);
            // Keep last 200 entries.
            while (log.children.length > 200) log.removeChild(log.firstChild);
            log.scrollTop = log.scrollHeight;
          }
        }
      }
      return origWrite(data, callback);
    };

    document.getElementById('insp-io-pause').addEventListener('click', () => {
      ioPaused = !ioPaused;
      document.getElementById('insp-io-pause').textContent = ioPaused ? 'Resume' : 'Pause';
    });
    document.getElementById('insp-io-clear').addEventListener('click', () => {
      const log = document.getElementById('insp-io-log');
      if (log) log.innerHTML = '';
    });
  }
}

function stopInspectorUpdates() {
  clearInterval(inspectorInterval);
  inspectorInterval = null;
}

function flag(val) {
  return val ? 'on' : 'off';
}

function updateInspector(term, configOpts) {
  const buf = term.buffer.active;
  const wt = term.wasmTerm;
  const cursor = wt ? wt.getCursor() : null;

  // Terminal section
  document.getElementById('insp-grid').textContent = `${term.cols} \xd7 ${term.rows}`;
  document.getElementById('insp-buffer-type').textContent = buf.type;
  document.getElementById('insp-buffer-lines').textContent = buf.length;
  document.getElementById('insp-viewport-y').textContent = buf.viewportY ?? '—';
  document.getElementById('insp-scroll-region').textContent =
    `0–${term.rows - 1} (${term.cols} wide)`;

  // Cursor section
  if (cursor) {
    document.getElementById('insp-cursor').textContent = `col ${cursor.x}, row ${cursor.y}`;
    document.getElementById('insp-cursor-style').textContent = cursor.style ?? '—';
    document.getElementById('insp-cursor-visible').textContent = cursor.visible ? 'yes' : 'no';
  }
  document.getElementById('insp-cursor-blink').textContent =
    wt ? flag(wt.getMode(12, true)) : '—';

  // Mouse section
  document.getElementById('insp-mouse-tracking').textContent =
    wt ? flag(term.hasMouseTracking()) : '—';
  document.getElementById('insp-mouse-sgr').textContent =
    wt ? flag(wt.getMode(1006, false)) : '—';
  document.getElementById('insp-bracketed-paste').textContent =
    wt ? flag(term.hasBracketedPaste()) : '—';
  document.getElementById('insp-focus-events').textContent =
    wt ? flag(term.hasFocusEvents()) : '—';

  // Modes section
  document.getElementById('insp-mode-decawm').textContent =
    wt ? flag(wt.getMode(7, true)) : '—';
  document.getElementById('insp-mode-irm').textContent =
    wt ? flag(wt.getMode(4, false)) : '—';
  document.getElementById('insp-mode-lnm').textContent =
    wt ? flag(wt.getMode(20, false)) : '—';
  document.getElementById('insp-mode-decom').textContent =
    wt ? flag(wt.getMode(6, true)) : '—';
  document.getElementById('insp-mode-altscreen').textContent =
    buf.type === 'alternate' ? 'yes' : 'no';

  // Colors section — prefer the theme the terminal was constructed with; fall back to configOpts.
  const theme = term.options?.theme ?? configOpts.theme ?? {};
  function setColor(swatchId, hexId, color) {
    const s = document.getElementById(swatchId);
    const h = document.getElementById(hexId);
    if (s) s.style.background = color ?? 'transparent';
    if (h) h.textContent = color ?? '—';
  }
  setColor('insp-bg-swatch', 'insp-bg', theme.background);
  setColor('insp-fg-swatch', 'insp-fg', theme.foreground);
  setColor('insp-cursor-color-swatch', 'insp-cursor-color', theme.cursor);
  setColor('insp-sel-bg-swatch', 'insp-sel-bg', theme.selectionBackground);

  // Palette — build once when colors are available; clear and rebuild if stale
  const palette = document.getElementById('insp-palette');
  const paletteKeys = [
    'black','red','green','yellow','blue','magenta','cyan','white',
    'brightBlack','brightRed','brightGreen','brightYellow',
    'brightBlue','brightMagenta','brightCyan','brightWhite',
  ];
  const hasColors = paletteKeys.some(k => theme[k]);
  const firstCell = palette.firstElementChild;
  const isStale = firstCell && !firstCell.style.background;
  if (hasColors && (palette.children.length === 0 || isStale)) {
    palette.innerHTML = '';
    paletteKeys.forEach((key, i) => {
      const color = theme[key];
      const cell = document.createElement('div');
      cell.className = 'palette-cell';
      cell.style.background = color ?? 'transparent';
      cell.title = color ? `${i} (${key}): ${color}` : `${i} (${key})`;
      palette.appendChild(cell);
    });
  }
}

function setupAboutModal(configOpts) {
  const modal = document.getElementById('about-modal');
  const termEl = document.getElementById('about-anim-term');
  let term = null;
  let fit = null;
  let frameTimer = null;
  let frameIdx = 0;

  function renderFrame() {
    if (!term) return;
    const frame = GHOST_FRAMES[frameIdx % GHOST_FRAMES.length];
    // Move cursor to top-left, then write all lines
    let out = '\x1b[H';
    for (const line of frame) {
      out += line + '\r\n';
    }
    term.write(out);
    frameIdx++;
  }

  function openAbout() {
    modal.classList.add('visible');
    if (!term) {
      term = new Terminal({
        fontSize: Math.min(configOpts.fontSize ?? 14, 9),
        cursorBlink: false,
        disableStdin: true,
        convertEol: false,
        cols: FRAME_WIDTH,
        rows: FRAME_HEIGHT,
        ...(configOpts.theme ? { theme: configOpts.theme } : {}),
      });
      fit = new FitAddon();
      term.loadAddon(fit);
      term.open(termEl);
    }
    frameIdx = 0;
    renderFrame();
    frameTimer = setInterval(renderFrame, 30);
  }

  function closeAbout() {
    clearInterval(frameTimer);
    frameTimer = null;
    modal.classList.remove('visible');
  }

  document.getElementById('about-close-btn').addEventListener('click', closeAbout);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeAbout(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.classList.contains('visible')) closeAbout(); });

  return { openAbout };
}

function openTitleDialog() {
  const dialog = document.getElementById('title-dialog');
  const input = document.getElementById('title-input');
  input.value = document.getElementById('header-title').textContent;
  dialog.classList.add('visible');
  input.select();
  input.focus();
}

function setupTitleDialog() {
  const dialog = document.getElementById('title-dialog');
  const input = document.getElementById('title-input');

  function confirm() {
    const val = input.value.trim();
    if (val) {
      document.getElementById('header-title').textContent = val;
      document.title = val;
    }
    dialog.classList.remove('visible');
  }

  function cancel() {
    dialog.classList.remove('visible');
  }

  document.getElementById('title-confirm').addEventListener('click', confirm);
  document.getElementById('title-cancel').addEventListener('click', cancel);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirm();
    if (e.key === 'Escape') cancel();
  });
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) cancel();
  });
}

async function main() {
  await init();

  const configOpts = loadGhosttyConfig();

  if (configOpts.themeName) {
    const namedTheme = await loadTheme(configOpts.themeName);
    if (namedTheme) {
      configOpts.theme = Object.assign({}, namedTheme, configOpts.theme ?? {});
    }
  }

  setupTitleDialog();

  // Boot pod once; all tabs share it.
  const terminalsEl = document.getElementById('terminals');

  // Measure cols/rows using a temporary off-screen terminal before the pod boots.
  const measureEl = document.createElement('div');
  measureEl.style.cssText = 'position:absolute;visibility:hidden;inset:0;';
  terminalsEl.appendChild(measureEl);
  const measureTerm = new Terminal({ fontSize: configOpts.fontSize ?? 14 });
  const measureFit = new FitAddon();
  measureTerm.loadAddon(measureFit);
  measureTerm.open(measureEl);
  measureFit.fit();
  const cols = measureTerm.cols;
  const rows = measureTerm.rows;
  measureTerm.dispose();
  terminalsEl.removeChild(measureEl);

  const refs = { podTerm: null, openConfigDialog: null, toggleInspector: null, readonlyMode: false, bgOpaque: false, toggleBgOpacity: null, wrapOutputRef: null };

  // Tab state
  const tabList = [];  // [{ id, termEl, term, fit, podTerm, btn }]
  let activeTabId = null;
  let nextTabId = 1;

  const tabBar = document.getElementById('tab-bar');
  const addBtn = document.createElement('button');
  addBtn.id = 'tab-add';
  addBtn.title = 'New Tab';
  addBtn.textContent = '+';
  tabBar.appendChild(addBtn);

  function getActiveTab() {
    return tabList.find(t => t.id === activeTabId) ?? null;
  }

  function renderTabBar() {
    // Remove old tab buttons (keep addBtn)
    tabBar.querySelectorAll('.tab-btn').forEach(el => el.remove());
    tabList.forEach(tab => {
      const btn = document.createElement('button');
      btn.className = 'tab-btn' + (tab.id === activeTabId ? ' active' : '');
      btn.dataset.tabId = tab.id;

      const label = document.createElement('span');
      label.textContent = tab.label;
      btn.appendChild(label);

      if (tabList.length > 1) {
        const closeSpan = document.createElement('span');
        closeSpan.className = 'tab-close';
        closeSpan.textContent = '×';
        closeSpan.title = 'Close tab';
        closeSpan.addEventListener('click', (e) => {
          e.stopPropagation();
          removeTab(tab.id);
        });
        btn.appendChild(closeSpan);
      }

      btn.addEventListener('click', () => switchTab(tab.id));
      tabBar.insertBefore(btn, addBtn);
      tab.btn = btn;
    });
  }

  function switchTab(id) {
    tabList.forEach(t => {
      t.termEl.classList.toggle('active', t.id === id);
    });
    activeTabId = id;
    renderTabBar();
    const tab = getActiveTab();
    if (tab) {
      tab.fit.fit();
      tab.term.focus();
      refs.podTerm = tab.podTerm;
    }
  }

  function removeTab(id) {
    const idx = tabList.findIndex(t => t.id === id);
    if (idx === -1) return;
    const tab = tabList[idx];
    tab.term.dispose();
    tab.termEl.remove();
    tabList.splice(idx, 1);
    if (tabList.length === 0) {
      // No tabs left — create a fresh one
      createTab(pod);
      return;
    }
    if (activeTabId === id) {
      const next = tabList[Math.min(idx, tabList.length - 1)];
      switchTab(next.id);
    } else {
      renderTabBar();
    }
  }

  async function createTab(pod) {
    const id = nextTabId++;
    const label = `~ ${tabList.length + 1}`;

    const termEl = document.createElement('div');
    termEl.className = 'terminal-instance';
    terminalsEl.appendChild(termEl);

    const term = new Terminal({
      fontSize: configOpts.fontSize ?? 14,
      cursorBlink: configOpts.cursorBlink ?? true,
      ...(configOpts.cursorStyle ? { cursorStyle: configOpts.cursorStyle } : {}),
      ...(configOpts.fontFamily ? { fontFamily: configOpts.fontFamily } : {}),
      ...(configOpts.scrollback != null ? { scrollback: configOpts.scrollback } : {}),
      ...(configOpts.smoothScrollDuration != null ? { smoothScrollDuration: configOpts.smoothScrollDuration } : {}),
      ...(configOpts.preserveScrollOnWrite != null ? { preserveScrollOnWrite: configOpts.preserveScrollOnWrite } : {}),
      ...(configOpts.allowTransparency != null ? { allowTransparency: configOpts.allowTransparency } : {}),
      ...(configOpts.theme ? { theme: configOpts.theme } : {}),
    });

    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(termEl);
    fit.fit();

    if (configOpts.mouseScrollMultiplier && configOpts.mouseScrollMultiplier !== 1) {
      termEl.addEventListener('wheel', (e) => {
        e.preventDefault();
        e.stopImmediatePropagation();
        const synthetic = new WheelEvent('wheel', {
          deltaX: e.deltaX * configOpts.mouseScrollMultiplier,
          deltaY: e.deltaY * configOpts.mouseScrollMultiplier,
          deltaZ: e.deltaZ * configOpts.mouseScrollMultiplier,
          deltaMode: e.deltaMode,
          bubbles: e.bubbles,
          cancelable: e.cancelable,
          composed: e.composed,
          ctrlKey: e.ctrlKey,
          shiftKey: e.shiftKey,
          altKey: e.altKey,
          metaKey: e.metaKey,
          clientX: e.clientX,
          clientY: e.clientY,
        });
        term.handleWheelEvent(synthetic);
      }, { capture: true, passive: false });
    }

    const outputRef = { write: (buf) => term.write(toCrlf(buf)) };
    wrapOutputRef(outputRef);

    const podTerm = await pod.createCustomTerminal({
      cols: term.cols,
      rows: term.rows,
      onOutput: (buffer) => outputRef.write(buffer),
    });

    term.onData((data) => { if (!refs.readonlyMode) podTerm.readData(translateKittySequences(data)); });

    setupKeybinds(termEl, () => getActiveTab()?.term ?? term, refs, ghosttyConfigText, tabs);

    const shellEnv = configOpts.shellPrompt ? [`PS1=${configOpts.shellPrompt}`] : undefined;
    pod.run('bash', [], { terminal: podTerm, env: shellEnv });

    const tabEntry = { id, label, termEl, term, fit, podTerm, outputRef, btn: null };
    tabList.push(tabEntry);

    switchTab(id);
    return tabEntry;
  }

  const tabs = {
    newTab: () => createTab(pod),
    nextTab: () => {
      const idx = tabList.findIndex(t => t.id === activeTabId);
      if (idx === -1) return;
      switchTab(tabList[(idx + 1) % tabList.length].id);
    },
    previousTab: () => {
      const idx = tabList.findIndex(t => t.id === activeTabId);
      if (idx === -1) return;
      switchTab(tabList[(idx - 1 + tabList.length) % tabList.length].id);
    },
    lastTab: () => {
      if (tabList.length) switchTab(tabList[tabList.length - 1].id);
    },
    closeTab: () => {
      if (activeTabId !== null) removeTab(activeTabId);
    },
    gotoTab: (n) => {
      const tab = tabList[n - 1];
      if (tab) switchTab(tab.id);
    },
    getActive: () => tabList.find(t => t.id === activeTabId) ?? null,
  };

  addBtn.addEventListener('click', () => createTab(pod));

  // First terminal — write boot message before pod is ready
  const firstTermEl = document.createElement('div');
  firstTermEl.className = 'terminal-instance active';
  terminalsEl.appendChild(firstTermEl);

  const firstTerm = new Terminal({
    fontSize: configOpts.fontSize ?? 14,
    cursorBlink: configOpts.cursorBlink ?? true,
    ...(configOpts.cursorStyle ? { cursorStyle: configOpts.cursorStyle } : {}),
    ...(configOpts.fontFamily ? { fontFamily: configOpts.fontFamily } : {}),
    ...(configOpts.scrollback != null ? { scrollback: configOpts.scrollback } : {}),
    ...(configOpts.smoothScrollDuration != null ? { smoothScrollDuration: configOpts.smoothScrollDuration } : {}),
    ...(configOpts.preserveScrollOnWrite != null ? { preserveScrollOnWrite: configOpts.preserveScrollOnWrite } : {}),
    ...(configOpts.allowTransparency != null ? { allowTransparency: configOpts.allowTransparency } : {}),
    ...(configOpts.theme ? { theme: configOpts.theme } : {}),
  });

  const firstFit = new FitAddon();
  firstTerm.loadAddon(firstFit);
  firstTerm.open(firstTermEl);
  firstFit.fit();
  firstTerm.write('Booting BrowserPod...\r\n');

  const { openConfigDialog } = setupConfigDialog(firstTerm, configOpts, cols, rows);
  refs.openConfigDialog = openConfigDialog;

  const { openAbout } = setupAboutModal(configOpts);

  const { openGame } = setupGame();
  refs.wrapOutputRef = wrapOutputRef;

  // Detect "ghostty-gets-even" in PTY output across all tabs.
  // Each outputRef.write is wrapped so we can scan decoded bytes without altering them.
  const TRIGGER = 'ghostty-gets-even';
  let triggerBuf = '';
  function wrapOutputRef(outputRef) {
    const orig = outputRef.write.bind(outputRef);
    outputRef.write = (buf) => {
      orig(buf);
      const text = typeof buf === 'string' ? buf : new TextDecoder().decode(
        new Uint8Array(buf instanceof Uint8Array ? buf : new Uint8Array(buf))
      );
      triggerBuf += text;
      if (triggerBuf.length > TRIGGER.length * 2) {
        triggerBuf = triggerBuf.slice(-TRIGGER.length * 2);
      }
      if (triggerBuf.includes(TRIGGER)) {
        triggerBuf = '';
        openGame();
      }
    };
  }

  const { toggleInspector } = setupContextMenu(firstTerm, configOpts, cols, rows, refs, openConfigDialog, openAbout);
  refs.toggleInspector = toggleInspector;

  const id = nextTabId++;
  const firstOutputRef = { write: (buf) => firstTabEntry.term.write(toCrlf(buf)) };
  wrapOutputRef(firstOutputRef);
  const firstTabEntry = { id, label: `~ 1`, termEl: firstTermEl, term: firstTerm, fit: firstFit, podTerm: null, outputRef: firstOutputRef, btn: null };
  tabList.push(firstTabEntry);
  activeTabId = id;
  renderTabBar();

  const pod = await BrowserPod.boot({ apiKey: import.meta.env.VITE_BP_APIKEY, storageKey: 'ghostty' });

  const firstPodTerm = await pod.createCustomTerminal({
    cols: firstTerm.cols,
    rows: firstTerm.rows,
    onOutput: (buffer) => firstOutputRef.write(buffer),
  });
  firstTabEntry.podTerm = firstPodTerm;
  refs.podTerm = firstPodTerm;

  firstTerm.onData((data) => { if (!refs.readonlyMode) firstPodTerm.readData(translateKittySequences(data)); });
  setupKeybinds(firstTermEl, () => getActiveTab()?.term ?? firstTerm, refs, ghosttyConfigText, tabs);

  const shellEnv = configOpts.shellPrompt ? [`PS1=${configOpts.shellPrompt}`] : undefined;
  await pod.run('bash', [], { terminal: firstPodTerm, env: shellEnv });

  if (configOpts.mouseScrollMultiplier && configOpts.mouseScrollMultiplier !== 1) {
    firstTermEl.addEventListener('wheel', (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      const synthetic = new WheelEvent('wheel', {
        deltaX: e.deltaX * configOpts.mouseScrollMultiplier,
        deltaY: e.deltaY * configOpts.mouseScrollMultiplier,
        deltaZ: e.deltaZ * configOpts.mouseScrollMultiplier,
        deltaMode: e.deltaMode,
        bubbles: e.bubbles,
        cancelable: e.cancelable,
        composed: e.composed,
        ctrlKey: e.ctrlKey,
        shiftKey: e.shiftKey,
        altKey: e.altKey,
        metaKey: e.metaKey,
        clientX: e.clientX,
        clientY: e.clientY,
      });
      firstTerm.handleWheelEvent(synthetic);
    }, { capture: true, passive: false });
  }

  firstTerm.focus();
}

main().catch((err) => {
  console.error(err);
});
