const canvas = document.querySelector("#tetris");
const context = canvas.getContext("2d");
const overlay = document.querySelector("[data-game-overlay]");
const overlayTitle = document.querySelector("[data-overlay-title]");
const overlayCopy = document.querySelector("[data-overlay-copy]");
const startButton = document.querySelector("[data-start]");
const pauseButton = document.querySelector("[data-pause]");
const resetButton = document.querySelector("[data-reset]");
const scoreElement = document.querySelector("[data-score]");
const linesElement = document.querySelector("[data-lines]");
const levelElement = document.querySelector("[data-level]");
const scoreForm = document.querySelector("[data-score-form]");
const playerNameInput = document.querySelector("#player-name");
const saveScoreButton = document.querySelector("[data-save-score]");
const saveMessage = document.querySelector("[data-save-message]");
const rankingList = document.querySelector("[data-ranking-list]");

const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;
const colors = [null, "#ff4fa3", "#1746ff", "#ff7847", "#d9ff43", "#61e7ca", "#a875ff", "#ffdd38"];
const pieceTypes = "TJLOSZI";
const STORAGE_KEY = "fonaa-tetris-ranking-v1";

let board = createMatrix(COLS, ROWS);
let score = 0;
let lines = 0;
let level = 1;
let dropCounter = 0;
let dropInterval = 800;
let lastTime = 0;
let running = false;
let paused = false;
let animationId;
let scoreSaved = false;
let ranking = loadRanking();

const player = {
  position: { x: 0, y: 0 },
  matrix: null,
  type: ""
};

context.scale(BLOCK_SIZE, BLOCK_SIZE);

function createMatrix(width, height) {
  return Array.from({ length: height }, () => Array(width).fill(0));
}

function createPiece(type) {
  const pieces = {
    T: [[0, 0, 0], [1, 1, 1], [0, 1, 0]],
    O: [[2, 2], [2, 2]],
    L: [[0, 3, 0], [0, 3, 0], [0, 3, 3]],
    J: [[0, 4, 0], [0, 4, 0], [4, 4, 0]],
    I: [[0, 0, 0, 0], [5, 5, 5, 5], [0, 0, 0, 0], [0, 0, 0, 0]],
    S: [[0, 6, 6], [6, 6, 0], [0, 0, 0]],
    Z: [[7, 7, 0], [0, 7, 7], [0, 0, 0]]
  };
  return pieces[type];
}

function collide(arena, currentPlayer) {
  const matrix = currentPlayer.matrix;
  const position = currentPlayer.position;

  for (let y = 0; y < matrix.length; y += 1) {
    for (let x = 0; x < matrix[y].length; x += 1) {
      if (matrix[y][x] !== 0 && (arena[y + position.y] && arena[y + position.y][x + position.x]) !== 0) {
        return true;
      }
    }
  }
  return false;
}

function merge(arena, currentPlayer) {
  currentPlayer.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) arena[y + currentPlayer.position.y][x + currentPlayer.position.x] = value;
    });
  });
}

function sweepLines() {
  let multiplier = 1;
  let cleared = 0;

  outer: for (let y = board.length - 1; y >= 0; y -= 1) {
    for (let x = 0; x < board[y].length; x += 1) {
      if (board[y][x] === 0) continue outer;
    }
    const row = board.splice(y, 1)[0].fill(0);
    board.unshift(row);
    y += 1;
    cleared += 1;
    score += 100 * multiplier;
    multiplier *= 2;
  }

  if (cleared > 0) {
    lines += cleared;
    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(120, 800 - (level - 1) * 70);
  }
}

function resetPlayer() {
  player.type = pieceTypes[Math.floor(Math.random() * pieceTypes.length)];
  player.matrix = createPiece(player.type);
  player.position.y = 0;
  player.position.x = Math.floor(COLS / 2) - Math.floor(player.matrix[0].length / 2);

  if (collide(board, player)) endGame();
}

function movePlayer(direction) {
  if (!running || paused) return;
  player.position.x += direction;
  if (collide(board, player)) player.position.x -= direction;
}

function dropPlayer() {
  if (!running || paused) return;
  player.position.y += 1;
  if (collide(board, player)) {
    player.position.y -= 1;
    merge(board, player);
    sweepLines();
    resetPlayer();
    updateStats();
  }
  dropCounter = 0;
}

function hardDrop() {
  if (!running || paused) return;
  while (!collide(board, player)) player.position.y += 1;
  player.position.y -= 1;
  merge(board, player);
  score += 2;
  sweepLines();
  resetPlayer();
  updateStats();
  dropCounter = 0;
}

function rotate(matrix, direction) {
  for (let y = 0; y < matrix.length; y += 1) {
    for (let x = 0; x < y; x += 1) {
      [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
    }
  }
  if (direction > 0) matrix.forEach((row) => row.reverse());
  else matrix.reverse();
}

function rotatePlayer() {
  if (!running || paused) return;
  const originalX = player.position.x;
  let offset = 1;
  rotate(player.matrix, 1);
  while (collide(board, player)) {
    player.position.x += offset;
    offset = -(offset + (offset > 0 ? 1 : -1));
    if (Math.abs(offset) > player.matrix[0].length) {
      rotate(player.matrix, -1);
      player.position.x = originalX;
      return;
    }
  }
}

function drawMatrix(matrix, offset) {
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        context.fillStyle = colors[value];
        context.fillRect(x + offset.x, y + offset.y, 1, 1);
        context.strokeStyle = "#171717";
        context.lineWidth = 0.07;
        context.strokeRect(x + offset.x + 0.04, y + offset.y + 0.04, 0.92, 0.92);
        context.fillStyle = "rgba(255,255,255,.35)";
        context.fillRect(x + offset.x + 0.12, y + offset.y + 0.12, 0.18, 0.18);
      }
    });
  });
}

function draw() {
  context.fillStyle = "#fffaf0";
  context.fillRect(0, 0, COLS, ROWS);
  context.strokeStyle = "rgba(23,23,23,.09)";
  context.lineWidth = 0.025;
  for (let x = 0; x <= COLS; x += 1) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, ROWS);
    context.stroke();
  }
  for (let y = 0; y <= ROWS; y += 1) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(COLS, y);
    context.stroke();
  }
  drawMatrix(board, { x: 0, y: 0 });
  if (player.matrix) drawMatrix(player.matrix, player.position);
}

function updateStats() {
  scoreElement.textContent = String(score).padStart(6, "0");
  linesElement.textContent = String(lines).padStart(2, "0");
  levelElement.textContent = String(level).padStart(2, "0");
}

function loadRanking() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(saved)) return [];
    return saved
      .filter((entry) => entry && typeof entry.name === "string" && Number.isFinite(entry.score))
      .sort((a, b) => b.score - a.score || b.lines - a.lines)
      .slice(0, 20);
  } catch {
    return [];
  }
}

function storeRanking() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ranking));
    return true;
  } catch {
    return false;
  }
}

function renderRanking(highlightId = "") {
  rankingList.replaceChildren();
  const topScores = ranking.slice(0, 5);

  if (topScores.length === 0) {
    const emptyItem = document.createElement("li");
    emptyItem.className = "ranking-empty";
    emptyItem.textContent = "아직 기록이 없어요. 첫 1등에 도전!";
    rankingList.append(emptyItem);
    return;
  }

  topScores.forEach((entry, index) => {
    const item = document.createElement("li");
    if (entry.id === highlightId) item.classList.add("is-new-score");

    const rank = document.createElement("span");
    rank.className = "rank-number";
    rank.textContent = String(index + 1).padStart(2, "0");

    const name = document.createElement("strong");
    name.textContent = entry.name;

    const points = document.createElement("span");
    points.className = "rank-score";
    points.textContent = `${entry.score.toLocaleString("ko-KR")} PTS`;

    item.append(rank, name, points);
    rankingList.append(item);
  });
}

function saveCurrentScore(event) {
  event.preventDefault();
  if (running || scoreSaved || saveScoreButton.disabled) return;

  const playerName = playerNameInput.value.trim().slice(0, 10) || "PLAYER";
  const entry = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: playerName,
    score,
    lines,
    savedAt: new Date().toISOString()
  };

  ranking.push(entry);
  ranking.sort((a, b) => b.score - a.score || b.lines - a.lines || a.savedAt.localeCompare(b.savedAt));
  ranking = ranking.slice(0, 20);

  if (!storeRanking()) {
    saveMessage.textContent = "이 브라우저에서는 점수를 저장할 수 없어요.";
    return;
  }

  scoreSaved = true;
  saveScoreButton.disabled = true;
  const currentRank = ranking.findIndex((savedEntry) => savedEntry.id === entry.id) + 1;
  saveMessage.textContent = currentRank <= 5
    ? `저장 완료! 현재 ${currentRank}위예요 🎉`
    : `저장 완료! 현재 ${currentRank}위예요.`;
  renderRanking(entry.id);
}

function showOverlay(title, copy) {
  overlayTitle.textContent = title;
  overlayCopy.textContent = copy;
  overlay.hidden = false;
}

function startGame() {
  board = createMatrix(COLS, ROWS);
  score = 0;
  lines = 0;
  level = 1;
  dropInterval = 800;
  dropCounter = 0;
  lastTime = performance.now();
  running = true;
  paused = false;
  scoreSaved = false;
  resetPlayer();
  updateStats();
  overlay.hidden = true;
  startButton.disabled = true;
  pauseButton.disabled = false;
  resetButton.disabled = false;
  pauseButton.textContent = "일시정지";
  saveScoreButton.disabled = true;
  saveMessage.textContent = "게임 오버 후 점수를 저장할 수 있어요.";
}

function togglePause() {
  if (!running) return;
  paused = !paused;
  pauseButton.textContent = paused ? "계속하기" : "일시정지";
  if (paused) showOverlay("PAUSE!", "잠깐 쉬는 중이에요");
  else {
    overlay.hidden = true;
    lastTime = performance.now();
  }
}

function endGame() {
  running = false;
  paused = false;
  startButton.disabled = false;
  startButton.innerHTML = '다시 시작 <span aria-hidden="true">▶</span>';
  pauseButton.disabled = true;
  saveScoreButton.disabled = false;
  saveMessage.textContent = "닉네임을 확인하고 점수를 저장하세요.";
  showOverlay("GAME OVER", `최종 점수 ${score}점 · 한 판 더?`);
}

function update(time = 0) {
  const deltaTime = time - lastTime;
  lastTime = time;
  if (running && !paused) {
    dropCounter += deltaTime;
    if (dropCounter > dropInterval) dropPlayer();
  }
  draw();
  animationId = window.requestAnimationFrame(update);
}

const actions = {
  left: () => movePlayer(-1),
  right: () => movePlayer(1),
  rotate: rotatePlayer,
  down: dropPlayer,
  drop: hardDrop
};

document.addEventListener("keydown", (event) => {
  const keyActions = {
    ArrowLeft: actions.left,
    ArrowRight: actions.right,
    ArrowUp: actions.rotate,
    ArrowDown: actions.down,
    " ": actions.drop,
    p: togglePause,
    P: togglePause
  };
  if (keyActions[event.key]) {
    event.preventDefault();
    keyActions[event.key]();
  }
});

document.querySelectorAll("[data-action]").forEach((button) => {
  button.addEventListener("pointerdown", () => actions[button.dataset.action]());
});

startButton.addEventListener("click", startGame);
pauseButton.addEventListener("click", togglePause);
resetButton.addEventListener("click", startGame);
scoreForm.addEventListener("submit", saveCurrentScore);
window.addEventListener("beforeunload", () => window.cancelAnimationFrame(animationId));

updateStats();
renderRanking();
update();
