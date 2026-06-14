import { Parser, Language, Query } from 'web-tree-sitter';
import treeSitterWasmUrl from '/tree-sitter.wasm?url';
import ghosttyWasmUrl from '/tree-sitter-ghostty.wasm?url';

// Maps tree-sitter node types / capture names to CSS classes.
// Derived from queries/ghostty/highlights.scm in the grammar.
const CAPTURE_CLASS = {
  'comment':           'hl-comment',
  'variable':          'hl-property',   // property keys
  'boolean':           'hl-boolean',
  'number':            'hl-number',
  'string':            'hl-string',
  'color':             'hl-color',
  'operator':          'hl-operator',
  'keyword':           'hl-keyword',
  'keyword.import':    'hl-keyword',
  'keyword.conditional': 'hl-operator',
  'attribute':         'hl-keyword',
  'variable.member':   'hl-property',
  'variable.parameter':'hl-string',
  'function.call':     'hl-keyword',
  'string.special':    'hl-keybind',
  'string.special.path':'hl-path',
  'punctuation.delimiter.special': 'hl-operator',
  'module':            'hl-keyword',
  'constant.builtin':  'hl-keyword',
};

let parser = null;
let ghosttyLang = null;

export async function initHighlighter() {
  await Parser.init({
    locateFile: () => treeSitterWasmUrl,
  });
  parser = new Parser();
  ghosttyLang = await Language.load(ghosttyWasmUrl);
  parser.setLanguage(ghosttyLang);

  // Build a query from the highlights file content we know statically.
  // We embed the query string directly so we don't need a fetch at runtime.
  return buildQuery();
}

function buildQuery() {
  // Condensed version of queries/ghostty/highlights.scm
  const scm = `
(comment) @comment
(property) @variable
(boolean) @boolean
(number) @number
(string) @string
(color) @color
(path_directive (property) @keyword.import)
(path_directive (path_value) @string.special.path)
(path_value "?" @keyword.conditional)
(keybind_value) @string.special
((keybind_value) @keyword (#eq? @keyword "clear"))
(keybind_action) @function.call
(action_argument) @variable.parameter
"+" @operator
"=" @operator
(keybind_trigger ">") @operator
(chain_operator) @operator
(modifier_key) @constant.builtin
(key) @constant.builtin
(key_qualifier) @attribute
(keybind_modifier) @attribute
(theme_variant) @attribute
(command_modifier) @attribute
(keybind_table) @module
(palette_index) @variable.member
(palette_value "=" @operator)
(env_var_name) @variable.member
(env_value "=" @operator)
(color "#" @punctuation.delimiter.special)
(tuple "," @punctuation.delimiter.special)
`;
  return new Query(ghosttyLang, scm);
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function highlight(text, query) {
  if (!parser || !query) return escapeHtml(text);

  const tree = parser.parse(text);
  const captures = query.captures(tree.rootNode);

  // Sort by start byte; for overlapping captures keep the last (most specific).
  captures.sort((a, b) => a.node.startIndex - b.node.startIndex || b.node.endIndex - a.node.endIndex);

  // Build a flat array of [start, end, class] spans, resolving overlaps greedily.
  const spans = [];
  let covered = 0;
  for (const { name, node } of captures) {
    const cls = CAPTURE_CLASS[name];
    if (!cls) continue;
    if (node.startIndex < covered) continue; // already inside a span
    spans.push([node.startIndex, node.endIndex, cls]);
    covered = node.endIndex;
  }

  // Build HTML by interleaving plain text and highlighted spans.
  let html = '';
  let pos = 0;
  const encoded = new TextEncoder().encode(text);
  const decode = (start, end) => new TextDecoder().decode(encoded.slice(start, end));

  for (const [start, end, cls] of spans) {
    if (pos < start) html += escapeHtml(decode(pos, start));
    html += `<span class="${cls}">${escapeHtml(decode(start, end))}</span>`;
    pos = end;
  }
  if (pos < encoded.length) html += escapeHtml(decode(pos, encoded.length));

  // Overlay div needs a trailing newline to keep scroll height in sync with textarea.
  return html + '\n';
}
