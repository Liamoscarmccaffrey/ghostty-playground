// Settings data ported from ghostty-config-main/src/lib/data/settings.ts
// Types stripped, theme fetch replaced with local /themes/ directory.

import { idToConfigKey } from './config-utils.js';

// ─── Theme browser data (ported from ghostty-style-lab) ──────────────────────

const THEME_DATA = {
  'Catppuccin Mocha':      { bg: '#1e1e2e', fg: '#cdd6f4', accent: '#89b4fa', swatches: ['#1e1e2e','#f38ba8','#a6e3a1','#f9e2af','#89b4fa','#cdd6f4'] },
  'TokyoNight Storm':      { bg: '#24283b', fg: '#c0caf5', accent: '#7aa2f7', swatches: ['#24283b','#f7768e','#9ece6a','#e0af68','#7aa2f7','#c0caf5'] },
  'TokyoNight Night':      { bg: '#1a1b26', fg: '#c0caf5', accent: '#7dcfff', swatches: ['#1a1b26','#f7768e','#9ece6a','#e0af68','#7dcfff','#c0caf5'] },
  'Rose Pine Moon':        { bg: '#232136', fg: '#e0def4', accent: '#c4a7e7', swatches: ['#232136','#eb6f92','#9ccfd8','#f6c177','#c4a7e7','#e0def4'] },
  'Kanagawa Wave':         { bg: '#1f1f28', fg: '#dcd7ba', accent: '#7e9cd8', swatches: ['#1f1f28','#e46876','#98bb6c','#e6c384','#7e9cd8','#dcd7ba'] },
  'Dracula':               { bg: '#282a36', fg: '#f8f8f2', accent: '#8be9fd', swatches: ['#282a36','#ff5555','#50fa7b','#f1fa8c','#bd93f9','#f8f8f2'] },
  'GitHub Dark':           { bg: '#0d1117', fg: '#c9d1d9', accent: '#58a6ff', swatches: ['#0d1117','#ff7b72','#3fb950','#d29922','#58a6ff','#c9d1d9'] },
  'Gruvbox Material Dark': { bg: '#282828', fg: '#d4be98', accent: '#7daea3', swatches: ['#282828','#ea6962','#a9b665','#d8a657','#7daea3','#d4be98'] },
  'Everforest Dark Hard':  { bg: '#1e2326', fg: '#d3c6aa', accent: '#7fbbb3', swatches: ['#1e2326','#e67e80','#a7c080','#dbbc7f','#7fbbb3','#d3c6aa'] },
  'Carbonfox':             { bg: '#161616', fg: '#f2f4f8', accent: '#78a9ff', swatches: ['#161616','#ee5396','#25be6a','#08bdba','#78a9ff','#f2f4f8'] },
  'Ayu Mirage':            { bg: '#1f2430', fg: '#cbccc6', accent: '#73d0ff', swatches: ['#1f2430','#ff3333','#bae67e','#ffd580','#73d0ff','#cbccc6'] },
  'Flexoki Dark':          { bg: '#100f0f', fg: '#cecdc3', accent: '#205ea6', swatches: ['#100f0f','#af3029','#66800b','#ad8301','#205ea6','#cecdc3'] },
  'Catppuccin Latte':      { bg: '#eff1f5', fg: '#4c4f69', accent: '#1e66f5', swatches: ['#eff1f5','#d20f39','#40a02b','#df8e1d','#1e66f5','#4c4f69'] },
  'GitHub Light Default':  { bg: '#ffffff', fg: '#24292f', accent: '#0969da', swatches: ['#ffffff','#cf222e','#1a7f37','#9a6700','#0969da','#24292f'] },
  'TokyoNight Day':        { bg: '#e1e2e7', fg: '#3760bf', accent: '#2e7de9', swatches: ['#e1e2e7','#f52a65','#587539','#8c6c3e','#2e7de9','#3760bf'] },
  'Rose Pine Dawn':        { bg: '#faf4ed', fg: '#575279', accent: '#907aa9', swatches: ['#faf4ed','#b4637a','#56949f','#ea9d34','#907aa9','#575279'] },
  'Ayu Light':             { bg: '#fafafa', fg: '#5c6773', accent: '#41a6d9', swatches: ['#fafafa','#f07178','#86b300','#f2ae49','#41a6d9','#5c6773'] },
  'Flexoki Light':         { bg: '#fffcf0', fg: '#100f0f', accent: '#205ea6', swatches: ['#fffcf0','#af3029','#66800b','#ad8301','#205ea6','#100f0f'] },
};

const THEME_CATEGORIES = [
  { title: 'Recommended',   themes: ['Catppuccin Mocha', 'TokyoNight Storm', 'Gruvbox Material Dark', 'GitHub Dark'] },
  { title: 'Cool / Focus',  themes: ['TokyoNight Night', 'TokyoNight Storm', 'Carbonfox', 'Dracula'] },
  { title: 'Soft / Eyecare',themes: ['Everforest Dark Hard', 'Gruvbox Material Dark', 'Flexoki Dark', 'Kanagawa Wave', 'Rose Pine Moon', 'Ayu Mirage'] },
  { title: 'High contrast', themes: ['GitHub Dark', 'Dracula', 'Carbonfox'] },
  { title: 'Light',         themes: ['Catppuccin Latte', 'GitHub Light Default', 'TokyoNight Day', 'Rose Pine Dawn', 'Ayu Light', 'Flexoki Light'] },
];

const SETTINGS_PANELS = [
  {
    id: 'themes',
    name: 'Themes',
    groups: [
      {
        id: 'browser',
        name: '',
        settings: [
          { id: 'theme', name: 'Color theme', note: 'Leave empty to use explicit color settings only.', type: 'theme', value: '', options: [] },
          { id: '_themeBrowser', name: '', type: 'theme-browser' },
        ]
      },
    ]
  },
  {
    id: 'colors',
    name: 'Colors',
    groups: [
      {
        id: 'base',
        name: 'Base Colors',
        settings: [
          { id: 'background', name: 'Background color', type: 'color', value: '#282c34' },
          { id: 'foreground', name: 'Foreground color', type: 'color', value: '#ffffff' },
          { id: 'boldColor', name: 'Bold color', note: 'Use a color, <code>bright</code>, or leave empty.', type: 'text', value: '', placeholder: 'bright or #rrggbb' },
          { id: 'faintOpacity', name: 'Faint text opacity', type: 'range', value: 0.5, min: 0, max: 1, step: 0.05 },
          { id: 'minimumContrast', name: 'Minimum contrast', type: 'range', value: 1, min: 1, max: 21, step: 0.1 },
          { id: 'selectionBackground', name: 'Selection background color', type: 'color', value: '' },
          { id: 'selectionForeground', name: 'Selection foreground color', type: 'color', value: '' },
        ]
      },
      {
        id: 'cursor',
        name: 'Cursor',
        settings: [
          { id: 'cursorColor', name: 'Cursor color', type: 'color', value: '' },
          { id: 'cursorOpacity', name: 'Cursor opacity', type: 'range', value: 1, min: 0, max: 1, step: 0.05 },
          { id: 'cursorStyle', name: 'Cursor style', type: 'dropdown', value: 'block', options: ['block', 'bar', 'underline', 'block_hollow'] },
          { id: 'cursorStyleBlink', name: 'Cursor blink', type: 'dropdown', value: '', options: ['true', 'false', { value: '', name: 'default' }] },
        ]
      },
      {
        id: 'palette',
        name: 'Color Palette',
        settings: [
          {
            id: 'palette',
            name: '',
            type: 'palette',
            value: [
              '#000000', '#cd3131', '#0dbc79', '#e5e510',
              '#2472c8', '#bc3fbc', '#11a8cd', '#e5e5e5',
              '#666666', '#f14c4c', '#23d18b', '#f5f543',
              '#3b8eea', '#d670d6', '#29b8db', '#e5e5e5',
            ],
          }
        ]
      }
    ]
  },
  {
    id: 'background',
    name: 'Background',
    groups: [
      {
        id: 'image',
        name: 'Background Image',
        settings: [
          { id: 'backgroundImage', name: 'Image', note: 'Choose a browser-local image or enter a URL/path.', type: 'file', value: '', placeholder: 'https://example.com/image.png' },
          { id: 'backgroundImageOpacity', name: 'Image opacity', note: 'Multiplied by background opacity; values above 1 are valid.', type: 'number', value: 1, min: 0, step: 0.05 },
          {
            id: 'backgroundImagePosition',
            name: 'Image position',
            type: 'dropdown',
            value: 'center',
            options: [
              'top-left', 'top-center', 'top-right',
              'center-left', 'center', 'center-right',
              'bottom-left', 'bottom-center', 'bottom-right',
            ],
          },
          { id: 'backgroundImageFit', name: 'Image fit', type: 'dropdown', value: 'contain', options: ['contain', 'cover', 'stretch', 'none'] },
          { id: 'backgroundImageRepeat', name: 'Repeat image', type: 'switch', value: false },
        ]
      }
    ]
  },
  {
    id: 'fonts',
    name: 'Fonts',
    groups: [
      {
        id: 'general',
        name: 'General',
        settings: [
          { id: 'fontSize', name: 'Font size', type: 'range', value: 14, min: 4, max: 60, step: 0.5 },
          { id: 'fontThicken', name: 'Thicken font strokes', type: 'switch', value: false },
          { id: 'fontThickenStrength', name: 'Thickening strength', type: 'range', value: 255, min: 0, max: 255, step: 1 },
        ]
      },
      {
        id: 'family',
        name: 'Font Family',
        settings: [
          { id: 'fontFamily', name: 'Regular', type: 'text', value: '', placeholder: 'monospace' },
          { id: 'fontFamilyBold', name: 'Bold', type: 'text', value: '', placeholder: 'Falls back to regular' },
          { id: 'fontFamilyItalic', name: 'Italic', type: 'text', value: '', placeholder: 'Falls back to regular' },
          { id: 'fontFamilyBoldItalic', name: 'Bold italic', type: 'text', value: '', placeholder: 'Falls back to regular' },
        ]
      }
    ]
  },
  {
    id: 'window',
    name: 'Window',
    groups: [
      {
        id: 'appearance',
        name: 'Appearance',
        settings: [
          { id: 'backgroundOpacity', name: 'Background opacity', type: 'range', value: 1, min: 0, max: 1, step: 0.05 },
          { id: 'windowTheme', name: 'Window theme', type: 'dropdown', value: 'auto', options: ['auto', 'system', 'light', 'dark', 'ghostty'] },
          { id: 'windowDecoration', name: 'Window decoration', type: 'dropdown', value: 'auto', options: ['auto', 'client', 'server', 'none'] },
        ]
      },
      {
        id: 'padding',
        name: 'Padding',
        settings: [
          { id: 'windowPaddingX', name: 'Horizontal padding', note: 'One value, or left and right separated by a comma.', type: 'text', value: '2', placeholder: '2 or 2,4' },
          { id: 'windowPaddingY', name: 'Vertical padding', note: 'One value, or top and bottom separated by a comma.', type: 'text', value: '2', placeholder: '2 or 2,4' },
        ]
      },
      {
        id: 'initial-size',
        name: 'Initial Grid Size',
        settings: [
          { id: 'windowWidth', name: 'Columns', note: 'Both columns and rows must be set. Minimum 10.', type: 'number', value: 0, min: 0, step: 1 },
          { id: 'windowHeight', name: 'Rows', note: 'Both columns and rows must be set. Minimum 4.', type: 'number', value: 0, min: 0, step: 1 },
        ]
      }
    ]
  },
  {
    id: 'terminal',
    name: 'Terminal',
    groups: [
      {
        id: 'shell',
        name: 'Shell',
        settings: [
          { id: 'shellPrompt', name: 'Shell prompt', note: 'Sets <code>PS1</code> for newly created shells.', type: 'text', value: '' },
        ]
      },
      {
        id: 'scrolling',
        name: 'Scrolling',
        settings: [
          { id: 'scrollbackLimit', name: 'Scrollback buffer (bytes)', type: 'number', value: 10000000, min: 0, size: 10 },
          { id: 'smoothScrollDuration', name: 'Smooth scroll duration (ms)', type: 'number', value: 100, min: 0, step: 1, size: 6 },
          { id: 'preserveScrollOnWrite', name: 'Preserve scroll position on output', type: 'switch', value: false },
        ]
      }
    ]
  },
  {
    id: 'mouse',
    name: 'Mouse',
    groups: [
      {
        id: 'main',
        name: '',
        settings: [
          {
            id: 'mouseScrollMultiplier',
            name: 'Scroll multiplier',
            note: 'Accepts a number or Ghostty syntax such as <code>precision:1,discrete:3</code>.',
            type: 'text',
            value: 'precision:1,discrete:3',
            placeholder: 'precision:1,discrete:3',
          },
          { id: 'mouseHideWhileTyping', name: 'Hide pointer while typing', type: 'switch', value: false },
          { id: 'cursorClickToMove', name: 'Click to move at shell prompts', type: 'switch', value: true },
          { id: 'focusFollowsMouse', name: 'Focus follows mouse', type: 'switch', value: false },
        ]
      }
    ]
  },
  {
    id: 'clipboard',
    name: 'Clipboard',
    groups: [
      {
        id: 'access',
        name: 'Access',
        settings: [
          { id: 'clipboardRead', name: 'Terminal clipboard read', type: 'dropdown', value: 'ask', options: ['ask', 'allow', 'deny'] },
          { id: 'clipboardWrite', name: 'Terminal clipboard write', type: 'dropdown', value: 'allow', options: ['ask', 'allow', 'deny'] },
          {
            id: 'copyOnSelect',
            name: 'Copy selection automatically',
            type: 'dropdown',
            value: 'true',
            options: ['true', 'false', 'clipboard'],
          },
          { id: 'clipboardTrimTrailingSpaces', name: 'Trim trailing spaces when copying', type: 'switch', value: true },
        ]
      }
    ]
  },
  {
    id: 'keybinds',
    name: 'Keybinds',
    groups: [
      {
        id: 'main',
        name: '',
        settings: [
          { id: 'keybind', name: '', type: 'keybinds', value: [] },
        ]
      }
    ]
  },
];

// Build defaults map from settings data
const DEFAULTS = {};
for (const panel of SETTINGS_PANELS) {
  for (const group of panel.groups) {
    for (const setting of group.settings) {
      DEFAULTS[setting.id] = setting.value;
    }
  }
}

// Parse a Ghostty config string into a flat camelCase object (same logic as parse.ts)
export function parseConfigToState(configString) {
  const re = /^\s*([a-z][a-z0-9-]*)[\s]*=\s*(.*)\s*$/;
  const colorKeys = ['background', 'foreground', 'cursor-color', 'selection-background', 'selection-foreground'];
  const result = { keybind: [] };

  for (const l of configString.split('\n')) {
    const line = l.trim();
    if (!line || line.startsWith('#')) continue;
    const match = re.exec(line);
    if (!match) continue;
    const key = match[1].trim();
    const value = match[2].trim();

    if (key === 'palette') {
      const split = value.split('=');
      const num = parseInt(split[0].trim(), 10);
      const color = split[1]?.trim();
      if (!isNaN(num) && num >= 0 && num < 16 && color) {
        if (!result.palette) result.palette = Array(16).fill('');
        result.palette[num] = color.startsWith('#') ? color : `#${color}`;
      }
    } else if (key === 'keybind') {
      result.keybind.push(value);
    } else {
      const parts = key.split('-');
      let camel = parts[0];
      for (let i = 1; i < parts.length; i++) {
        camel += parts[i][0].toUpperCase() + parts[i].slice(1);
      }
      if (colorKeys.includes(key) && value.length === 6 && !value.startsWith('#')) {
        result[camel] = `#${value}`;
      } else {
        // Strip surrounding quotes from path values (e.g. background-image = "/path/to/img.png")
        result[camel] = value.replace(/^["']|["']$/g, '');
      }
    }
  }
  return result;
}

// Serialise state back to Ghostty config text.
// Writes only settings explicitly changed in the panel.
export function serialiseState(state, dirtyIds) {
  const lines = [];

  for (const panel of SETTINGS_PANELS) {
    for (const group of panel.groups) {
      for (const setting of group.settings) {
        const id = setting.id;
        if (id.startsWith('_')) continue; // internal UI-only settings
        if (!dirtyIds.has(id)) continue;

        const val = state[id];

        if (id === 'palette') {
          const statePalette = val || [];
          for (let i = 0; i < 16; i++) {
            if (statePalette[i]) {
              lines.push(`palette = ${i}=${statePalette[i]}`);
            }
          }
        } else if (id === 'keybind') {
          const keybinds = val || [];
          for (const kb of keybinds) {
            if (kb && kb.trim()) lines.push(`keybind = ${kb.trim()}`);
          }
        } else if (val !== undefined && val !== '') {
          lines.push(`${idToConfigKey(id)} = ${val}`);
        }
      }
    }
  }
  return lines.join('\n');
}

// Fetch local theme list from generated /themes.json index
async function fetchLocalThemeNames() {
  try {
    const res = await fetch('/themes.json');
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

// Fetch and parse a local theme file, return partial state object
async function fetchThemeState(name) {
  const res = await fetch(`/themes/${encodeURIComponent(name)}`);
  if (!res.ok) throw new Error(`Theme not found: ${name}`);
  const text = await res.text();
  return parseConfigToState(text);
}

// ─── UI ──────────────────────────────────────────────────────────────────────

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function createSwitch(id, value, onChange) {
  const label = document.createElement('label');
  label.className = 'cp-switch';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = value === true || value === 'true';
  input.addEventListener('change', () => onChange(input.checked));
  const track = document.createElement('span');
  track.className = 'cp-switch-track';
  label.appendChild(input);
  label.appendChild(track);
  return label;
}

function createText(id, value, onChange, placeholder) {
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'cp-input';
  input.value = value ?? '';
  if (placeholder) input.placeholder = placeholder;
  input.addEventListener('input', () => onChange(input.value));
  return input;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => resolve(String(reader.result)));
    reader.addEventListener('error', () => reject(reader.error));
    reader.readAsDataURL(file);
  });
}

function createFile(id, value, onChange, onFileData, placeholder) {
  const wrap = document.createElement('div');
  wrap.className = 'cp-file-wrap';

  const text = createText(id, value, (nextValue) => {
    onChange(nextValue);
    onFileData(null);
  }, placeholder);
  text.classList.add('cp-file-text');

  const picker = document.createElement('input');
  picker.type = 'file';
  picker.accept = 'image/png,image/jpeg,image/webp,image/gif,image/avif';
  picker.hidden = true;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'cp-btn';
  button.textContent = 'Choose';
  button.addEventListener('click', () => picker.click());
  picker.addEventListener('change', async () => {
    const file = picker.files?.[0];
    if (!file) return;
    const path = file.name;
    text.value = path;
    onChange(path);
    try {
      onFileData(await readFileAsDataUrl(file));
    } catch (error) {
      console.error('[config] failed to read background image', error);
      onFileData(null);
    }
  });

  wrap.append(text, button, picker);
  return wrap;
}

function createNumber(id, value, onChange, setting) {
  const input = document.createElement('input');
  input.type = 'number';
  input.className = 'cp-input cp-input-number';
  if (value !== undefined) input.value = value;
  if (setting.min !== undefined) input.min = setting.min;
  if (setting.max !== undefined) input.max = setting.max;
  if (setting.step !== undefined) input.step = setting.step;
  if (setting.placeholder) input.placeholder = setting.placeholder;
  input.addEventListener('input', () => {
    const v = input.value === '' ? undefined : parseFloat(input.value);
    onChange(v);
  });
  return input;
}

function createRange(id, value, onChange, setting) {
  const wrap = document.createElement('div');
  wrap.className = 'cp-range-wrap';
  const input = document.createElement('input');
  input.type = 'range';
  input.className = 'cp-range';
  input.min = setting.min;
  input.max = setting.max;
  input.step = setting.step ?? 1;
  input.value = value ?? setting.value;
  const label = document.createElement('span');
  label.className = 'cp-range-label';
  label.textContent = input.value;
  input.addEventListener('input', () => {
    label.textContent = input.value;
    onChange(parseFloat(input.value));
  });
  wrap.appendChild(input);
  wrap.appendChild(label);
  return wrap;
}

function createDropdown(id, value, onChange, options) {
  const select = document.createElement('select');
  select.className = 'cp-select';
  for (const opt of options) {
    const el = document.createElement('option');
    if (typeof opt === 'string') {
      el.value = opt;
      el.textContent = opt || '(default)';
    } else {
      el.value = opt.value;
      el.textContent = opt.name;
    }
    if (el.value === (value ?? '')) el.selected = true;
    select.appendChild(el);
  }
  select.addEventListener('change', () => onChange(select.value));
  return select;
}

function createColor(id, value, onChange) {
  const wrap = document.createElement('div');
  wrap.className = 'cp-color-wrap';
  const swatch = document.createElement('input');
  swatch.type = 'color';
  swatch.className = 'cp-color-swatch';
  swatch.value = value || '#000000';
  const text = document.createElement('input');
  text.type = 'text';
  text.className = 'cp-input cp-color-text';
  text.value = value || '';
  text.placeholder = '#rrggbb';
  swatch.addEventListener('input', () => {
    text.value = swatch.value;
    onChange(swatch.value);
  });
  text.addEventListener('input', () => {
    const v = text.value.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(v)) swatch.value = v;
    onChange(v);
  });
  wrap.appendChild(swatch);
  wrap.appendChild(text);
  return wrap;
}

function createPalette(id, values, onChange) {
  const wrap = document.createElement('div');
  wrap.className = 'cp-palette-grid';
  const NAMES = ['Black','Red','Green','Yellow','Blue','Magenta','Cyan','White',
    'Bright Black','Bright Red','Bright Green','Bright Yellow','Bright Blue','Bright Magenta','Bright Cyan','Bright White'];
  const current = [...(values || Array(16).fill(''))];
  for (let i = 0; i < 16; i++) {
    const cell = document.createElement('div');
    cell.className = 'cp-palette-cell';
    const swatch = document.createElement('input');
    swatch.type = 'color';
    swatch.className = 'cp-palette-swatch';
    swatch.value = current[i] || '#000000';
    swatch.title = `${i}: ${NAMES[i]}`;
    swatch.addEventListener('input', () => {
      current[i] = swatch.value;
      onChange([...current]);
    });
    const name = document.createElement('span');
    name.className = 'cp-palette-name';
    name.textContent = NAMES[i];
    cell.appendChild(swatch);
    cell.appendChild(name);
    wrap.appendChild(cell);
  }
  return wrap;
}

const ALL_ACTIONS = [
  // Clipboard
  'copy_to_clipboard',
  'copy_to_clipboard:plain',
  'copy_to_clipboard:html',
  'copy_url_to_clipboard',
  'copy_title_to_clipboard',
  'paste_from_clipboard',
  'paste_from_selection',
  // Selection
  'select_all',
  'adjust_selection:left',
  'adjust_selection:right',
  'adjust_selection:up',
  'adjust_selection:down',
  'adjust_selection:page_up',
  'adjust_selection:page_down',
  'adjust_selection:home',
  'adjust_selection:end',
  'adjust_selection:beginning_of_line',
  'adjust_selection:end_of_line',
  // Screen / scrollback
  'clear_screen',
  'scroll_to_top',
  'scroll_to_bottom',
  'scroll_to_selection',
  'scroll_page_up',
  'scroll_page_down',
  'scroll_page_lines:N',
  'scroll_page_fractional:0.5',
  'jump_to_prompt:1',
  'jump_to_prompt:-1',
  // Font size
  'increase_font_size:1',
  'decrease_font_size:1',
  'reset_font_size',
  'set_font_size:14',
  // Search
  'start_search',
  'end_search',
  'search_selection',
  'navigate_search:next',
  'navigate_search:previous',
  // Tabs
  'new_tab',
  'previous_tab',
  'next_tab',
  'last_tab',
  'goto_tab:1',
  'move_tab:1',
  'close_tab',
  'toggle_tab_overview',
  'prompt_tab_title',
  // Splits
  'new_split',
  'new_split:right',
  'new_split:down',
  'goto_split:right',
  'goto_split:left',
  'goto_split:up',
  'goto_split:down',
  'goto_split:previous',
  'goto_split:next',
  'toggle_split_zoom',
  'resize_split:right,10',
  'resize_split:left,10',
  'equalize_splits',
  // Windows
  'new_window',
  'close_surface',
  'close_window',
  'close_all_windows',
  'goto_window:next',
  'goto_window:previous',
  'toggle_maximize',
  'toggle_fullscreen',
  'toggle_window_decorations',
  'toggle_window_float_on_top',
  'reset_window_size',
  'prompt_surface_title',
  // Terminal inspector / config
  'inspector:toggle',
  'inspector:show',
  'inspector:hide',
  'open_config',
  'reload_config',
  // Visibility / appearance
  'toggle_quick_terminal',
  'toggle_visibility',
  'toggle_background_opacity',
  'toggle_tab_overview',
  'toggle_command_palette',
  'toggle_secure_input',
  'toggle_mouse_reporting',
  'toggle_readonly',
  // Input / sequences
  'text:\\xNN',
  'esc:X',
  'csi:sequence',
  'cursor_key',
  'end_key_sequence',
  'activate_key_table:name',
  'activate_key_table_once:name',
  'deactivate_key_table',
  'deactivate_all_key_tables',
  // Scrollback files
  'write_scrollback_file:copy',
  'write_scrollback_file:paste',
  'write_scrollback_file:open',
  'write_screen_file:copy',
  'write_selection_file:copy',
  // Misc
  'reset',
  'ignore',
  'unbind',
  'undo',
  'redo',
  'check_for_updates',
  'show_on_screen_keyboard',
  'quit',
];

function createKeybinds(id, value, onChange) {
  const bindings = [...(value || [])];
  const wrap = document.createElement('div');
  wrap.className = 'cp-keybinds-wrap';

  // Available actions reference
  const refHeading = document.createElement('div');
  refHeading.className = 'cp-group-title';
  refHeading.style.marginBottom = '6px';
  refHeading.textContent = 'Available actions';
  wrap.appendChild(refHeading);

  const refList = document.createElement('div');
  refList.className = 'cp-kb-ref-list';
  for (const action of ALL_ACTIONS) {
    const item = document.createElement('div');
    item.className = 'cp-kb-ref-item';
    item.textContent = action;
    item.title = 'Click to insert';
    item.addEventListener('click', () => {
      bindings.push(`=${action}`);
      onChange([...bindings]);
      render();
      const inputs = editArea.querySelectorAll('.cp-kb-input');
      const last = inputs[inputs.length - 1];
      if (last) { last.focus(); last.setSelectionRange(0, 0); }
    });
    refList.appendChild(item);
  }
  wrap.appendChild(refList);

  const editHeading = document.createElement('div');
  editHeading.className = 'cp-group-title';
  editHeading.style.margin = '12px 0 6px';
  editHeading.textContent = 'Configured keybinds';
  wrap.appendChild(editHeading);

  const editArea = document.createElement('div');
  wrap.appendChild(editArea);

  function render() {
    editArea.innerHTML = '';
    for (let i = 0; i < bindings.length; i++) {
      const row = document.createElement('div');
      row.className = 'cp-kb-row';
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'cp-input cp-kb-input';
      input.value = bindings[i];
      input.placeholder = 'e.g. ctrl+shift+c=copy_to_clipboard';
      input.addEventListener('input', () => {
        bindings[i] = input.value;
        onChange([...bindings]);
      });
      const del = document.createElement('button');
      del.className = 'cp-kb-del';
      del.textContent = '×';
      del.title = 'Remove';
      del.addEventListener('click', () => {
        bindings.splice(i, 1);
        onChange([...bindings]);
        render();
      });
      row.appendChild(input);
      row.appendChild(del);
      editArea.appendChild(row);
    }
    const addBtn = document.createElement('button');
    addBtn.className = 'cp-btn cp-kb-add';
    addBtn.textContent = '+ Add keybind';
    addBtn.addEventListener('click', () => {
      bindings.push('');
      onChange([...bindings]);
      render();
      const inputs = editArea.querySelectorAll('.cp-kb-input');
      inputs[inputs.length - 1]?.focus();
    });
    editArea.appendChild(addBtn);
  }

  render();
  return wrap;
}

function createThemePicker(id, value, onChange, themeNames) {
  const wrap = document.createElement('div');
  wrap.className = 'cp-theme-wrap';
  const search = document.createElement('input');
  search.type = 'text';
  search.className = 'cp-input';
  search.placeholder = 'Search themes…';
  search.value = '';
  const list = document.createElement('select');
  list.className = 'cp-select cp-theme-list';
  list.size = 8;

  function populate(filter) {
    list.innerHTML = '';
    const none = document.createElement('option');
    none.value = '';
    none.textContent = '(none)';
    if (!value) none.selected = true;
    list.appendChild(none);
    for (const name of themeNames) {
      if (filter && !name.toLowerCase().includes(filter.toLowerCase())) continue;
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      if (name === value) opt.selected = true;
      list.appendChild(opt);
    }
  }

  populate('');
  search.addEventListener('input', () => populate(search.value));
  list.addEventListener('change', () => onChange(list.value));
  wrap.appendChild(search);
  wrap.appendChild(list);
  return wrap;
}

function createThemeBrowser(currentTheme, onSelect) {
  const wrap = document.createElement('div');
  wrap.className = 'cp-theme-browser';

  // Search bar across all themes
  const search = document.createElement('input');
  search.type = 'text';
  search.className = 'cp-input';
  search.placeholder = 'Search themes…';
  search.style.marginBottom = '12px';
  wrap.appendChild(search);

  const categoriesEl = document.createElement('div');
  wrap.appendChild(categoriesEl);

  function render(filter) {
    categoriesEl.innerHTML = '';
    // Collect all theme names from local list too (fetched externally)
    const localNames = wrap._localThemeNames || [];
    const allKnown = new Set([...Object.keys(THEME_DATA), ...localNames]);
    const filtered = filter ? [...allKnown].filter(n => n.toLowerCase().includes(filter.toLowerCase())) : null;

    if (filtered) {
      // Flat search results
      const grid = document.createElement('div');
      grid.className = 'cp-tb-grid';
      for (const name of filtered) {
        grid.appendChild(makeChip(name));
      }
      categoriesEl.appendChild(grid);
      return;
    }

    // Categorized view
    for (const cat of THEME_CATEGORIES) {
      const section = document.createElement('div');
      section.className = 'cp-tb-category';
      const head = document.createElement('div');
      head.className = 'cp-tb-cat-head';
      head.textContent = cat.title;
      section.appendChild(head);
      const grid = document.createElement('div');
      grid.className = 'cp-tb-grid';
      for (const name of cat.themes) {
        grid.appendChild(makeChip(name));
      }
      section.appendChild(grid);
      categoriesEl.appendChild(section);
    }

    // "All local themes" section for themes not in categories
    const categorised = new Set(THEME_CATEGORIES.flatMap(c => c.themes));
    const extra = localNames.filter(n => !categorised.has(n) && !THEME_DATA[n]);
    if (extra.length) {
      const section = document.createElement('div');
      section.className = 'cp-tb-category';
      const head = document.createElement('div');
      head.className = 'cp-tb-cat-head';
      head.textContent = 'All installed themes';
      section.appendChild(head);
      const grid = document.createElement('div');
      grid.className = 'cp-tb-grid';
      for (const name of extra) {
        grid.appendChild(makeChip(name));
      }
      section.appendChild(grid);
      categoriesEl.appendChild(section);
    }
  }

  function makeChip(name) {
    const data = THEME_DATA[name];
    const chip = document.createElement('button');
    chip.className = 'cp-tb-chip' + (name === wrap._currentTheme ? ' active' : '');
    chip.dataset.theme = name;

    if (data) {
      const swatches = document.createElement('span');
      swatches.className = 'cp-tb-swatches';
      for (const color of data.swatches) {
        const s = document.createElement('span');
        s.className = 'cp-tb-swatch';
        s.style.background = color;
        swatches.appendChild(s);
      }
      chip.appendChild(swatches);
    }

    const label = document.createElement('span');
    label.className = 'cp-tb-label';
    label.textContent = name;
    chip.appendChild(label);

    chip.addEventListener('click', () => {
      wrap._currentTheme = name;
      wrap.querySelectorAll('.cp-tb-chip').forEach(c => c.classList.toggle('active', c.dataset.theme === name));
      onSelect(name, data);
    });

    return chip;
  }

  wrap._currentTheme = currentTheme;
  wrap.setLocalThemeNames = (names) => {
    wrap._localThemeNames = names;
    render(search.value.trim());
  };
  search.addEventListener('input', () => render(search.value.trim()));
  render('');

  return wrap;
}

// ─── Panel renderer ──────────────────────────────────────────────────────────

export function createConfigPanel(initialConfigText, onApply, onPreviewChange = null) {
  const initialState = structuredClone(DEFAULTS);
  initialState.keybind = [];
  const dirtyIds = new Set();
  // Load from current config text
  const parsed = parseConfigToState(initialConfigText);
  for (const k in parsed) {
    if (k === 'palette') {
      initialState.palette = initialState.palette.map((color, index) => parsed.palette[index] || color);
    } else if (k in initialState || k === 'keybind') {
      initialState[k] = parsed[k];
    }
  }
  let initialBackgroundImageDataUrl = null;
  try {
    const saved = JSON.parse(localStorage.getItem('ghostty-background-image') || 'null');
    if (saved?.path && saved.path === initialState.backgroundImage && saved.dataUrl) {
      initialBackgroundImageDataUrl = saved.dataUrl;
    }
  } catch {
    localStorage.removeItem('ghostty-background-image');
  }
  initialState._backgroundImageDataUrl = initialBackgroundImageDataUrl;
  let state = structuredClone(initialState);
  let activePanelId = SETTINGS_PANELS[0].id;
  let themeSelectionVersion = 0;
  const dirtyBaselines = {};

  const updateDirty = (id) => {
    const baseline = Object.hasOwn(dirtyBaselines, id) ? dirtyBaselines[id] : initialState[id];
    const unchanged = JSON.stringify(state[id]) === JSON.stringify(baseline);
    if (unchanged) dirtyIds.delete(id);
    else dirtyIds.add(id);
  };

  const notifyPreview = () => {
    onPreviewChange?.({
      ...structuredClone(state),
      _dirtyIds: [...dirtyIds],
    });
  };

  const selectTheme = async (name, markDirty = true) => {
    const version = ++themeSelectionVersion;
    state.theme = name;
    if (markDirty) updateDirty('theme');
    if (!name) {
      for (const key of ['background', 'foreground', 'palette']) {
        state[key] = structuredClone(initialState[key]);
        dirtyBaselines[key] = structuredClone(state[key]);
      }
      if (markDirty) notifyPreview();
      showPanel(activePanelId);
      return;
    }
    try {
      const themeState = await fetchThemeState(name);
      if (version !== themeSelectionVersion) return;
      for (const key of ['background', 'foreground']) {
        if (parsed[key] !== undefined) state[key] = structuredClone(parsed[key]);
        else if (themeState[key] !== undefined) state[key] = structuredClone(themeState[key]);
      }
      const themePalette = themeState.palette ?? DEFAULTS.palette;
      state.palette = themePalette.map((color, index) => parsed.palette?.[index] || color);
      if (markDirty) {
        for (const key of ['background', 'foreground', 'palette']) {
          dirtyBaselines[key] = structuredClone(state[key]);
        }
      }
      if (!markDirty) {
        for (const key of ['background', 'foreground', 'palette']) {
          initialState[key] = structuredClone(state[key]);
        }
      }
    } catch (error) {
      console.warn(`[config] failed to preview theme "${name}"`, error);
    }
    if (version !== themeSelectionVersion) return;
    if (markDirty) notifyPreview();
    showPanel(activePanelId);
  };

  let themeNames = [];
  fetchLocalThemeNames().then(names => {
    themeNames = names;
    // Re-render theme picker if panel is already open
    const existing = document.querySelector('.cp-theme-list');
    if (existing) {
      const parent = existing.closest('.cp-theme-wrap');
      if (parent) {
        const newPicker = createThemePicker('theme', state.theme, v => {
          void selectTheme(v);
        }, themeNames);
        parent.replaceWith(newPicker);
      }
    }
    // Update theme browser if already open
    const browser = document.querySelector('.cp-theme-browser');
    if (browser) {
      browser.setLocalThemeNames(names);
    }
  });

  // Root panel element
  const panel = document.createElement('div');
  panel.id = 'config-panel';

  const header = document.createElement('div');
  header.className = 'cp-header';
  header.innerHTML = `<span class="cp-title">Config</span>`;
  const closeBtn = document.createElement('button');
  closeBtn.className = 'cp-close';
  closeBtn.innerHTML = '&#x2715;';
  closeBtn.addEventListener('click', closeWithoutApplying);
  header.appendChild(closeBtn);
  panel.appendChild(header);

  const body = document.createElement('div');
  body.className = 'cp-body';

  // Sidebar
  const sidebar = document.createElement('nav');
  sidebar.className = 'cp-sidebar';
  for (const p of SETTINGS_PANELS) {
    const btn = document.createElement('button');
    btn.className = 'cp-panel-btn';
    btn.textContent = p.name;
    btn.dataset.panelId = p.id;
    btn.addEventListener('click', () => showPanel(p.id));
    sidebar.appendChild(btn);
  }

  // Content area
  const content = document.createElement('div');
  content.className = 'cp-content';

  body.appendChild(sidebar);
  body.appendChild(content);
  panel.appendChild(body);

  // Footer
  const footer = document.createElement('div');
  footer.className = 'cp-footer';
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'cp-btn';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.addEventListener('click', closeWithoutApplying);
  const applyBtn = document.createElement('button');
  applyBtn.className = 'cp-btn cp-btn-primary';
  applyBtn.textContent = 'Apply';
  applyBtn.addEventListener('click', () => {
    if (dirtyIds.size === 0) {
      panel.classList.remove('visible');
      return;
    }
    const replacedKeys = new Set([...dirtyIds].map(idToConfigKey));
    const text = serialiseState(state, dirtyIds);
    if (dirtyIds.has('backgroundImage')) {
      if (state.backgroundImage && state._backgroundImageDataUrl) {
        localStorage.setItem('ghostty-background-image', JSON.stringify({
          path: state.backgroundImage,
          dataUrl: state._backgroundImageDataUrl,
        }));
      } else {
        localStorage.removeItem('ghostty-background-image');
      }
    }
    onApply({ text, replacedKeys });
  });
  footer.appendChild(cancelBtn);
  footer.appendChild(applyBtn);
  panel.appendChild(footer);

  function showPanel(panelId) {
    const panelData = SETTINGS_PANELS.find(p => p.id === panelId);
    if (!panelData) return;
    activePanelId = panelId;

    // Update sidebar active state
    for (const btn of sidebar.querySelectorAll('.cp-panel-btn')) {
      btn.classList.toggle('active', btn.dataset.panelId === panelId);
    }

    content.innerHTML = '';

    for (const group of panelData.groups) {
      const section = document.createElement('section');
      section.className = 'cp-group';

      if (group.name) {
        const h = document.createElement('h4');
        h.className = 'cp-group-title';
        h.textContent = group.name;
        section.appendChild(h);
      }

      for (const setting of group.settings) {
        if (setting.type === 'palette') {
          const row = document.createElement('div');
          row.className = 'cp-row cp-row-palette';
          const widget = createPalette(setting.id, state[setting.id], v => {
            state[setting.id] = v;
            updateDirty(setting.id);
            notifyPreview();
          });
          row.appendChild(widget);
          section.appendChild(row);
          continue;
        }

        if (setting.type === 'keybinds') {
          const row = document.createElement('div');
          row.className = 'cp-row cp-row-keybinds';
          const widget = createKeybinds(setting.id, state[setting.id], v => {
            state[setting.id] = v;
            updateDirty(setting.id);
          });
          row.appendChild(widget);
          section.appendChild(row);
          continue;
        }

        if (setting.type === 'theme-browser') {
          const browser = createThemeBrowser(state.theme, (name) => {
            void selectTheme(name);
          });
          browser.setLocalThemeNames(themeNames);
          section.appendChild(browser);
          continue;
        }

        const row = document.createElement('div');
        row.className = 'cp-row';

        const labelWrap = document.createElement('div');
        labelWrap.className = 'cp-label-wrap';
        const labelEl = document.createElement('label');
        labelEl.className = 'cp-label';
        labelEl.textContent = setting.name;
        labelWrap.appendChild(labelEl);
        if (setting.note) {
          const note = document.createElement('span');
          note.className = 'cp-note';
          note.innerHTML = setting.note;
          labelWrap.appendChild(note);
        }

        const controlWrap = document.createElement('div');
        controlWrap.className = 'cp-control';

        let widget;
        const makeOnChange = (id) => (v) => {
          state[id] = v;
          updateDirty(id);
          notifyPreview();
        };

        if (setting.type === 'switch') {
          widget = createSwitch(setting.id, state[setting.id], makeOnChange(setting.id));
        } else if (setting.type === 'text') {
          widget = createText(setting.id, state[setting.id], makeOnChange(setting.id), setting.placeholder);
        } else if (setting.type === 'file') {
          widget = createFile(
            setting.id,
            state[setting.id],
            makeOnChange(setting.id),
            (dataUrl) => {
              state._backgroundImageDataUrl = dataUrl;
              if (dataUrl) dirtyIds.add(setting.id);
              else updateDirty(setting.id);
              notifyPreview();
            },
            setting.placeholder,
          );
        } else if (setting.type === 'number') {
          widget = createNumber(setting.id, state[setting.id], makeOnChange(setting.id), setting);
        } else if (setting.type === 'range') {
          widget = createRange(setting.id, state[setting.id], makeOnChange(setting.id), setting);
        } else if (setting.type === 'dropdown') {
          widget = createDropdown(setting.id, state[setting.id], makeOnChange(setting.id), setting.options);
        } else if (setting.type === 'color') {
          widget = createColor(setting.id, state[setting.id], makeOnChange(setting.id));
        } else if (setting.type === 'theme') {
          widget = createThemePicker(setting.id, state[setting.id], value => {
            void selectTheme(value);
          }, themeNames);
        }

        if (widget) controlWrap.appendChild(widget);
        row.appendChild(labelWrap);
        row.appendChild(controlWrap);
        section.appendChild(row);
      }

      content.appendChild(section);
    }
  }

  function closeWithoutApplying() {
    state = structuredClone(initialState);
    dirtyIds.clear();
    for (const key of Object.keys(dirtyBaselines)) delete dirtyBaselines[key];
    notifyPreview();
    panel.classList.remove('visible');
    showPanel(activePanelId);
  }

  // Show first panel by default
  showPanel(SETTINGS_PANELS[0].id);
  if (initialState.theme) void selectTheme(initialState.theme, false);

  return panel;
}
