import './docs-app.css';

const html = String.raw;

const pages = [
  {
    slug: 'overview',
    nav: 'What it is',
    title: 'What is Ghostty Playground?',
    seoTitle: 'Ghostty Playground: Ghostty Online in Your Browser',
    description: 'Ghostty Playground runs a Ghostty terminal with Bash, Node.js, npm, files, and BrowserPod directly in your browser.',
    lead: 'Ghostty Playground combines a Ghostty terminal with a BrowserPod development environment so you can use Bash, Git, Node.js, npm, and project files in one browser page.',
    content: html`
      <section class="docs-section">
        <h3>Ghostty in the browser</h3>
        <p><code>@crunchloop/ghostty-web</code> provides the terminal engine. It parses terminal output, maintains the screen and scrollback, handles keyboard input, and renders the terminal to a browser canvas.</p>
        <p>The terminal at the top of this page is interactive. It supports Ghostty themes and configuration alongside browser-specific tools such as the config panel and terminal Inspector.</p>
      </section>

      <section class="docs-section">
        <h3>The development environment</h3>
        <p>BrowserPod provides the command runtime behind the terminal. It runs Bash and Node.js through WebAssembly, supplies npm and process execution, and stores project files in a virtual filesystem inside the browser.</p>
        <div class="docs-table-wrap">
          <table class="docs-table">
            <thead><tr><th>Part</th><th>Role</th></tr></thead>
            <tbody>
              <tr><td>ghostty-web</td><td>Terminal parsing, input, screen state, scrollback, selection, and rendering.</td></tr>
              <tr><td>BrowserPod</td><td>Bash, Git, Node.js, npm, processes, files, networking, and Portals.</td></tr>
              <tr><td>Ghostty Playground</td><td>Connects the terminal to BrowserPod and adds configuration, navigation, and browser controls.</td></tr>
              <tr><td>WebLLM</td><td>Runs the optional <code>ghostty-ai</code> local model feature through WebGPU.</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="docs-section">
        <h3>What you can use it for</h3>
        <ul class="docs-list">
          <li>Open an interactive Bash session without installing a local terminal application.</li>
          <li>Create and work with files in a persistent browser filesystem.</li>
          <li>Use Git, run Node.js programs, and execute npm package scripts.</li>
          <li>Start HTTP servers inside BrowserPod and understand how Portal URLs expose them.</li>
          <li>Try Ghostty themes, terminal settings, keybindings, tabs, and split panes.</li>
          <li>Run supported local language models from the terminal with <code>ghostty-ai</code>.</li>
        </ul>
      </section>

      <section class="docs-section">
        <h3>About these docs</h3>
        <p>These pages document Ghostty Playground and its BrowserPod runtime. For the complete native terminal application, use the <a href="https://ghostty.org/docs" target="_blank" rel="noopener">official Ghostty documentation</a>.</p>
        <p><a href="#docs/start" data-doc-route="start">Start using the terminal</a> or read <a href="#docs/architecture" data-doc-route="architecture">how BrowserPod runs the environment</a>.</p>
      </section>
    `,
  },
  {
    slug: 'start',
    nav: 'Start using the terminal',
    title: 'Start using the terminal',
    seoTitle: 'Use Ghostty Online: Ghostty Playground Quick Start',
    description: 'Start using the Ghostty Playground browser terminal, check Bash and Node.js, and understand what remains active during the session.',
    lead: 'Wait for the BrowserPod prompt, click the terminal, and enter commands as you would in an interactive Bash session.',
    content: html`
      <section class="docs-section">
        <h3>Wait for the prompt</h3>
        <p>The first pane appears while BrowserPod is booting. When the prompt appears, Bash is ready to accept commands. Startup failures are printed in the terminal and recorded in the browser console.</p>
      </section>

      <section class="docs-section">
        <h3>Check the environment</h3>
        <div class="docs-code">
          <div class="docs-code-head"><span>Terminal</span><button class="docs-copy" data-copy-target="start-environment">Copy</button></div>
          <pre><code id="start-environment">pwd
ls -la
printf 'bash %s\n' "$BASH_VERSION"
node --version
npm --version</code></pre>
        </div>
        <p>Commands run in the BrowserPod environment and use its filesystem. The current working directory, shell variables, files, and child processes behave as part of that environment.</p>
      </section>

      <section class="docs-section">
        <h3>Terminal controls</h3>
        <dl class="docs-definition">
          <div><dt>Run a command</dt><dd>Type in the active pane and press Enter.</dd></div>
          <div><dt>Interrupt a command</dt><dd>Press Ctrl-C. BrowserPod forwards the control character to the active process.</dd></div>
          <div><dt>Copy and paste</dt><dd>Use the configured shortcuts or the terminal context menu. Browser clipboard permission still applies.</dd></div>
          <div><dt>Open settings</dt><dd>Right-click the terminal and choose Edit Config or Config Panel.</dd></div>
          <div><dt>Inspect terminal state</dt><dd>Choose Open Inspector from the context menu.</dd></div>
        </dl>
      </section>

      <section class="docs-section">
        <h3>Session behavior</h3>
        <ul class="docs-list">
          <li>Documentation navigation keeps the terminal and BrowserPod session running.</li>
          <li>Each pane starts its own Bash process inside the shared BrowserPod instance.</li>
          <li>All panes use the same BrowserPod filesystem.</li>
          <li>Reloading the page restarts processes and terminal state.</li>
          <li>Files can persist because the playground reopens the same BrowserPod storage key.</li>
          <li>Applying changed terminal configuration reloads the page.</li>
        </ul>
      </section>
    `,
  },
  {
    slug: 'bash-files',
    nav: 'Bash, files, and commands',
    title: 'Bash, files, and commands',
    seoTitle: 'Bash in the Browser with Ghostty Playground',
    description: 'Learn how Bash commands and persistent project files work inside the BrowserPod runtime used by Ghostty Playground.',
    lead: 'Each terminal pane is connected to an interactive Bash process. Bash commands and child processes share BrowserPod files and environment variables.',
    content: html`
      <section class="docs-section">
        <h3>The Bash session</h3>
        <p>Ghostty Playground creates a BrowserPod custom terminal and starts <code>bash --norc -i</code> for the pane. The configured <code>shell-prompt</code> value supplies its initial prompt.</p>
        <p>Pipes, redirection, shell variables, functions, scripts, and foreground processes use Bash behavior. Available external commands depend on the tools included in the BrowserPod environment.</p>
      </section>

      <section class="docs-section">
        <h3>Project files</h3>
        <p>BrowserPod supplies a POSIX-style virtual filesystem with paths, directories, and file permissions. Bash and Node.js see the same files, so a file created by a shell command is immediately available to a Node process.</p>
        <div class="docs-code">
          <div class="docs-code-head"><span>Files and directories</span><button class="docs-copy" data-copy-target="bash-files">Copy</button></div>
          <pre><code id="bash-files">mkdir -p ~/project
cd ~/project
printf 'Ghostty Playground\n' > README.txt
cat README.txt
ls -la</code></pre>
        </div>
      </section>

      <section class="docs-section">
        <h3>File persistence</h3>
        <p>The playground boots BrowserPod with the storage key <code>ghostty</code>. BrowserPod stores the virtual disk for this website in IndexedDB and reopens it on later sessions.</p>
        <ul class="docs-list">
          <li>Reloading the page restarts Bash but can preserve files.</li>
          <li>Clearing site data removes the stored BrowserPod filesystem.</li>
          <li>A different website origin receives separate browser storage.</li>
        </ul>
      </section>

      <section class="docs-section">
        <h3>Processes</h3>
        <p>Bash starts programs in the BrowserPod runtime and streams their output back through the terminal. A foreground process owns the pane until it exits or receives terminal input such as Ctrl-C.</p>
        <p>Closing a pane sends Ctrl-C followed by <code>exit</code>. BrowserPod exposes process completion but no public kill method, so pane shutdown is best-effort.</p>
      </section>
    `,
  },
  {
    slug: 'node-npm',
    nav: 'Node.js and npm',
    title: 'Node.js and npm',
    seoTitle: 'Run Node.js and npm in the Browser with Ghostty',
    description: 'Ghostty Playground uses BrowserPod to run Node.js, npm, package scripts, and compatible dependencies directly in the browser.',
    lead: 'BrowserPod runs Node.js inside the browser through WebAssembly. npm uses the same runtime and virtual filesystem as the Bash session.',
    content: html`
      <section class="docs-section">
        <h3>Node.js</h3>
        <p>Use <code>node</code> from Bash for scripts, command-line programs, and server processes. BrowserPod supplies Node APIs for its process, filesystem, and network environment.</p>
        <div class="docs-code">
          <div class="docs-code-head"><span>Runtime information</span><button class="docs-copy" data-copy-target="node-runtime">Copy</button></div>
          <pre><code id="node-runtime">node --version
node -p "process.platform + ' ' + process.arch"
node -p "process.cwd()"</code></pre>
        </div>
      </section>

      <section class="docs-section">
        <h3>npm projects</h3>
        <p><code>npm</code> reads and writes normal project files such as <code>package.json</code>, <code>package-lock.json</code>, and <code>node_modules</code>. Package scripts run as BrowserPod processes and print to the Ghostty terminal.</p>
        <div class="docs-code">
          <div class="docs-code-head"><span>Project commands</span><button class="docs-copy" data-copy-target="npm-commands">Copy</button></div>
          <pre><code id="npm-commands">npm --version
npm init
npm install
npm run
npm run &lt;script&gt;</code></pre>
        </div>
      </section>

      <section class="docs-section">
        <h3>Package compatibility</h3>
        <div class="docs-table-wrap">
          <table class="docs-table">
            <thead><tr><th>Dependency</th><th>BrowserPod compatibility</th></tr></thead>
            <tbody>
              <tr><td>Pure JavaScript package</td><td>Generally compatible when it uses supported Node APIs.</td></tr>
              <tr><td>WebAssembly package</td><td>Compatible when it provides a suitable Node or browser Wasm build.</td></tr>
              <tr><td>Node native addon</td><td>Requires a WebAssembly alternative.</td></tr>
              <tr><td>Downloaded desktop binary</td><td>Requires a Wasm replacement for BrowserPod's runtime.</td></tr>
              <tr><td>Build tooling</td><td>May require packages such as <code>esbuild-wasm</code> or <code>@rollup/wasm-node</code>.</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="docs-section">
        <h3>Long-running commands</h3>
        <p>Watchers and servers continue running while their pane and page remain open. Use another pane for additional commands, or press Ctrl-C to return to the prompt.</p>
        <p>For HTTP servers, continue to <a href="#docs/portals" data-doc-route="portals">Web servers and BrowserPod Portals</a>.</p>
      </section>
    `,
  },
  {
    slug: 'portals',
    nav: 'Web servers and Portals',
    title: 'Web servers and BrowserPod Portals',
    seoTitle: 'Run Browser Web Servers with BrowserPod Portals',
    description: 'Learn how BrowserPod Portals expose Node.js servers running inside Ghostty Playground through browser-accessible URLs.',
    lead: 'BrowserPod Portals connect an HTTP server running inside a Pod to a browser-accessible URL.',
    content: html`
      <section class="docs-section">
        <h3>What a Portal does</h3>
        <p>A Node.js process can listen on a port inside BrowserPod. BrowserPod detects the service and creates a Portal URL that routes requests back to that process while it continues running in the browser.</p>
        <p>This makes browser-hosted development servers, API examples, and full-stack demos accessible without provisioning a separate server for each terminal session.</p>
      </section>

      <section class="docs-section">
        <h3>Portal lifecycle</h3>
        <ol class="docs-steps">
          <li><strong>Start a server</strong>A BrowserPod process listens on a port such as 3000.</li>
          <li><strong>BrowserPod creates a Portal</strong>The runtime associates the listening port with a controlled URL.</li>
          <li><strong>The host receives the URL</strong><code>pod.onPortal()</code> reports the URL and port to the web application.</li>
          <li><strong>Open the application</strong>Requests to the Portal URL reach the server running inside the Pod.</li>
        </ol>
      </section>

      <section class="docs-section">
        <h3>The BrowserPod API</h3>
        <div class="docs-code">
          <div class="docs-code-head"><span>Portal callback</span><button class="docs-copy" data-copy-target="portal-api">Copy</button></div>
          <pre><code id="portal-api">pod.onPortal(({ url, port }) => {
  console.log('Port ' + port + ': ' + url);
});</code></pre>
        </div>
        <p>The callback belongs to the page integrating BrowserPod. The server itself uses its normal Node.js listen API.</p>
      </section>

      <section class="docs-section">
        <h3>Current Playground support</h3>
        <p>Ghostty Playground registers BrowserPod's <code>onPortal</code> callback. When a server creates a Portal, the active terminal prints its port and URL and the page shows an <strong>Open</strong> link. Each port keeps its latest Portal link until you dismiss it or reload the page.</p>
      </section>

      <section class="docs-section">
        <h3>Portal documentation</h3>
        <p>See the <a href="https://browserpod.io/docs" target="_blank" rel="noopener">BrowserPod documentation</a> for current Portal behavior and deployment requirements.</p>
      </section>
    `,
  },
  {
    slug: 'git-workflows',
    nav: 'Git and project workflows',
    title: 'Git and project workflows',
    seoTitle: 'Git and Project Workflows in Ghostty Playground',
    description: 'Use Git and persistent BrowserPod project files in the Ghostty browser playground.',
    lead: "The BrowserPod environment includes Git alongside Bash, Node.js, and npm. Projects use BrowserPod's persistent virtual filesystem.",
    content: html`
      <section class="docs-section">
        <h3>Git CLI</h3>
        <p>Git is available directly from the terminal as part of the BrowserPod environment.</p>
      </section>

      <section class="docs-section">
        <h3>Current project workflow</h3>
        <ol class="docs-steps">
          <li><strong>Open a project</strong>Clone a repository with Git or create a directory inside the BrowserPod filesystem.</li>
          <li><strong>Install dependencies</strong>Use npm with packages compatible with the BrowserPod runtime.</li>
          <li><strong>Run scripts and tools</strong>Use Node.js, npm scripts, and available shell commands.</li>
          <li><strong>Keep files between visits</strong>The stable <code>ghostty</code> storage key reopens the browser filesystem.</li>
          <li><strong>Clear the environment</strong>Remove project files manually or clear the site's browser data.</li>
        </ol>
      </section>

      <section class="docs-section">
        <h3>Storage is origin-specific</h3>
        <p>BrowserPod storage belongs to the website origin and its storage key. A local development URL, a preview deployment, and the production domain can each have separate project files.</p>
      </section>
    `,
  },
  {
    slug: 'architecture',
    nav: 'How BrowserPod runs it',
    title: 'How BrowserPod runs everything',
    seoTitle: 'How BrowserPod Powers Ghostty Playground',
    description: 'Explore the Ghostty Playground architecture: ghostty-web rendering, BrowserPod WebAssembly processes, files, terminals, and Portals.',
    lead: 'Ghostty Playground joins a terminal engine to a browser-hosted process runtime through BrowserPod terminal input and output.',
    content: html`
      <section class="docs-section">
        <h3>Architecture</h3>
        <div class="docs-table-wrap">
          <table class="docs-table">
            <thead><tr><th>Layer</th><th>Responsibility</th></tr></thead>
            <tbody>
              <tr><td>Browser page</td><td>Workspace UI, configuration, clipboard policy, docs navigation, and integration code.</td></tr>
              <tr><td>ghostty-web</td><td>Terminal state, VT parsing, keyboard encoding, scrollback, selection, and canvas rendering.</td></tr>
              <tr><td>BrowserPod terminal</td><td>Connects terminal input and output to a process running inside the Pod.</td></tr>
              <tr><td>BrowserPod runtime</td><td>Runs Bash, Node.js, npm, child processes, filesystem operations, and networking through WebAssembly.</td></tr>
              <tr><td>BrowserPod Portal</td><td>Maps a listening Pod port to a browser-accessible URL.</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="docs-section">
        <h3>Boot sequence</h3>
        <ol class="docs-steps">
          <li><strong>Initialize ghostty-web</strong>The terminal WebAssembly module and renderer are loaded.</li>
          <li><strong>Create the first pane</strong>The page measures the available terminal area and fixes its rows and columns.</li>
          <li><strong>Boot BrowserPod</strong>The page supplies its API key and the <code>ghostty</code> storage key.</li>
          <li><strong>Create a custom terminal</strong>BrowserPod receives the pane dimensions and an output callback.</li>
          <li><strong>Start Bash</strong><code>pod.run()</code> launches the interactive shell attached to that terminal.</li>
        </ol>
      </section>

      <section class="docs-section">
        <h3>Input and output</h3>
        <ol class="docs-steps">
          <li><strong>Input</strong>ghostty-web emits bytes from keyboard and paste actions.</li>
          <li><strong>Process terminal</strong>The Playground forwards those bytes through BrowserPod's terminal <code>readData()</code> method.</li>
          <li><strong>Execution</strong>Bash or its child process handles the input and writes output.</li>
          <li><strong>Output</strong>BrowserPod calls the pane's output handler with process bytes.</li>
          <li><strong>Rendering</strong>The Playground copies the bytes from shared memory and writes them into ghostty-web.</li>
        </ol>
      </section>

      <section class="docs-section">
        <h3>Files and persistence</h3>
        <p>BrowserPod presents a POSIX-style filesystem to Bash and Node.js. The <code>ghostty</code> storage key selects an IndexedDB-backed disk for this site. Processes restart with the page, while files can remain available for the next session.</p>
      </section>

      <section class="docs-section">
        <h3>Workers and browser isolation</h3>
        <p>BrowserPod runs compiled runtimes through WebAssembly and browser workers. The browser sandbox separates the Pod from the user's operating system.</p>
        <p>Shared runtime memory requires a cross-origin-isolated page. Ghostty Playground configures COOP and COEP headers, with a service-worker fallback for hosts that cannot set them directly.</p>
        <div class="docs-code">
          <div class="docs-code-head"><span>Required headers</span><button class="docs-copy" data-copy-target="isolation-headers">Copy</button></div>
          <pre><code id="isolation-headers">Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Opener-Policy: same-origin</code></pre>
        </div>
      </section>
    `,
  },
  {
    slug: 'local-models',
    nav: 'Ghostty AI',
    title: 'Ghostty AI providers and local models',
    seoTitle: 'Use AI Providers and Local WebGPU Models in Ghostty Playground',
    description: 'Use ghostty-ai with BYOK providers, local WebLLM models, normal chat, and explicit file-writing commands.',
    lead: 'The ghostty-ai command can chat with BYOK API providers or a local WebGPU model. Normal ask mode is just chat; file writes require an explicit write or scaffold command.',
    content: html`
      <section class="docs-section">
        <h3>Use a local model</h3>
        <div class="docs-code">
          <div class="docs-code-head"><span>Terminal</span><button class="docs-copy" data-copy-target="model-start">Copy</button></div>
          <pre><code id="model-start">ghostty-ai providers
ghostty-ai setup openai
ghostty-ai models
ghostty-ai load 5
ghostty-ai ask Explain file descriptors
ghostty-ai Give a shorter explanation
ghostty-ai write Create a README for this project
ghostty-ai scaffold express express-app
ghostty-ai status
ghostty-ai unload</code></pre>
        </div>
        <p><code>ghostty-ai &lt;prompt&gt;</code> is shorthand for <code>ghostty-ai ask &lt;prompt&gt;</code>. Ask mode streams normal chat into the active terminal pane and does not write files, install packages, or start servers.</p>
        <p><code>ghostty-ai write &lt;prompt&gt;</code> is the file-writing mode. It asks before writing file artifacts to BrowserPod. <code>ghostty-ai scaffold express [dir]</code> writes a small Express project and stops there.</p>
      </section>

      <section class="docs-section">
        <h3>Commands</h3>
        <div class="docs-table-wrap">
          <table class="docs-table">
            <thead><tr><th>Command</th><th>Action</th></tr></thead>
            <tbody>
              <tr><td><code>ghostty-ai models</code></td><td>List model numbers, names, families, IDs, and approximate download sizes.</td></tr>
              <tr><td><code>ghostty-ai load &lt;number|id&gt;</code></td><td>Download or open the cached model and initialize its WebLLM engine.</td></tr>
              <tr><td><code>ghostty-ai providers</code></td><td>List local and BYOK API providers.</td></tr>
              <tr><td><code>ghostty-ai setup &lt;provider&gt;</code></td><td>Store an API key for a provider in this browser's localStorage.</td></tr>
              <tr><td><code>ghostty-ai use &lt;provider&gt;</code></td><td>Switch between local, OpenAI, Anthropic, OpenRouter, Groq, and Gemini.</td></tr>
              <tr><td><code>ghostty-ai ask &lt;prompt&gt;</code></td><td>Send a prompt using the active pane's conversation history.</td></tr>
              <tr><td><code>ghostty-ai write &lt;prompt&gt;</code></td><td>Ask for file artifacts and confirm before writing them to BrowserPod.</td></tr>
              <tr><td><code>ghostty-ai scaffold express [dir]</code></td><td>Create a small Express project. It does not run npm install or npm start.</td></tr>
              <tr><td><code>ghostty-ai status</code></td><td>Show WebGPU, loading, generation, model, and conversation status.</td></tr>
              <tr><td><code>ghostty-ai clear</code></td><td>Clear conversation history for the active pane.</td></tr>
              <tr><td><code>ghostty-ai unload</code></td><td>Unload the model and clear conversations in every pane.</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="docs-section">
        <h3>Available models</h3>
        <div class="docs-table-wrap">
          <table class="docs-table">
            <thead><tr><th>No.</th><th>Model</th><th>Approx. download</th></tr></thead>
            <tbody>
              <tr><td>1</td><td><code>Hermes-2-Pro-Llama-3-8B-q4f16_1-MLC</code></td><td>4.7 GB</td></tr>
              <tr><td>2</td><td><code>Llama-3.2-3B-Instruct-q4f16_1-MLC</code></td><td>1.9 GB</td></tr>
              <tr><td>3</td><td><code>Llama-3.2-1B-Instruct-q4f16_1-MLC</code></td><td>700 MB</td></tr>
              <tr><td>4</td><td><code>Qwen2.5-1.5B-Instruct-q4f16_1-MLC</code></td><td>950 MB</td></tr>
              <tr><td>5</td><td><code>Qwen2.5-0.5B-Instruct-q4f16_1-MLC</code></td><td>350 MB</td></tr>
              <tr><td>6</td><td><code>gemma-2-2b-it-q4f16_1-MLC</code></td><td>1.5 GB</td></tr>
            </tbody>
          </table>
        </div>
        <p>The listed size is the approximate download. Model initialization also needs GPU memory and browser storage.</p>
      </section>

      <section class="docs-section">
        <h3>Downloads and caching</h3>
        <p>WebLLM downloads model and runtime assets from their configured Hugging Face sources when a model is first loaded. Progress is printed in the terminal. WebLLM caches downloaded assets in browser storage, so a later load can reuse them.</p>
        <p>Browser storage policy still applies. Clearing site data or automatic browser eviction can remove cached assets.</p>
      </section>

      <section class="docs-section">
        <h3>Browser requirements</h3>
        <ul class="docs-list">
          <li>A WebGPU-capable browser with hardware acceleration enabled.</li>
          <li>HTTPS or localhost so the page runs in a secure context.</li>
          <li>Network access for model and WebLLM runtime assets.</li>
          <li>Enough browser storage for the selected download.</li>
          <li>Enough GPU memory for model initialization and inference.</li>
        </ul>
      </section>

      <section class="docs-section">
        <h3>Model and conversation state</h3>
        <ul class="docs-list">
          <li>One WebLLM engine is shared by the entire page.</li>
          <li>One model can be loaded at a time.</li>
          <li>One response can generate at a time across all panes.</li>
          <li>Each pane keeps its own conversation history.</li>
          <li>The active conversation retains up to 12 recent user and assistant messages.</li>
          <li>Loading a different model clears conversation history in every pane.</li>
        </ul>
      </section>

      <section class="docs-section">
        <h3>Interrupting and unloading</h3>
        <p>Press Ctrl-C while a response is generating to call WebLLM's generation interruption method. Model initialization cannot currently be interrupted safely.</p>
        <p><code>ghostty-ai unload</code> releases the active engine after generation has finished. Closing a pane also aborts generation associated with that pane.</p>
      </section>

      <section class="docs-section">
        <h3>How it connects to the terminal</h3>
        <p>The <code>ghostty-ai</code> shell function passes the command to the host page. AI responses run outside BrowserPod, stream generated text to ghostty-web, and then return control to Bash.</p>
        <p><code>ghostty-ai ask</code> provides text chat only. <code>ghostty-ai write</code> can write confirmed file artifacts to BrowserPod. It does not execute install commands, start servers, inspect BrowserPod files, browse the network, or call tools.</p>
      </section>
    `,
  },
  {
    slug: 'configuration',
    nav: 'Configuration and themes',
    title: 'Ghostty configuration and themes',
    seoTitle: 'Ghostty Configuration and Themes Online',
    description: 'Edit supported Ghostty configuration and themes in Ghostty Playground using the raw editor or visual configuration panel.',
    lead: 'Ghostty Playground reads Ghostty-style key-value configuration and maps supported settings to ghostty-web and the browser interface.',
    content: html`
      <section class="docs-section">
        <h3>Open the editors</h3>
        <p>Right-click the terminal and choose <strong>Edit Config</strong> for the full text file or <strong>Config Panel</strong> for supported visual controls.</p>
        <dl class="docs-definition">
          <div><dt>Edit Config</dt><dd>Edits the complete configuration text with syntax highlighting.</dd></div>
          <div><dt>Config Panel</dt><dd>Edits supported settings and merges only changed fields into the existing text.</dd></div>
        </dl>
      </section>

      <section class="docs-section">
        <h3>Configuration format</h3>
        <div class="docs-code">
          <div class="docs-code-head"><span>ghostty-config</span><button class="docs-copy" data-copy-target="config-example">Copy</button></div>
          <pre><code id="config-example">font-size = 14
cursor-style = block
theme = TokyoNight
background-opacity = 0.96
scrollback-limit = 10000000
copy-on-select = true</code></pre>
        </div>
        <p>Comments and unknown settings remain in the file when the structured panel applies changed values. Unknown settings are not interpreted by the Playground runtime.</p>
      </section>

      <section class="docs-section">
        <h3>Themes and appearance</h3>
        <p>The Playground includes the Ghostty theme catalogue and supports named themes alongside explicit foreground, background, cursor, selection, and palette colours.</p>
        <p>Font, cursor, padding, background opacity, and background image settings are mapped to the browser renderer and pane layers.</p>
      </section>

      <section class="docs-section">
        <h3>Applying changes</h3>
        <p>Applied configuration is stored in browser local storage. A changed configuration reloads the page so new terminals and BrowserPod shells start with the saved settings. Applying an unchanged structured panel closes it without reloading.</p>
      </section>

      <section class="docs-section">
        <h3>Compatibility</h3>
        <p>The Playground supports the settings implemented by its parser and UI. The <a href="https://ghostty.org/docs/config" target="_blank" rel="noopener">native Ghostty configuration reference</a> remains the source for the complete desktop application.</p>
      </section>
    `,
  },
  {
    slug: 'native-differences',
    nav: 'Browser vs native',
    title: 'Browser versus native Ghostty',
    seoTitle: 'Ghostty Browser Playground vs Native Ghostty',
    description: 'Compare Ghostty Playground in the browser with the native Ghostty terminal application on macOS and Linux.',
    lead: 'The browser Playground uses Ghostty terminal technology with BrowserPod as its command environment. Native Ghostty uses the operating system directly.',
    content: html`
      <section class="docs-section">
        <h3>Runtime differences</h3>
        <div class="docs-table-wrap">
          <table class="docs-table">
            <thead><tr><th>Area</th><th>Ghostty Playground</th><th>Native Ghostty</th></tr></thead>
            <tbody>
              <tr><td>Commands</td><td>Run inside BrowserPod.</td><td>Run as operating-system processes.</td></tr>
              <tr><td>Files</td><td>Use an origin-scoped browser filesystem.</td><td>Use local files, mounts, and permissions.</td></tr>
              <tr><td>Node.js and npm</td><td>Use BrowserPod's WebAssembly runtime.</td><td>Use locally installed runtimes and native binaries.</td></tr>
              <tr><td>Git</td><td>Uses the Git CLI included in BrowserPod.</td><td>Uses the Git CLI installed on the host.</td></tr>
              <tr><td>Servers</td><td>BrowserPod Portals can expose Pod ports when integrated by the host page.</td><td>Listen on normal host interfaces and ports.</td></tr>
              <tr><td>Windows</td><td>Uses browser tabs, fullscreen, and page controls.</td><td>Uses native windows and operating-system integration.</td></tr>
              <tr><td>Configuration</td><td>Supports the Playground's documented subset.</td><td>Supports Ghostty's complete configuration surface.</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="docs-section">
        <h3>Terminal behavior</h3>
        <p>ghostty-web provides terminal parsing and rendering in the browser. BrowserPod supplies the PTY-facing process environment. Native Ghostty connects its terminal directly to operating-system PTYs and processes.</p>
      </section>

      <section class="docs-section">
        <h3>Choose the environment for the task</h3>
        <p>Ghostty Playground is suited to browser demos, interactive documentation, browser-hosted project work, terminal experimentation, and trying supported Ghostty configuration. Native Ghostty is the full desktop terminal for host files, locally installed tools, native processes, and operating-system integration.</p>
      </section>
    `,
  },
  {
    slug: 'limitations',
    nav: 'Limitations',
    title: 'Current limitations',
    seoTitle: 'Ghostty Playground Browser Limitations',
    description: 'Current Ghostty Playground limitations for native npm packages, Portals, process control, terminal resizing, files, and browser APIs.',
    lead: 'The current limits come from BrowserPod APIs, browser security boundaries, ghostty-web APIs, and features that the Playground has not integrated yet.',
    content: html`
      <section class="docs-section">
        <h3>Runtime and projects</h3>
        <div class="docs-table-wrap">
          <table class="docs-table">
            <thead><tr><th>Area</th><th>Current status</th></tr></thead>
            <tbody>
              <tr><td>Native npm modules</td><td>Require a WebAssembly-compatible alternative.</td></tr>
              <tr><td>Portal lifetime</td><td>A Portal depends on its BrowserPod server process and page session. Reloading or stopping the server ends that running service.</td></tr>
              <tr><td>Process termination</td><td>BrowserPod has no public kill method; closing a pane sends terminal shutdown input.</td></tr>
              <tr><td>Terminal resize</td><td>Rows and columns are fixed when the BrowserPod custom terminal is created.</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="docs-section">
        <h3>Browser boundaries</h3>
        <ul class="docs-list">
          <li>Clipboard actions depend on browser permission and user interaction.</li>
          <li>Browser-reserved shortcuts may not reach the terminal.</li>
          <li>Host files are not mounted into the BrowserPod filesystem.</li>
          <li>Native window effects, quick terminal behavior, secure input, and always-on-top controls are unavailable.</li>
          <li>Storage can be removed by clearing site data or browser storage eviction.</li>
        </ul>
      </section>

      <section class="docs-section">
        <h3>Ghostty feature coverage</h3>
        <ul class="docs-list">
          <li>The config parser supports a documented subset of native Ghostty settings.</li>
          <li>Some native keybinding actions have browser approximations or no web equivalent.</li>
          <li>Terminal search and stored prompt navigation are not implemented.</li>
          <li>Split panes retain the terminal grid chosen when each pane starts.</li>
        </ul>
      </section>

      <section class="docs-section">
        <h3>Local models</h3>
        <p><code>ghostty-ai</code> requires WebGPU, network access for model assets, browser storage, and sufficient GPU memory. One model and one generation are active across the page at a time.</p>
      </section>
    `,
  },
  {
    slug: 'interface',
    nav: 'Interface reference',
    title: 'Interface reference',
    seoTitle: 'Ghostty Playground Interface Reference',
    description: 'Reference for Ghostty Playground tabs, split panes, clipboard, Inspector, keybindings, local models, and the terminal game.',
    lead: 'The interface adds browser controls around the Ghostty terminal and BrowserPod session.',
    content: html`
      <section class="docs-section">
        <h3>Tabs and split panes</h3>
        <div class="docs-table-wrap">
          <table class="docs-table">
            <thead><tr><th>Default binding</th><th>Action</th></tr></thead>
            <tbody>
              <tr><td><code>super+t</code></td><td>Create a terminal tab.</td></tr>
              <tr><td><code>super+w</code></td><td>Close the active tab.</td></tr>
              <tr><td><code>super+d</code></td><td>Split the active pane to the right.</td></tr>
              <tr><td><code>super+shift+d</code></td><td>Split the active pane below.</td></tr>
              <tr><td><code>super+shift+w</code></td><td>Close the active pane.</td></tr>
              <tr><td><code>super+shift+enter</code></td><td>Toggle split zoom.</td></tr>
            </tbody>
          </table>
        </div>
        <p>Click a pane to activate it. Clipboard actions, keybindings, context menus, and the Inspector follow the active pane.</p>
      </section>

      <section class="docs-section">
        <h3>Context menu</h3>
        <dl class="docs-definition">
          <div><dt>Copy and Paste</dt><dd>Use the selection and browser clipboard for the pane that opened the menu.</dd></div>
          <div><dt>Open Inspector</dt><dd>Display live terminal grid, cursor, mode, palette, and output state.</dd></div>
          <div><dt>Edit Config</dt><dd>Open the raw Ghostty-style configuration text.</dd></div>
          <div><dt>Config Panel</dt><dd>Open the structured settings interface.</dd></div>
          <div><dt>Reset Terminal</dt><dd>Reload the page and restart the BrowserPod session.</dd></div>
        </dl>
      </section>

      <section class="docs-section">
        <h3>Keybindings</h3>
        <p>Repeated <code>keybind</code> entries use Ghostty-style modifier, key, and action syntax.</p>
        <div class="docs-code">
          <div class="docs-code-head"><span>Configuration</span><button class="docs-copy" data-copy-target="keybind-example">Copy</button></div>
          <pre><code id="keybind-example">keybind = super+c=copy_to_clipboard
keybind = super+v=paste_from_clipboard
keybind = ctrl+shift+i=inspector:toggle</code></pre>
        </div>
        <p>See <code>docs/keybinds.md</code> in the project for the complete implemented, approximated, and unsupported action list.</p>
      </section>

      <section class="docs-section">
        <h3>Ghostty Gets Even</h3>
        <p>Run <code>ghostty-gets-even</code> to open the terminal easter egg. Use the arrow keys to move, Tab to switch ghosts, and Escape to close it.</p>
      </section>

      <section class="docs-section">
        <h3>Project documentation</h3>
        <ul class="docs-list">
          <li><a href="https://ghostty.org/docs" target="_blank" rel="noopener">Ghostty documentation</a></li>
          <li><a href="https://github.com/crunchloop/ghostty-web" target="_blank" rel="noopener">ghostty-web repository</a></li>
          <li><a href="https://browserpod.io/docs" target="_blank" rel="noopener">BrowserPod documentation</a></li>
          <li><a href="https://github.com/mlc-ai/web-llm" target="_blank" rel="noopener">WebLLM repository</a></li>
        </ul>
      </section>
    `,
  },
];

const pageBySlug = new Map(pages.map(page => [page.slug, page]));
const docsRoot = document.getElementById('page-content');
const docsView = document.getElementById('docs-view');
const desktopNav = document.getElementById('docs-nav');
const mobileNav = document.getElementById('docs-mobile-nav');
const descriptionMeta = document.querySelector('meta[name="description"]');

function routeFromLocation() {
  const prefix = '#docs/';
  if (!window.location.hash.startsWith(prefix)) return pages[0].slug;
  const slug = decodeURIComponent(window.location.hash.slice(prefix.length));
  return pageBySlug.has(slug) ? slug : pages[0].slug;
}

function navMarkup() {
  return pages.map(page => (
    `<a class="docs-nav-link" href="#docs/${page.slug}" data-doc-route="${page.slug}">${page.nav}</a>`
  )).join('');
}

function adjacentLink(page, direction) {
  if (!page) return '<span class="docs-nav-empty" aria-hidden="true"></span>';
  const className = direction === 'next' ? 'docs-next' : 'docs-previous';
  const label = direction === 'next' ? 'Next' : 'Previous';
  const arrow = direction === 'next' ? ' &rarr;' : '&larr; ';
  return `
    <a class="${className}" href="#docs/${page.slug}" data-doc-route="${page.slug}">
      <small>${label}</small>
      <strong>${direction === 'next' ? `${page.nav}${arrow}` : `${arrow}${page.nav}`}</strong>
    </a>
  `;
}

function pageMarkup(page) {
  const index = pages.indexOf(page);
  return `
    <article data-doc-page="${page.slug}">
      <header class="docs-page-head">
        <h2>${page.title}</h2>
        <p class="docs-lead">${page.lead}</p>
      </header>
      ${page.content}
      <nav class="docs-page-nav" aria-label="Previous and next documentation pages">
        ${adjacentLink(pages[index - 1], 'previous')}
        ${adjacentLink(pages[index + 1], 'next')}
      </nav>
    </article>
  `;
}

function updateActiveNavigation(slug) {
  document.querySelectorAll('.docs-nav-link[data-doc-route]').forEach(link => {
    if (link.dataset.docRoute === slug) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
}

function updatePageMetadata(page) {
  document.title = page.seoTitle;
  descriptionMeta?.setAttribute('content', page.description);
}

function renderPage(slug, { scroll = false } = {}) {
  const page = pageBySlug.get(slug) ?? pages[0];
  docsView.innerHTML = pageMarkup(page);
  updateActiveNavigation(page.slug);
  updatePageMetadata(page);

  if (scroll) {
    const top = docsView.getBoundingClientRect().top + window.scrollY - 20;
    window.scrollTo({ top, behavior: 'auto' });
    docsView.focus({ preventScroll: true });
  }
}

function navigateTo(slug) {
  const page = pageBySlug.get(slug);
  if (!page) return;
  const hash = `#docs/${page.slug}`;
  if (window.location.hash !== hash) {
    window.history.pushState({ docsRoute: page.slug }, '', hash);
  }
  renderPage(page.slug, { scroll: true });
}

async function copyCode(button) {
  const target = document.getElementById(button.dataset.copyTarget);
  if (!target) return;

  try {
    await navigator.clipboard.writeText(target.textContent);
    button.textContent = 'Copied';
    button.classList.add('copied');
    window.setTimeout(() => {
      button.textContent = 'Copy';
      button.classList.remove('copied');
    }, 1200);
  } catch {
    button.textContent = 'Copy failed';
  }
}

desktopNav.innerHTML = navMarkup();
mobileNav.innerHTML = navMarkup();
renderPage(routeFromLocation(), {
  scroll: window.location.hash.startsWith('#docs/'),
});

docsRoot.addEventListener('click', event => {
  const copyButton = event.target.closest('.docs-copy');
  if (copyButton) {
    void copyCode(copyButton);
    return;
  }

  const routeLink = event.target.closest('[data-doc-route]');
  if (!routeLink) return;
  event.preventDefault();
  navigateTo(routeLink.dataset.docRoute);
});

window.addEventListener('popstate', () => {
  renderPage(routeFromLocation(), {
    scroll: window.location.hash.startsWith('#docs/'),
  });
});

window.addEventListener('hashchange', () => {
  const slug = routeFromLocation();
  if (docsView.querySelector('article')?.dataset.docPage !== slug) {
    renderPage(slug, {
      scroll: window.location.hash.startsWith('#docs/'),
    });
  }
});
