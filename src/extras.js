// Ghostty Gets Even — inverted Pac-Man easter egg.
// Player controls the ghosts (Tab cycles between them); Pac-Man runs on AI.
// Win: eat Pac-Man. Lose: Pac-Man eats your active ghost while scared.

const WIDTH = 28;

// 0=pac-dot, 1=wall, 2=ghost-lair, 3=power-pellet, 4=empty
const LAYOUT = [
  1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
  1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1,
  1,0,1,1,1,1,0,1,1,1,1,1,0,1,1,0,1,1,1,1,1,0,1,1,1,1,0,1,
  1,3,1,1,1,1,0,1,1,1,1,1,0,1,1,0,1,1,1,1,1,0,1,1,1,1,3,1,
  1,0,1,1,1,1,0,1,1,1,1,1,0,1,1,0,1,1,1,1,1,0,1,1,1,1,0,1,
  1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
  1,0,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,0,1,
  1,0,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,0,1,
  1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1,
  1,1,1,1,1,1,0,1,1,1,1,1,0,1,1,0,1,1,1,1,1,0,1,1,1,1,1,1,
  1,1,1,1,1,1,0,1,1,4,4,4,4,4,4,4,4,4,4,1,1,0,1,1,1,1,1,1,
  1,1,1,1,1,1,0,1,1,4,1,1,1,2,2,1,1,1,4,1,1,0,1,1,1,1,1,1,
  1,1,1,1,1,1,0,1,1,4,1,2,2,2,2,2,2,1,4,1,1,0,1,1,1,1,1,1,
  4,4,4,4,4,4,0,0,0,4,1,2,2,2,2,2,2,1,4,0,0,0,4,4,4,4,4,4,
  1,1,1,1,1,1,0,1,1,4,1,2,2,2,2,2,2,1,4,1,1,0,1,1,1,1,1,1,
  1,1,1,1,1,1,0,1,1,4,1,1,1,1,1,1,1,1,4,1,1,0,1,1,1,1,1,1,
  1,1,1,1,1,1,0,1,1,4,1,1,1,1,1,1,1,1,4,1,1,0,1,1,1,1,1,1,
  1,0,0,0,0,0,0,0,0,4,4,4,4,4,4,4,4,4,4,0,0,0,0,0,0,0,0,1,
  1,0,1,1,1,1,0,1,1,1,1,1,0,1,1,0,1,1,1,1,1,0,1,1,1,1,0,1,
  1,0,1,1,1,1,0,1,1,1,1,1,0,1,1,0,1,1,1,1,1,0,1,1,1,1,0,1,
  1,3,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,3,1,
  1,1,1,0,1,1,0,1,1,0,1,1,1,1,1,1,1,1,0,1,1,0,1,1,0,1,1,1,
  1,1,1,0,1,1,0,1,1,0,1,1,1,1,1,1,1,1,0,1,1,0,1,1,0,1,1,1,
  1,0,0,0,0,0,0,1,1,0,0,0,0,1,1,0,0,0,0,1,1,0,0,0,0,0,0,1,
  1,0,1,1,1,1,1,1,1,1,1,1,0,1,1,0,1,1,1,1,1,1,1,1,1,1,0,1,
  1,0,1,1,1,1,1,1,1,1,1,1,0,1,1,0,1,1,1,1,1,1,1,1,1,1,0,1,
  1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
  1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
];

// Ghost starts are in the corridor just outside the lair, not inside it.
// Row 17 col 6 = index 17*28+6 = 482 — but the original uses row 12 area.
// Use positions on the open corridor near the lair entrance (row 13, cols 6/21 area).
// Actually use the original source positions but ensure they aren't ghost-lair cells.
// Original: blinky=348, pinky=376, inky=351, clyde=379
// Row 12: indices 336-363 → layout row [1,1,1,1,1,1,0,1,1,4,1,2,2,2,2,2,2,1,4,1,1,0,1,1,1,1,1,1]
// col 6 = 0 (open), col 9 = 4 (empty corridor), col 12 = 2 (lair) — so 348 = col 12 = lair.
// Use the open corridor on row 13 (the horizontal tunnel through the lair), col 6 area:
// Row 13: [4,4,4,4,4,4,0,0,0,4,1,2,2,...] col 6 = 0 (open path)
// Place ghosts on row 10 col 9/10/17/18 which are the empty cells above the lair.
// Row 10: [1,1,1,1,1,1,0,1,1,4,4,4,4,4,4,4,4,4,4,1,1,0,...] — col 9..18 are type 4 (empty)
// Ghost starts: all on the open corridor row 13, near col 6 (index 13*28+6=370)
// Let's place them symmetrically on the corridor: 370,371,372,373
// Actually simplest: place all 4 at the lair-adjacent corridor positions used in original
// but shift to non-lair cells:
// blinky: row 11 col 13 = 11*28+13 = 321 — row11=[1,1,1,1,1,1,0,1,1,4,1,1,1,2,2,...] col13=2(lair)
// Use row 10 (all type-4 empty): col 9=10*28+9=289, col10=290, col17=297, col18=298
const GHOST_STARTS = [289, 290, 297, 298];
const GHOST_SPEEDS = [250, 400, 300, 500];
const GHOST_NAMES  = ['blinky', 'pinky', 'inky', 'clyde'];

function isWall(idx) { return LAYOUT[idx] === 1; }
function isLair(idx) { return LAYOUT[idx] === 2; }
function isBlocked(idx) {
  if (idx < 0 || idx >= LAYOUT.length) return true;
  return isWall(idx) || isLair(idx);
}

function ghosttyIconSvg(active) {
  const glow = active
    ? 'filter:drop-shadow(0 0 5px #fff) drop-shadow(0 0 2px #fff);'
    : '';
  return `<svg width="18" height="18" viewBox="0 0 27 32" fill="none" xmlns="http://www.w3.org/2000/svg" style="${glow}">
<path d="M20.4 32C19.14 32 17.92 31.62 16.88 30.93C15.84 31.62 14.61 32 13.36 32C12.11 32 10.88 31.62 9.85 30.93C8.82 31.62 7.63 31.99 6.37 32H6.33C4.63 32 3.04 31.32 1.83 30.09C0.65 28.88 0 27.29 0 25.61V13.36C0 5.99 5.99 0 13.36 0C20.73 0 26.73 5.99 26.73 13.36V25.62C26.73 29.01 24.1 31.81 20.75 31.99Z" fill="#3551F3"/>
<path d="M23.91 13.36V25.62C23.91 27.49 22.47 29.08 20.59 29.18C19.68 29.23 18.84 28.94 18.19 28.41C17.42 27.79 16.32 27.82 15.54 28.43C14.94 28.91 14.18 29.19 13.36 29.19C12.54 29.19 11.78 28.91 11.19 28.43C10.39 27.81 9.3 27.81 8.5 28.43C7.91 28.9 7.16 29.18 6.35 29.19C4.4 29.2 2.81 27.56 2.81 25.61V13.36C2.81 7.54 7.54 2.81 13.36 2.81C19.19 2.81 23.91 7.54 23.91 13.36Z" fill="white"/>
<path d="M11.28 12.44L7.35 10.17C6.84 9.87 6.18 10.05 5.89 10.56C5.59 11.07 5.77 11.73 6.28 12.02L8.6 13.37L6.28 14.71C5.77 15.0 5.59 15.66 5.89 16.17C6.18 16.68 6.84 16.86 7.35 16.56L11.28 14.29C11.99 13.88 11.99 12.85 11.28 12.44Z" fill="black"/>
<path d="M20.18 12.29H15.02C14.43 12.29 13.95 12.77 13.95 13.36C13.95 13.96 14.42 14.43 15.02 14.43H20.18C20.77 14.43 21.25 13.96 21.25 13.36C21.25 12.77 20.78 12.29 20.18 12.29Z" fill="black"/>
</svg>`;
}

function pacmanSvg(scared) {
  const fill = scared ? '#4488ff' : '#f7c948';
  return `<svg width="18" height="18" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
<path d="M10,10 L19,6 A9,9 0 1,0 19,14 Z" fill="${fill}"/>
</svg>`;
}

function dotHtml() {
  return '<div style="width:4px;height:4px;border-radius:50%;background:#565f89;pointer-events:none"></div>';
}

function pelletHtml() {
  return '<div style="width:10px;height:10px;border-radius:50%;background:#f7c948;box-shadow:0 0 6px #f7c948;pointer-events:none"></div>';
}

export function setupGame() {
  const modal = document.createElement('div');
  modal.id = 'ghostty-game-modal';
  modal.style.cssText = [
    'display:none','position:fixed','inset:0','z-index:9999',
    'background:rgba(0,0,0,0.88)','align-items:center','justify-content:center',
    'flex-direction:column','font-family:system-ui,sans-serif',
  ].join(';');

  const box = document.createElement('div');
  box.style.cssText = [
    'background:#0d0e17','border:1px solid #3551F3','border-radius:10px',
    'padding:20px','display:flex','flex-direction:column','align-items:center','gap:10px',
  ].join(';');

  const titleEl = document.createElement('div');
  titleEl.textContent = 'GHOSTTY GETS EVEN';
  titleEl.style.cssText = 'color:#3551F3;font-size:22px;font-weight:700;letter-spacing:1px;';

  const scoreEl = document.createElement('div');
  scoreEl.style.cssText = 'color:#a9b1d6;font-size:13px;';

  const statusEl = document.createElement('div');
  statusEl.style.cssText = 'color:#e0af68;font-size:12px;min-height:16px;';

  const board = document.createElement('div');
  board.style.cssText = [
    'display:grid',
    'grid-template-columns:repeat(28,20px)',
    'width:560px',
    'border:2px solid #3551F3',
    'border-radius:4px',
    'overflow:hidden',
  ].join(';');

  const helpEl = document.createElement('div');
  helpEl.textContent = 'Arrow keys: move active ghost  |  Tab: switch ghost  |  Esc: quit';
  helpEl.style.cssText = 'color:#565f89;font-size:11px;';

  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Close';
  closeBtn.style.cssText = [
    'background:#1a1b26','color:#a9b1d6','border:1px solid #3551F3',
    'border-radius:6px','padding:6px 20px','cursor:pointer','font-size:13px',
  ].join(';');

  box.append(titleEl, scoreEl, statusEl, board, helpEl, closeBtn);
  modal.appendChild(box);
  document.body.appendChild(modal);

  // ---- Game state (reset each play) ----
  let cells = [];
  let dots = [];
  let pellets = [];
  let score = 0;
  let gameOver = false;
  let scared = false;
  let scaredTimer = null;
  let activeGhostIdx = 0;
  let pacIdx = 490;
  let prevPacIdx = -1;
  let prevGhostIdxs = [];
  let prevActiveGhost = -1;
  let ghostPos = [];
  let pacAiTimer = null;
  let ghostTimers = [];
  let keyHandler = null;

  // ---- Board build ----
  function buildBoard() {
    board.innerHTML = '';
    cells = [];
    dots = LAYOUT.map(v => v === 0);
    pellets = LAYOUT.map(v => v === 3);

    for (let i = 0; i < LAYOUT.length; i++) {
      const cell = document.createElement('div');
      cell.style.cssText = 'width:20px;height:20px;display:flex;align-items:center;justify-content:center;box-sizing:border-box;overflow:hidden;';

      if (LAYOUT[i] === 1) {
        cell.style.background = '#1a237e';
      } else {
        cell.style.background = '#0d0e17';
        if (LAYOUT[i] === 0) cell.innerHTML = dotHtml();
        else if (LAYOUT[i] === 3) cell.innerHTML = pelletHtml();
      }

      board.appendChild(cell);
      cells.push(cell);
    }
  }

  // ---- Targeted render — only touch cells that changed ----
  function setCellContent(idx) {
    if (idx < 0) return;
    const cell = cells[idx];

    // Is any ghost here?
    let ghostAt = -1;
    for (let g = 0; g < 4; g++) {
      if (ghostPos[g] === idx) { ghostAt = g; break; }
    }

    // Is Pac-Man here?
    const pacHere = pacIdx === idx;

    if (ghostAt !== -1) {
      cell.innerHTML = ghosttyIconSvg(ghostAt === activeGhostIdx);
    } else if (pacHere) {
      cell.innerHTML = pacmanSvg(scared);
    } else {
      // Restore terrain
      if (LAYOUT[idx] === 0) cell.innerHTML = dots[idx] ? dotHtml() : '';
      else if (LAYOUT[idx] === 3) cell.innerHTML = pellets[idx] ? pelletHtml() : '';
      else cell.innerHTML = '';
    }
  }

  // Cells that need repainting after a move: the old and new positions of everything that moved.
  function repaint(changedIdxs) {
    const seen = new Set();
    for (const idx of changedIdxs) {
      if (idx < 0 || seen.has(idx)) continue;
      seen.add(idx);
      setCellContent(idx);
    }
  }

  function fullRender() {
    for (let i = 0; i < LAYOUT.length; i++) setCellContent(i);
    prevPacIdx = pacIdx;
    prevGhostIdxs = [...ghostPos];
    prevActiveGhost = activeGhostIdx;
  }

  // ---- Scoring / status ----
  function updateScore() { scoreEl.textContent = `Score: ${score}`; }

  function eatTile() {
    if (dots[pacIdx]) { dots[pacIdx] = false; score++; updateScore(); }
    if (pellets[pacIdx]) { pellets[pacIdx] = false; score += 10; updateScore(); triggerScared(); }
  }

  function triggerScared() {
    scared = true;
    statusEl.style.color = '#9ece6a';
    statusEl.textContent = 'Power pellet — Pac-Man is coming for you!';
    clearTimeout(scaredTimer);
    scaredTimer = setTimeout(() => {
      scared = false;
      if (!gameOver) statusEl.textContent = `Controlling: ${GHOST_NAMES[activeGhostIdx]}`;
      // Redraw Pac-Man without scared colour
      setCellContent(pacIdx);
    }, 8000);
  }

  function endGame(won) {
    gameOver = true;
    ghostTimers.forEach(clearInterval);
    ghostTimers = [];
    clearInterval(pacAiTimer); pacAiTimer = null;
    clearTimeout(scaredTimer); scaredTimer = null;
    fullRender();
    if (won) {
      statusEl.style.color = '#9ece6a';
      statusEl.textContent = 'You got Pac-Man! Ghostty wins.';
    } else {
      statusEl.style.color = '#f7768e';
      statusEl.textContent = 'Pac-Man ate your ghost. Better luck next time.';
    }
  }

  // ---- Collision check ----
  function checkCollisions() {
    for (let g = 0; g < 4; g++) {
      if (ghostPos[g] !== pacIdx) continue;
      if (scared) {
        const old = ghostPos[g];
        ghostPos[g] = GHOST_STARTS[g];
        score += 200; updateScore();
        statusEl.textContent = `Pac-Man ate ${GHOST_NAMES[g]}!`;
        if (g === activeGhostIdx) { endGame(false); return true; }
        setCellContent(old);
        setCellContent(ghostPos[g]);
      } else {
        endGame(true); return true;
      }
    }
    return false;
  }

  // ---- Pac-Man AI ----
  function distToNearestGhost(idx) {
    let min = Infinity;
    const ir = Math.floor(idx / WIDTH), ic = idx % WIDTH;
    for (const gp of ghostPos) {
      const gr = Math.floor(gp / WIDTH), gc = gp % WIDTH;
      min = Math.min(min, Math.abs(ir - gr) + Math.abs(ic - gc));
    }
    return min;
  }

  function pacStep() {
    if (gameOver) return;

    const dirs = [-1, 1, -WIDTH, WIDTH];
    const r = Math.floor(pacIdx / WIDTH);

    const candidates = dirs.map(d => pacIdx + d).filter(ni => {
      if (isBlocked(ni)) return false;
      // Prevent vertical wrap-around (left/right move across row boundary)
      const nr = Math.floor(ni / WIDTH);
      if (Math.abs(r - nr) > 1) return false;
      return true;
    });

    if (!candidates.length) return;

    let best = scared
      ? candidates.reduce((a, b) => distToNearestGhost(a) < distToNearestGhost(b) ? a : b)
      : candidates.reduce((a, b) => distToNearestGhost(a) > distToNearestGhost(b) ? a : b);

    const oldPac = pacIdx;
    pacIdx = best;
    eatTile();
    const hit = checkCollisions();
    if (!hit) repaint([oldPac, pacIdx]);
  }

  // ---- Ghost AI (non-active) ----
  function startGhostAi(g) {
    const dirs = [-1, 1, WIDTH, -WIDTH];
    let dir = dirs[Math.floor(Math.random() * dirs.length)];

    ghostTimers[g] = setInterval(() => {
      if (gameOver || g === activeGhostIdx) return;

      const cur = ghostPos[g];
      const r = Math.floor(cur / WIDTH);
      const ni = cur + dir;
      const nr = Math.floor(ni / WIDTH);

      if (!isBlocked(ni) && Math.abs(r - nr) <= 1) {
        ghostPos[g] = ni;
      } else {
        dir = dirs[Math.floor(Math.random() * dirs.length)];
      }

      const hit = checkCollisions();
      if (!hit) repaint([cur, ghostPos[g]]);
    }, GHOST_SPEEDS[g]);
  }

  // ---- Player movement ----
  function moveActiveGhost(dc, dr) {
    if (gameOver) return;
    const g = activeGhostIdx;
    const cur = ghostPos[g];
    const row = Math.floor(cur / WIDTH);
    const col = cur % WIDTH;
    const newRow = row + dr;
    const newCol = col + dc;
    if (newRow < 0 || newRow >= 28 || newCol < 0 || newCol >= WIDTH) return;
    const ni = newRow * WIDTH + newCol;
    if (isBlocked(ni)) return;
    ghostPos[g] = ni;
    const hit = checkCollisions();
    if (!hit) repaint([cur, ni]);
  }

  // ---- Controls ----
  function attachControls() {
    keyHandler = (e) => {
      if (modal.style.display === 'none') return;
      if (e.key === 'Escape') { e.preventDefault(); closeGame(); return; }
      if (e.key === 'Tab') {
        e.preventDefault();
        e.stopPropagation();
        const prev = activeGhostIdx;
        activeGhostIdx = (activeGhostIdx + 1) % 4;
        statusEl.style.color = '#e0af68';
        statusEl.textContent = `Controlling: ${GHOST_NAMES[activeGhostIdx]}`;
        // Repaint both old and new active ghost to update glow
        setCellContent(ghostPos[prev]);
        setCellContent(ghostPos[activeGhostIdx]);
        return;
      }
      switch (e.key) {
        case 'ArrowLeft':  e.preventDefault(); e.stopPropagation(); moveActiveGhost(-1, 0); break;
        case 'ArrowRight': e.preventDefault(); e.stopPropagation(); moveActiveGhost(1, 0);  break;
        case 'ArrowUp':    e.preventDefault(); e.stopPropagation(); moveActiveGhost(0, -1); break;
        case 'ArrowDown':  e.preventDefault(); e.stopPropagation(); moveActiveGhost(0, 1);  break;
      }
    };
    document.addEventListener('keydown', keyHandler, { capture: true });
  }

  function detachControls() {
    if (keyHandler) { document.removeEventListener('keydown', keyHandler, { capture: true }); keyHandler = null; }
  }

  // ---- Open / Close ----
  function openGame() {
    score = 0; gameOver = false; scared = false;
    activeGhostIdx = 0;
    pacIdx = 490;
    prevPacIdx = -1; prevGhostIdxs = []; prevActiveGhost = -1;
    ghostPos = [...GHOST_STARTS];
    ghostTimers = [];

    buildBoard();
    fullRender();
    updateScore();
    statusEl.style.color = '#e0af68';
    statusEl.textContent = `Controlling: ${GHOST_NAMES[activeGhostIdx]}`;
    modal.style.display = 'flex';

    for (let g = 0; g < 4; g++) startGhostAi(g);
    pacAiTimer = setInterval(pacStep, 300);

    attachControls();
  }

  function closeGame() {
    ghostTimers.forEach(clearInterval); ghostTimers = [];
    clearInterval(pacAiTimer); pacAiTimer = null;
    clearTimeout(scaredTimer); scaredTimer = null;
    detachControls();
    modal.style.display = 'none';
  }

  closeBtn.addEventListener('click', closeGame);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeGame(); });

  return { openGame };
}
