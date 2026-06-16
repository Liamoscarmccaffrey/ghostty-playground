export const LOCAL_MODELS = [
  {
    id: 'Hermes-2-Pro-Llama-3-8B-q4f16_1-MLC',
    label: 'Hermes 2 Pro 8B',
    family: 'Hermes (Llama 3)',
    sizeMB: 4700,
  },
  {
    id: 'Llama-3.2-3B-Instruct-q4f16_1-MLC',
    label: 'Llama 3.2 3B',
    family: 'Llama',
    sizeMB: 1900,
  },
  {
    id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
    label: 'Llama 3.2 1B',
    family: 'Llama',
    sizeMB: 700,
  },
  {
    id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
    label: 'Qwen 2.5 1.5B',
    family: 'Qwen',
    sizeMB: 950,
  },
  {
    id: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',
    label: 'Qwen 2.5 0.5B',
    family: 'Qwen',
    sizeMB: 350,
  },
  {
    id: 'gemma-2-2b-it-q4f16_1-MLC',
    label: 'Gemma 2 2B',
    family: 'Gemma',
    sizeMB: 1500,
  },
];

const SYSTEM_PROMPT = [
  'You are a local language model running inside a browser terminal.',
  'Answer the user directly in plain text.',
  'Do not claim to execute commands, inspect files, use tools, or act as an agent.',
  'Keep terminal output readable and reasonably concise.',
].join(' ');

function modelMatches(model, query) {
  const normalized = query.toLowerCase();
  return model.id.toLowerCase() === normalized ||
    model.label.toLowerCase() === normalized ||
    model.id.toLowerCase().includes(normalized) ||
    model.label.toLowerCase().includes(normalized);
}

export function resolveLocalModel(query) {
  const value = String(query ?? '').trim();
  const index = Number.parseInt(value, 10);
  if (String(index) === value && index >= 1 && index <= LOCAL_MODELS.length) {
    return LOCAL_MODELS[index - 1];
  }
  const matches = LOCAL_MODELS.filter(model => modelMatches(model, value));
  return matches.length === 1 ? matches[0] : null;
}

export function formatLocalModelList() {
  return LOCAL_MODELS.map((model, index) => {
    const size = model.sizeMB >= 1000
      ? `${(model.sizeMB / 1000).toFixed(1)} GB`
      : `${model.sizeMB} MB`;
    return `${index + 1}. ${model.label} (${model.family}, ~${size})\r\n   ${model.id}`;
  }).join('\r\n');
}

class LocalModelRuntime {
  constructor() {
    this.engine = null;
    this.loadedModel = null;
    this.loadingModel = null;
    this.loadingPromise = null;
    this.generating = false;
  }

  get supported() {
    return window.isSecureContext && 'gpu' in navigator;
  }

  get status() {
    if (!this.supported) return 'WebGPU unavailable';
    if (this.loadingModel) return `loading ${this.loadingModel.label}`;
    if (this.generating && this.loadedModel) return `generating with ${this.loadedModel.label}`;
    if (this.loadedModel) return `ready: ${this.loadedModel.label}`;
    return 'no model loaded';
  }

  async load(model, onProgress) {
    if (!this.supported) {
      throw new Error(
        'WebGPU is unavailable. Use a WebGPU-capable browser over HTTPS or localhost.',
      );
    }
    if (this.loadedModel?.id === model.id && this.engine) return;
    if (this.generating) {
      throw new Error('Wait for the current response to finish before changing models.');
    }
    if (this.loadingPromise) {
      if (this.loadingModel?.id !== model.id) {
        throw new Error(`Already loading ${this.loadingModel?.label ?? 'another model'}`);
      }
      return this.loadingPromise;
    }

    this.loadingModel = model;
    this.loadingPromise = (async () => {
      if (this.engine) {
        await this.engine.unload();
        this.engine = null;
        this.loadedModel = null;
      }
      const { CreateMLCEngine } = await import('@mlc-ai/web-llm');
      this.engine = await CreateMLCEngine(model.id, {
        initProgressCallback: report => {
          const percentage = Number.isFinite(report.progress)
            ? Math.round(report.progress * 100)
            : 0;
          onProgress?.(report.text || 'downloading model', percentage);
        },
      });
      this.loadedModel = model;
    })();

    try {
      await this.loadingPromise;
    } catch (error) {
      this.engine = null;
      this.loadedModel = null;
      throw error;
    } finally {
      this.loadingModel = null;
      this.loadingPromise = null;
    }
  }

  async generate(messages, onText, signal, options = {}) {
    if (this.loadingPromise) {
      throw new Error(`Wait for ${this.loadingModel?.label ?? 'the model'} to finish loading.`);
    }
    if (!this.engine || !this.loadedModel) {
      throw new Error('No model loaded. Run `ghostty-ai load <number>` first.');
    }
    if (this.generating) {
      throw new Error('The local model is already responding in another pane.');
    }
    if (signal?.aborted) return '';

    this.generating = true;
    const interrupt = () => {
      void this.engine?.interruptGenerate();
    };
    signal?.addEventListener('abort', interrupt, { once: true });

    try {
      const promptMessages = options.includeDefaultSystem === false
        ? messages
        : [
            { role: 'system', content: SYSTEM_PROMPT },
            ...messages,
          ];
      const stream = await this.engine.chat.completions.create({
        stream: true,
        temperature: 0.7,
        max_tokens: 768,
        messages: promptMessages,
      });

      let result = '';
      for await (const chunk of stream) {
        if (signal?.aborted) break;
        const text = chunk.choices?.[0]?.delta?.content ?? '';
        if (!text) continue;
        result += text;
        onText(text);
      }
      return result;
    } finally {
      signal?.removeEventListener('abort', interrupt);
      this.generating = false;
    }
  }

  async unload() {
    if (this.loadingPromise) {
      throw new Error(`Wait for ${this.loadingModel?.label ?? 'the model'} to finish loading.`);
    }
    if (this.generating) {
      throw new Error('Wait for the current response to finish before unloading the model.');
    }
    await this.engine?.unload();
    this.engine = null;
    this.loadedModel = null;
  }
}

export const localModelRuntime = new LocalModelRuntime();
