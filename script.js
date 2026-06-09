const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");

const scoreDisplay = document.getElementById("score-display");
const comboDisplay = document.getElementById("combo-display");
const timeDisplay = document.getElementById("time-display");
const alertDisplay = document.getElementById("alert-display");
const reportBar = document.getElementById("report-bar");
const throughputBar = document.getElementById("throughput-bar");
const stabilityBar = document.getElementById("stability-bar");

const startButton = document.getElementById("start-button");
const overlayStart = document.getElementById("overlay-start");
const restartButton = document.getElementById("restart-button");
const bossKeyButton = document.getElementById("boss-key");
const shareButton = document.getElementById("share-button");
const installButton = document.getElementById("install-button");
const mobileStartButton = document.getElementById("mobile-start");
const mobileDisguiseButton = document.getElementById("mobile-disguise");
const mobileShareButton = document.getElementById("mobile-share");

const startOverlay = document.getElementById("start-overlay");
const gameOverOverlay = document.getElementById("game-over-overlay");
const disguiseOverlay = document.getElementById("disguise-overlay");
const gameOverTitle = document.getElementById("game-over-title");
const gameOverCopy = document.getElementById("game-over-copy");
const fakeRows = document.getElementById("fake-rows");

const width = canvas.width;
const height = canvas.height;
const keys = new Set();
let deferredInstallPrompt = null;

const fakeTeams = [
  "日报线程整形",
  "跨组协同回收",
  "需求归档矩阵",
  "稳定性观察面板",
  "周报节奏优化",
  "异步沟通清洗",
  "工位响应压测"
];

const owners = ["Lynn", "Kai", "Yuki", "Mira", "Noah", "Iris", "Sean"];

const state = {
  running: false,
  disguised: false,
  score: 0,
  combo: 1,
  timeLeft: 60,
  alert: 0,
  shield: 0,
  speedBoost: 0,
  lastTime: 0,
  spawnBubble: 0,
  spawnHazard: 0,
  spawnPowerUp: 0,
  flash: 0,
  backgroundPhase: 0,
  player: {
    x: width * 0.18,
    y: height * 0.5,
    radius: 18,
    speed: 240,
    hue: 188
  },
  bubbles: [],
  hazards: [],
  powerUps: [],
  particles: []
};

const touchControl = {
  active: false,
  pointerId: null,
  x: width * 0.18,
  y: height * 0.5
};

function random(min, max) {
  return Math.random() * (max - min) + min;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function setVisible(element, visible) {
  element.classList.toggle("visible", visible);
}

function updateInstallAvailability() {
  installButton.classList.toggle("hidden", deferredInstallPrompt === null);
}

function canvasPointFromClient(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((clientX - rect.left) / rect.width) * width,
    y: ((clientY - rect.top) / rect.height) * height
  };
}

function setTouchTarget(clientX, clientY) {
  const point = canvasPointFromClient(clientX, clientY);
  touchControl.x = clamp(point.x, 0, width);
  touchControl.y = clamp(point.y, 0, height);
}

function startTouchControl(event) {
  touchControl.active = true;
  touchControl.pointerId = event.pointerId;
  setTouchTarget(event.clientX, event.clientY);
}

function endTouchControl(event) {
  if (touchControl.pointerId !== event.pointerId) {
    return;
  }
  touchControl.active = false;
  touchControl.pointerId = null;
}

function resetState() {
  state.running = true;
  state.disguised = false;
  state.score = 0;
  state.combo = 1;
  state.timeLeft = 60;
  state.alert = 0;
  state.shield = 0;
  state.speedBoost = 0;
  state.spawnBubble = 0;
  state.spawnHazard = 1.4;
  state.spawnPowerUp = 6;
  state.flash = 0;
  state.backgroundPhase = 0;
  state.player.x = width * 0.18;
  state.player.y = height * 0.5;
  state.bubbles = [];
  state.hazards = [];
  state.powerUps = [];
  state.particles = [];
  state.lastTime = performance.now();
  touchControl.active = false;
  touchControl.pointerId = null;
  setVisible(startOverlay, false);
  setVisible(gameOverOverlay, false);
  setVisible(disguiseOverlay, false);
  renderFakeRows();
  updateHud();
}

function updateHud() {
  scoreDisplay.textContent = Math.round(state.score).toString();
  comboDisplay.textContent = `x${state.combo}`;
  timeDisplay.textContent = `${state.timeLeft.toFixed(1)}s`;
  alertDisplay.textContent = `${Math.round(state.alert)}%`;

  const progress = clamp(state.score / 240, 0.16, 1);
  reportBar.style.width = `${Math.round(progress * 100)}%`;
  throughputBar.style.width = `${Math.round(clamp((state.score + state.combo * 12) / 260, 0.18, 1) * 100)}%`;
  stabilityBar.style.width = `${Math.round(clamp(1 - state.alert / 120, 0.08, 1) * 100)}%`;
}

function renderFakeRows() {
  fakeRows.innerHTML = "";
  for (let index = 0; index < 7; index += 1) {
    const row = document.createElement("div");
    const completion = clamp(Math.round((state.score / 4) + random(38, 86)), 12, 100);
    const risk = state.alert > 70 ? "需关注" : state.alert > 38 ? "观察中" : "正常";
    const riskClass = state.alert > 70 ? "status-risk" : state.alert > 38 ? "status-watch" : "status-ok";
    row.className = "fake-grid-row";
    row.innerHTML = `
      <span>${fakeTeams[index % fakeTeams.length]}</span>
      <span>${owners[index % owners.length]}</span>
      <span>${completion}%</span>
      <span class="status-pill ${riskClass}">${risk}</span>
    `;
    fakeRows.appendChild(row);
  }
}

function spawnBubble() {
  state.bubbles.push({
    x: width + random(20, 160),
    y: random(60, height - 60),
    radius: random(10, 18),
    speed: random(120, 210),
    wobble: random(0.5, 1.8),
    phase: random(0, Math.PI * 2),
    value: 8
  });
}

function spawnHazard() {
  const type = Math.random() > 0.5 ? "laser" : "popup";
  if (type === "laser") {
    const horizontal = Math.random() > 0.5;
    state.hazards.push({
      type,
      horizontal,
      x: horizontal ? width + 180 : random(160, width - 120),
      y: horizontal ? random(80, height - 80) : -120,
      w: horizontal ? 220 : 18,
      h: horizontal ? 18 : 180,
      speed: random(220, 320),
      pulse: 0
    });
    return;
  }

  state.hazards.push({
    type,
    x: width + 180,
    y: random(80, height - 180),
    w: random(110, 170),
    h: random(70, 110),
    speed: random(180, 250),
    text: Math.random() > 0.5 ? "临时会议" : "进度催办"
  });
}

function spawnPowerUp() {
  const type = Math.random() > 0.5 ? "coffee" : "shield";
  state.powerUps.push({
    type,
    x: width + random(40, 120),
    y: random(70, height - 70),
    radius: 14,
    speed: 150
  });
}

function emitParticles(x, y, color, count) {
  for (let index = 0; index < count; index += 1) {
    state.particles.push({
      x,
      y,
      vx: random(-90, 90),
      vy: random(-90, 90),
      life: random(0.25, 0.7),
      color
    });
  }
}

function playerBounds() {
  return {
    left: state.player.x - state.player.radius,
    right: state.player.x + state.player.radius,
    top: state.player.y - state.player.radius,
    bottom: state.player.y + state.player.radius
  };
}

function intersectsCircle(item) {
  const dx = item.x - state.player.x;
  const dy = item.y - state.player.y;
  const distance = Math.hypot(dx, dy);
  return distance < item.radius + state.player.radius;
}

function intersectsRect(item) {
  const box = playerBounds();
  return !(
    box.right < item.x ||
    box.left > item.x + item.w ||
    box.bottom < item.y ||
    box.top > item.y + item.h
  );
}

function handleHit() {
  if (state.shield > 0) {
    state.shield -= 1;
    state.flash = 0.22;
    emitParticles(state.player.x, state.player.y, "#93c5fd", 14);
    return;
  }

  state.combo = 1;
  state.alert = clamp(state.alert + 24, 0, 100);
  state.flash = 0.35;
  emitParticles(state.player.x, state.player.y, "#f87171", 18);
}

function finishGame(reason) {
  state.running = false;
  touchControl.active = false;
  setVisible(gameOverOverlay, true);
  if (reason === "time") {
    gameOverTitle.textContent = "准点下班";
    gameOverCopy.textContent = `你安全摸到了下班，最终摸鱼值 ${Math.round(state.score)}。`;
  } else {
    gameOverTitle.textContent = "老板来了";
    gameOverCopy.textContent = `警觉值爆表，最终摸鱼值 ${Math.round(state.score)}。`;
  }
}

function toggleDisguise(forceValue) {
  const nextValue = typeof forceValue === "boolean" ? forceValue : !state.disguised;
  state.disguised = nextValue;
  setVisible(disguiseOverlay, nextValue);
  if (nextValue) {
    renderFakeRows();
  }
}

function update(delta) {
  if (!state.running || state.disguised) {
    return;
  }

  state.backgroundPhase += delta * 0.35;
  state.flash = Math.max(0, state.flash - delta);
  state.timeLeft = Math.max(0, state.timeLeft - delta);
  state.alert = clamp(state.alert + delta * 2.4, 0, 100);
  state.speedBoost = Math.max(0, state.speedBoost - delta);

  if (state.timeLeft === 0) {
    finishGame("time");
    return;
  }

  if (state.alert >= 100) {
    finishGame("alert");
    return;
  }

  const moveX = (keys.has("ArrowRight") || keys.has("d") ? 1 : 0) - (keys.has("ArrowLeft") || keys.has("a") ? 1 : 0);
  const moveY = (keys.has("ArrowDown") || keys.has("s") ? 1 : 0) - (keys.has("ArrowUp") || keys.has("w") ? 1 : 0);
  const speed = state.player.speed * (state.speedBoost > 0 ? 1.45 : 1);
  let velocityX = moveX;
  let velocityY = moveY;

  if (touchControl.active) {
    velocityX = touchControl.x - state.player.x;
    velocityY = touchControl.y - state.player.y;
  }

  const moveLength = Math.hypot(velocityX, velocityY);
  if (moveLength > 2) {
    state.player.x = clamp(state.player.x + (velocityX / moveLength) * speed * delta, 34, width - 34);
    state.player.y = clamp(state.player.y + (velocityY / moveLength) * speed * delta, 34, height - 34);
  }

  state.spawnBubble -= delta;
  state.spawnHazard -= delta;
  state.spawnPowerUp -= delta;

  if (state.spawnBubble <= 0) {
    spawnBubble();
    state.spawnBubble = random(0.22, 0.55);
  }

  if (state.spawnHazard <= 0) {
    spawnHazard();
    state.spawnHazard = random(0.9, Math.max(0.38, 1.6 - state.score / 180));
  }

  if (state.spawnPowerUp <= 0) {
    spawnPowerUp();
    state.spawnPowerUp = random(7.5, 11.5);
  }

  state.bubbles = state.bubbles.filter((bubble) => {
    bubble.x -= bubble.speed * delta;
    bubble.y += Math.sin(state.backgroundPhase * 2 + bubble.phase) * bubble.wobble;

    if (bubble.x < -40) {
      return false;
    }

    if (intersectsCircle(bubble)) {
      state.score += bubble.value * state.combo;
      state.combo += 1;
      state.alert = clamp(state.alert - 4.5, 0, 100);
      emitParticles(bubble.x, bubble.y, "#7dd3fc", 12);
      updateHud();
      return false;
    }

    return true;
  });

  state.hazards = state.hazards.filter((hazard) => {
    if (hazard.type === "laser") {
      if (hazard.horizontal) {
        hazard.x -= hazard.speed * delta;
      } else {
        hazard.y += hazard.speed * delta;
      }
      hazard.pulse += delta * 8;

      if (intersectsRect(hazard)) {
        handleHit();
        return false;
      }

      return hazard.x + hazard.w > -30 && hazard.y < height + 30;
    }

    hazard.x -= hazard.speed * delta;
    if (intersectsRect(hazard)) {
      handleHit();
      return false;
    }
    return hazard.x + hazard.w > -40;
  });

  state.powerUps = state.powerUps.filter((powerUp) => {
    powerUp.x -= powerUp.speed * delta;
    if (powerUp.x < -30) {
      return false;
    }

    if (intersectsCircle(powerUp)) {
      if (powerUp.type === "coffee") {
        state.speedBoost = 6;
        state.timeLeft = clamp(state.timeLeft + 2, 0, 60);
        emitParticles(powerUp.x, powerUp.y, "#f59e0b", 14);
      } else {
        state.shield = 1;
        emitParticles(powerUp.x, powerUp.y, "#60a5fa", 14);
      }
      return false;
    }

    return true;
  });

  state.particles = state.particles.filter((particle) => {
    particle.life -= delta;
    particle.x += particle.vx * delta;
    particle.y += particle.vy * delta;
    particle.vx *= 0.98;
    particle.vy *= 0.98;
    return particle.life > 0;
  });

  updateHud();
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#f8fbff");
  gradient.addColorStop(0.46, "#d5eef2");
  gradient.addColorStop(1, "#b9dfe5");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.globalAlpha = 0.18;
  for (let index = 0; index < 16; index += 1) {
    const waveY = 40 + index * 34 + Math.sin(state.backgroundPhase + index * 0.4) * 8;
    ctx.beginPath();
    ctx.moveTo(0, waveY);
    for (let x = 0; x <= width; x += 40) {
      ctx.lineTo(x, waveY + Math.sin((x / 72) + state.backgroundPhase * 1.6 + index) * 7);
    }
    ctx.strokeStyle = index % 2 === 0 ? "#ffffff" : "#cae6eb";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.restore();
}

function drawPlayer() {
  const { x, y, radius } = state.player;

  if (state.shield > 0) {
    ctx.beginPath();
    ctx.fillStyle = "rgba(96, 165, 250, 0.22)";
    ctx.arc(x, y, radius + 9 + Math.sin(state.backgroundPhase * 3) * 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "#0d7c86";
  ctx.beginPath();
  ctx.ellipse(0, 0, radius + 7, radius - 1, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(-radius + 2, 0);
  ctx.lineTo(-radius - 16, -12);
  ctx.lineTo(-radius - 16, 12);
  ctx.closePath();
  ctx.fillStyle = "#0a5a60";
  ctx.fill();

  ctx.fillStyle = "#f8fafc";
  ctx.beginPath();
  ctx.arc(radius * 0.28, -3, 4.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#173042";
  ctx.beginPath();
  ctx.arc(radius * 0.34, -3, 2.1, 0, Math.PI * 2);
  ctx.fill();

  if (state.speedBoost > 0) {
    ctx.strokeStyle = "rgba(245, 158, 11, 0.75)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-radius - 10, 0);
    ctx.lineTo(-radius - 26, -8);
    ctx.moveTo(-radius - 10, 0);
    ctx.lineTo(-radius - 26, 8);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBubbles() {
  state.bubbles.forEach((bubble) => {
    ctx.beginPath();
    ctx.fillStyle = "rgba(125, 211, 252, 0.85)";
    ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.arc(bubble.x - bubble.radius * 0.28, bubble.y - bubble.radius * 0.28, bubble.radius * 0.22, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawHazards() {
  state.hazards.forEach((hazard) => {
    if (hazard.type === "laser") {
      ctx.save();
      ctx.fillStyle = `rgba(239, 68, 68, ${0.45 + Math.sin(hazard.pulse) * 0.18})`;
      ctx.fillRect(hazard.x, hazard.y, hazard.w, hazard.h);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.86)";
      ctx.lineWidth = 2;
      if (hazard.horizontal) {
        ctx.beginPath();
        ctx.moveTo(hazard.x + 12, hazard.y + hazard.h / 2);
        ctx.lineTo(hazard.x + hazard.w - 12, hazard.y + hazard.h / 2);
      } else {
        ctx.beginPath();
        ctx.moveTo(hazard.x + hazard.w / 2, hazard.y + 12);
        ctx.lineTo(hazard.x + hazard.w / 2, hazard.y + hazard.h - 12);
      }
      ctx.stroke();
      ctx.restore();
      return;
    }

    ctx.save();
    ctx.fillStyle = "#fff1f2";
    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 3;
    roundRect(hazard.x, hazard.y, hazard.w, hazard.h, 18, true, true);
    ctx.fillStyle = "#991b1b";
    ctx.font = 'bold 24px "Avenir Next", "PingFang SC", sans-serif';
    ctx.fillText(hazard.text, hazard.x + 18, hazard.y + hazard.h / 2 + 8);
    ctx.restore();
  });
}

function drawPowerUps() {
  state.powerUps.forEach((powerUp) => {
    ctx.save();
    ctx.translate(powerUp.x, powerUp.y);
    if (powerUp.type === "coffee") {
      ctx.fillStyle = "#f59e0b";
      roundRect(-12, -9, 24, 18, 5, true, false);
      ctx.strokeStyle = "#7c2d12";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(11, -1, 6, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();
      ctx.strokeStyle = "rgba(124, 45, 18, 0.45)";
      ctx.beginPath();
      ctx.moveTo(-4, -13);
      ctx.quadraticCurveTo(-1, -20, 2, -13);
      ctx.moveTo(4, -13);
      ctx.quadraticCurveTo(7, -20, 10, -13);
      ctx.stroke();
    } else {
      ctx.fillStyle = "#60a5fa";
      ctx.beginPath();
      ctx.moveTo(0, -16);
      ctx.lineTo(14, -6);
      ctx.lineTo(10, 14);
      ctx.lineTo(0, 18);
      ctx.lineTo(-10, 14);
      ctx.lineTo(-14, -6);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#eff6ff";
      ctx.beginPath();
      ctx.arc(0, 1, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  });
}

function drawParticles() {
  state.particles.forEach((particle) => {
    ctx.beginPath();
    ctx.fillStyle = particle.color;
    ctx.globalAlpha = clamp(particle.life * 1.4, 0, 1);
    ctx.arc(particle.x, particle.y, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  });
}

function drawHud() {
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.72)";
  roundRect(20, 18, 200, 78, 20, true, false);
  ctx.fillStyle = "#173042";
  ctx.font = '600 18px "Avenir Next", "PingFang SC", sans-serif';
  ctx.fillText(`警觉值 ${Math.round(state.alert)}%`, 34, 48);
  ctx.fillText(`护盾 ${state.shield > 0 ? "ON" : "OFF"}`, 34, 77);

  ctx.fillStyle = "rgba(255,255,255,0.72)";
  roundRect(width - 214, 18, 194, 78, 20, true, false);
  ctx.fillStyle = "#173042";
  ctx.fillText(`时间 ${state.timeLeft.toFixed(1)}s`, width - 198, 48);
  ctx.fillText(`加速 ${state.speedBoost > 0 ? "ON" : "OFF"}`, width - 198, 77);
  ctx.restore();

  if (state.flash > 0) {
    ctx.fillStyle = `rgba(239, 68, 68, ${state.flash * 0.35})`;
    ctx.fillRect(0, 0, width, height);
  }

  if (touchControl.active && state.running && !state.disguised) {
    ctx.save();
    ctx.strokeStyle = "rgba(13, 124, 134, 0.35)";
    ctx.fillStyle = "rgba(13, 124, 134, 0.12)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(touchControl.x, touchControl.y, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

function roundRect(x, y, w, h, radius, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
  if (fill) {
    ctx.fill();
  }
  if (stroke) {
    ctx.stroke();
  }
}

function render() {
  drawBackground();
  drawBubbles();
  drawPowerUps();
  drawHazards();
  drawPlayer();
  drawParticles();
  drawHud();
}

function loop(timestamp) {
  const delta = Math.min((timestamp - state.lastTime) / 1000, 0.032);
  state.lastTime = timestamp;
  update(delta);
  render();
  requestAnimationFrame(loop);
}

function startGame() {
  resetState();
}

async function shareGame() {
  const shareData = {
    title: "TouchFish.xls",
    text: "上班间隙来摸一局，看看谁最会躲老板。",
    url: window.location.href
  };

  if (navigator.share) {
    try {
      await navigator.share(shareData);
      return;
    } catch (error) {
      if (error && error.name === "AbortError") {
        return;
      }
    }
  }

  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(window.location.href);
    alert("链接已复制，快转发给同事一起摸。");
    return;
  }

  window.prompt("复制这个链接分享给朋友：", window.location.href);
}

async function installGame() {
  if (!deferredInstallPrompt) {
    alert("当前环境暂时不能直接安装，但部署后用手机浏览器打开仍然可以玩。");
    return;
  }

  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  updateInstallAvailability();
}

document.addEventListener("keydown", (event) => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "a", "s", "d", "b"].includes(key)) {
    event.preventDefault();
  }

  if (key === "b") {
    toggleDisguise();
    return;
  }

  keys.add(key);
});

document.addEventListener("keyup", (event) => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  keys.delete(key);
});

canvas.addEventListener("pointerdown", (event) => {
  if (!state.running || state.disguised) {
    return;
  }
  startTouchControl(event);
  canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener("pointermove", (event) => {
  if (!touchControl.active || touchControl.pointerId !== event.pointerId) {
    return;
  }
  setTouchTarget(event.clientX, event.clientY);
});

canvas.addEventListener("pointerup", endTouchControl);
canvas.addEventListener("pointercancel", endTouchControl);
canvas.addEventListener("pointerleave", (event) => {
  if (event.pointerType === "mouse") {
    endTouchControl(event);
  }
});

startButton.addEventListener("click", startGame);
overlayStart.addEventListener("click", startGame);
restartButton.addEventListener("click", startGame);
bossKeyButton.addEventListener("click", () => toggleDisguise());
shareButton.addEventListener("click", () => {
  shareGame().catch(() => {
    window.prompt("复制这个链接分享给朋友：", window.location.href);
  });
});
installButton.addEventListener("click", () => {
  installGame().catch(() => {
    alert("安装入口暂时不可用。");
  });
});
mobileStartButton.addEventListener("click", startGame);
mobileDisguiseButton.addEventListener("click", () => toggleDisguise());
mobileShareButton.addEventListener("click", () => {
  shareGame().catch(() => {
    window.prompt("复制这个链接分享给朋友：", window.location.href);
  });
});

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  updateInstallAvailability();
});

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  updateInstallAvailability();
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      return undefined;
    });
  });
}

renderFakeRows();
updateHud();
updateInstallAvailability();
requestAnimationFrame((timestamp) => {
  state.lastTime = timestamp;
  loop(timestamp);
});
