import { init, Terminal, FitAddon } from '@crunchloop/ghostty-web';
import { BrowserPod } from '@leaningtech/browserpod';
import { GHOST_FRAMES, FRAME_WIDTH, FRAME_HEIGHT } from './src/ghost-animation.js';
import { setupGame } from './src/extras.js';
import bundledConfigText from './ghostty-config?raw';
import { initHighlighter, highlight } from './src/config-highlight.js';
import { createConfigPanel } from './src/config-panel.js';
import { mergeConfigText, scrollbackBytesToLines } from './src/config-utils.js';
import { SplitTree } from './src/split-tree.js';
import { SplitLayout } from './src/split-layout.js';
import {
  formatLocalModelList,
  localModelRuntime,
  resolveLocalModel,
} from './src/local-models.js';
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
      refs.copySelection?.(term);
      return true;
    case 'paste_from_clipboard':
      refs.pasteFromClipboard?.(term);
      return true;
    case 'paste_from_selection': {
      const sel = window.getSelection()?.toString();
      if (sel) refs.pasteText?.(term, sel);
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
      refs.copySelection?.(term);
      return true;
    case 'copy_title_to_clipboard': {
      const activeTab = tabs?.getActive?.();
      const label = activeTab?.label ?? document.title;
      refs.copyText?.(label);
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
      tabs?.closePane?.();
      return true;
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
      if (!refs.toggleBgOpacity) return false;
      refs.toggleBgOpacity();
      return true;
    case 'toggle_window_decorations':
      if (!refs.toggleWindowDecorations) return false;
      refs.toggleWindowDecorations();
      return true;
    case 'toggle_readonly':
      refs.readonlyMode = !refs.readonlyMode;
      return true;
    case 'new_split':
    case 'new_split:right':
      tabs?.newSplit?.('right');
      return true;
    case 'new_split:down':
      tabs?.newSplit?.('down');
      return true;
    case 'goto_split:right':
      tabs?.gotoSplit?.('right');
      return true;
    case 'goto_split:left':
      tabs?.gotoSplit?.('left');
      return true;
    case 'goto_split:up':
      tabs?.gotoSplit?.('up');
      return true;
    case 'goto_split:down':
      tabs?.gotoSplit?.('down');
      return true;
    case 'goto_split:previous':
      tabs?.gotoSplit?.('previous');
      return true;
    case 'goto_split:next':
      tabs?.gotoSplit?.('next');
      return true;
    case 'toggle_split_zoom':
      tabs?.toggleSplitZoom?.();
      return true;
    case 'equalize_splits':
      tabs?.equalizeSplits?.();
      return true;
    case 'write_selection_file:copy':
      refs.copySelection?.(term);
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
      if (action.startsWith('resize_split:')) {
        // format: resize_split:direction,amount  e.g. resize_split:right,10
        const parts = action.slice('resize_split:'.length).split(',');
        const dir = parts[0];
        const amount = parseInt(parts[1], 10) || 10;
        tabs?.resizeSplit?.(dir, amount);
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

function parseMouseScrollMultiplier(value) {
  const result = { precision: 1, discrete: 3 };
  const text = String(value ?? '').trim();
  const scalar = Number(text);
  if (Number.isFinite(scalar)) {
    const clamped = clamp(scalar, 0.01, 10000);
    return { precision: clamped, discrete: clamped };
  }
  for (const entry of text.split(',')) {
    const [kind, rawValue] = entry.split(':').map(part => part.trim());
    const parsed = Number(rawValue);
    if ((kind === 'precision' || kind === 'discrete') && Number.isFinite(parsed)) {
      result[kind] = clamp(parsed, 0.01, 10000);
    }
  }
  return result;
}

const DEFAULT_GHOSTTY_THEME = {
  background: '#282c34',
  foreground: '#ffffff',
};

function parseGhosttyConfig(text) {
  const theme = {};
  const opts = {
    backgroundImageOpacity: 1,
    backgroundImagePosition: 'center',
    backgroundImageFit: 'contain',
    backgroundImageRepeat: false,
    backgroundOpacity: 1,
    faintOpacity: 0.5,
    minimumContrast: 1,
    cursorOpacity: 1,
    scrollbackBytes: 10000000,
    fontThicken: false,
    fontThickenStrength: 255,
    mouseScrollMultiplier: { precision: 1, discrete: 3 },
    mouseHideWhileTyping: false,
    cursorClickToMove: true,
    focusFollowsMouse: false,
    clipboardRead: 'ask',
    clipboardWrite: 'allow',
    clipboardTrimTrailingSpaces: true,
    copyOnSelect: true,
    windowPaddingX: '2',
    windowPaddingY: '2',
    windowTheme: 'auto',
    windowDecoration: 'auto',
    windowWidth: 0,
    windowHeight: 0,
  };

  const parseBoolean = value => value === 'true';
  const parseNumber = (value, fallback) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const parseColor = value => (
    value.startsWith('#') || !/^[0-9a-fA-F]{6}$/.test(value)
      ? value
      : `#${value}`
  );

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
      case 'font-family-bold':
        opts.fontFamilyBold = val;
        break;
      case 'font-family-italic':
        opts.fontFamilyItalic = val;
        break;
      case 'font-family-bold-italic':
        opts.fontFamilyBoldItalic = val;
        break;
      case 'font-thicken':
        opts.fontThicken = parseBoolean(val);
        break;
      case 'font-thicken-strength':
        opts.fontThickenStrength = parseNumber(val, 255);
        break;
      case 'bold-color':
        opts.boldColor = parseColor(val);
        break;
      case 'faint-opacity':
        opts.faintOpacity = parseNumber(val, 0.5);
        break;
      case 'minimum-contrast':
        opts.minimumContrast = parseNumber(val, 1);
        break;
      case 'cursor-style':
        if (val === 'block' || val === 'bar' || val === 'underline' || val === 'block_hollow')
          opts.cursorStyle = val;
        break;
      case 'cursor-style-blink':
        opts.cursorBlink = parseBoolean(val);
        break;
      case 'cursor-opacity':
        opts.cursorOpacity = parseNumber(val, 1);
        break;
      case 'scrollback-limit':
        opts.scrollbackBytes = parseInt(val, 10);
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
        opts.preserveScrollOnWrite = parseBoolean(val);
        break;
      case 'allow-transparency':
        opts.allowTransparency = parseBoolean(val);
        break;
      case 'mouse-scroll-multiplier':
        opts.mouseScrollMultiplier = parseMouseScrollMultiplier(val);
        break;
      case 'mouse-hide-while-typing':
        opts.mouseHideWhileTyping = parseBoolean(val);
        break;
      case 'cursor-click-to-move':
        opts.cursorClickToMove = parseBoolean(val);
        break;
      case 'focus-follows-mouse':
        opts.focusFollowsMouse = parseBoolean(val);
        break;
      case 'clipboard-read':
        opts.clipboardRead = val;
        break;
      case 'clipboard-write':
        opts.clipboardWrite = val;
        break;
      case 'clipboard-trim-trailing-spaces':
        opts.clipboardTrimTrailingSpaces = parseBoolean(val);
        break;
      case 'copy-on-select':
        opts.copyOnSelect = val === 'clipboard' ? 'clipboard' : parseBoolean(val);
        break;
      case 'background-image':
        opts.backgroundImage = val;
        break;
      case 'background-image-opacity':
        opts.backgroundImageOpacity = parseNumber(val, 1);
        break;
      case 'background-image-position':
        opts.backgroundImagePosition = val;
        break;
      case 'background-image-fit':
        opts.backgroundImageFit = val;
        break;
      case 'background-image-repeat':
        opts.backgroundImageRepeat = parseBoolean(val);
        break;
      case 'background-opacity':
        opts.backgroundOpacity = parseNumber(val, 1);
        break;
      case 'window-padding-x':
        opts.windowPaddingX = val;
        break;
      case 'window-padding-y':
        opts.windowPaddingY = val;
        break;
      case 'window-width':
        opts.windowWidth = parseInt(val, 10);
        if (opts.windowWidth > 0) opts.windowWidth = Math.max(10, opts.windowWidth);
        break;
      case 'window-height':
        opts.windowHeight = parseInt(val, 10);
        if (opts.windowHeight > 0) opts.windowHeight = Math.max(4, opts.windowHeight);
        break;
      case 'window-theme':
        opts.windowTheme = val;
        break;
      case 'window-decoration':
        opts.windowDecoration = val === 'false' ? 'none' : val === 'true' ? 'auto' : val;
        break;
      case 'background':
        theme.background = parseColor(val);
        break;
      case 'foreground':
        theme.foreground = parseColor(val);
        break;
      case 'cursor-color':
        theme.cursor = parseColor(val);
        break;
      case 'selection-background':
        theme.selectionBackground = parseColor(val);
        break;
      case 'selection-foreground':
        theme.selectionForeground = parseColor(val);
        break;
      default:
        // palette entries: e.g. palette = 0=#1a1b26
        if (key === 'palette') {
          const m = val.match(/^(\d+)=(.+)$/);
          if (m) {
            const idx = parseInt(m[1], 10);
            const colorNames = Object.values(COLOR_NAMES);
            if (idx < colorNames.length) {
              const color = parseColor(m[2]);
              theme[colorNames[idx]] = color;
            }
          }
        } else if (COLOR_NAMES[key]) {
          theme[COLOR_NAMES[key]] = parseColor(val);
        }
    }
  }

  if (Object.keys(theme).length > 0) opts.theme = theme;
  return opts;
}

function loadGhosttyConfig() {
  try {
    return parseGhosttyConfig(ghosttyConfigText);
  } catch {
    return {};
  }
}

const themeCache = new Map();

async function loadTheme(name) {
  if (!name) return null;
  if (themeCache.has(name)) return themeCache.get(name);
  try {
    const res = await fetch(`/themes/${encodeURIComponent(name)}`);
    if (!res.ok) return null;
    const text = await res.text();
    const theme = parseGhosttyConfig(text).theme ?? null;
    themeCache.set(name, theme);
    return theme;
  } catch {
    return null;
  }
}

async function runtimeConfigFromPanelState(base, state) {
  const bool = value => value === true || value === 'true';
  const number = (value, fallback) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const dirty = new Set(state._dirtyIds ?? []);
  const next = { ...base };

  const directKeys = [
    'backgroundImage', 'backgroundImagePosition', 'backgroundImageFit',
    'fontFamilyBold', 'fontFamilyItalic', 'fontFamilyBoldItalic',
    'boldColor', 'windowPaddingX', 'windowPaddingY', 'windowTheme',
    'windowDecoration', 'clipboardRead', 'clipboardWrite', 'shellPrompt',
  ];
  for (const key of directKeys) next[key] = state[key] ?? '';

  const booleanKeys = [
    'backgroundImageRepeat', 'fontThicken', 'preserveScrollOnWrite',
    'mouseHideWhileTyping', 'cursorClickToMove', 'focusFollowsMouse',
    'clipboardTrimTrailingSpaces',
  ];
  for (const key of booleanKeys) next[key] = bool(state[key]);
  next.copyOnSelect = state.copyOnSelect === 'clipboard' ? 'clipboard' : bool(state.copyOnSelect);

  const numberDefaults = {
    backgroundImageOpacity: 1,
    backgroundOpacity: 1,
    fontSize: 14,
    fontThickenStrength: 255,
    faintOpacity: 0.5,
    minimumContrast: 1,
    cursorOpacity: 1,
    smoothScrollDuration: 100,
    windowWidth: 0,
    windowHeight: 0,
  };
  for (const [key, fallback] of Object.entries(numberDefaults)) {
    next[key] = number(state[key], fallback);
  }
  next.fontFamily = state.fontFamily || 'monospace';
  next.mouseScrollMultiplier = parseMouseScrollMultiplier(state.mouseScrollMultiplier);
  next.cursorStyle = state.cursorStyle || 'block';
  next.cursorBlink = state.cursorStyleBlink === '' ? true : bool(state.cursorStyleBlink);
  next._backgroundImageDataUrl = state._backgroundImageDataUrl ?? null;
  next.themeName = state.theme ?? '';

  const namedTheme = await loadTheme(next.themeName);
  const theme = {
    ...DEFAULT_GHOSTTY_THEME,
    ...(namedTheme ?? {}),
    ...(base.explicitTheme ?? base.theme ?? {}),
  };
  const colorMappings = {
    background: 'background',
    foreground: 'foreground',
    cursorColor: 'cursor',
    selectionBackground: 'selectionBackground',
    selectionForeground: 'selectionForeground',
  };
  for (const [stateKey, themeKey] of Object.entries(colorMappings)) {
    if (!dirty.has(stateKey)) continue;
    if (state[stateKey]) theme[themeKey] = state[stateKey];
    else delete theme[themeKey];
  }
  if (dirty.has('palette')) {
    const paletteKeys = [
      'black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white',
      'brightBlack', 'brightRed', 'brightGreen', 'brightYellow',
      'brightBlue', 'brightMagenta', 'brightCyan', 'brightWhite',
    ];
    paletteKeys.forEach((key, index) => {
      if (state.palette?.[index]) theme[key] = state.palette[index];
      else delete theme[key];
    });
  }
  next.theme = theme;
  return next;
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

function copyOutputBytes(buffer) {
  const view = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const copy = new Uint8Array(view.byteLength);
  copy.set(view);
  return copy;
}

const HOST_COMMAND_MARKER_PREFIX = new TextEncoder().encode(
  '\x1b]777;ghostty-ai-ready;',
);
const HOST_COMMAND_MARKER_END = 0x07;

const LOCAL_MODEL_SHELL_BOOTSTRAP = [
  'ghostty-ai() {',
  '  local _ghostty_ai_payload',
  "  _ghostty_ai_payload=$(printf '%s' \"$*\" | base64 -w0)",
  "  printf '\\033]777;ghostty-ai-ready;%s\\007' \"$_ghostty_ai_payload\"",
  '  IFS= read -r _ghostty_ai_resume',
  '}',
  'export -f ghostty-ai',
  'exec bash --norc -i',
].join('\n');

function findByteSequence(bytes, sequence, start = 0) {
  const end = bytes.length - sequence.length;
  outer: for (let index = start; index <= end; index++) {
    for (let offset = 0; offset < sequence.length; offset++) {
      if (bytes[index + offset] !== sequence[offset]) continue outer;
    }
    return index;
  }
  return -1;
}

function findByte(bytes, value, start = 0) {
  for (let index = start; index < bytes.length; index++) {
    if (bytes[index] === value) return index;
  }
  return -1;
}

function decodeHostCommandPayload(bytes) {
  try {
    const base64 = new TextDecoder().decode(bytes);
    const binary = atob(base64);
    const decoded = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index++) {
      decoded[index] = binary.charCodeAt(index);
    }
    const args = new TextDecoder().decode(decoded);
    return args ? `ghostty-ai ${args}` : 'ghostty-ai';
  } catch {
    return null;
  }
}

function filterHostCommandMarkers(pane, bytes) {
  const buffered = pane.hostMarkerBuffer;
  const combined = new Uint8Array(buffered.length + bytes.length);
  combined.set(buffered);
  combined.set(bytes, buffered.length);

  const parts = [];
  const commands = [];
  let cursor = 0;
  for (;;) {
    const markerIndex = findByteSequence(combined, HOST_COMMAND_MARKER_PREFIX, cursor);
    if (markerIndex === -1) break;
    const payloadStart = markerIndex + HOST_COMMAND_MARKER_PREFIX.length;
    const markerEnd = findByte(combined, HOST_COMMAND_MARKER_END, payloadStart);
    if (markerEnd === -1) {
      parts.push(combined.subarray(cursor, markerIndex));
      pane.hostMarkerBuffer = combined.slice(markerIndex);
      const outputLength = parts.reduce((total, part) => total + part.length, 0);
      const output = new Uint8Array(outputLength);
      let outputOffset = 0;
      for (const part of parts) {
        output.set(part, outputOffset);
        outputOffset += part.length;
      }
      return { output, commands };
    }
    parts.push(combined.subarray(cursor, markerIndex));
    commands.push(decodeHostCommandPayload(combined.subarray(payloadStart, markerEnd)));
    cursor = markerEnd + 1;
  }

  const tail = combined.subarray(cursor);
  let heldLength = 0;
  const maxHeldLength = Math.min(tail.length, HOST_COMMAND_MARKER_PREFIX.length - 1);
  for (let length = maxHeldLength; length > 0; length--) {
    let matches = true;
    for (let index = 0; index < length; index++) {
      if (tail[tail.length - length + index] !== HOST_COMMAND_MARKER_PREFIX[index]) {
        matches = false;
        break;
      }
    }
    if (matches) {
      heldLength = length;
      break;
    }
  }

  parts.push(tail.subarray(0, tail.length - heldLength));
  pane.hostMarkerBuffer = tail.slice(tail.length - heldLength);

  const outputLength = parts.reduce((total, part) => total + part.length, 0);
  const output = new Uint8Array(outputLength);
  let outputOffset = 0;
  for (const part of parts) {
    output.set(part, outputOffset);
    outputOffset += part.length;
  }
  return { output, commands };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

let colorParserContext = null;

function parseCssColor(value) {
  if (!value) return null;
  const hex = String(value).trim();
  const short = /^#([0-9a-f]{3})$/i.exec(hex);
  if (short) {
    return short[1].split('').map(part => parseInt(part + part, 16));
  }
  const full = /^#([0-9a-f]{6})$/i.exec(hex);
  if (full) {
    return [
      parseInt(full[1].slice(0, 2), 16),
      parseInt(full[1].slice(2, 4), 16),
      parseInt(full[1].slice(4, 6), 16),
    ];
  }
  const rgb = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(hex);
  if (rgb) return rgb.slice(1, 4).map(Number);
  colorParserContext ??= document.createElement('canvas').getContext('2d');
  if (!colorParserContext) return null;
  colorParserContext.fillStyle = '#000000';
  colorParserContext.fillStyle = hex;
  const normalized = colorParserContext.fillStyle;
  if (normalized === hex) return null;
  return parseCssColor(normalized);
}

function rgbToCss(rgb, alpha = 1) {
  if (!rgb) return `rgba(40, 44, 52, ${alpha})`;
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}

function relativeLuminance(rgb) {
  const linear = rgb.map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

function contrastRatio(foreground, background) {
  const lighter = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const darker = Math.min(relativeLuminance(foreground), relativeLuminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

function ensureMinimumContrast(foreground, background, minimum) {
  if (!foreground || !background || minimum <= 1 || contrastRatio(foreground, background) >= minimum) {
    return foreground;
  }
  const black = [0, 0, 0];
  const white = [255, 255, 255];
  const target = contrastRatio(white, background) >= contrastRatio(black, background) ? white : black;
  let low = 0;
  let high = 1;
  for (let i = 0; i < 12; i++) {
    const amount = (low + high) / 2;
    const candidate = foreground.map((channel, index) => (
      Math.round(channel + (target[index] - channel) * amount)
    ));
    if (contrastRatio(candidate, background) >= minimum) high = amount;
    else low = amount;
  }
  return foreground.map((channel, index) => (
    Math.round(channel + (target[index] - channel) * high)
  ));
}

function parsePadding(value) {
  const parts = String(value ?? '2')
    .split(',')
    .map(part => Math.max(0, Number.parseFloat(part.trim())))
    .filter(Number.isFinite);
  const first = parts[0] ?? 2;
  return [first, parts[1] ?? first];
}

function trimClipboardText(text) {
  return String(text).split('\n').map(line => line.trimEnd()).join('\n');
}

function selectionText(term, config) {
  const text = term.getSelection();
  return config.clipboardTrimTrailingSpaces ? trimClipboardText(text) : text;
}

function encodeBase64Utf8(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function decodeBase64Utf8(value) {
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function backgroundImageSource(config) {
  if (!config.backgroundImage) return '';
  if (config._backgroundImageDataUrl) return config._backgroundImageDataUrl;
  try {
    const saved = JSON.parse(localStorage.getItem('ghostty-background-image') || 'null');
    if (saved?.path === config.backgroundImage && saved.dataUrl) return saved.dataUrl;
  } catch {
    localStorage.removeItem('ghostty-background-image');
  }
  return config.backgroundImage;
}

function backgroundPosition(value) {
  return {
    'top-left': 'left top',
    'top-center': 'center top',
    'top-right': 'right top',
    'center-left': 'left center',
    center: 'center center',
    'center-right': 'right center',
    'bottom-left': 'left bottom',
    'bottom-center': 'center bottom',
    'bottom-right': 'right bottom',
  }[value] ?? 'center center';
}

function backgroundSize(value) {
  if (value === 'stretch') return '100% 100%';
  if (value === 'none') return 'auto';
  return value === 'cover' ? 'cover' : 'contain';
}

function forcePaneRender(pane) {
  const renderer = pane.term.renderer;
  if (!renderer || !pane.term.wasmTerm) return;
  renderer.render(pane.term.wasmTerm, true, pane.term.viewportY, pane.term);
}

function installRendererExtensions(pane) {
  const renderer = pane.term.renderer;
  if (!renderer || renderer.__ghosttyPlaygroundExtended) return;
  renderer.__ghosttyPlaygroundExtended = true;

  const originalRenderCellText = renderer.renderCellText;
  renderer.renderCellText = function renderConfiguredCell(cell, x, y, overrideColor, graphemeRow) {
    const config = pane.runtimeConfig;
    const flags = cell.flags ?? 0;
    const bold = (flags & 1) !== 0;
    const italic = (flags & 2) !== 0;
    const faint = (flags & 128) !== 0;
    const originalFamily = this.fontFamily;
    const family = bold && italic
      ? config.fontFamilyBoldItalic
      : bold ? config.fontFamilyBold
        : italic ? config.fontFamilyItalic
          : config.fontFamily;
    if (family) this.fontFamily = family;

    let configuredColor = overrideColor;
    const inverse = (flags & 16) !== 0;
    const foregroundIsDefault = inverse ? cell.bgIsDefault : cell.fgIsDefault;
    const backgroundIsDefault = inverse ? cell.fgIsDefault : cell.bgIsDefault;
    const cellForeground = foregroundIsDefault
      ? parseCssColor(inverse ? this.theme.background : pane.term.currentTheme?.foreground ?? this.theme.foreground)
      : [inverse ? cell.bg_r : cell.fg_r, inverse ? cell.bg_g : cell.fg_g, inverse ? cell.bg_b : cell.fg_b];
    const cellBackground = backgroundIsDefault
      ? parseCssColor(inverse ? pane.term.currentTheme?.foreground ?? this.theme.foreground : pane.term.currentTheme?.background ?? '#282c34')
      : [inverse ? cell.fg_r : cell.bg_r, inverse ? cell.fg_g : cell.bg_g, inverse ? cell.fg_b : cell.bg_b];

    if (!configuredColor && bold && config.boldColor) {
      if (config.boldColor === 'bright') {
        const normal = [
          this.theme.black, this.theme.red, this.theme.green, this.theme.yellow,
          this.theme.blue, this.theme.magenta, this.theme.cyan, this.theme.white,
        ];
        const bright = [
          this.theme.brightBlack, this.theme.brightRed, this.theme.brightGreen, this.theme.brightYellow,
          this.theme.brightBlue, this.theme.brightMagenta, this.theme.brightCyan, this.theme.brightWhite,
        ];
        const index = normal.findIndex(color => {
          const rgb = parseCssColor(color);
          return rgb && cellForeground && rgb.every((channel, i) => channel === cellForeground[i]);
        });
        configuredColor = index >= 0 ? bright[index] : this.theme.brightWhite;
      } else {
        configuredColor = config.boldColor;
      }
    }

    if (!configuredColor && inverse && cell.bgIsDefault) {
      configuredColor = pane.term.currentTheme?.background ?? '#282c34';
    }

    if (!configuredColor && config.minimumContrast > 1 && !this.isInSelection(x, y)) {
      const adjusted = ensureMinimumContrast(
        cellForeground,
        cellBackground,
        clamp(config.minimumContrast, 1, 21),
      );
      if (adjusted && adjusted !== cellForeground) configuredColor = rgbToCss(adjusted);
    }

    const renderCell = faint && config.faintOpacity !== 0.5
      ? { ...cell, flags: flags & ~128 }
      : cell;
    const context = this.ctx;
    const originalFillText = context.fillText;
    if (config.fontThicken) {
      const offset = 0.15 + clamp(config.fontThickenStrength, 0, 255) / 255 * 0.6;
      context.fillText = function drawThickenedText(text, drawX, drawY, maxWidth) {
        if (maxWidth === undefined) {
          originalFillText.call(this, text, drawX, drawY);
          originalFillText.call(this, text, drawX + offset, drawY);
        } else {
          originalFillText.call(this, text, drawX, drawY, maxWidth);
          originalFillText.call(this, text, drawX + offset, drawY, maxWidth);
        }
      };
    }
    context.save();
    if (faint && config.faintOpacity !== 0.5) {
      context.globalAlpha *= clamp(config.faintOpacity, 0, 1);
    }
    try {
      return originalRenderCellText.call(this, renderCell, x, y, configuredColor, graphemeRow);
    } finally {
      context.restore();
      context.fillText = originalFillText;
      this.fontFamily = originalFamily;
    }
  };

  const originalRenderCursor = renderer.renderCursor;
  renderer.renderCursor = function renderConfiguredCursor(x, y, style) {
    const config = pane.runtimeConfig;
    const opacity = clamp(config.cursorOpacity, 0, 1);
    this.ctx.save();
    this.ctx.globalAlpha *= opacity;
    try {
      const effectiveStyle = style ?? config.cursorStyle;
      const hollow = effectiveStyle === 'block_hollow' ||
        (config.cursorStyle === 'block_hollow' && effectiveStyle === 'block');
      if (hollow) {
        const left = x * this.metrics.width;
        const top = y * this.metrics.height;
        this.ctx.strokeStyle = this.theme.cursor;
        this.ctx.lineWidth = Math.max(1, Math.min(this.metrics.width, this.metrics.height) * 0.08);
        this.ctx.strokeRect(
          left + this.ctx.lineWidth / 2,
          top + this.ctx.lineWidth / 2,
          this.metrics.width - this.ctx.lineWidth,
          this.metrics.height - this.ctx.lineWidth,
        );
        return;
      }
      return originalRenderCursor.call(this, x, y, style);
    } finally {
      this.ctx.restore();
    }
  };
}

function applyPaneAppearance(pane, config) {
  pane.runtimeConfig = config;
  const term = pane.term;
  if (config.fontSize != null) term.options.fontSize = config.fontSize;
  term.options.fontFamily = config.fontFamily || 'monospace';
  term.options.cursorStyle = config.cursorStyle === 'block_hollow'
    ? 'block'
    : config.cursorStyle ?? 'block';
  if (config.cursorBlink != null) term.options.cursorBlink = config.cursorBlink;
  if (config.theme) term.options.theme = config.theme;

  const theme = term.currentTheme ?? config.theme ?? {};
  const background = parseCssColor(theme.background ?? '#282c34');
  const opacity = clamp(Number(config.backgroundOpacity ?? 1), 0, 1);
  pane.backgroundColorEl.style.background = rgbToCss(background, opacity);

  const source = backgroundImageSource(config);
  pane.backgroundImageEl.style.backgroundImage = source ? `url(${JSON.stringify(source)})` : 'none';
  pane.backgroundImageEl.style.backgroundPosition = backgroundPosition(config.backgroundImagePosition);
  pane.backgroundImageEl.style.backgroundSize = backgroundSize(config.backgroundImageFit);
  pane.backgroundImageEl.style.backgroundRepeat = config.backgroundImageRepeat ? 'repeat' : 'no-repeat';
  pane.backgroundImageEl.style.opacity = String(clamp(
    opacity * Number(config.backgroundImageOpacity ?? 1),
    0,
    1,
  ));

  const [left, right] = parsePadding(config.windowPaddingX);
  const [top, bottom] = parsePadding(config.windowPaddingY);
  pane.terminalHost.style.padding = `${top}px ${right}px ${bottom}px ${left}px`;

  installRendererExtensions(pane);
  if (term.renderer) {
    term.renderer.theme.background = 'rgba(0, 0, 0, 0)';
  }
  forcePaneRender(pane);
}

function applyWindowAppearance(config) {
  const root = document.documentElement;
  const theme = config.theme ?? {};
  const background = parseCssColor(theme.background ?? '#282c34') ?? [40, 44, 52];
  const automaticTheme = relativeLuminance(background) > 0.45 ? 'light' : 'dark';
  const requested = config.windowTheme ?? 'auto';
  const resolved = requested === 'auto'
    ? automaticTheme
    : requested === 'system'
      ? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
      : requested === 'ghostty' ? automaticTheme : requested;
  root.dataset.windowTheme = resolved;
  root.dataset.windowDecoration = config.windowDecoration ?? 'auto';
  root.style.colorScheme = resolved;

  const header = document.querySelector('header');
  if (header && requested === 'ghostty') {
    header.style.background = theme.background ?? '#282c34';
    header.style.color = theme.foreground ?? '#ffffff';
  } else if (header) {
    header.style.background = '';
    header.style.color = '';
  }
}

function allowTerminalClipboardAccess(kind, policy) {
  if (policy === 'deny') return false;
  if (policy === 'allow') return true;
  return window.confirm(`Allow the terminal program to ${kind} the system clipboard?`);
}

function handleOsc52(pane, text) {
  pane.osc52Buffer = (pane.osc52Buffer + text).slice(-16384);
  const pattern = /\x1b]52;([^;]*);(.*?)(?:\x07|\x1b\\)/gs;
  let match;
  let consumed = 0;
  while ((match = pattern.exec(pane.osc52Buffer))) {
    consumed = pattern.lastIndex;
    const selection = match[1] || 'c';
    const payload = match[2];
    if (payload === '?') {
      if (!allowTerminalClipboardAccess('read', pane.runtimeConfig.clipboardRead)) continue;
      navigator.clipboard.readText().then((value) => {
        if (!pane.closed && pane.podTerm) {
          pane.podTerm.readData(`\x1b]52;${selection};${encodeBase64Utf8(value)}\x07`);
        }
      }).catch(error => console.warn('[clipboard] OSC 52 read failed', error));
      continue;
    }
    if (!allowTerminalClipboardAccess('write', pane.runtimeConfig.clipboardWrite)) continue;
    try {
      const value = decodeBase64Utf8(payload);
      navigator.clipboard.writeText(value)
        .catch(error => console.warn('[clipboard] OSC 52 write failed', error));
    } catch (error) {
      console.warn('[clipboard] invalid OSC 52 payload', error);
    }
  }
  if (consumed > 0) pane.osc52Buffer = pane.osc52Buffer.slice(consumed);
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

function setupConfigDialog(getActivePane) {
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
    getActivePane()?.term.focus();
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

function setupContextMenu({
  configOpts,
  refs,
  getActivePane,
  activatePaneElement,
  openConfigDialog,
  openAbout,
  previewConfigState,
}) {
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
    activatePaneElement(e.target.closest('.split-pane'));
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

  termEl.oncontextmenu = showMenu;

  document.addEventListener('click', hideMenu);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideMenu(); });

  document.getElementById('menu-copy').addEventListener('click', () => {
    hideMenu();
    const term = getActivePane()?.term;
    if (term) refs.copySelection?.(term);
  });

  document.getElementById('menu-paste').addEventListener('click', () => {
    hideMenu();
    const term = getActivePane()?.term;
    if (term) refs.pasteFromClipboard?.(term);
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
    getActivePane()?.term.focus();
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

  // Config panel
  let configPanelEl = null;
  document.getElementById('menu-config-panel').addEventListener('click', (e) => {
    e.stopPropagation();
    hideMenu();
    if (!configPanelEl) {
      configPanelEl = createConfigPanel(
        ghosttyConfigText,
        (changes) => {
          const merged = mergeConfigText(ghosttyConfigText, changes);
          localStorage.setItem('ghostty-config', merged);
          window.location.reload();
        },
        previewConfigState,
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
    if (inspectorVisible) startInspectorUpdates(getActivePane, configOpts);
    else stopInspectorUpdates();
    getActivePane()?.term.focus();
  }

  return { toggleInspector };
}

let inspectorInterval = null;
let ioPaused = false;
let ioControlsHooked = false;
let inspectedPane = null;
let getInspectedPane = null;

function appendInspectorOutput(pane, data) {
  const inspector = document.getElementById('inspector');
  if (ioPaused || !inspector?.classList.contains('visible')) return;
  if (getInspectedPane?.() !== pane) return;

  const log = document.getElementById('insp-io-log');
  if (!log) return;
  const text = typeof data === 'string' ? data : new TextDecoder().decode(data);
  const entry = document.createElement('div');
  entry.style.borderBottom = '1px solid #1e1f2e';
  entry.style.padding = '1px 0';
  entry.style.wordBreak = 'break-all';

  let printable = '';
  const flushPrintable = () => {
    if (!printable) return;
    entry.appendChild(document.createTextNode(printable));
    printable = '';
  };
  for (const char of text) {
    const code = char.charCodeAt(0);
    if (code === 0x1b || code < 0x20 || code === 0x7f) {
      flushPrintable();
      const marker = document.createElement('span');
      marker.style.color = code === 0x1b ? '#bb9af7' : '#e0af68';
      marker.textContent = code === 0x1b
        ? 'ESC'
        : code === 0x7f ? '^?' : `^${String.fromCharCode(code + 64)}`;
      entry.appendChild(marker);
    } else {
      printable += char;
    }
  }
  flushPrintable();
  log.appendChild(entry);
  while (log.children.length > 200) log.removeChild(log.firstChild);
  log.scrollTop = log.scrollHeight;
}

function startInspectorUpdates(getPane, configOpts) {
  getInspectedPane = getPane;
  const refresh = () => {
    const pane = getPane();
    if (!pane) return;
    if (pane !== inspectedPane) {
      inspectedPane = pane;
      document.getElementById('insp-palette')?.replaceChildren();
    }
    updateInspector(pane.term, configOpts);
  };
  refresh();
  clearInterval(inspectorInterval);
  inspectorInterval = setInterval(refresh, 500);

  if (!ioControlsHooked) {
    ioControlsHooked = true;
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
  inspectedPane = null;
  getInspectedPane = null;
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

  // Colors section — currentTheme includes defaults plus runtime background changes.
  const theme = term.currentTheme ?? term.options?.theme ?? configOpts.theme ?? {};
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
  configOpts.explicitTheme = { ...(configOpts.theme ?? {}) };
  const namedTheme = configOpts.themeName ? await loadTheme(configOpts.themeName) : null;
  configOpts.theme = Object.assign(
    {},
    DEFAULT_GHOSTTY_THEME,
    namedTheme ?? {},
    configOpts.explicitTheme,
  );
  applyWindowAppearance(configOpts);

  setupTitleDialog();

  const terminalsEl = document.getElementById('terminals');
  const refs = {
    podTerm: null,
    openConfigDialog: null,
    toggleInspector: null,
    readonlyMode: false,
    toggleBgOpacity: null,
    toggleWindowDecorations: null,
    copyText: text => navigator.clipboard.writeText(String(text)).catch(() => {}),
    copySelection: null,
    pasteText: null,
    pasteFromClipboard: null,
  };
  refs.copySelection = (term) => {
    if (!term.hasSelection()) return;
    refs.copyText(selectionText(term, configOpts));
  };
  refs.pasteText = (term, text) => {
    if (text) term.paste(text);
    term.focus();
  };
  refs.pasteFromClipboard = (term) => {
    navigator.clipboard.readText()
      .then(text => refs.pasteText(term, text))
      .catch(() => term.focus());
  };

  // ── Tab state ─────────────────────────────────────────────────────────────
  // tab: { id, label, splitTree, panes, paneEls, layout, activePaneId, containerEl, btn }
  const tabList = [];
  let activeTabId = null;
  let nextTabId = 1;
  let pod = null;
  let tabs = null;
  let initialGridClaimed = false;

  const tabBar = document.getElementById('tab-bar');
  const addBtn = document.createElement('button');
  addBtn.id = 'tab-add';
  addBtn.title = 'New Tab';
  addBtn.textContent = '+';
  tabBar.appendChild(addBtn);

  function getActiveTab() {
    return tabList.find(t => t.id === activeTabId) ?? null;
  }

  function getActivePane() {
    const tab = getActiveTab();
    return tab?.panes.get(tab.activePaneId) ?? null;
  }

  function forEachPane(callback) {
    for (const tab of tabList) {
      for (const pane of tab.panes.values()) callback(pane, tab);
    }
  }

  let backgroundOpacityToggled = false;
  refs.toggleBgOpacity = () => {
    backgroundOpacityToggled = !backgroundOpacityToggled;
    const opacity = backgroundOpacityToggled ? 1 : configOpts.backgroundOpacity;
    forEachPane(pane => applyPaneAppearance(pane, {
      ...pane.runtimeConfig,
      backgroundOpacity: opacity,
    }));
  };
  refs.toggleWindowDecorations = () => {
    const current = document.documentElement.dataset.windowDecoration;
    applyWindowAppearance({
      ...configOpts,
      windowDecoration: current === 'none'
        ? (configOpts.windowDecoration === 'none' ? 'auto' : configOpts.windowDecoration)
        : 'none',
    });
  };

  function renderTabBar() {
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
        closeSpan.textContent = '\xd7';
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

  function renderTab(tab) {
    tab.layout.render(tab.splitTree, tab.paneEls, tab.activePaneId);
    const isSplit = tab.splitTree.isSplit;
    for (const [paneId, el] of tab.paneEls) {
      el.classList.toggle('split-pane-active', isSplit && paneId === tab.activePaneId);
    }
  }

  function switchTab(id) {
    tabList.forEach(t => { if (t.containerEl) t.containerEl.style.display = 'none'; });
    activeTabId = id;
    renderTabBar();
    const tab = getActiveTab();
    if (tab) {
      tab.containerEl.style.display = 'block';
      renderTab(tab);
      const pane = tab.panes.get(tab.activePaneId);
      if (pane) {
        refs.podTerm = pane.podTerm;
        pane.term.focus();
      }
    }
  }

  function removeTab(id) {
    const idx = tabList.findIndex(t => t.id === id);
    if (idx === -1) return;
    const tab = tabList[idx];
    for (const pane of tab.panes.values()) disposePane(pane);
    tab.panes.clear();
    tab.paneEls.clear();
    tab.containerEl.remove();
    tabList.splice(idx, 1);
    if (tabList.length === 0) {
      activeTabId = null;
      renderTabBar();
      void createTab(pod ? '' : 'Booting BrowserPod...\r\n');
      return;
    }
    if (activeTabId === id) {
      switchTab(tabList[Math.min(idx, tabList.length - 1)].id);
    } else {
      renderTabBar();
    }
  }

  function makeTerminal(useInitialGrid = false) {
    const scrollback = scrollbackBytesToLines(configOpts.scrollbackBytes);
    const configuredGrid = useInitialGrid &&
      configOpts.windowWidth >= 10 &&
      configOpts.windowHeight >= 4;
    return new Terminal({
      fontSize: configOpts.fontSize ?? 14,
      cursorBlink: configOpts.cursorBlink ?? true,
      cursorStyle: configOpts.cursorStyle === 'block_hollow'
        ? 'block'
        : configOpts.cursorStyle ?? 'block',
      ...(configOpts.fontFamily ? { fontFamily: configOpts.fontFamily } : {}),
      ...(configuredGrid ? {
        cols: configOpts.windowWidth,
        rows: configOpts.windowHeight,
      } : {}),
      ...(scrollback != null ? { scrollback } : {}),
      ...(configOpts.smoothScrollDuration != null ? { smoothScrollDuration: configOpts.smoothScrollDuration } : {}),
      ...(configOpts.preserveScrollOnWrite != null ? { preserveScrollOnWrite: configOpts.preserveScrollOnWrite } : {}),
      allowTransparency: true,
      ...(configOpts.theme ? { theme: configOpts.theme } : {}),
    });
  }

  function activatePane(tab, paneId, focus = true) {
    if (!tab?.panes.has(paneId)) return;
    if (activeTabId !== tab.id) switchTab(tab.id);
    tab.activePaneId = paneId;
    const pane = tab.panes.get(paneId);
    refs.podTerm = pane.podTerm;
    renderTab(tab);
    if (focus) pane.term.focus();
  }

  function activatePaneElement(paneEl) {
    if (!paneEl) return;
    const tabId = Number(paneEl.dataset.tabId);
    const paneId = Number(paneEl.dataset.paneId);
    const tab = tabList.find(candidate => candidate.id === tabId);
    if (tab) activatePane(tab, paneId, false);
  }

  const { openAbout } = setupAboutModal(configOpts);
  const { openGame } = setupGame();
  const trigger = 'ghostty-gets-even';
  let lastGameLaunch = 0;

  function launchGame() {
    const now = Date.now();
    if (now - lastGameLaunch < 1500) return;
    lastGameLaunch = now;
    openGame();
  }

  function writeHostText(pane, text) {
    if (pane.closed) return;
    pane.term.write(String(text).replace(/\r?\n/g, '\r\n'));
  }

  function writeModelText(pane, text) {
    const safeText = String(text).replace(
      /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g,
      character => character === '\x1b'
        ? '[ESC]'
        : character === '\x7f'
          ? '^?'
          : `^${String.fromCharCode(character.charCodeAt(0) + 64)}`,
    );
    writeHostText(pane, safeText);
  }

  function finishHostCommand(pane) {
    pane.hostCommandActive = false;
    pane.aiAbortController = null;
    pane.loadInterruptNotified = false;
    if (!pane.closed) {
      pane.podTerm?.readData('\r');
      pane.term.focus();
    }
  }

  function localModelHelp() {
    return [
      'Experimental local inference commands:',
      '  ghostty-ai models',
      '  ghostty-ai load <number|model-id>',
      '  ghostty-ai ask <prompt>',
      '  ghostty-ai <prompt>              shorthand for ask',
      '  ghostty-ai status',
      '  ghostty-ai clear                 clear this pane conversation',
      '  ghostty-ai unload                release model memory',
      '',
      'Models run in the browser with WebGPU. They cannot execute terminal commands or use tools.',
    ].join('\r\n');
  }

  async function runLocalModelCommand(pane, commandLine) {
    pane.hostCommandActive = true;

    const rawArgs = commandLine.slice('ghostty-ai'.length).trim();
    const firstSpace = rawArgs.indexOf(' ');
    const verb = (firstSpace === -1 ? rawArgs : rawArgs.slice(0, firstSpace)).toLowerCase();
    const remainder = firstSpace === -1 ? '' : rawArgs.slice(firstSpace + 1).trim();

    try {
      if (!rawArgs || verb === 'help' || verb === '--help' || verb === '-h') {
        writeHostText(pane, `${localModelHelp()}\r\n`);
        return;
      }

      if (verb === 'models' || verb === 'list') {
        writeHostText(pane, `${formatLocalModelList()}\r\n`);
        return;
      }

      if (verb === 'status') {
        writeHostText(pane, `[ghostty-ai] ${localModelRuntime.status}\r\n`);
        writeHostText(pane, `[ghostty-ai] conversation turns: ${Math.floor(pane.aiMessages.length / 2)}\r\n`);
        return;
      }

      if (verb === 'clear') {
        pane.aiMessages = [];
        writeHostText(pane, '[ghostty-ai] conversation cleared\r\n');
        return;
      }

      if (verb === 'unload') {
        writeHostText(pane, '[ghostty-ai] unloading model...\r\n');
        await localModelRuntime.unload();
        forEachPane(candidate => {
          candidate.aiMessages = [];
        });
        writeHostText(pane, '[ghostty-ai] model unloaded\r\n');
        return;
      }

      if (verb === 'load') {
        if (!remainder) {
          throw new Error('Usage: ghostty-ai load <number|model-id>');
        }
        const model = resolveLocalModel(remainder);
        if (!model) {
          throw new Error(`Unknown or ambiguous model "${remainder}". Run \`ghostty-ai models\`.`);
        }
        const previousModelId = localModelRuntime.loadedModel?.id;
        let lastProgress = '';
        await localModelRuntime.load(model, (text, percentage) => {
          if (pane.closed) return;
          const progress = `[ghostty-ai] ${text.replace(/\s+/g, ' ').trim()} ${percentage}%`;
          if (progress === lastProgress) return;
          lastProgress = progress;
          pane.term.write(`\r\x1b[2K${progress}`);
        });
        if (previousModelId !== model.id) {
          forEachPane(candidate => {
            candidate.aiMessages = [];
          });
        }
        writeHostText(pane, `\r\x1b[2K[ghostty-ai] ready: ${model.label}\r\n`);
        return;
      }

      let prompt = verb === 'ask' || verb === 'chat' ? remainder : rawArgs;
      if ((prompt.startsWith('"') && prompt.endsWith('"')) ||
          (prompt.startsWith("'") && prompt.endsWith("'"))) {
        prompt = prompt.slice(1, -1);
      }
      if (!prompt) throw new Error('Usage: ghostty-ai ask <prompt>');

      const controller = new AbortController();
      pane.aiAbortController = controller;
      const userMessage = { role: 'user', content: prompt };
      const messages = [...pane.aiMessages.slice(-10), userMessage];
      const modelLabel = localModelRuntime.loadedModel?.label ?? 'local model';
      writeHostText(pane, `[${modelLabel}] `);
      let response = '';
      response = await localModelRuntime.generate(
        messages,
        text => writeModelText(pane, text),
        controller.signal,
      );
      writeHostText(pane, '\r\n');
      if (!controller.signal.aborted && response) {
        pane.aiMessages = [
          ...messages,
          { role: 'assistant', content: response },
        ].slice(-12);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      writeHostText(pane, `\r\n[ghostty-ai error] ${message}\r\n`);
    } finally {
      finishHostCommand(pane);
    }
  }

  function startHostCommand(pane, command) {
    if (pane.closed) return;
    pane.hostCommandActive = true;
    if (!command) {
      writeHostText(pane, '\r\n[ghostty-ai error] Invalid terminal bridge payload.\r\n');
      finishHostCommand(pane);
      return;
    }
    void runLocalModelCommand(pane, command);
  }

  function forwardPaneInput(pane, podTerm, data) {
    for (const char of data) {
      if (pane.hostCommandActive) {
        if (char === '\x03') {
          if (pane.aiAbortController) {
            pane.aiAbortController.abort();
            writeHostText(pane, '^C\r\n');
          } else if (!pane.loadInterruptNotified) {
            pane.loadInterruptNotified = true;
            writeHostText(pane, '\r\n[ghostty-ai] model loading cannot be interrupted safely\r\n');
          }
        }
        continue;
      }

      if (char === '\r' || char === '\n') {
        const command = pane.inputTriggerBuffer.trim();
        pane.inputTriggerBuffer = '';
        if (command === trigger) {
          podTerm.readData('\x15\r');
          launchGame();
          continue;
        }
      } else if (char === '\x7f' || char === '\b') {
        pane.inputTriggerBuffer = pane.inputTriggerBuffer.slice(0, -1);
      } else if (char === '\x15' || char === '\x03') {
        pane.inputTriggerBuffer = '';
      } else if (char === '\x1b') {
        pane.inputTriggerBuffer = '';
      } else if (char >= ' ') {
        pane.inputTriggerBuffer = (pane.inputTriggerBuffer + char).slice(-256);
      }
      podTerm.readData(char);
    }
  }

  function writePaneOutput(pane, buffer) {
    if (pane.closed) return;
    const bytes = typeof buffer === 'string'
      ? new TextEncoder().encode(buffer)
      : copyOutputBytes(buffer);
    const { output, commands } = filterHostCommandMarkers(pane, bytes);

    if (output.length > 0) {
      appendInspectorOutput(pane, output);
      pane.term.write(toCrlf(output));

      const text = new TextDecoder().decode(output);
      handleOsc52(pane, text);
      pane.triggerBuffer += text;
      if (pane.triggerBuffer.length > trigger.length * 2) {
        pane.triggerBuffer = pane.triggerBuffer.slice(-trigger.length * 2);
      }
      if (pane.triggerBuffer.includes(trigger)) {
        pane.triggerBuffer = '';
        launchGame();
      }
    }
    for (const command of commands) {
      queueMicrotask(() => startHostCommand(pane, command));
    }
  }

  function createPaneInTab(tab, paneId, statusText = '') {
    const paneEl = document.createElement('div');
    paneEl.className = 'split-pane';
    paneEl.dataset.tabId = String(tab.id);
    paneEl.dataset.paneId = String(paneId);
    paneEl.style.cssText = 'position:absolute;overflow:hidden;display:none;';

    const backgroundColorEl = document.createElement('div');
    backgroundColorEl.className = 'pane-background-color';
    const backgroundImageEl = document.createElement('div');
    backgroundImageEl.className = 'pane-background-image';
    const terminalHost = document.createElement('div');
    terminalHost.className = 'pane-terminal-host';
    const [paddingLeft, paddingRight] = parsePadding(configOpts.windowPaddingX);
    const [paddingTop, paddingBottom] = parsePadding(configOpts.windowPaddingY);
    terminalHost.style.padding =
      `${paddingTop}px ${paddingRight}px ${paddingBottom}px ${paddingLeft}px`;
    paneEl.append(backgroundColorEl, backgroundImageEl, terminalHost);

    tab.containerEl.appendChild(paneEl);
    tab.paneEls.set(paneId, paneEl);
    renderTab(tab);

    const useInitialGrid = !initialGridClaimed &&
      configOpts.windowWidth >= 10 &&
      configOpts.windowHeight >= 4;
    if (useInitialGrid) initialGridClaimed = true;
    const term = makeTerminal(useInitialGrid);
    let fit = null;
    if (!useInitialGrid) {
      fit = new FitAddon();
      term.loadAddon(fit);
    }
    term.open(terminalHost);
    if (fit) {
      fit.fit();
      fit.dispose();
      fit = null;
    }

    const pane = {
      paneId,
      tabId: tab.id,
      paneEl,
      terminalHost,
      backgroundColorEl,
      backgroundImageEl,
      term,
      ptyCols: term.cols,
      ptyRows: term.rows,
      podTerm: null,
      process: null,
      processPromise: null,
      inputDisposable: null,
      selectionDisposable: null,
      promptStartDisposable: null,
      commandStartDisposable: null,
      selectionCopyTimer: null,
      triggerBuffer: '',
      inputTriggerBuffer: '',
      osc52Buffer: '',
      aiMessages: [],
      aiAbortController: null,
      hostCommandActive: false,
      hostMarkerBuffer: new Uint8Array(0),
      loadInterruptNotified: false,
      promptReady: false,
      runtimeConfig: configOpts,
      starting: false,
      closed: false,
    };
    tab.panes.set(paneId, pane);
    applyPaneAppearance(pane, configOpts);

    if (statusText) term.write(statusText);

    paneEl.addEventListener('wheel', (e) => {
      const multipliers = pane.runtimeConfig.mouseScrollMultiplier ?? { precision: 1, discrete: 3 };
      const multiplier = e.deltaMode === WheelEvent.DOM_DELTA_PIXEL
        ? multipliers.precision
        : multipliers.discrete;
      if (multiplier && multiplier !== 1) {
        e.preventDefault();
        e.stopImmediatePropagation();
        const synthetic = new WheelEvent('wheel', {
          deltaX: e.deltaX * multiplier,
          deltaY: e.deltaY * multiplier,
          deltaZ: e.deltaZ * multiplier,
          deltaMode: e.deltaMode, bubbles: e.bubbles,
          cancelable: e.cancelable, composed: e.composed,
          ctrlKey: e.ctrlKey, shiftKey: e.shiftKey,
          altKey: e.altKey, metaKey: e.metaKey,
          clientX: e.clientX, clientY: e.clientY,
        });
        pane.term.handleWheelEvent(synthetic);
      }
    }, { capture: true, passive: false });

    paneEl.addEventListener('mousedown', () => {
      activatePane(tab, paneId);
      paneEl.style.cursor = '';
    });
    paneEl.addEventListener('mouseenter', () => {
      if (pane.runtimeConfig.focusFollowsMouse) activatePane(tab, paneId);
    });
    paneEl.addEventListener('mousemove', () => {
      paneEl.style.cursor = '';
    });
    paneEl.addEventListener('click', (event) => {
      if (!pane.runtimeConfig.cursorClickToMove ||
          !pane.promptReady ||
          pane.term.hasSelection() ||
          pane.term.hasMouseTracking() ||
          !pane.podTerm) return;
      const canvas = pane.term.renderer?.getCanvas?.();
      const metrics = pane.term.renderer?.getMetrics?.();
      const cursor = pane.term.wasmTerm?.getCursor?.();
      if (!canvas || !metrics || !cursor) return;
      const bounds = canvas.getBoundingClientRect();
      const row = Math.floor((event.clientY - bounds.top) / metrics.height);
      if (row !== cursor.y) return;
      const column = clamp(Math.floor((event.clientX - bounds.left) / metrics.width), 0, pane.term.cols - 1);
      const distance = column - cursor.x;
      if (distance === 0) return;
      pane.podTerm.readData((distance > 0 ? '\x1b[C' : '\x1b[D').repeat(Math.abs(distance)));
    });

    pane.selectionDisposable = term.onSelectionChange(() => {
      clearTimeout(pane.selectionCopyTimer);
      if (!pane.runtimeConfig.copyOnSelect || !term.hasSelection()) return;
      pane.selectionCopyTimer = setTimeout(() => {
        if (!pane.closed && term.hasSelection()) {
          navigator.clipboard.writeText(selectionText(term, pane.runtimeConfig)).catch(() => {});
        }
      }, 40);
    });
    pane.promptStartDisposable = term.onPromptStart(() => {
      pane.promptReady = true;
    });
    pane.commandStartDisposable = term.onCommandStart(() => {
      pane.promptReady = false;
    });

    setupKeybinds(paneEl, () => pane.term, refs, ghosttyConfigText, tabs);
    return pane;
  }

  function reportPaneError(pane, prefix, error) {
    console.error(prefix, error);
    if (pane && !pane.closed) {
      const message = error instanceof Error ? error.message : String(error);
      pane.term.write(`\r\n[${prefix}: ${message}]\r\n`);
    }
  }

  async function startPaneShell(pane) {
    if (!pod || pane.closed || pane.podTerm || pane.starting) return;
    pane.starting = true;
    try {
      const podTerm = await pod.createCustomTerminal({
        cols: pane.ptyCols,
        rows: pane.ptyRows,
        onOutput: buffer => writePaneOutput(pane, buffer),
      });
      if (pane.closed) return;

      pane.podTerm = podTerm;
      pane.inputDisposable = pane.term.onData((data) => {
        if (!pane.closed && !refs.readonlyMode) {
          if (pane.runtimeConfig.mouseHideWhileTyping) {
            pane.paneEl.style.cursor = 'none';
          }
          const translated = translateKittySequences(data);
          forwardPaneInput(pane, podTerm, translated);
        }
      });
      if (getActivePane() === pane) refs.podTerm = podTerm;

      const configuredPrompt = configOpts.shellPrompt ?? '\\u@browserpod:\\w\\$ ';
      const prompt = configOpts.cursorClickToMove
        ? `\\[\\e]133;A\\a\\]${configuredPrompt}\\[\\e]133;B\\a\\]`
        : configuredPrompt;
      const process = pod.run('bash', ['-c', LOCAL_MODEL_SHELL_BOOTSTRAP], {
        terminal: podTerm,
        env: [`PS1=${prompt}`],
      });
      pane.process = process;
      pane.processPromise = Promise.resolve(process).then(
        () => {
          if (!pane.closed) pane.term.write('\r\n[Shell exited]\r\n');
        },
        error => reportPaneError(pane, 'Shell failed', error),
      );
    } catch (error) {
      reportPaneError(pane, 'Shell failed to start', error);
    } finally {
      pane.starting = false;
    }
  }

  function disposePane(pane) {
    if (!pane || pane.closed) return;
    pane.aiAbortController?.abort();
    pane.aiAbortController = null;
    pane.hostCommandActive = false;
    pane.closed = true;
    pane.inputDisposable?.dispose();
    pane.inputDisposable = null;
    pane.selectionDisposable?.dispose();
    pane.selectionDisposable = null;
    pane.promptStartDisposable?.dispose();
    pane.promptStartDisposable = null;
    pane.commandStartDisposable?.dispose();
    pane.commandStartDisposable = null;
    clearTimeout(pane.selectionCopyTimer);
    pane.selectionCopyTimer = null;
    try {
      pane.podTerm?.readData('\x03exit\r');
    } catch (error) {
      console.warn('Failed to request shell shutdown', error);
    }
    if (refs.podTerm === pane.podTerm) refs.podTerm = null;
    pane.term.dispose();
    pane.paneEl.remove();
  }

  async function createTab(statusText = '') {
    const id = nextTabId++;
    const label = `~ ${tabList.length + 1}`;

    const containerEl = document.createElement('div');
    containerEl.style.cssText = 'position:absolute;inset:0;display:none;z-index:1;';
    terminalsEl.appendChild(containerEl);

    const { tree: splitTree, paneId } = SplitTree.withRoot();
    const paneEls = new Map();
    const panes = new Map();
    const tab = { id, label, splitTree, panes, paneEls, layout: null, activePaneId: paneId, containerEl, btn: null };
    tab.layout = new SplitLayout(containerEl, (nodeIdx, newRatio) => {
      splitTree.nodes[nodeIdx].ratio = newRatio;
      renderTab(tab);
    });
    tabList.push(tab);
    switchTab(id);

    const pane = createPaneInTab(tab, paneId, statusText);
    activatePane(tab, paneId);
    await startPaneShell(pane);
    return tab;
  }

  async function newSplit(direction) {
    const tab = getActiveTab();
    if (!tab) return;
    const zoomedPaneId = tab.splitTree.zoomedPaneId;
    const newPaneId = tab.splitTree.insertPane(tab.activePaneId, direction);
    if (newPaneId === null) return;

    // Measure the new pane in the unzoomed layout, then restore the stable
    // pane-ID zoom target before the shell starts.
    if (zoomedPaneId !== null) tab.splitTree.zoomedPaneId = null;
    tab.activePaneId = newPaneId;
    const pane = createPaneInTab(tab, newPaneId, pod ? '' : 'Booting BrowserPod...\r\n');
    if (zoomedPaneId !== null) {
      tab.splitTree.zoomedPaneId = zoomedPaneId;
      tab.activePaneId = zoomedPaneId;
      renderTab(tab);
    } else {
      activatePane(tab, newPaneId);
    }
    await startPaneShell(pane);
    if (zoomedPaneId !== null) tab.panes.get(zoomedPaneId)?.term.focus();
  }

  function gotoSplit(direction) {
    const tab = getActiveTab();
    if (!tab) return;
    const targetId = (direction === 'previous' || direction === 'next')
      ? tab.splitTree.gotoSequential(tab.activePaneId, direction)
      : tab.splitTree.gotoSpatial(tab.activePaneId, direction);
    if (targetId == null) return;
    tab.activePaneId = targetId;
    const pane = tab.panes.get(targetId);
    if (pane) { refs.podTerm = pane.podTerm; pane.term.focus(); }
    renderTab(tab);
  }

  function toggleSplitZoom() {
    const tab = getActiveTab();
    if (!tab) return;
    tab.splitTree.toggleZoom(tab.activePaneId);
    renderTab(tab);
    tab.panes.get(tab.activePaneId)?.term.focus();
  }

  function equalizeSplits() {
    const tab = getActiveTab();
    if (!tab) return;
    tab.splitTree.equalize();
    renderTab(tab);
  }

  function resizeSplit(direction, amount) {
    const tab = getActiveTab();
    if (!tab) return;
    const totalPx = (direction === 'left' || direction === 'right')
      ? tab.containerEl.offsetWidth : tab.containerEl.offsetHeight;
    tab.splitTree.resizePane(tab.activePaneId, direction, amount, totalPx);
    renderTab(tab);
  }

  function closePane() {
    const tab = getActiveTab();
    if (!tab) return;
    const paneId = tab.activePaneId;

    // If this is the only pane in the tab, close the whole tab.
    if (!tab.splitTree.isSplit) {
      removeTab(tab.id);
      return;
    }

    // Find a sibling pane to focus after removal.
    const nextPaneId = tab.splitTree.gotoSequential(paneId, 'next')
      ?? tab.splitTree.gotoSequential(paneId, 'previous');

    // Remove from tree and dispose the terminal.
    tab.splitTree.removePane(paneId);
    const pane = tab.panes.get(paneId);
    if (pane) {
      disposePane(pane);
      tab.panes.delete(paneId);
      tab.paneEls.delete(paneId);
    }

    // Switch focus to the sibling.
    if (nextPaneId != null) {
      tab.activePaneId = nextPaneId;
      const next = tab.panes.get(nextPaneId);
      if (next) { refs.podTerm = next.podTerm; next.term.focus(); }
    }

    renderTab(tab);
  }

  tabs = {
    newTab: () => { void createTab(pod ? '' : 'Booting BrowserPod...\r\n'); },
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
    lastTab: () => { if (tabList.length) switchTab(tabList[tabList.length - 1].id); },
    closeTab: () => { if (activeTabId !== null) removeTab(activeTabId); },
    gotoTab: (n) => { const tab = tabList[n - 1]; if (tab) switchTab(tab.id); },
    getActive: () => tabList.find(t => t.id === activeTabId) ?? null,
    newSplit,
    gotoSplit,
    toggleSplitZoom,
    equalizeSplits,
    resizeSplit,
    closePane,
  };

  addBtn.addEventListener('click', () => tabs.newTab());

  const { openConfigDialog } = setupConfigDialog(getActivePane);
  refs.openConfigDialog = openConfigDialog;

  let previewVersion = 0;
  const previewConfigState = async (state) => {
    const version = ++previewVersion;
    const previewConfig = await runtimeConfigFromPanelState(configOpts, state);
    if (version !== previewVersion) return;
    applyWindowAppearance(previewConfig);
    forEachPane(pane => applyPaneAppearance(pane, previewConfig));
  };

  const { toggleInspector } = setupContextMenu({
    configOpts,
    refs,
    getActivePane,
    activatePaneElement,
    openConfigDialog,
    openAbout,
    previewConfigState,
  });
  refs.toggleInspector = toggleInspector;

  await createTab('Booting BrowserPod...\r\n');

  window.addEventListener('resize', () => {
    const activeTab = getActiveTab();
    if (activeTab) renderTab(activeTab);
  });

  try {
    pod = await BrowserPod.boot({
      apiKey: import.meta.env.VITE_BP_APIKEY,
      storageKey: 'ghostty',
    });
  } catch (error) {
    reportPaneError(getActivePane(), 'BrowserPod failed to boot', error);
    throw error;
  }

  const pendingPanes = [];
  forEachPane((pane) => {
    if (!pane.closed && !pane.podTerm) pendingPanes.push(startPaneShell(pane));
  });
  await Promise.all(pendingPanes);
  getActivePane()?.term.focus();
}

main().catch((err) => {
  console.error(err);
});
