# Keybinds

## Implemented

These actions work when assigned as a keybind.

| Action | Native Ghostty behaviour | Browser behaviour |
|---|---|---|
| `copy_to_clipboard` | Copy selected text to system clipboard | Copies selection via `navigator.clipboard.writeText` |
| `paste_from_clipboard` | Paste from system clipboard into terminal | Pastes via `navigator.clipboard.readText` |
| `paste_from_selection` | Paste from primary (mouse) selection | Pastes from `window.getSelection()` |
| `select_all` | Select all terminal content | Calls `term.selectAll()` |
| `adjust_selection:left` | Extend selection left | No-op -- terminal API does not expose character-level selection manipulation |
| `adjust_selection:right` | Extend selection right | No-op -- same reason |
| `adjust_selection:up` | Extend selection up | Scrolls viewport up one line |
| `adjust_selection:down` | Extend selection down | Scrolls viewport down one line |
| `adjust_selection:page_up` | Extend selection up a page | Scrolls viewport up one page |
| `adjust_selection:page_down` | Extend selection down a page | Scrolls viewport down one page |
| `adjust_selection:home` | Extend selection to top | Scrolls to top of scrollback |
| `adjust_selection:end` | Extend selection to bottom | Scrolls to bottom of scrollback |
| `adjust_selection:beginning_of_line` | Extend to start of line | No-op -- terminal API does not expose character-level selection manipulation |
| `adjust_selection:end_of_line` | Extend to end of line | No-op -- same reason |
| `clear_screen` | Clear terminal screen | Calls `term.clear()` |
| `scroll_to_top` | Scroll to top of scrollback | Calls `term.scrollToTop()` |
| `scroll_to_bottom` | Scroll to bottom of scrollback | Calls `term.scrollToBottom()` |
| `scroll_page_up` | Scroll up one page | Calls `term.scrollPages(-1)` |
| `scroll_page_down` | Scroll down one page | Calls `term.scrollPages(1)` |
| `increase_font_size:N` | Increase font size by N | Increases `term.options.fontSize` by N |
| `decrease_font_size:N` | Decrease font size by N | Decreases `term.options.fontSize` by N, min 4 |
| `reset_font_size` | Reset font size to default | Sets `term.options.fontSize` to 14 |
| `toggle_fullscreen` | Toggle native OS fullscreen | Calls `document.documentElement.requestFullscreen()` / `exitFullscreen()` |
| `inspector:toggle` | Toggle terminal inspector panel | Toggles the inspector panel |
| `open_config` | Open config file in editor | Opens the config panel dialog |
| `reload_config` | Reload config from disk | Reloads the page (`window.location.reload()`) |
| `new_tab` | Open a new terminal tab | Opens a new tab in the tab bar |
| `next_tab` | Switch to next tab | Switches to the next tab |
| `previous_tab` | Switch to previous tab | Switches to the previous tab |
| `last_tab` | Switch to last tab | Switches to the last tab |
| `goto_tab:N` | Switch to tab N | Switches to tab N |
| `close_tab` | Close current tab | Closes the current tab |
| `new_split`, `new_split:right` | Split the current pane to the right | Creates a fixed-grid pane to the right |
| `new_split:down` | Split the current pane below | Creates a fixed-grid pane below |
| `goto_split:DIR` | Focus a neighboring split | Moves focus left, right, up, or down |
| `goto_split:previous`, `goto_split:next` | Focus splits sequentially | Moves through panes in layout order |
| `toggle_split_zoom` | Zoom or restore the active split | Shows only the active pane until toggled again |
| `resize_split:DIR,N` | Resize the active split | Moves the nearest divider by N pixels |
| `equalize_splits` | Equalize split sizes | Rebalances all split ratios |
| `text:\xNN` | Send literal bytes to the PTY | Sends bytes to the PTY |
| `esc:X` | Send ESC + X to the PTY | Sends `\x1b` + X to the PTY |
| `scroll_lines:N` | Scroll N lines | Calls `term.scrollLines(N)` |

---

## Additional implemented actions

| Action | Browser behaviour |
| --- | --- |
| `copy_to_clipboard:plain` | Same as `copy_to_clipboard` -- `term.getSelection()` already returns plain text |
| `copy_title_to_clipboard` | Copies the active tab's label to clipboard |
| `scroll_to_selection` | `term.scrollToBottom()` |
| `scroll_page_lines:N` | `term.scrollLines(N)` |
| `scroll_page_fractional:F` | `term.scrollLines(Math.round(term.rows * F))` |
| `set_font_size:N` | `term.options.fontSize = N` |
| `close_surface` | Closes the active pane, or its tab when it is the only pane |
| `close_window` | `window.close()` |
| `close_all_windows` | `window.close()` |
| `quit` | `window.close()` |
| `toggle_maximize` | Fullscreen API, same as `toggle_fullscreen` |
| `inspector:show` | Same as `inspector:toggle` |
| `inspector:hide` | Same as `inspector:toggle` |
| `toggle_readonly` | Flips a readonly flag -- when set, all keyboard input is swallowed before reaching the PTY |
| `toggle_background_opacity` | Toggles between the configured background opacity and fully opaque |
| `toggle_window_decorations` | Toggles the playground header decoration while retaining browser tabs |
| `csi:sequence` | Sends `\x1b[` + the sequence argument to the PTY |
| `write_selection_file:copy` | Copies `term.getSelection()` to clipboard |
| `reset` | `term.reset()` |
| `ignore` | Consumes the keypress without doing anything |
| `show_on_screen_keyboard` | Focuses a hidden `<input>` to trigger the mobile soft keyboard |

---

## Not yet implemented

🟢 = one-liner or near-trivial addition to `executeKeybindAction`
🟡 = self-contained feature, a few dozen lines of new code
🔴 = substantial new subsystem required first

| | Action | Native Ghostty behaviour | Proposed browser behaviour |
| --- | --- | --- | --- |
| 🟢 | `copy_to_clipboard:plain` | Copy as plain text, stripping ANSI | Same as `copy_to_clipboard` -- `term.getSelection()` already returns plain text |
| 🟢 | `copy_title_to_clipboard` | Copy the window title | Copy the current tab's label text to clipboard |
| 🟢 | `scroll_to_selection` | Scroll viewport so current selection is visible | `term.scrollToBottom()` -- selection is always near the active area |
| 🟢 | `scroll_page_lines:N` | Scroll exactly N lines | `term.scrollLines(N)` -- identical to the existing `scroll_lines:N` |
| 🟢 | `scroll_page_fractional:F` | Scroll by a fraction of the page height | `term.scrollLines(Math.round(term.rows * F))` |
| 🟢 | `set_font_size:N` | Set font size to exactly N pt | `term.options.fontSize = N` |
| 🟢 | `close_surface` | Close the current surface (pane or tab) | Close the current tab, same as `close_tab` |
| 🟢 | `close_window` | Close the current window | `window.close()` |
| 🟢 | `close_all_windows` | Close all windows | `window.close()` |
| 🟢 | `toggle_maximize` | Maximize / restore the window | Use the Fullscreen API, same as `toggle_fullscreen` |
| 🟢 | `inspector:show` | Show the inspector panel | Same as `inspector:toggle` |
| 🟢 | `inspector:hide` | Hide the inspector panel | Same as `inspector:toggle` |
| 🟢 | `toggle_readonly` | Block keyboard input from reaching the PTY | Track a flag; when set, suppress input in the `onData` handler |
| 🟢 | `csi:sequence` | Send a raw CSI escape sequence to the PTY | Send `\x1b[` + the sequence argument to `podTerm.readData` |
| 🟢 | `write_selection_file:copy` | Write the current selection to a file, copy path | `term.getSelection()` to clipboard -- same as `copy_to_clipboard` |
| 🟢 | `reset` | Full terminal reset (RIS) | `term.reset()` |
| 🟢 | `ignore` | Consume the keypress, do nothing | Return true without any action -- prevents the key reaching the PTY or browser |
| 🟢 | `quit` | Quit the application | `window.close()` |
| 🟢 | `show_on_screen_keyboard` | Raise the iOS / Android on-screen keyboard | Focus a hidden `<input>` element to trigger the mobile soft keyboard |
| 🟡 | `copy_url_to_clipboard` | Copy the URL under the cursor | Scan the line under the cursor for a URL pattern and copy it |
| 🟡 | `copy_to_clipboard:html` | Copy as HTML with colours preserved | Iterate visible cells, wrap colour runs in `<span style="color:...">`, write as `text/html` to clipboard |
| 🟡 | `move_tab:N` | Move the current tab to position N | Splice the tab in `tabList` to index N and re-render the tab bar |
| 🟡 | `prompt_tab_title` | Prompt to rename the current tab | Show an inline text input in the tab label, commit on Enter |
| 🟡 | `prompt_surface_title` | Prompt to set the surface title | Same as `prompt_tab_title` |
| 🟡 | `write_scrollback_file:copy` | Write full scrollback to a file, copy the path | Read all scrollback lines from the terminal buffer and copy to clipboard |
| 🟡 | `write_scrollback_file:paste` | Write scrollback to a file, paste path into terminal | Same but paste the text directly into the PTY |
| 🟡 | `write_scrollback_file:open` | Write scrollback to a file, open in editor | Trigger a `.txt` file download of all scrollback text |
| 🟡 | `write_screen_file:copy` | Write visible screen to a file, copy path | Read visible rows from the terminal buffer and copy to clipboard |
| 🟡 | `toggle_mouse_reporting` | Toggle mouse event forwarding to the PTY | Track a flag; suppress or pass through mouse events to the terminal accordingly |
| 🟡 | `goto_window:next` | Focus the next Ghostty window | `window.open(window.location.href, '_blank')` -- no cross-window focus API exists |
| 🟡 | `goto_window:previous` | Focus the previous Ghostty window | Same |
| 🟡 | `check_for_updates` | Check for a new Ghostty release | Fetch a version endpoint and show a notification banner if a newer version is available |
| 🔴 | `start_search` | Open the in-terminal search bar | Requires a floating search overlay with match highlighting built on top of the terminal |
| 🔴 | `end_search` | Close the search bar | Close the overlay |
| 🔴 | `search_selection` | Open search pre-filled with selected text | Open the overlay with `term.getSelection()` as the initial query |
| 🔴 | `navigate_search:next` | Move to the next search match | Step forward through matches in the overlay |
| 🔴 | `navigate_search:previous` | Move to the previous search match | Step backward through matches |
| 🔴 | `jump_to_prompt:1` | Jump forward to the next shell prompt | OSC 133 integration is active, but ghostty-web does not expose prompt positions for scrollback navigation |
| 🔴 | `jump_to_prompt:-1` | Jump backward to the previous shell prompt | Same |
| 🔴 | `toggle_tab_overview` | Show a visual overview of all open tabs | Show a grid of tab thumbnails as an overlay; click one to switch |
| 🔴 | `toggle_command_palette` | Open the command palette | Floating palette listing all available actions, filterable by typing |
## Not supported in the browser

These actions are present in the config panel UI but will never do anything here. They are listed so users know they can be skipped when configuring keybinds.

| Action | Native Ghostty behaviour | Why it cannot work in a browser |
| --- | --- | --- |
| `new_window` | Open a new Ghostty window with its own BrowserPod session | Each browser tab boots an independent BrowserPod instance -- there is no way to share a running pod across tabs, so a second window would be a completely separate disconnected session, not a second view into the same one |
| `toggle_quick_terminal` | Slide in a system-wide overlay terminal from any app | Requires OS-level access to draw above other applications -- not possible from a browser tab |
| `toggle_visibility` | Hide or show the Ghostty window | A page cannot hide the browser tab it is running in |
| `toggle_window_float_on_top` | Pin the window above all other windows | OS-level window management -- no browser API exists for this |
| `reset_window_size` | Reset the window to its default dimensions | `window.resizeTo()` is blocked in all major browsers unless the window was opened by script |
| `toggle_secure_input` | Block other applications from reading keyboard input | OS-level input isolation -- not available to a web page |
| `unbind` | Remove a keybind at runtime | Keybinds are loaded from the config file on boot, not held in a live mutable table |
| `undo` | Undo the last terminal action | Terminals have no undo history -- there is nothing to revert |
| `redo` | Redo the last undone action | Same reason as `undo` |
| `end_key_sequence` | Terminate a Ghostty key table sequence | Key tables are a Ghostty-internal mechanism with no equivalent here |
| `activate_key_table:name` | Activate a named key binding table | Ghostty-internal -- no equivalent |
| `activate_key_table_once:name` | Activate a key table for one keypress then revert | Ghostty-internal -- no equivalent |
| `deactivate_key_table` | Deactivate the current key table | Ghostty-internal -- no equivalent |
| `deactivate_all_key_tables` | Deactivate all active key tables | Ghostty-internal -- no equivalent |
| `cursor_key` | Send a cursor key escape sequence | Ambiguous as a standalone action -- there is no "which key" parameter to know which arrow to send |
