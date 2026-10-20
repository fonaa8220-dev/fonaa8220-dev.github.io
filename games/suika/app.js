const canvas = document.querySelector("#suika");
const context = canvas.getContext("2d");
const overlay = document.querySelector("[data-game-overlay]");
const overlayTitle = document.querySelector("[data-overlay-title]");
const overlayCopy = document.querySelector("[data-overlay-copy]");
const startButton = document.querySelector("[data-start]");
const pauseButton = document.querySelector("[data-pause]");
const resetButton = document.querySelector("[data-reset]");
const scoreElement = document.querySelector("[data-suika-score]");
const mergesElement = document.querySelector("[data-suika-merges]");
const nextFruitElement = document.querySelector("[data-next-fruit]");
const scoreForm = document.querySelector("[data-score-form]");
const playerNameInput = document.querySelector("#player-name");
const saveScoreButton = document.querySelector("[data-save-score]");
const saveMessage = document.querySelector("[data-save-message]");
const rankingList = document.querySelector("[data-ranking-list]");
const supabaseClient = window.getEumeSupabaseClient?.() || null;

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const WALL = 5;
const FLOOR = HEIGHT - 5;
const WARNING_Y = 104;
const SPAWN_Y = 56;
const GRAVITY = 720;
const DROP_DELAY = 520;
const FRUITS = [
  { name: "체리", emoji: "🍒", radius: 12, color: "#ff5576", points: 2 },
  { name: "딸기", emoji: "🍓", radius: 17, color: "#ff7847", points: 5 },
  { name: "포도", emoji: "🍇", radius: 22, color: "#a875ff", points: 10 },
  { name: "귤", emoji: "🍊", radius: 28, color: "#ff9f2e", points: 18 },
  { name: "사과", emoji: "🍎", radius: 35, color: "#ff4f5e", points: 30 },
  { name: "배", emoji: "🍐", radius: 43, color: "#d9e84f", points: 50 },
  { name: "복숭아", emoji: "🍑", radius: 52, color: "#ff9fb6", points: 80 },
  { name: "멜론", emoji: "🍈", radius: 63, color: "#9fd96d", points: 120 },
  { name: "수박", emoji: "🍉", radius: 75, color: "#47b96b", points: 200 }
];

let fruits = [];
let score = 0;
let merges = 0;
let previewX = WIDTH / 2;
let previewType = 0;
let nextType = 0;
let running = false;
let paused = false;
let dropReady = false;
let dropReadyAt = 0;
let overflowStartedAt = 0;
let lastTime = performance.now();
let animationId;
let nextId = 1;
let scoreSaved = false;
let ranking = [];
let rankingReady = false;
let rankingStatus = "랭킹을 불러오는 중이에요.";

function randomDropType() {
  const roll = Math.random();
  if (roll < 0.43) return 0;
  if (roll < 0.73) return 1;
  if (roll < 0.91) return 2;
  return 3;
}

function fruitRadius(fruit) {
  return FRUITS[fruit.type].radius;
}

function clampPreviewX(value) {
  const radius = FRUITS[previewType].radius;
  return Math.max(WALL + radius, Math.min(WIDTH - WALL - radius, value));
}

function updateStats() {
  scoreElement.textContent = String(score).padStart(6, "0");
  mergesElement.textContent = String(merges).padStart(2, "0");
  nextFruitElement.textContent = FRUITS[nextType].emoji;
}

function drawFruit(fruit, alpha = 1) {
  const definition = FRUITS[fruit.type];
  const radius = definition.radius;
  context.save();
  context.globalAlpha = alpha;
  context.translate(fruit.x, fruit.y);
  context.beginPath();
  context.arc(0, 0, radius, 0, Math.PI * 2);
  context.fillStyle = definition.color;
  context.fill();
  context.lineWidth = Math.max(2, radius * 0.07);
  context.strokeStyle = "#171717";
  context.stroke();
  context.beginPath();
  context.arc(-radius * 0.28, -radius * 0.3, Math.max(2, radius * 0.12), 0, Math.PI * 2);
  context.fillStyle = "rgba(255,255,255,.42)";
  context.fill();
  context.font = Math.max(15, radius * 1.08) + 'px "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = "#171717";
  context.fillText(definition.emoji, 0, radius * 0.04);
  context.restore();
}

function draw() {
  const gradient = context.createLinearGradient(0, 0, 0, HEIGHT);
  gradient.addColorStop(0, "#fffaf0");
  gradient.addColorStop(1, "#fff0b8");
  context.fillStyle = gradient;
  context.fillRect(0, 0, WIDTH, HEIGHT);

  context.fillStyle = "rgba(23,23,23,.06)";
  for (let y = 130; y < HEIGHT; y += 28) context.fillRect(0, y, WIDTH, 1);

  context.save();
  context.setLineDash([7, 7]);
  context.strokeStyle = overflowStartedAt ? "#ff4fa3" : "rgba(255,79,163,.6)";
  context.lineWidth = overflowStartedAt ? 3 : 2;
  context.beginPath();
  context.moveTo(WALL, WARNING_Y);
  context.lineTo(WIDTH - WALL, WARNING_Y);
  context.stroke();
  context.restore();

  context.fillStyle = "#171717";
  context.fillRect(0, 0, WALL, HEIGHT);
  context.fillRect(WIDTH - WALL, 0, WALL, HEIGHT);
  context.fillRect(0, FLOOR, WIDTH, HEIGHT - FLOOR);

  fruits.forEach((fruit) => drawFruit(fruit));

  if (running && !paused && dropReady) {
    context.save();
    context.setLineDash([4, 6]);
    context.strokeStyle = "rgba(23,23,23,.28)";
    context.beginPath();
    context.moveTo(previewX, SPAWN_Y + FRUITS[previewType].radius);
    context.lineTo(previewX, WARNING_Y);
    context.stroke();
    context.restore();
    drawFruit({ type: previewType, x: previewX, y: SPAWN_Y }, 0.72);
  }
}

function separatePair(a, b, dx, dy, distance, minimumDistance) {
  const safeDistance = distance || 0.001;
  const normalX = dx / safeDistance;
  const normalY = dy / safeDistance;
  const overlap = minimumDistance - safeDistance;
  const massA = fruitRadius(a) ** 2;
  const massB = fruitRadius(b) ** 2;
  const inverseA = 1 / massA;
  const inverseB = 1 / massB;
  const inverseTotal = inverseA + inverseB;

  a.x -= normalX * overlap * (inverseA / inverseTotal);
  a.y -= normalY * overlap * (inverseA / inverseTotal);
  b.x += normalX * overlap * (inverseB / inverseTotal);
  b.y += normalY * overlap * (inverseB / inverseTotal);

  const relativeVelocity = (b.vx - a.vx) * normalX + (b.vy - a.vy) * normalY;
  if (relativeVelocity >= 0) return;

  const impulse = -(1.15 * relativeVelocity) / inverseTotal;
  a.vx -= impulse * inverseA * normalX;
  a.vy -= impulse * inverseA * normalY;
  b.vx += impulse * inverseB * normalX;
  b.vy += impulse * inverseB * normalY;
}

function mergePair(a, b, indexB) {
  const massA = fruitRadius(a) ** 2;
  const massB = fruitRadius(b) ** 2;
  const totalMass = massA + massB;
  a.x = (a.x * massA + b.x * massB) / totalMass;
  a.y = (a.y * massA + b.y * massB) / totalMass;
  a.vx = (a.vx + b.vx) * 0.42;
  a.vy = Math.min(-48, (a.vy + b.vy) * 0.25);
  a.type += 1;
  a.age = 0;
  fruits.splice(indexB, 1);
  merges += 1;
  score += FRUITS[a.type].points;
  updateStats();
}

function resolveCollisions() {
  for (let pass = 0; pass < 5; pass += 1) {
    let mergedOnPass = false;

    outer: for (let i = 0; i < fruits.length; i += 1) {
      for (let j = i + 1; j < fruits.length; j += 1) {
        const a = fruits[i];
        const b = fruits[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distance = Math.hypot(dx, dy);
        const minimumDistance = fruitRadius(a) + fruitRadius(b);
        if (distance >= minimumDistance) continue;

        if (a.type === b.type && a.type < FRUITS.length - 1 && a.age > 0.08 && b.age > 0.08) {
          mergePair(a, b, j);
          mergedOnPass = true;
          break outer;
        }

        separatePair(a, b, dx || 0.001, dy, distance, minimumDistance);
      }
    }

    if (!mergedOnPass && pass >= 2) break;
  }
}

function keepInsideBoard(fruit) {
  const radius = fruitRadius(fruit);
  if (fruit.x - radius < WALL) {
    fruit.x = WALL + radius;
    fruit.vx = Math.abs(fruit.vx) * 0.25;
  } else if (fruit.x + radius > WIDTH - WALL) {
    fruit.x = WIDTH - WALL - radius;
    fruit.vx = -Math.abs(fruit.vx) * 0.25;
  }

  if (fruit.y + radius > FLOOR) {
    fruit.y = FLOOR - radius;
    fruit.vy = -Math.abs(fruit.vy) * 0.16;
    if (Math.abs(fruit.vy) < 18) fruit.vy = 0;
    fruit.vx *= 0.94;
  }
}

function checkGameOver(time) {
  const overflowing = dropReady && fruits.some((fruit) => {
    const radius = fruitRadius(fruit);
    const slowEnough = Math.abs(fruit.vy) < 70;
    return fruit.age > 1.6 && fruit.y - radius < WARNING_Y && slowEnough;
  });

  if (!overflowing) {
    overflowStartedAt = 0;
    return;
  }

  if (!overflowStartedAt) overflowStartedAt = time;
  if (time - overflowStartedAt > 1700) endGame();
}

function updatePhysics(deltaSeconds, time) {
  fruits.forEach((fruit) => {
    fruit.age += deltaSeconds;
    fruit.vy += GRAVITY * deltaSeconds;
    fruit.x += fruit.vx * deltaSeconds;
    fruit.y += fruit.vy * deltaSeconds;
    keepInsideBoard(fruit);
  });

  resolveCollisions();
  fruits.forEach(keepInsideBoard);
  checkGameOver(time);
}

function dropFruit() {
  if (!running || paused || !dropReady) return;
  const radius = FRUITS[previewType].radius;
  previewX = Math.max(WALL + radius, Math.min(WIDTH - WALL - radius, previewX));
  fruits.push({
    id: nextId,
    type: previewType,
    x: previewX,
    y: SPAWN_Y,
    vx: 0,
    vy: 0,
    age: 0
  });
  nextId += 1;
  previewType = nextType;
  nextType = randomDropType();
  previewX = clampPreviewX(previewX);
  dropReady = false;
  dropReadyAt = performance.now() + DROP_DELAY;
  updateStats();
}

function showOverlay(title, copy) {
  overlayTitle.textContent = title;
  overlayCopy.textContent = copy;
  overlay.hidden = false;
}

function startGame() {
  fruits = [];
  score = 0;
  merges = 0;
  previewX = WIDTH / 2;
  previewType = randomDropType();
  nextType = randomDropType();
  running = true;
  paused = false;
  dropReady = true;
  overflowStartedAt = 0;
  lastTime = performance.now();
  scoreSaved = false;
  startButton.disabled = true;
  pauseButton.disabled = false;
  resetButton.disabled = false;
  pauseButton.textContent = "일시정지";
  saveScoreButton.disabled = true;
  saveMessage.textContent = "게임 오버 후 점수를 저장할 수 있어요.";
  overlay.hidden = true;
  updateStats();
}

function togglePause() {
  if (!running) return;
  paused = !paused;
  pauseButton.textContent = paused ? "계속하기" : "일시정지";
  if (paused) showOverlay("PAUSE!", "과일도 잠깐 쉬는 중이에요");
  else {
    overlay.hidden = true;
    lastTime = performance.now();
  }
}

function endGame() {
  running = false;
  paused = false;
  dropReady = false;
  startButton.disabled = false;
  startButton.innerHTML = '다시 시작 <span aria-hidden="true">▶</span>';
  pauseButton.disabled = true;
  saveScoreButton.disabled = !rankingReady;
  saveMessage.textContent = rankingReady
    ? "닉네임을 확인하고 점수를 저장하세요."
    : "랭킹에 연결되지 않아 지금은 점수를 저장할 수 없어요.";
  showOverlay("GAME OVER", "최종 점수 " + score + "점 · 수박까지 한 번 더?");
}

function update(time = 0) {
  const deltaSeconds = Math.min((time - lastTime) / 1000, 1 / 30);
  lastTime = time;

  if (running && !paused) {
    if (!dropReady && time >= dropReadyAt) dropReady = true;
    updatePhysics(deltaSeconds, time);
  }

  draw();
  animationId = window.requestAnimationFrame(update);
}

function movePreviewFromPointer(event) {
  const bounds = canvas.getBoundingClientRect();
  const canvasX = (event.clientX - bounds.left) * (WIDTH / bounds.width);
  previewX = clampPreviewX(canvasX);
}

async function loadRanking() {
  if (!supabaseClient) {
    rankingStatus = "랭킹 연결 설정을 확인해 주세요.";
    saveMessage.textContent = rankingStatus;
    renderRanking();
    return;
  }

  const { data, error } = await supabaseClient
    .from("game_scores")
    .select("id, player_name, score, lines, created_at")
    .eq("game", "suika")
    .order("score", { ascending: false })
    .order("lines", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(20);

  if (error) {
    console.error("수박게임 랭킹을 불러오지 못했습니다.", error);
    rankingStatus = "랭킹을 불러오지 못했어요.";
    saveMessage.textContent = "랭킹 연결에 실패했어요. 잠시 후 새로고침해 주세요.";
    renderRanking();
    return;
  }

  ranking = (data || []).map((entry) => ({
    id: String(entry.id),
    name: entry.player_name,
    score: entry.score,
    merges: entry.lines,
    savedAt: entry.created_at
  }));
  rankingReady = true;
  rankingStatus = "아직 기록이 없어요. 첫 1등에 도전!";
  if (!running) saveMessage.textContent = "게임 오버 후 점수를 저장할 수 있어요.";
  renderRanking();
}

function renderRanking(highlightId = "") {
  rankingList.replaceChildren();
  const topScores = ranking.slice(0, 5);

  if (topScores.length === 0) {
    const emptyItem = document.createElement("li");
    emptyItem.className = "ranking-empty";
    emptyItem.textContent = rankingStatus;
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
    points.textContent = entry.score.toLocaleString("ko-KR") + " PTS";

    item.append(rank, name, points);
    rankingList.append(item);
  });
}

async function saveCurrentScore(event) {
  event.preventDefault();
  if (running || scoreSaved || saveScoreButton.disabled || !rankingReady) return;

  const playerName = playerNameInput.value.trim().slice(0, 10) || "PLAYER";
  saveScoreButton.disabled = true;
  saveMessage.textContent = "점수를 저장하는 중이에요…";

  const { data, error } = await supabaseClient
    .from("game_scores")
    .insert({ game: "suika", player_name: playerName, score, lines: merges })
    .select("id, player_name, score, lines, created_at")
    .single();

  if (error) {
    console.error("수박게임 점수를 저장하지 못했습니다.", error);
    saveScoreButton.disabled = false;
    saveMessage.textContent = "저장하지 못했어요. 잠시 후 다시 시도해 주세요.";
    return;
  }

  const entry = {
    id: String(data.id),
    name: data.player_name,
    score: data.score,
    merges: data.lines,
    savedAt: data.created_at
  };
  ranking.push(entry);
  ranking.sort((a, b) => b.score - a.score || b.merges - a.merges || a.savedAt.localeCompare(b.savedAt));
  ranking = ranking.slice(0, 20);
  scoreSaved = true;

  const currentRank = ranking.findIndex((savedEntry) => savedEntry.id === entry.id) + 1;
  saveMessage.textContent = currentRank > 0
    ? (currentRank <= 5 ? "저장 완료! 현재 " + currentRank + "위예요 🎉" : "저장 완료! 현재 " + currentRank + "위예요.")
    : "저장 완료! TOP 20 진입에 다시 도전해 보세요.";
  renderRanking(entry.id);
}

canvas.addEventListener("pointermove", (event) => {
  if (!running || paused) return;
  movePreviewFromPointer(event);
});

canvas.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  if (!running || paused) return;
  movePreviewFromPointer(event);
  dropFruit();
});

document.addEventListener("keydown", (event) => {
  const actions = {
    ArrowLeft: () => { previewX = clampPreviewX(previewX - 14); },
    ArrowRight: () => { previewX = clampPreviewX(previewX + 14); },
    " ": dropFruit,
    p: togglePause,
    P: togglePause
  };
  if (actions[event.key]) {
    event.preventDefault();
    actions[event.key]();
  }
});

startButton.addEventListener("click", startGame);
pauseButton.addEventListener("click", togglePause);
resetButton.addEventListener("click", startGame);
scoreForm.addEventListener("submit", saveCurrentScore);
window.addEventListener("beforeunload", () => window.cancelAnimationFrame(animationId));

previewType = randomDropType();
nextType = randomDropType();
updateStats();
renderRanking();
loadRanking();
draw();
update();
