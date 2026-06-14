import './docs-app.css';

const html = String.raw;

const pages = [
  {
    slug: 'overview',
    nav: 'Overview',
    title: 'Overview',
    lead: 'Ghostty Playground combines ghostty-web, BrowserPod, and browser UI code. This page describes the responsibility of each component and the lifecycle of a session.',
    content: html`
      <section class="docs-section">
        <h3>Components</h3>
        <div class="docs-table-wrap">
          <table class="docs-table">
            <thead>
              <tr><th>Component</th><th>Responsibility</th></tr>
            </thead>
            <tbody>
              <tr>
                <td><code>@crunchloop/ghostty-web</code></td>
                <td>Parses terminal output, maintains terminal state and scrollback, handles input encoding, and renders the terminal to a canvas.</td>
              </tr>
              <tr>
                <td><code>@leaningtech/browserpod</code></td>
                <td>Provides the Linux environment, pseudo-terminals, Bash processes, commands, and files.</td>
              </tr>
              <tr>
                <td>Playground UI</td>
                <td>Implements tabs, split panes, configuration, keybindings, clipboard policy, the Inspector, and BrowserPod integration.</td>
              </tr>
              <tr>
                <td><code>@mlc-ai/web-llm</code></td>
                <td>Downloads supported MLC models and runs local inference through WebGPU.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="docs-section">
        <h3>Session lifecycle</h3>
        <ul class="docs-list">
          <li>Loading the page initializes ghostty-web and boots one BrowserPod instance.</li>
          <li>Each terminal pane has its own BrowserPod custom terminal and Bash process.</li>
          <li>Tabs and split panes share the same BrowserPod instance.</li>
          <li>Switching documentation pages replaces only the documentation article.</li>
          <li>Reloading the browser page restarts the UI and BrowserPod boot process.</li>
          <li>Applying changed configuration currently reloads the page.</li>
        </ul>
      </section>

      <section class="docs-section">
        <h3>Implemented features</h3>
        <ul class="docs-list">
          <li>Ghostty terminal parsing and rendering through ghostty-web.</li>
          <li>Interactive Bash shells through BrowserPod.</li>
          <li>Multiple tabs and nested horizontal or vertical split panes.</li>
          <li>Ghostty-style configuration parsing and a structured configuration panel.</li>
          <li>Bundled Ghostty themes and explicit colour overrides.</li>
          <li>Configurable keybindings for implemented browser actions.</li>
          <li>Clipboard policy, OSC 52 handling, selection, and copy-on-select.</li>
          <li>Terminal state Inspector.</li>
          <li>Experimental local model inference through WebLLM.</li>
        </ul>
      </section>

      <section class="docs-section">
        <h3>Documentation pages</h3>
        <dl class="docs-definition">
          <div><dt>Using the terminal</dt><dd>Boot, input, clipboard, context menu, and Inspector behavior.</dd></div>
          <div><dt>Tabs and splits</dt><dd>Pane creation, focus, fixed grids, zoom, resizing, and disposal.</dd></div>
          <div><dt>Configuration</dt><dd>Raw and structured editors, supported settings, themes, persistence, and reload behavior.</dd></div>
          <div><dt>Keybindings</dt><dd>Syntax, implemented actions, approximations, and unsupported actions.</dd></div>
          <div><dt>Local models</dt><dd>Commands, model list, resource requirements, conversation state, and interruption.</dd></div>
          <div><dt>Architecture</dt><dd>Input and output paths, pane ownership, shared memory, and cross-origin isolation.</dd></div>
          <div><dt>Limitations</dt><dd>Known constraints and troubleshooting information.</dd></div>
        </dl>
      </section>
    `,
  },
  {
    slug: 'terminal',
    nav: 'Using the terminal',
    title: 'Using the terminal',
    lead: 'Keyboard input is sent to a BrowserPod pseudo-terminal. BrowserPod output is copied into normal memory and written to ghostty-web for parsing and rendering.',
    content: html`
      <section class="docs-section">
        <h3>Startup</h3>
        <ol class="docs-steps">
          <li><strong>Initialize ghostty-web</strong>The WebAssembly terminal engine and renderer are created.</li>
          <li><strong>Boot BrowserPod</strong>The browser-hosted Linux runtime is started using <code>VITE_BP_APIKEY</code>.</li>
          <li><strong>Create the pane terminal</strong>The pane is fitted once and its row and column counts are passed to BrowserPod.</li>
          <li><strong>Start Bash</strong>An interactive Bash process is attached to the pane terminal.</li>
        </ol>
        <p>Startup errors are written into the active terminal pane and logged to the browser console.</p>
      </section>

      <section class="docs-section">
        <h3>Keyboard input</h3>
        <p>ghostty-web emits terminal data from keyboard and paste input. The playground handles configured keybindings, translates supported Kitty keyboard sequences for Bash, and passes remaining data to BrowserPod through <code>readData()</code>.</p>
        <div class="docs-code">
          <div class="docs-code-head"><span>Shell checks</span><button class="docs-copy" data-copy-target="terminal-checks">Copy</button></div>
          <pre><code id="terminal-checks">pwd
printf 'shell=%s\n' "$SHELL"
uname -a
ls -la</code></pre>
        </div>
        <p>Browser-reserved shortcuts may not reach the page. This includes some tab, address-bar, download, and developer-tool shortcuts.</p>
      </section>

      <section class="docs-section">
        <h3>Selection and clipboard</h3>
        <dl class="docs-definition">
          <div><dt>Mouse selection</dt><dd>Drag across terminal cells. The active terminal stores the selection.</dd></div>
          <div><dt>Copy</dt><dd>Uses <code>navigator.clipboard.writeText()</code> when clipboard policy allows it.</dd></div>
          <div><dt>Paste</dt><dd>Uses <code>navigator.clipboard.readText()</code> and passes the result through the terminal paste API.</dd></div>
          <div><dt>copy-on-select</dt><dd>Copies a selection automatically after the selection change settles.</dd></div>
          <div><dt>OSC 52</dt><dd>Clipboard requests from terminal applications are allowed, denied, or confirmed according to configuration.</dd></div>
        </dl>
        <p>The browser can still require permission or a recent user interaction even when the Ghostty setting allows clipboard access.</p>
      </section>

      <section class="docs-section">
        <h3>Context menu</h3>
        <div class="docs-table-wrap">
          <table class="docs-table">
            <thead><tr><th>Item</th><th>Behavior</th></tr></thead>
            <tbody>
              <tr><td>Copy</td><td>Copies the selection from the pane that opened the menu.</td></tr>
              <tr><td>Paste</td><td>Pastes clipboard text into that pane.</td></tr>
              <tr><td>Reset Terminal</td><td>Reloads the browser page and restarts the session.</td></tr>
              <tr><td>Open Inspector</td><td>Shows live state for the active pane.</td></tr>
              <tr><td>Edit Config</td><td>Opens the raw configuration editor.</td></tr>
              <tr><td>Config Panel</td><td>Opens the structured configuration editor.</td></tr>
              <tr><td>About</td><td>Shows runtime and dependency information.</td></tr>
              <tr><td>Change Title</td><td>Changes the page and header title for the current browser page.</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="docs-section">
        <h3>Inspector</h3>
        <p>The Inspector follows the active pane and displays:</p>
        <ul class="docs-list">
          <li>Grid dimensions, scroll region, buffer type, line count, and viewport position.</li>
          <li>Cursor position, style, visibility, blink state, and colour.</li>
          <li>Mouse tracking, SGR mouse mode, bracketed paste, and focus reporting.</li>
          <li>Terminal modes including auto-wrap, insert, line feed, origin, and alternate screen.</li>
          <li>Current foreground, background, selection, and 16-colour palette values.</li>
          <li>A text-only log of terminal output with control characters shown as markers.</li>
        </ul>
        <p>Pausing the Inspector stops log updates. Clearing it removes the Inspector log only; it does not alter terminal scrollback.</p>
      </section>
    `,
  },
  {
    slug: 'workspace',
    nav: 'Tabs and splits',
    title: 'Tabs and split panes',
    lead: 'Each tab owns a split tree, a pane map, and one active pane ID. Each pane owns a terminal renderer, BrowserPod terminal, Bash process, listeners, and per-pane state.',
    content: html`
      <section class="docs-section">
        <h3>Tabs</h3>
        <p>The plus button or <code>new_tab</code> action creates a tab with one pane. The pane starts a new Bash process in the existing BrowserPod instance.</p>
        <div class="docs-table-wrap">
          <table class="docs-table">
            <thead><tr><th>Default binding</th><th>Action</th></tr></thead>
            <tbody>
              <tr><td><code>super+t</code></td><td>Create a tab.</td></tr>
              <tr><td><code>super+shift+bracketleft</code></td><td>Focus the previous tab.</td></tr>
              <tr><td><code>super+shift+bracketright</code></td><td>Focus the next tab.</td></tr>
              <tr><td><code>super+w</code></td><td>Close the active tab.</td></tr>
            </tbody>
          </table>
        </div>
        <p>Switching tabs hides and shows existing tab containers. It does not recreate terminals or processes.</p>
      </section>

      <section class="docs-section">
        <h3>Creating split panes</h3>
        <div class="docs-table-wrap">
          <table class="docs-table">
            <thead><tr><th>Default binding</th><th>Action</th></tr></thead>
            <tbody>
              <tr><td><code>super+d</code></td><td>Create a pane to the right of the active pane.</td></tr>
              <tr><td><code>super+shift+d</code></td><td>Create a pane below the active pane.</td></tr>
              <tr><td><code>super+shift+w</code></td><td>Close the active pane, or close the tab if it contains one pane.</td></tr>
            </tbody>
          </table>
        </div>
        <p>A split replaces the active leaf node with a branch containing the existing pane and the new pane. Nested splits are supported.</p>
      </section>

      <section class="docs-section">
        <h3>Focus and navigation</h3>
        <ul class="docs-list">
          <li>Clicking a pane makes it active.</li>
          <li><code>focus-follows-mouse</code> can activate a pane when the pointer enters it.</li>
          <li><code>goto_split:left</code>, <code>right</code>, <code>up</code>, and <code>down</code> select a spatial neighbor.</li>
          <li><code>goto_split:previous</code> and <code>next</code> traverse panes in layout order.</li>
          <li>Paste, keybind actions, the context menu, and the Inspector use active-pane state.</li>
        </ul>
      </section>

      <section class="docs-section">
        <h3>Size and zoom</h3>
        <p>BrowserPod terminal dimensions are fixed when the pane is created. Divider movement changes the visible allocation but does not resize the BrowserPod PTY or ghostty-web grid.</p>
        <dl class="docs-definition">
          <div><dt>Drag divider</dt><dd>Updates the branch ratio and lays out the existing fixed-grid canvases.</dd></div>
          <div><dt>resize_split</dt><dd>Moves the nearest applicable divider by the configured pixel amount.</dd></div>
          <div><dt>equalize_splits</dt><dd>Sets split ratios back to equal values.</dd></div>
          <div><dt>toggle_split_zoom</dt><dd>Temporarily displays only the active pane. Zoom state is stored by pane ID.</dd></div>
        </dl>
        <p>An undersized pane scrolls or clips the fixed terminal canvas. BrowserPod does not expose a terminal resize operation in its published API.</p>
      </section>

      <section class="docs-section">
        <h3>Closing a pane</h3>
        <p>Pane disposal performs the following operations once:</p>
        <ol class="docs-steps">
          <li>Mark the pane closed so late output is ignored.</li>
          <li>Abort local model generation associated with the pane.</li>
          <li>Dispose input, selection, prompt, and command listeners.</li>
          <li>Send Ctrl-C followed by <code>exit</code> to the shell.</li>
          <li>Dispose the ghostty-web terminal and remove the pane element.</li>
        </ol>
        <p>Process shutdown is best-effort because BrowserPod exposes process completion but no public kill operation.</p>
      </section>
    `,
  },
  {
    slug: 'configuration',
    nav: 'Configuration',
    title: 'Configuration',
    lead: 'Configuration uses Ghostty-style key-value text. The raw editor edits the full text. The structured panel edits only settings implemented by the playground.',
    content: html`
      <section class="docs-section">
        <h3>Storage and loading</h3>
        <ul class="docs-list">
          <li>The bundled default is <code>ghostty-config</code>.</li>
          <li>Applied configuration is stored under <code>ghostty-config</code> in browser local storage.</li>
          <li>If the bundled configuration signature changes, the stored configuration is cleared.</li>
          <li>Unknown settings are ignored by the runtime parser.</li>
          <li>Comments and unknown settings are preserved when the structured panel merges changed values.</li>
        </ul>
      </section>

      <section class="docs-section">
        <h3>Raw editor</h3>
        <p><strong>Edit Config</strong> opens the complete text with Tree-sitter syntax highlighting. Apply stores the editor text and reloads the page. <code>Cmd/Ctrl+Enter</code> also applies.</p>
      </section>

      <section class="docs-section">
        <h3>Structured panel</h3>
        <p>The panel tracks which fields differ from their initial values. Apply serializes only those dirty fields, merges them into the existing text, stores the result, and reloads the page. Apply with no dirty fields closes the panel without reloading.</p>
        <p>Clearing a field removes an existing value where the setting supports clearing. Theme previews do not create explicit colour overrides.</p>
      </section>

      <section class="docs-section">
        <h3>Example</h3>
        <div class="docs-code">
          <div class="docs-code-head"><span>ghostty-config</span><button class="docs-copy" data-copy-target="configuration-example">Copy</button></div>
          <pre><code id="configuration-example">font-size = 14
font-family = monospace
cursor-style = block
cursor-style-blink = true

theme = TokyoNight
background-opacity = 0.96
window-padding-x = 8
window-padding-y = 6

scrollback-limit = 10000000
smooth-scroll-duration = 200
copy-on-select = true
cursor-click-to-move = true</code></pre>
        </div>
      </section>

      <section class="docs-section">
        <h3>Appearance settings</h3>
        <div class="docs-table-wrap">
          <table class="docs-table">
            <thead><tr><th>Setting</th><th>Behavior</th></tr></thead>
            <tbody>
              <tr><td><code>font-size</code></td><td>Sets terminal font size in pixels.</td></tr>
              <tr><td><code>font-family</code></td><td>Sets the browser font-family value used by the renderer.</td></tr>
              <tr><td><code>cursor-style</code></td><td>Supports block, bar, underline, and block_hollow mapping.</td></tr>
              <tr><td><code>theme</code></td><td>Loads a named file from the bundled theme catalogue.</td></tr>
              <tr><td>Colour keys</td><td>Override foreground, background, cursor, selection, or palette values from the named theme.</td></tr>
              <tr><td><code>background-opacity</code></td><td>Controls the browser background layer beneath the transparent terminal canvas.</td></tr>
              <tr><td><code>background-image</code></td><td>Uses a URL or stored local data URL as the pane background image.</td></tr>
              <tr><td><code>window-padding-x/y</code></td><td>Applies CSS padding around each terminal canvas.</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="docs-section">
        <h3>Behavior settings</h3>
        <div class="docs-table-wrap">
          <table class="docs-table">
            <thead><tr><th>Setting</th><th>Behavior</th></tr></thead>
            <tbody>
              <tr><td><code>scrollback-limit</code></td><td>Interpreted as bytes, matching native Ghostty, then converted to ghostty-web's line-count option.</td></tr>
              <tr><td><code>smooth-scroll-duration</code></td><td>Passed to ghostty-web.</td></tr>
              <tr><td><code>preserve-scroll-on-write</code></td><td>Passed to ghostty-web.</td></tr>
              <tr><td><code>mouse-scroll-multiplier</code></td><td>Scales precision and discrete wheel events before they reach the terminal.</td></tr>
              <tr><td><code>copy-on-select</code></td><td>Copies completed selections when clipboard policy allows it.</td></tr>
              <tr><td><code>cursor-click-to-move</code></td><td>Sends left or right cursor keys when clicking the current prompt row.</td></tr>
              <tr><td><code>focus-follows-mouse</code></td><td>Activates a split pane on pointer entry.</td></tr>
              <tr><td><code>shell-prompt</code></td><td>Sets <code>PS1</code> for the initial Bash process.</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    `,
  },
  {
    slug: 'keybindings',
    nav: 'Keybindings',
    title: 'Keybindings',
    lead: 'Keybindings are parsed from repeated Ghostty-style keybind entries. Actions are handled by browser UI code or sent as terminal input.',
    content: html`
      <section class="docs-section">
        <h3>Syntax</h3>
        <div class="docs-code">
          <div class="docs-code-head"><span>Keybind entries</span><button class="docs-copy" data-copy-target="keybinding-example">Copy</button></div>
          <pre><code id="keybinding-example">keybind = super+c=copy_to_clipboard
keybind = super+v=paste_from_clipboard
keybind = super+t=new_tab
keybind = super+d=new_split:right
keybind = super+shift+d=new_split:down
keybind = super+shift+enter=toggle_split_zoom
keybind = ctrl+shift+i=inspector:toggle</code></pre>
        </div>
        <p>The left side contains modifiers and a key. Supported modifiers are <code>ctrl</code>, <code>alt</code>, <code>shift</code>, and <code>super</code>. The right side contains the action and optional arguments.</p>
      </section>

      <section class="docs-section">
        <h3>Implemented action groups</h3>
        <dl class="docs-definition">
          <div><dt>Clipboard</dt><dd>Copy, paste, selection paste, title copy, and plain-text variants.</dd></div>
          <div><dt>Scrollback</dt><dd>Scroll to top or bottom, by page, by line count, or by page fraction.</dd></div>
          <div><dt>Font size</dt><dd>Increase, decrease, reset, or set the active terminal font size.</dd></div>
          <div><dt>Tabs</dt><dd>Create, close, cycle, select by number, or select the last tab.</dd></div>
          <div><dt>Split panes</dt><dd>Create, close, focus, resize, equalize, or zoom panes.</dd></div>
          <div><dt>Terminal input</dt><dd>Send literal text, ESC-prefixed data, CSI data, or byte values.</dd></div>
          <div><dt>UI</dt><dd>Toggle fullscreen, Inspector, readonly mode, background opacity, and window decorations.</dd></div>
        </dl>
      </section>

      <section class="docs-section">
        <h3>Approximate browser mappings</h3>
        <div class="docs-table-wrap">
          <table class="docs-table">
            <thead><tr><th>Action</th><th>Browser behavior</th></tr></thead>
            <tbody>
              <tr><td><code>toggle_fullscreen</code></td><td>Uses the browser Fullscreen API.</td></tr>
              <tr><td><code>toggle_maximize</code></td><td>Uses the same Fullscreen API behavior.</td></tr>
              <tr><td><code>close_window</code></td><td>Calls <code>window.close()</code>, which browsers may refuse.</td></tr>
              <tr><td><code>close_all_windows</code></td><td>Calls <code>window.close()</code> for the current page only.</td></tr>
              <tr><td><code>adjust_selection:up/down</code></td><td>Scrolls because character-level selection endpoints are not exposed.</td></tr>
              <tr><td><code>write_selection_file:copy</code></td><td>Copies selection text instead of creating a native temporary file.</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="docs-section">
        <h3>Unsupported native actions</h3>
        <div class="docs-table-wrap">
          <table class="docs-table">
            <thead><tr><th>Action</th><th>Reason</th></tr></thead>
            <tbody>
              <tr><td><code>new_window</code></td><td>A new browser page would boot a separate BrowserPod session.</td></tr>
              <tr><td><code>toggle_quick_terminal</code></td><td>Requires an operating-system overlay.</td></tr>
              <tr><td><code>toggle_visibility</code></td><td>A page cannot hide its browser tab.</td></tr>
              <tr><td><code>toggle_window_float_on_top</code></td><td>Browser pages cannot control native window stacking.</td></tr>
              <tr><td><code>toggle_secure_input</code></td><td>Requires operating-system input isolation.</td></tr>
              <tr><td><code>activate_key_table:*</code></td><td>Ghostty key tables are not implemented by the playground parser.</td></tr>
              <tr><td><code>undo</code> / <code>redo</code></td><td>A terminal byte stream has no reversible application action history.</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="docs-section">
        <h3>Troubleshooting</h3>
        <ul class="docs-list">
          <li>Check whether the browser reserves the shortcut.</li>
          <li>Check that the intended pane is active.</li>
          <li>Check modifier names, key names, equals signs, and action arguments.</li>
          <li>Check whether readonly mode is enabled.</li>
          <li>Check <code>docs/keybinds.md</code> for the full action list and browser mapping.</li>
        </ul>
      </section>
    `,
  },
  {
    slug: 'local-models',
    nav: 'Local models',
    title: 'Local model inference',
    lead: 'The ghostty-ai shell function sends requests to a WebLLM engine in the host page. It does not install a model in BrowserPod and does not provide tool or agent capabilities.',
    content: html`
      <section class="docs-section">
        <h3>Commands</h3>
        <div class="docs-table-wrap">
          <table class="docs-table">
            <thead><tr><th>Command</th><th>Behavior</th></tr></thead>
            <tbody>
              <tr><td><code>ghostty-ai models</code></td><td>List available models and approximate download sizes.</td></tr>
              <tr><td><code>ghostty-ai load &lt;number|id&gt;</code></td><td>Download or open the cached model and initialize WebLLM.</td></tr>
              <tr><td><code>ghostty-ai ask &lt;prompt&gt;</code></td><td>Generate a response using the active pane's conversation.</td></tr>
              <tr><td><code>ghostty-ai &lt;prompt&gt;</code></td><td>Shorthand for <code>ask</code>.</td></tr>
              <tr><td><code>ghostty-ai status</code></td><td>Show engine state and active-pane conversation count.</td></tr>
              <tr><td><code>ghostty-ai clear</code></td><td>Clear the active pane's conversation.</td></tr>
              <tr><td><code>ghostty-ai unload</code></td><td>Unload the engine and clear conversations in all panes.</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="docs-section">
        <h3>Example</h3>
        <div class="docs-code">
          <div class="docs-code-head"><span>Terminal</span><button class="docs-copy" data-copy-target="model-example">Copy</button></div>
          <pre><code id="model-example">ghostty-ai models
ghostty-ai load 5
ghostty-ai ask Explain file descriptors
ghostty-ai Give a shorter version
ghostty-ai status
ghostty-ai unload</code></pre>
        </div>
      </section>

      <section class="docs-section">
        <h3>Models</h3>
        <div class="docs-table-wrap">
          <table class="docs-table">
            <thead><tr><th>No.</th><th>Model ID</th><th>Approx. download</th></tr></thead>
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
        <p>Download size does not include all runtime GPU memory. Larger models can fail after download if the browser cannot allocate enough GPU memory.</p>
      </section>

      <section class="docs-section">
        <h3>Requirements</h3>
        <ul class="docs-list">
          <li>A secure browser context: HTTPS or localhost.</li>
          <li>WebGPU support and hardware acceleration.</li>
          <li>Network access to the model files on Hugging Face and WebLLM runtime assets.</li>
          <li>Enough browser storage for the download.</li>
          <li>Enough GPU memory for the selected model.</li>
        </ul>
      </section>

      <section class="docs-section">
        <h3>State and concurrency</h3>
        <ul class="docs-list">
          <li>One WebLLM engine is shared by the page.</li>
          <li>Only one model is loaded at a time.</li>
          <li>Only one generation can run at a time.</li>
          <li>Conversation history is stored separately for each pane.</li>
          <li>Changing the loaded model clears conversation history in all panes.</li>
          <li>The active conversation keeps up to 12 recent user and assistant messages.</li>
        </ul>
      </section>

      <section class="docs-section">
        <h3>Interruption and output</h3>
        <p><code>Ctrl-C</code> calls WebLLM's generation interruption method. Model loading is not currently cancellable. Closing a pane aborts generation associated with that pane.</p>
        <p>Generated control characters are replaced with visible text markers before terminal output is written. The model cannot inject terminal escape sequences through generated text.</p>
      </section>

      <section class="docs-section">
        <h3>No tool access</h3>
        <p>The model cannot execute commands, inspect files, read BrowserPod state, browse the network, or call tools. The shell function passes text to the host model runtime and writes returned text to the terminal.</p>
      </section>
    `,
  },
  {
    slug: 'architecture',
    nav: 'Architecture',
    title: 'Architecture',
    lead: 'The terminal renderer, Linux runtime, workspace UI, and local model runtime are separate components connected by explicit browser APIs.',
    content: html`
      <section class="docs-section">
        <h3>Input path</h3>
        <ol class="docs-steps">
          <li><strong>Browser input</strong>Keyboard, paste, and terminal-generated responses enter ghostty-web.</li>
          <li><strong>Keybinding handling</strong>The playground consumes matching configured UI actions.</li>
          <li><strong>Kitty translation</strong>Supported Kitty keyboard sequences are converted for Bash.</li>
          <li><strong>PTY input</strong>Remaining data is passed to the active BrowserPod terminal through <code>readData()</code>.</li>
        </ol>
      </section>

      <section class="docs-section">
        <h3>Output path</h3>
        <ol class="docs-steps">
          <li><strong>Process output</strong>Bash or a child process writes bytes to its BrowserPod PTY.</li>
          <li><strong>Shared-memory copy</strong>The output view is copied into a new <code>Uint8Array</code> before decoding or rendering.</li>
          <li><strong>Host markers</strong>Private <code>ghostty-ai</code> bridge markers are removed and dispatched.</li>
          <li><strong>Inspector and clipboard handling</strong>Output is recorded for the Inspector and scanned for OSC 52 clipboard requests.</li>
          <li><strong>Newline conversion</strong>Bare line feeds are converted to CRLF for terminal display.</li>
          <li><strong>Terminal write</strong>The resulting bytes are written to ghostty-web.</li>
        </ol>
      </section>

      <section class="docs-section">
        <h3>Pane object</h3>
        <p>Each pane stores:</p>
        <ul class="docs-list">
          <li>Pane and tab IDs plus its DOM elements.</li>
          <li>The ghostty-web terminal and fixed PTY dimensions.</li>
          <li>The BrowserPod custom terminal and process completion promise.</li>
          <li>Input, selection, prompt, and command event disposables.</li>
          <li>Inspector, OSC 52, game trigger, and local model bridge buffers.</li>
          <li>Per-pane local model messages and abort controller.</li>
          <li>Runtime configuration and lifecycle flags.</li>
        </ul>
      </section>

      <section class="docs-section">
        <h3>Tab object</h3>
        <p>Each tab stores a <code>SplitTree</code>, pane map, pane element map, layout renderer, active pane ID, container element, and tab button. No global pane registry is used for pane-specific operations.</p>
      </section>

      <section class="docs-section">
        <h3>Split tree</h3>
        <p>The split tree contains leaf nodes with pane IDs and branch nodes with direction, ratio, and child indexes. It implements insertion, removal, spatial navigation, sequential navigation, divider resizing, equalization, and zoom by pane ID.</p>
      </section>

      <section class="docs-section">
        <h3>Cross-origin isolation</h3>
        <p>BrowserPod uses <code>SharedArrayBuffer</code>. The page must be cross-origin isolated.</p>
        <div class="docs-code">
          <div class="docs-code-head"><span>Response headers</span><button class="docs-copy" data-copy-target="isolation-headers">Copy</button></div>
          <pre><code id="isolation-headers">Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Opener-Policy: same-origin</code></pre>
        </div>
        <p>The Vite development server sets these headers. The page also loads the bundled cross-origin-isolation service worker before application modules for hosts that cannot set them directly.</p>
      </section>

      <section class="docs-section">
        <h3>Local model bridge</h3>
        <p>The initial Bash process defines a <code>ghostty-ai</code> function. The function writes its parsed arguments in a private OSC marker and waits. The host page removes the marker from visible output, runs WebLLM, streams sanitized text to ghostty-web, and sends Enter to release Bash.</p>
      </section>
    `,
  },
  {
    slug: 'limitations',
    nav: 'Limitations',
    title: 'Limitations and troubleshooting',
    lead: 'These constraints come from BrowserPod API limits, browser security, missing ghostty-web APIs, or features not implemented by the playground.',
    content: html`
      <section class="docs-section">
        <h3>Known limitations</h3>
        <div class="docs-table-wrap">
          <table class="docs-table">
            <thead><tr><th>Area</th><th>Limitation</th></tr></thead>
            <tbody>
              <tr><td>Terminal resize</td><td>BrowserPod custom terminal dimensions cannot be changed after creation.</td></tr>
              <tr><td>Process termination</td><td>BrowserPod exposes completion but no public kill operation. Pane shutdown is best-effort.</td></tr>
              <tr><td>Native transparency and blur</td><td>The page cannot display or blur native desktop windows behind the browser.</td></tr>
              <tr><td>Multiple native windows</td><td>Each browser page boots an independent BrowserPod instance.</td></tr>
              <tr><td>Terminal search</td><td>No search overlay or scrollback match index is implemented.</td></tr>
              <tr><td>Prompt navigation</td><td>OSC 133 events are recognized, but ghostty-web does not expose stored prompt positions.</td></tr>
              <tr><td>OS window actions</td><td>Quick terminal, always-on-top, secure input, and native window visibility are unavailable.</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="docs-section">
        <h3>BrowserPod startup</h3>
        <dl class="docs-definition">
          <div><dt>BrowserPod failed to boot</dt><dd>Check <code>VITE_BP_APIKEY</code>, network access, cross-origin isolation, and browser console output.</dd></div>
          <div><dt>Shell failed to start</dt><dd>Custom terminal creation or <code>pod.run()</code> failed after BrowserPod boot. The pane includes the returned error message.</dd></div>
          <div><dt>Shell exited</dt><dd>The Bash process completed. Create a new pane or tab for another shell.</dd></div>
        </dl>
      </section>

      <section class="docs-section">
        <h3>Terminal display and input</h3>
        <dl class="docs-definition">
          <div><dt>Pane is clipped</dt><dd>The pane has a fixed terminal grid. Enlarge the split, zoom the pane, or create a new pane at a different size.</dd></div>
          <div><dt>Shortcut does not run</dt><dd>Check browser-reserved shortcuts, active pane, config syntax, readonly mode, and action support.</dd></div>
          <div><dt>Paste is denied</dt><dd>Check clipboard configuration, browser site permissions, secure context, and user-interaction requirements.</dd></div>
          <div><dt>Click-to-move does nothing</dt><dd>It only works on the active prompt row when there is no selection and no terminal mouse tracking.</dd></div>
          <div><dt>Prompt changes in a child shell</dt><dd><code>shell-prompt</code> sets the initial Bash <code>PS1</code>. A child shell can replace it.</dd></div>
        </dl>
      </section>

      <section class="docs-section">
        <h3>Configuration</h3>
        <dl class="docs-definition">
          <div><dt>Apply restarts the session</dt><dd>Applying dirty structured settings or raw config stores text and reloads the page.</dd></div>
          <div><dt>Setting has no effect</dt><dd>The parser ignores unknown keys. Check whether the setting is listed in the structured panel or README.</dd></div>
          <div><dt>Local background disappeared</dt><dd>Local files depend on their stored data URL in browser local storage.</dd></div>
        </dl>
      </section>

      <section class="docs-section">
        <h3>Local models</h3>
        <dl class="docs-definition">
          <div><dt>WebGPU unavailable</dt><dd>Use a WebGPU-capable browser over HTTPS or localhost and check hardware acceleration.</dd></div>
          <div><dt>Model load failed</dt><dd>Check network access, browser storage quota, and GPU memory. Try a smaller model.</dd></div>
          <div><dt>Model already generating</dt><dd>Only one generation can run across the page. Wait or interrupt the active generation.</dd></div>
          <div><dt>Ctrl-C does not stop loading</dt><dd>Generation can be interrupted. Model initialization is not currently cancellable.</dd></div>
          <div><dt>Model claims it used a tool</dt><dd>No tool execution path exists. The claim is generated text.</dd></div>
        </dl>
      </section>

      <section class="docs-section">
        <h3>Inspector checks</h3>
        <p>Use the Inspector to check grid dimensions, alternate-screen state, mouse tracking, bracketed paste, cursor state, palette values, and incoming terminal output. Activate the affected pane before reading Inspector state.</p>
      </section>

      <section class="docs-section">
        <h3>External documentation</h3>
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

function renderPage(slug, { scroll = false } = {}) {
  const page = pageBySlug.get(slug) ?? pages[0];
  docsView.innerHTML = pageMarkup(page);
  updateActiveNavigation(page.slug);

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
