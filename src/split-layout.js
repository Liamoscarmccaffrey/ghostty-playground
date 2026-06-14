// Split layout renderer.
// Takes a SplitTree and a map of paneId -> HTMLElement (terminal container),
// and lays them out inside a parent container element using absolute positioning.
// Also wires up draggable dividers.

const DIVIDER_PX = 1;        // visible divider width/height
const HIT_PX = 7;            // interactive hit area (3px each side + 1px visible)
const MIN_RATIO = 0.1;
const MAX_RATIO = 0.9;

export class SplitLayout {
  constructor(containerEl, onRatioChange) {
    this.container = containerEl;
    this.onRatioChange = onRatioChange; // (nodeIdx, newRatio) => void
    this._dividers = [];   // currently rendered divider elements
    this._activePaneId = null;
  }

  // Re-render the layout from the given tree and pane elements.
  // paneEls: Map<paneId, HTMLElement>
  // activePaneId: currently focused pane
  render(tree, paneEls, activePaneId) {
    this._activePaneId = activePaneId;
    // Remove old dividers
    for (const d of this._dividers) d.remove();
    this._dividers = [];

    // Hide all pane elements
    for (const [, el] of paneEls) {
      el.style.display = 'none';
      el.style.position = 'absolute';
    }

    if (tree.nodes.length === 0) return;

    const cw = this.container.offsetWidth;
    const ch = this.container.offsetHeight;

    if (tree.zoomedPaneId !== null) {
      // Zoom: show only the zoomed pane
      const el = paneEls.get(tree.zoomedPaneId);
      if (el) {
        el.style.display = 'block';
        el.style.left   = '0';
        el.style.top    = '0';
        el.style.width  = `${cw}px`;
        el.style.height = `${ch}px`;
      }
      return;
    }

    this._renderNode(tree, 0, 0, 0, cw, ch, paneEls);
  }

  _renderNode(tree, idx, x, y, w, h, paneEls) {
    const n = tree.nodes[idx];
    if (!n) return;

    if (n.type === 'leaf') {
      const el = paneEls.get(n.paneId);
      if (el) {
        el.style.display = 'block';
        el.style.left   = `${Math.round(x)}px`;
        el.style.top    = `${Math.round(y)}px`;
        el.style.width  = `${Math.round(w)}px`;
        el.style.height = `${Math.round(h)}px`;
      }
      return;
    }

    if (n.direction === 'horizontal') {
      const lw = Math.round(w * n.ratio);
      const rw = w - lw - DIVIDER_PX;
      this._renderNode(tree, n.left,  x,              y, lw, h, paneEls);
      this._renderNode(tree, n.right, x + lw + DIVIDER_PX, y, rw, h, paneEls);
      this._addDivider(tree, idx, x + lw, y, DIVIDER_PX, h, 'horizontal', w);
    } else {
      const th = Math.round(h * n.ratio);
      const bh = h - th - DIVIDER_PX;
      this._renderNode(tree, n.left,  x, y,              w, th, paneEls);
      this._renderNode(tree, n.right, x, y + th + DIVIDER_PX, w, bh, paneEls);
      this._addDivider(tree, idx, x, y + th, w, DIVIDER_PX, 'vertical', h);
    }
  }

  _addDivider(tree, nodeIdx, x, y, w, h, direction, totalAxisPx) {
    const el = document.createElement('div');
    el.className = 'split-divider split-divider-' + direction;
    el.style.position = 'absolute';
    el.style.left   = `${Math.round(x)}px`;
    el.style.top    = `${Math.round(y)}px`;
    el.style.width  = `${w}px`;
    el.style.height = `${h}px`;
    el.style.zIndex = '10';
    el.style.cursor = direction === 'horizontal' ? 'ew-resize' : 'ns-resize';
    el.style.background = 'var(--split-divider-color, #2a2b3d)';

    // Expand hit area symmetrically without shifting the visual bar.
    const hitEl = document.createElement('div');
    hitEl.style.position = 'absolute';
    if (direction === 'horizontal') {
      hitEl.style.top    = '0';
      hitEl.style.bottom = '0';
      hitEl.style.left   = `-${(HIT_PX - DIVIDER_PX) / 2}px`;
      hitEl.style.right  = `-${(HIT_PX - DIVIDER_PX) / 2}px`;
    } else {
      hitEl.style.left   = '0';
      hitEl.style.right  = '0';
      hitEl.style.top    = `-${(HIT_PX - DIVIDER_PX) / 2}px`;
      hitEl.style.bottom = `-${(HIT_PX - DIVIDER_PX) / 2}px`;
    }
    hitEl.style.cursor = el.style.cursor;
    el.appendChild(hitEl);

    // Drag to resize
    let startPos = 0;
    let startRatio = tree.nodes[nodeIdx].ratio;
    const onMouseMove = (e) => {
      const delta = direction === 'horizontal'
        ? e.clientX - startPos
        : e.clientY - startPos;
      const newRatio = Math.min(MAX_RATIO, Math.max(MIN_RATIO, startRatio + delta / totalAxisPx));
      this.onRatioChange(nodeIdx, newRatio);
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    el.addEventListener('mousedown', (e) => {
      e.preventDefault();
      startPos = direction === 'horizontal' ? e.clientX : e.clientY;
      startRatio = tree.nodes[nodeIdx].ratio;
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });

    // Double-click to equalize
    el.addEventListener('dblclick', () => {
      this.onRatioChange(nodeIdx, 0.5);
    });

    this.container.appendChild(el);
    this._dividers.push(el);
  }
}
