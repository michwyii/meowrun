// ----- DOM -----
const game = document.getElementById("game");
const player = document.getElementById("player");
const obstaclesLayer = document.getElementById("obstacles"); // requires <div id="obstacles"></div>
const scoreEl = document.getElementById("score");
const restartBtn = document.getElementById("restart");
const catImg = document.getElementById("catImg");
// grabs elements from HTML

// MODE MENU (requires #menu and .modeBtn buttons)
const menu = document.getElementById("menu");
const modeButtons = document.querySelectorAll(".modeBtn");

// >>> REWARDS: DOM
const rewardsLayer = document.getElementById("rewards");        // requires <div id="rewards"></div>
const rewardsCountEl = document.getElementById("rewardsCount");  // requires <span id="rewardsCount"></span>

const changeModeBtn = document.getElementById("changeMode");

const MODES = {
  classic: {
    bg: "images/grass2.jpeg",
    catAlive: "images/side.PNG",
    catDead: "images/dead.PNG",
    reward: "images/bread.PNG",
    obstacles: {
      tree: "images/tree.PNG",
      mountain: "images/bam.PNG",
      rock: "images/rock.PNG",
    }
  },
  halloween: {
    bg: "images/halloweenback.jpeg",
    catAlive: "images/pumpkin.png",
    catDead: "images/dead.PNG",
    reward: "images/candy.PNG",
    obstacles: {
      tree: "images/ghost.PNG",
      mountain: "images/lantern.png",
      rock: "images/rip.png",
    }
  },
  delivery: {
    bg: "images/road.jpg",
    catAlive: "images/delivery.PNG",
    catDead: "images/dead.PNG",
    reward: "images/coin.PNG",
    obstacles: {
      tree: "images/carpink.png",
      mountain: "images/yellowcar1.PNG",
      rock: "images/police.png",
    }
  },
  baseball: {
    bg: "images/baseball2.jpg",
    catAlive: "images/baseb.PNG",
    catDead: "images/dead.PNG",
    reward: "images/star.png",
    obstacles: {
      tree: "images/baseballdog.PNG",
      mountain: "images/baseballbam.PNG",
      rock: "images/baseballning.PNG",
    }
  },
  cafe: {
    bg: "images/cafe.jpeg",
    catAlive: "images/eat.PNG",
    catDead: "images/dead.PNG",
    reward: "images/bread.PNG",
    obstacles: {
      tree: "images/chair3.png",
      mountain: "images/table1.PNG",
      rock: "images/chair1.png",
    }
  },
  angel: {
    bg: "images/sky1.jpg",
    catAlive: "images/angel1.PNG",
    catDead: "images/dead.PNG",
    reward: "images/heart.PNG",
    obstacles: {
      tree: "images/angelmeng.PNG",
      mountain: "images/angelchoon1.PNG",
      rock: "images/anglebam.PNG",
    }
  },
};

let currentMode = null;

function applyMode(modeName) {
  currentMode = modeName;
  const m = MODES[modeName];

  // background inside the frame
  game.style.backgroundImage = `url("${m.bg}")`;

  // cat alive sprite
  catImg.src = m.catAlive;

  // update existing obstacles if they exist
  for (const o of obstacles) {
    if (o.key) o.img.src = m.obstacles[o.key];
  }
  if (currentMode === "angel") {
    rewardMinY = 80;
    rewardMaxY = 250;
  } else {
    rewardMinY = 80;   // normal modes
    rewardMaxY = 130;
  }
}

// ----- Game state -----
let running = true;
let score = 0;
let rewardsCount = 0;

// ----- Physics -----
let y = 18;            // player's bottom (px)
let vy = 0;            // vertical velocity (px/s)
const groundY = 18; // dist from ground
const jumpV = 550;     // jump impulse (px/s)
const gravity = 1600;  // (px/s^2)

// ----- Obstacles (multiple + repeating sequence) -----
let obsSpeed = 360; // px/s

const types = {
  tree:     { bottom: 18, angelBottom: 23 +
    Math.random() * (250 - 23) },
  mountain: { bottom: 18, angelBottom: 23 +
    Math.random() * (250 - 23) } ,
  rock:     { bottom: 18, angelBottom: 23 +
    Math.random() * (250 - 23) } ,
};

const sequence = ["tree", "mountain", "tree", "rock"];
let seqIndex = 0; //tracks which obstacle comes next

function nextTypeKey() {
  const key = sequence[seqIndex];
  seqIndex = (seqIndex + 1) % sequence.length;
  return key; //% makes it loop back to 0
}

const obstacles = []; // each: { el, hitbox, img, x, key }
const obstacleCount = 3;
const baseGap = 400;

// >>> REWARDS: config + list
const rewards = []; // each: { el, img, x }
let rewardSpawnTimer = 0;
const rewardSpawnEvery = 0.6; // seconds (tune)density of reward


// ----- Timing -----
let lastTime = performance.now();
function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

// ----- Input -----
function jump() {
  if (!running) return;
  if (currentMode === "angel") {
    vy = jumpV;
  } else {
    if (y <= groundY + 0.5) vy = jumpV;
  }
}

window.addEventListener("keydown", (e) => {
  if (e.code === "Space" || e.code === "ArrowUp") jump();
});
game.addEventListener("pointerdown", jump);

// ----- Collision helper -----
function rectsOverlap(a, b) {
  return !(
    a.right < b.left ||
    a.left > b.right ||
    a.bottom < b.top ||
    a.top > b.bottom
  );
}

// ----- Game over / reset -----
function endGame() {
  running = false;
  restartBtn.hidden = false;

  // dead sprite for THIS mode
  catImg.src = MODES[currentMode].catDead;
}
restartBtn.addEventListener("click", reset);

function makeObstacle() {
  const el = document.createElement("div");
  el.className = "obstacle";

  const hitbox = document.createElement("div");
  hitbox.className = "hitbox";

  const img = document.createElement("img");
  img.alt = "obstacle";

  el.appendChild(hitbox);
  el.appendChild(img);
  obstaclesLayer.appendChild(el);

  return { el, hitbox, img, x: 0, key: "" };
}

function applyType(o, key) {
  o.key = key;

  // sprite depends on mode
  o.img.src = MODES[currentMode].obstacles[key];

  const b = (currentMode === "angel" && types[key].angelBottom != null)
  ? types[key].angelBottom
  : types[key].bottom;

o.el.style.bottom = `${b}px`;
}

function spawn(o, startX) {
  const key = nextTypeKey();
  applyType(o, key);
  o.x = startX;
  o.el.style.left = `${o.x}px`;
}

function resetObstacles() {
  obstaclesLayer.innerHTML = "";
  obstacles.length = 0;
  seqIndex = 0;

  const startX = game.clientWidth + 40;

  for (let i = 0; i < obstacleCount; i++) {
    const o = makeObstacle();
    obstacles.push(o);
    spawn(o, startX + i * baseGap);
  }
}

// >>> REWARDS: create + spawn + reset
function makeReward() {
  const el = document.createElement("div");
  el.className = "reward";

  const img = document.createElement("img");
  img.src = MODES[currentMode].reward; // mode reward sprite
  img.alt = "reward";

  el.appendChild(img);
  rewardsLayer.appendChild(el);

  return { el, img, x: 0 };
}

function spawnReward(startX) {
  const r = makeReward();
  const yBottom = rewardMinY + Math.random() * (rewardMaxY - rewardMinY);
  r.x = startX;
  r.el.style.left = `${r.x}px`;
  r.el.style.bottom = `${yBottom}px`;
  rewards.push(r);
}

function resetRewards() {
  rewardsLayer.innerHTML = "";
  rewards.length = 0;
  rewardsCount = 0;
  rewardsCountEl.textContent = "0";
  rewardSpawnTimer = 0;
}

function goBackToMenu() {
  // stop the game loop
  running = false;

  // clear obstacles and rewards
  obstaclesLayer.innerHTML = "";
  rewardsLayer.innerHTML = "";
  obstacles.length = 0;
  rewards.length = 0;

  // reset counters
  score = 0;
  scoreEl.textContent = "0";
  rewardsCount = 0;
  rewardsCountEl.textContent = "0";

  // hide restart button
  restartBtn.hidden = true;

  // show menu again
  menu.hidden = false;

  // clear mode
  currentMode = null;
}


function reset() {
  if (!currentMode) return; // safety

  running = true;
  score = 0;
  scoreEl.textContent = "0";
  restartBtn.hidden = true;

  // revive the cat for this mode
  catImg.src = MODES[currentMode].catAlive;

  y = groundY;
  vy = 0;

  obsSpeed = 320;
  lastTime = performance.now();

  resetObstacles();
  resetRewards();

  requestAnimationFrame(loop);
}

// ----- Main loop -----
function loop(now) {
  if (!running) return;

  const dt = clamp((now - lastTime) / 1000, 0, 0.033);
  lastTime = now;

  // Update player
  vy -= gravity * dt;
  y += vy * dt;
  if (y < groundY) { y = groundY; vy = 0; }
  player.style.bottom = `${y}px`;

  const pRect = player.getBoundingClientRect();

  // Update obstacles + collision
  for (const o of obstacles) {
    o.x -= obsSpeed * dt;
    o.el.style.left = `${o.x}px`;

    if (o.x < -200) {
      const farthestX = Math.max(...obstacles.map(ob => ob.x));
      spawn(o, farthestX + baseGap);
      obsSpeed += 5;
    }

    const oRect = o.hitbox.getBoundingClientRect();
    if (rectsOverlap(pRect, oRect)) {
      endGame();
      break;
    }
  }

  // Rewards spawn timer
  rewardSpawnTimer += dt;
  if (rewardSpawnTimer >= rewardSpawnEvery) {
    rewardSpawnTimer = 0;
    spawnReward(game.clientWidth + 40);
  }

  // Move + collect rewards
  for (let i = rewards.length - 1; i >= 0; i--) {
    const r = rewards[i];
    r.x -= obsSpeed * dt;
    r.el.style.left = `${r.x}px`;

    if (r.x < -120) {
      r.el.remove();
      rewards.splice(i, 1);
      continue;
    }

    const rRect = r.el.getBoundingClientRect();
    if (rectsOverlap(pRect, rRect)) {
      rewardsCount += 1;
      rewardsCountEl.textContent = rewardsCount.toString();

      r.el.remove();
      rewards.splice(i, 1);
    }
  }

  // Score
  score += dt * 10;
  scoreEl.textContent = Math.floor(score).toString();

  requestAnimationFrame(loop);
}

// ----- Start: wait for mode choice -----
function startWithMode(modeName) {
  applyMode(modeName);
  if (menu) menu.hidden = true;
  reset();
}

modeButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    startWithMode(btn.dataset.mode);
  });
});

changeModeBtn.addEventListener("click", goBackToMenu);
