/**
 * Browser-friendly subset of Vexi's agent harness.
 *
 * Vexi's Node CLI owns local files, stdin, subprocesses and MCP stdio.
 * Ghostty Playground runs in a browser page, so this module keeps the
 * provider abstraction and command-block workflow while leaving execution to
 * the active BrowserPod terminal pane.
 */

export class ProviderError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ProviderError';
    this.status = status;
  }

  get isAuthError() {
    return this.status === 401 || this.status === 403;
  }
}

export const PROVIDER_INFO = {
  local: {
    label: 'Local WebGPU',
    defaultModel: '',
    requiresKey: false,
  },
  anthropic: {
    label: 'Anthropic (Claude)',
    defaultModel: 'claude-sonnet-4-5',
    requiresKey: true,
  },
  openai: {
    label: 'OpenAI (GPT)',
    defaultModel: 'gpt-4o-mini',
    requiresKey: true,
  },
  openrouter: {
    label: 'OpenRouter',
    defaultModel: 'openrouter/auto',
    requiresKey: true,
  },
  groq: {
    label: 'Groq',
    defaultModel: 'llama-3.3-70b-versatile',
    requiresKey: true,
  },
  gemini: {
    label: 'Google Gemini',
    defaultModel: 'gemini-2.5-flash',
    requiresKey: true,
  },
};

const PROVIDER_PATTERNS = [
  { provider: 'anthropic', pattern: /^sk-ant-/ },
  { provider: 'openrouter', pattern: /^sk-or-/ },
  { provider: 'groq', pattern: /^gsk_/ },
  { provider: 'gemini', pattern: /^AIza/ },
  { provider: 'openai', pattern: /^sk-(?!ant-|or-)/ },
];

const BASE_URLS = {
  openai: 'https://api.openai.com/v1',
  openrouter: 'https://openrouter.ai/api/v1',
  groq: 'https://api.groq.com/openai/v1',
  gemini: 'https://generativelanguage.googleapis.com/v1beta/openai',
};

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const CONFIG_STORAGE_KEY = 'ghostty-ai-config';
const MAX_HISTORY_MESSAGES = 16;

export function sanitizeKey(raw) {
  let key = String(raw ?? '').trim();
  while (key.length >= 2 && `"'\``.includes(key[0]) && key[0] === key[key.length - 1]) {
    key = key.slice(1, -1).trim();
  }
  return key;
}

export function detectProvider(key) {
  const matches = PROVIDER_PATTERNS.filter(({ pattern }) => pattern.test(key));
  return matches.length === 1 ? matches[0].provider : null;
}

export function resolveProviderId(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) return null;
  if (Object.hasOwn(PROVIDER_INFO, normalized)) return normalized;
  const matches = Object.entries(PROVIDER_INFO)
    .filter(([id, info]) => id.includes(normalized) || info.label.toLowerCase().includes(normalized))
    .map(([id]) => id);
  return matches.length === 1 ? matches[0] : null;
}

export function formatProviderList() {
  return Object.entries(PROVIDER_INFO).map(([id, info]) => {
    const model = info.defaultModel || 'loaded with ghostty-ai load';
    const key = info.requiresKey ? 'API key required' : 'no API key';
    return `${id.padEnd(10)} ${info.label} (${key}, default: ${model})`;
  }).join('\r\n');
}

export function loadAgentConfig() {
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (!raw) return { provider: 'local' };
    const parsed = JSON.parse(raw);
    const provider = resolveProviderId(parsed.provider) ?? 'local';
    const apiKeys = parsed.apiKeys && typeof parsed.apiKeys === 'object'
      ? { ...parsed.apiKeys }
      : {};
    const models = parsed.models && typeof parsed.models === 'object'
      ? { ...parsed.models }
      : {};
    if (typeof parsed.apiKey === 'string' && parsed.apiKey && provider !== 'local') {
      apiKeys[provider] = parsed.apiKey;
    }
    if (typeof parsed.model === 'string' && parsed.model) {
      models[provider] = parsed.model;
    }
    return {
      provider,
      apiKeys,
      models,
      apiKey: typeof apiKeys[provider] === 'string' ? apiKeys[provider] : '',
      model: typeof models[provider] === 'string' ? models[provider] : '',
    };
  } catch {
    return { provider: 'local' };
  }
}

export function saveAgentConfig(config) {
  const current = loadAgentConfig();
  const provider = resolveProviderId(config.provider) ?? 'local';
  const info = PROVIDER_INFO[provider];
  const apiKeys = { ...(current.apiKeys ?? {}), ...(config.apiKeys ?? {}) };
  const models = { ...(current.models ?? {}), ...(config.models ?? {}) };

  if (info.requiresKey && config.apiKey) apiKeys[provider] = String(config.apiKey);
  if (config.model) models[provider] = String(config.model);

  const next = {
    provider,
    apiKeys,
    models,
    apiKey: info.requiresKey ? apiKeys[provider] ?? '' : '',
    model: models[provider] ?? '',
  };
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify({
    provider,
    apiKeys,
    models,
  }));
  return next;
}

export function resetAgentConfig() {
  localStorage.removeItem(CONFIG_STORAGE_KEY);
}

export function configuredModel(config, localModelRuntime) {
  const provider = resolveProviderId(config.provider) ?? 'local';
  if (provider === 'local') {
    return localModelRuntime.loadedModel?.label ?? localModelRuntime.loadedModel?.id ?? 'no local model';
  }
  return config.model || PROVIDER_INFO[provider].defaultModel;
}

export function createProvider(config, localModelRuntime) {
  const provider = resolveProviderId(config.provider) ?? 'local';
  const info = PROVIDER_INFO[provider];
  const model = config.model || info.defaultModel;

  if (provider === 'local') {
    return createLocalProvider(localModelRuntime);
  }

  if (!config.apiKey) {
    throw new Error(`No API key configured for ${info.label}. Run \`ghostty-ai setup\`.`);
  }

  if (provider === 'anthropic') {
    return createAnthropicProvider(config.apiKey, model);
  }

  return createOpenAICompatProvider({
    id: provider,
    baseUrl: BASE_URLS[provider],
    apiKey: config.apiKey,
    model,
    extraHeaders: provider === 'openrouter'
      ? {
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Ghostty Playground',
        }
      : undefined,
  });
}

function createLocalProvider(localModelRuntime) {
  return {
    id: 'local',
    get model() {
      return localModelRuntime.loadedModel?.label ?? localModelRuntime.loadedModel?.id ?? 'local model';
    },
    async stream(messages, onText, signal) {
      return localModelRuntime.generate(messages, onText, signal, { includeDefaultSystem: false });
    },
  };
}

function createOpenAICompatProvider(opts) {
  return {
    id: opts.id,
    model: opts.model,
    async stream(messages, onText, signal) {
      const response = await fetch(`${opts.baseUrl}/chat/completions`, {
        method: 'POST',
        signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${opts.apiKey}`,
          ...opts.extraHeaders,
        },
        body: JSON.stringify({
          model: opts.model,
          messages,
          stream: true,
        }),
      }).catch(error => {
        if (signal?.aborted) throw error;
        throw new ProviderError(`Network error: ${error.message}`);
      });

      if (!response.ok || !response.body) {
        const body = await response.text().catch(() => '');
        throw new ProviderError(
          `${opts.id} API error (HTTP ${response.status}): ${truncate(body, 300)}`,
          response.status,
        );
      }

      let full = '';
      for await (const data of sseEvents(response.body, signal)) {
        if (data === '[DONE]') break;
        try {
          const json = JSON.parse(data);
          const text = json.choices?.[0]?.delta?.content;
          if (text) {
            full += text;
            onText(text);
          }
        } catch {
          // Ignore malformed keep-alive chunks.
        }
      }
      return full;
    },
  };
}

function createAnthropicProvider(apiKey, model) {
  return {
    id: 'anthropic',
    model,
    async stream(messages, onText, signal) {
      const system = messages
        .filter(message => message.role === 'system')
        .map(message => message.content)
        .join('\n\n');
      const chat = messages.filter(message => message.role !== 'system');
      const response = await fetch(ANTHROPIC_API, {
        method: 'POST',
        signal,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': ANTHROPIC_VERSION,
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model,
          max_tokens: 8192,
          ...(system ? { system } : {}),
          messages: chat,
          stream: true,
        }),
      }).catch(error => {
        if (signal?.aborted) throw error;
        throw new ProviderError(`Network error: ${error.message}`);
      });

      if (!response.ok || !response.body) {
        const body = await response.text().catch(() => '');
        throw new ProviderError(
          `anthropic API error (HTTP ${response.status}): ${truncate(body, 300)}`,
          response.status,
        );
      }

      let full = '';
      for await (const data of sseEvents(response.body, signal)) {
        try {
          const json = JSON.parse(data);
          if (json.type === 'content_block_delta' && json.delta?.type === 'text_delta') {
            full += json.delta.text;
            onText(json.delta.text);
          } else if (json.type === 'error') {
            throw new ProviderError(json.error?.message ?? 'Anthropic stream error');
          }
        } catch (error) {
          if (error instanceof ProviderError) throw error;
        }
      }
      return full;
    },
  };
}

async function* sseEvents(body, signal) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (!signal?.aborted) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let eventEnd;
      while ((eventEnd = buffer.indexOf('\n\n')) !== -1) {
        const event = buffer.slice(0, eventEnd);
        buffer = buffer.slice(eventEnd + 2);
        const data = event
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.startsWith('data:'))
          .map(line => line.slice(5).trim())
          .join('\n');
        if (data) yield data;
      }

      let lineEnd;
      while ((lineEnd = buffer.indexOf('\n')) !== -1 && !buffer.includes('\n\n')) {
        const line = buffer.slice(0, lineEnd).trim();
        buffer = buffer.slice(lineEnd + 1);
        if (line.startsWith('data:')) yield line.slice(5).trim();
      }
    }
  } finally {
    if (signal?.aborted) {
      await reader.cancel().catch(() => {});
    }
    reader.releaseLock();
  }
}

export function extractFileBlocks(reply) {
  const blocks = [];
  const pattern = /```([^\n`]*)\n([\s\S]*?)```/g;
  let match = pattern.exec(reply);
  while (match) {
    const info = match[1].trim();
    const content = match[2].replace(/\n$/, '');
    if (isPlaceholderFileContent(content)) {
      match = pattern.exec(reply);
      continue;
    }
    const path = parseFileBlockPath(info);
    if (path) {
      blocks.push({ path, content });
    } else {
      blocks.push(...splitFileBlocksFromContent(content));
    }
    match = pattern.exec(reply);
  }
  return blocks;
}

function parseFileBlockPath(info) {
  const normalized = info.trim();
  const fileMatch = /^file(?:\s+|:)(?:path=)?(.+)$/i.exec(normalized);
  if (fileMatch) return cleanPathToken(fileMatch[1]);

  const attrMatch = /(?:^|\s)(?:file|path)=("[^"]+"|'[^']+'|[^\s]+)/i.exec(normalized);
  if (attrMatch) return cleanPathToken(attrMatch[1]);

  return '';
}

function cleanPathToken(value) {
  return String(value ?? '')
    .trim()
    .replace(/^["']|["']$/g, '')
    .trim();
}

function isPlaceholderFileContent(content) {
  return /^\s*<complete file contents>\s*$/i.test(String(content ?? ''));
}

function parseFilenameComment(line) {
  const commentMatch = /^(?:\/\/|#|--|;)\s*([\w./-]+\.[A-Za-z0-9]+)\s*$/.exec(String(line ?? '').trim());
  if (!commentMatch) return '';
  return cleanPathToken(commentMatch[1]);
}

function splitFileBlocksFromContent(content) {
  const lines = String(content ?? '').replace(/\n$/, '').split(/\r?\n/);
  const markers = [];
  for (let index = 0; index < lines.length; index += 1) {
    const path = parseFilenameComment(lines[index]);
    if (path) markers.push({ index, path });
  }
  if (!markers.length || markers[0].index > 2) return [];

  const blocks = [];
  for (let markerIndex = 0; markerIndex < markers.length; markerIndex += 1) {
    const marker = markers[markerIndex];
    const nextMarker = markers[markerIndex + 1];
    const body = lines.slice(marker.index + 1, nextMarker?.index ?? lines.length).join('\n');
    const contentForFile = normalizeInferredFileContent(marker.path, body);
    if (!isPlaceholderFileContent(contentForFile) && contentForFile.trim()) {
      blocks.push({ path: marker.path, content: contentForFile });
    }
  }
  return blocks;
}

function normalizeInferredFileContent(path, content) {
  let body = String(content ?? '').replace(/^\s*\n/, '').replace(/\s+$/, '');
  if (/\.json$/i.test(path)) {
    body = body.replace(/,\s*([}\]])/g, '$1');
  }
  return `${body}\n`;
}

export function buildSystemPrompt({ allowFileWrites = false } = {}) {
  const parts = [
    'You are Ghostty AI, a coding assistant inside Ghostty Playground.',
    'The user is working in a BrowserPod Linux terminal rendered by Ghostty.',
    'Be concise, technical and direct.',
    'Default to normal chat. Do not ask the host app to write files unless this prompt explicitly says file writing is enabled.',
  ];
  if (allowFileWrites) {
    parts.push(
      'File writing is enabled for this turn.',
      'When the user asks you to create or edit files, emit file artifacts using this exact fenced format:',
      '```file path=relative/path.ext',
      '<complete file contents>',
      '```',
      'Use one file artifact per file. Do not merely describe file contents when the user asked you to create files.',
      'If the user asks for a project, emit every file needed for a runnable starting point.',
      'For Node or Express projects, include package.json and do not reference files that you do not also emit.',
      'After creating files, briefly say what was created.',
    );
  }
  parts.push(
    'Do not suggest install, start, dev-server, package-manager, database, or MongoDB commands unless the user explicitly asks for commands.',
    'Keep secrets out of commands and logs.',
  );
  return parts.join('\n');
}

export async function runAgentTurn({
  config,
  localModelRuntime,
  history,
  prompt,
  onText,
  signal,
  allowFileWrites = false,
}) {
  const provider = createProvider(config, localModelRuntime);
  const userMessage = { role: 'user', content: prompt };
  const messages = [
    { role: 'system', content: buildSystemPrompt({ allowFileWrites }) },
    ...history.slice(-MAX_HISTORY_MESSAGES),
    userMessage,
  ];
  const reply = await provider.stream(messages, onText, signal);
  const nextHistory = [
    ...history,
    userMessage,
    { role: 'assistant', content: reply },
  ].slice(-MAX_HISTORY_MESSAGES);

  return {
    provider,
    reply,
    history: nextHistory,
    fileBlocks: allowFileWrites ? extractFileBlocks(reply) : [],
  };
}

function truncate(text, max) {
  return text.length > max ? `${text.slice(0, max)}...` : text;
}
