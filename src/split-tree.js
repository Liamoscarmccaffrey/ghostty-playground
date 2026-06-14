// Binary split tree — mirrors Ghostty's SplitTree data structure.
// Nodes are stored in a flat array; the root is always at index 0.
// Each node is either { type:'leaf', paneId } or
// { type:'split', direction:'horizontal'|'vertical', ratio, left, right }
// where left/right are integer indices into the nodes array.
// 'horizontal' = side-by-side (vertical divider line).
// 'vertical'   = top/bottom (horizontal divider line).

export class SplitTree {
  constructor() {
    this.nodes = [];   // flat array of node objects
    this.zoomedPaneId = null;
    this._nextPaneId = 1;
  }

  // Create a tree with a single leaf pane. Returns the pane id.
  static withRoot() {
    const t = new SplitTree();
    const paneId = t._nextPaneId++;
    t.nodes.push({ type: 'leaf', paneId });
    return { tree: t, paneId };
  }

  newPaneId() {
    return this._nextPaneId++;
  }

  // Deep-clone the tree (nodes are plain objects so JSON works fine).
  clone() {
    const t = new SplitTree();
    t.nodes = JSON.parse(JSON.stringify(this.nodes));
    t.zoomedPaneId = this.zoomedPaneId;
    t._nextPaneId = this._nextPaneId;
    return t;
  }

  // Returns true if the root is a split node (i.e. more than one pane exists).
  get isSplit() {
    return this.nodes.length > 0 && this.nodes[0].type === 'split';
  }

  // Returns all leaf indices in in-order (left-to-right, top-to-bottom) traversal.
  _leaves(idx = 0) {
    if (idx < 0 || idx >= this.nodes.length) return [];
    const n = this.nodes[idx];
    if (n.type === 'leaf') return [idx];
    return [...this._leaves(n.left), ...this._leaves(n.right)];
  }

  // Returns leaf indices only under a given subtree index.
  _leavesUnder(idx) {
    return this._leaves(idx);
  }

  // Find the node index whose paneId matches.
  findLeaf(paneId) {
    return this.nodes.findIndex(n => n.type === 'leaf' && n.paneId === paneId);
  }

  // Find the parent index of a given node index, and whether child is left or right.
  _parent(childIdx) {
    for (let i = 0; i < this.nodes.length; i++) {
      const n = this.nodes[i];
      if (n.type === 'split') {
        if (n.left === childIdx) return { idx: i, side: 'left' };
        if (n.right === childIdx) return { idx: i, side: 'right' };
      }
    }
    return null;
  }

  // Returns the path (array of { idx, side }) from root down to targetIdx.
  _pathTo(targetIdx, idx = 0, path = []) {
    if (idx === targetIdx) return path;
    const n = this.nodes[idx];
    if (n.type === 'leaf') return null;
    const left = this._pathTo(targetIdx, n.left, [...path, { idx, side: 'left' }]);
    if (left) return left;
    return this._pathTo(targetIdx, n.right, [...path, { idx, side: 'right' }]);
  }

  // Insert a new pane next to paneId in the given direction.
  // direction: 'right' | 'down' | 'left' | 'up'
  // Returns the new pane id.
  insert(activePaneId, direction) {
    return this.insertPane(activePaneId, direction);
  }

  // Clean rebuild-based insert — always correct, keeps index 0 as root.
  _insertRebuild(activePaneId, direction, preallocatedPaneId) {
    // Build a fresh node list by recursively rebuilding the tree,
    // replacing the target leaf with a split containing the new leaf.
    const newPaneId = preallocatedPaneId ?? this._nextPaneId++;
    const newNodes = [];

    const rebuild = (idx) => {
      const n = this.nodes[idx];
      if (n.type === 'leaf') {
        if (n.paneId === activePaneId) {
          const splitDirection = (direction === 'right' || direction === 'left') ? 'horizontal' : 'vertical';
          const newOnLeft = (direction === 'left' || direction === 'up');
          const existingNewIdx = newNodes.length;
          newNodes.push(null); // placeholder for split
          const leftChildIdx = newNodes.length;
          const existingLeafIdx = leftChildIdx + (newOnLeft ? 1 : 0);
          const newLeafIdx = leftChildIdx + (newOnLeft ? 0 : 1);
          newNodes.push(null); // placeholder for left child
          newNodes.push(null); // placeholder for right child
          newNodes[existingNewIdx] = {
            type: 'split',
            direction: splitDirection,
            ratio: 0.5,
            left: leftChildIdx,
            right: leftChildIdx + 1,
          };
          newNodes[existingLeafIdx] = { type: 'leaf', paneId: activePaneId };
          newNodes[newLeafIdx] = { type: 'leaf', paneId: newPaneId };
          return existingNewIdx;
        }
        const newIdx = newNodes.length;
        newNodes.push({ ...n });
        return newIdx;
      }
      // split node
      const newIdx = newNodes.length;
      newNodes.push(null); // placeholder
      const leftIdx = rebuild(n.left);
      const rightIdx = rebuild(n.right);
      newNodes[newIdx] = { ...n, left: leftIdx, right: rightIdx };
      return newIdx;
    };

    rebuild(0);
    this.nodes = newNodes;
    return newPaneId;
  }

  // Proper insert always uses the rebuild path.
  insertPane(activePaneId, direction) {
    const leafIdx = this.findLeaf(activePaneId);
    if (leafIdx === -1) return null;
    return this._insertRebuild(activePaneId, direction, null);
  }

  // Remove a pane by paneId. The sibling takes its place.
  removePane(paneId) {
    if (this.nodes.length === 1) return; // only one pane, can't remove
    const leafIdx = this.findLeaf(paneId);
    if (leafIdx === -1) return;

    const parent = _findParent(this.nodes, leafIdx);
    if (!parent) return;

    const siblingIdx = parent.node.left === leafIdx ? parent.node.right : parent.node.left;

    // Rebuild replacing parent with sibling subtree
    const newNodes = [];
    const rebuild = (idx) => {
      if (idx === parent.idx) {
        // Replace parent split with sibling subtree
        return rebuildSubtree(siblingIdx);
      }
      const n = this.nodes[idx];
      if (n.type === 'leaf') {
        const newIdx = newNodes.length;
        newNodes.push({ ...n });
        return newIdx;
      }
      const newIdx = newNodes.length;
      newNodes.push(null);
      const leftIdx = rebuild(n.left);
      const rightIdx = rebuild(n.right);
      newNodes[newIdx] = { ...n, left: leftIdx, right: rightIdx };
      return newIdx;
    };
    const rebuildSubtree = (idx) => {
      const n = this.nodes[idx];
      if (n.type === 'leaf') {
        const newIdx = newNodes.length;
        newNodes.push({ ...n });
        return newIdx;
      }
      const newIdx = newNodes.length;
      newNodes.push(null);
      const leftIdx = rebuildSubtree(n.left);
      const rightIdx = rebuildSubtree(n.right);
      newNodes[newIdx] = { ...n, left: leftIdx, right: rightIdx };
      return newIdx;
    };

    rebuild(0);
    this.nodes = newNodes;
    if (this.zoomedPaneId === paneId) this.zoomedPaneId = null;
  }

  // Returns a spatial map: array of { paneId, x, y, w, h } all in 0..1 range.
  // x,y = top-left corner, w,h = width/height fraction of total.
  spatial(idx = 0, x = 0, y = 0, w = 1, h = 1) {
    const n = this.nodes[idx];
    if (!n) return [];
    if (n.type === 'leaf') return [{ paneId: n.paneId, x, y, w, h }];
    if (n.direction === 'horizontal') {
      const lw = w * n.ratio;
      const rw = w * (1 - n.ratio);
      return [
        ...this.spatial(n.left,  x,      y, lw, h),
        ...this.spatial(n.right, x + lw, y, rw, h),
      ];
    } else {
      const th = h * n.ratio;
      const bh = h * (1 - n.ratio);
      return [
        ...this.spatial(n.left,  x, y,      w, th),
        ...this.spatial(n.right, x, y + th, w, bh),
      ];
    }
  }

  // Navigate spatially. direction: 'left'|'right'|'up'|'down'.
  // Returns the pane id of the target, or null if none.
  gotoSpatial(activePaneId, direction) {
    const slots = this.spatial();
    const cur = slots.find(s => s.paneId === activePaneId);
    if (!cur) return null;

    const candidates = slots.filter(s => {
      if (s.paneId === activePaneId) return false;
      if (direction === 'right') return s.x >= cur.x + cur.w - 1e-6;
      if (direction === 'left')  return s.x + s.w <= cur.x + 1e-6;
      if (direction === 'down')  return s.y >= cur.y + cur.h - 1e-6;
      if (direction === 'up')    return s.y + s.h <= cur.y + 1e-6;
      return false;
    });

    if (!candidates.length) {
      // Wrap: shift source rect across the boundary and try again
      const shifted = { ...cur };
      if (direction === 'right') shifted.x = -cur.w;
      else if (direction === 'left') shifted.x = 1;
      else if (direction === 'down') shifted.y = -cur.h;
      else if (direction === 'up') shifted.y = 1;
      const wrapped = slots.filter(s => {
        if (s.paneId === activePaneId) return false;
        if (direction === 'right') return s.x >= shifted.x + shifted.w - 1e-6;
        if (direction === 'left')  return s.x + s.w <= shifted.x + 1e-6;
        if (direction === 'down')  return s.y >= shifted.y + shifted.h - 1e-6;
        if (direction === 'up')    return s.y + s.h <= shifted.y + 1e-6;
        return false;
      });
      if (!wrapped.length) return null;
      return _closestSlot(shifted, wrapped).paneId;
    }

    return _closestSlot(cur, candidates).paneId;
  }

  // Navigate sequentially. direction: 'previous'|'next'.
  gotoSequential(activePaneId, direction) {
    const leaves = this._leaves(0);
    const paneIds = leaves.map(idx => this.nodes[idx].paneId);
    const pos = paneIds.indexOf(activePaneId);
    if (pos === -1) return null;
    if (direction === 'next') return paneIds[(pos + 1) % paneIds.length];
    return paneIds[(pos - 1 + paneIds.length) % paneIds.length];
  }

  // Resize: find the nearest ancestor split matching the axis and adjust its ratio.
  // direction: 'right'|'left'|'up'|'down', amount: pixels, totalPx: total container px in that axis.
  resizePane(activePaneId, direction, amount, totalPx) {
    const leafIdx = this.findLeaf(activePaneId);
    if (leafIdx === -1) return;

    const axis = (direction === 'left' || direction === 'right') ? 'horizontal' : 'vertical';
    const path = this._pathTo(leafIdx);
    if (!path) return;

    // Walk path from nearest ancestor to root, find first split with matching axis.
    for (let i = path.length - 1; i >= 0; i--) {
      const { idx, side } = path[i];
      const node = this.nodes[idx];
      if (node.direction !== axis) continue;

      // Compute this split's pixel size fraction
      const slots = this.spatial();
      const leafSlots = this._leavesUnder(idx).map(li => slots.find(s => s.paneId === this.nodes[li].paneId)).filter(Boolean);
      if (!leafSlots.length) continue;

      const minX = Math.min(...leafSlots.map(s => s.x));
      const maxX = Math.max(...leafSlots.map(s => s.x + s.w));
      const minY = Math.min(...leafSlots.map(s => s.y));
      const maxY = Math.max(...leafSlots.map(s => s.y + s.h));
      const splitFrac = axis === 'horizontal' ? (maxX - minX) : (maxY - minY);
      const splitPx = splitFrac * totalPx;
      if (splitPx < 1) continue;

      const delta = amount / splitPx;
      // side = which child of this split ancestor we descended into.
      // If we went left, the active pane is on the left side.
      // resize_split:right means "expand the active pane rightward" → increase ratio if on left, decrease if on right.
      let newRatio;
      if (side === 'left') {
        newRatio = node.ratio + ((direction === 'right' || direction === 'down') ? delta : -delta);
      } else {
        newRatio = node.ratio + ((direction === 'right' || direction === 'down') ? -delta : delta);
      }

      node.ratio = Math.min(0.9, Math.max(0.1, newRatio));
      return;
    }
  }

  // Equalize all splits recursively. Same-axis leaf count determines ratio.
  equalize(idx = 0) {
    const n = this.nodes[idx];
    if (!n || n.type === 'leaf') return;
    const leftWeight = this._weight(n.left, n.direction);
    const rightWeight = this._weight(n.right, n.direction);
    n.ratio = leftWeight / (leftWeight + rightWeight);
    this.equalize(n.left);
    this.equalize(n.right);
  }

  // Count same-direction leaf descendants (cross-axis subtrees count as 1).
  _weight(idx, direction) {
    const n = this.nodes[idx];
    if (!n || n.type === 'leaf') return 1;
    if (n.direction !== direction) return 1;
    return this._weight(n.left, direction) + this._weight(n.right, direction);
  }

  // Toggle zoom on activePaneId.
  toggleZoom(activePaneId) {
    if (!this.isSplit) return;
    const leafIdx = this.findLeaf(activePaneId);
    if (leafIdx === -1) return;
    this.zoomedPaneId = this.zoomedPaneId === activePaneId ? null : activePaneId;
  }
}

function _findParent(nodes, childIdx) {
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (n.type === 'split') {
      if (n.left === childIdx || n.right === childIdx) return { idx: i, node: n };
    }
  }
  return null;
}

function _dist(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function _closestSlot(cur, candidates) {
  let best = candidates[0];
  let bestDist = _dist(cur, best);
  for (const c of candidates) {
    const d = _dist(cur, c);
    if (d < bestDist) { bestDist = d; best = c; }
  }
  return best;
}
