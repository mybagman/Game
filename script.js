const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// --- Game variables ---
let score = 0;
let wave = 1;
let enemies = [];
let bullets = [];
let enemyBullets = [];
let waveInProgress = true;

// --- Player ---
let player = {
  x: canvas.width/2,
  y: canvas.height/2,
  size: 25,
  color: "lime",
  speed: 5,
  health: 100,
  maxHealth: 100
};

// --- Player direction for shooting ---
let keys = {};
let playerDir = { dx: 1, dy: 0 }; // default right

// --- AI Partner ---
let partner = { x: player.x + 50, y: player.y + 50, size: 15, color: "cyan" };
let lastPartnerShot = 0;
const partnerFireRate = 500;

// --- Enemy settings ---
let waveEnemiesCount = 5;
let waveEnemiesSpawned = 0;
const enemyFireRate = 2000;

// --- Mega Bot ---
let megaBot = null;

// --- Event listeners ---
window.addEventListener("keydown", e => {
  keys[e.key.toLowerCase()] = true;
  if (e.key === " " && (playerDir.dx !== 0 || playerDir.dy !== 0)) {
    bullets.push({
      x: player.x + player.size/2,
      y: player.y + player.size/2,
      dx: playerDir.dx * 10,
      dy: playerDir.dy * 10,
      owner: "player"
    });
  }
});

window.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

// --- Helper Functions ---
function spawnEnemy(isMega=false) {
  const size = isMega ? 60 : 20;
  const health = isMega ? 50 + wave*20 : 2 + wave;
  const color = isMega ? "orange" : "red";

  const e = {
    x: Math.random() * (canvas.width - size),
    y: Math.random() * (canvas.height - size),
    size: size,
    color: color,
    health: health,
    maxHealth: health,
    isMega: isMega,
    lastShot: Date.now()
  };
  if (isMega) megaBot = e;
  else enemies.push(e);
}

// Spawn waves
function startWave() {
  waveEnemiesCount = 5 + wave*2;
  waveEnemiesSpawned = 0;
  waveInProgress = true;
  const spawnInterval = setInterval(() => {
    if (waveEnemiesSpawned < waveEnemiesCount) {
      spawnEnemy();
      waveEnemiesSpawned++;
    } else {
      clearInterval(spawnInterval);
    }
  }, 1000);
}

// --- Game Loop ---
function update() {
  // --- Player movement & direction ---
  let dirX = 0, dirY = 0;
  if (keys["w"]) dirY -= 1;
  if (keys["s"]) dirY += 1;
  if (keys["a"]) dirX -= 1;
  if (keys["d"]) dirX += 1;

  if (dirX !== 0 || dirY !== 0) {
    let mag = Math.hypot(dirX, dirY);
    playerDir = { dx: dirX/mag, dy: dirY/mag };
    player.x += playerDir.dx * player.speed;
    player.y += playerDir.dy * player.speed;
  }

  // --- Keep player on screen ---
  player.x = Math.max(0, Math.min(canvas.width-player.size, player.x));
  player.y = Math.max(0, Math.min(canvas.height-player.size, player.y));

  // --- Partner follows player ---
  partner.x += (player.x - partner.x) * 0.05;
  partner.y += (player.y - partner.y) * 0.05;

  // --- Partner auto-shoot ---
  const now = Date.now();
  if (enemies.length > 0 && now - lastPartnerShot > partnerFireRate) {
    let nearest = enemies[0];
    let minDist = Math.hypot(nearest.x - partner.x, nearest.y - partner.y);
    enemies.forEach(e => {
      const d = Math.hypot(e.x - partner.x, e.y - partner.y);
      if (d < minDist) { minDist = d; nearest = e; }
    });
    const angle = Math.atan2(nearest.y - partner.y, nearest.x - partner.x);
    bullets.push({
      x: partner.x + partner.size/2,
      y: partner.y + partner.size/2,
      dx: Math.cos(angle) * 8,
      dy: Math.sin(angle) * 8,
      owner: "partner"
    });
    lastPartnerShot = now;
  }

  // --- Enemy shooting ---
  enemies.forEach(e => {
    if (now - e.lastShot > enemyFireRate) {
      const angle = Math.atan2(player.y - e.y, player.x - e.x);
      enemyBullets.push({
        x: e.x + e.size/2,
        y: e.y + e.size/2,
        dx: Math.cos(angle) * 5,
        dy: Math.sin(angle) * 5,
        owner: "enemy"
      });
      e.lastShot = now;
    }
  });

  // Mega Bot shooting
  if (megaBot && now - megaBot.lastShot > enemyFireRate) {
    const angle = Math.atan2(player.y - megaBot.y, player.x - megaBot.x);
    enemyBullets.push({
      x: megaBot.x + megaBot.size/2,
      y: megaBot.y + megaBot.size/2,
      dx: Math.cos(angle) * 6,
      dy: Math.sin(angle) * 6,
      owner: "enemy"
    });
    megaBot.lastShot = now;
  }

  // --- Update bullets ---
  bullets.forEach((b, bi) => {
    b.x += b.dx; b.y += b.dy;
    // Check collision with enemies
    const targetEnemies = b.owner === "player" ? enemies.concat(megaBot ? [megaBot] : []) : [];
    targetEnemies.forEach((e, ei) => {
      if (e && b.x < e.x + e.size && b.x + 6 > e.x && b.y < e.y + e.size && b.y + 2 > e.y) {
        e.health -= 1;
        bullets.splice(bi, 1);
        if (e.health <= 0) {
          score += e.isMega ? 50 : 10;
          if (e.isMega) megaBot = null;
          else enemies.splice(ei, 1);
        }
      }
    });
    if (b.x > canvas.width || b.x < 0 || b.y > canvas.height || b.y < 0) bullets.splice(bi,1);
  });

  // --- Update enemy bullets ---
  enemyBullets.forEach((b, bi) => {
    b.x += b.dx; b.y += b.dy;
    if (b.x < player.x + player.size && b.x + 6 > player.x &&
        b.y < player.y + player.size && b.y + 2 > player.y) {
      player.health -= 5;
      enemyBullets.splice(bi,1);
    }
    if (b.x > canvas.width || b.x < 0 || b.y > canvas.height || b.y < 0) enemyBullets.splice(bi,1);
  });

  // --- Wave completion ---
  if (waveInProgress && enemies.length === 0 && waveEnemiesSpawned >= waveEnemiesCount && !megaBot) {
    // Spawn Mega Bot
    spawnEnemy(true);
    waveInProgress = false;
  }

  // --- Draw ---
  ctx.fillStyle = "black";
  ctx.fillRect(0,0,canvas.width,canvas.height);

  // Player
  ctx.fillStyle = player.color;
  ctx.fillRect(player.x, player.y, player.size, player.size);

  // Player health bar
  ctx.fillStyle = "gray";
  ctx.fillRect(20, 20, 200, 20);
  ctx.fillStyle = "lime";
  ctx.fillRect(20, 20, 200 * (player.health/player.maxHealth), 20);
  ctx.strokeStyle = "white";
  ctx.strokeRect(20,20,200,20);

  // Partner
  ctx.fillStyle = partner.color;
  ctx.fillRect(partner.x, partner.y, partner.size, partner.size);

  // Enemies
  enemies.forEach(e => {
    ctx.fillStyle = e.color;
    ctx.fillRect(e.x, e.y, e.size, e.size);
    // Enemy health bar
    ctx.fillStyle = "gray";
    ctx.fillRect(e.x, e.y - 5, e.size, 3);
    ctx.fillStyle = "red";
    ctx.fillRect(e.x, e.y - 5, e.size * (e.health / e.maxHealth), 3);
  });

  // Mega Bot
  if (megaBot) {
    ctx.fillStyle = megaBot.color;
    ctx.fillRect(megaBot.x, megaBot.y, megaBot.size, megaBot.size);
    ctx.fillStyle = "gray";
    ctx.fillRect(megaBot.x, megaBot.y - 10, megaBot.size, 5);
    ctx.fillStyle = "orange";
    ctx.fillRect(megaBot.x, megaBot.y - 10, megaBot.size * (megaBot.health/megaBot.maxHealth), 5);
  }

  // Bullets
  bullets.forEach(b => {
    ctx.fillStyle = b.owner === "player" ? "yellow" : "cyan";
    ctx.fillRect(b.x, b.y, 6, 2);
  });

  // Enemy bullets
  enemyBullets.forEach(b => {
    ctx.fillStyle = "red";
    ctx.fillRect(b.x, b.y, 6, 2);
  });

  // Score and wave
  ctx.fillStyle = "white";
  ctx.font = "20px Arial";
  ctx.fillText(`Score: ${score}`, 20, 60);
  ctx.fillText(`Wave: ${wave}`, 20, 90);

  // Check game over
  if (player.health <= 0) {
    ctx.fillStyle = "white";
    ctx.font = "50px Arial";
    ctx.fillText("GAME OVER", canvas.width/2 - 150, canvas.height/2);
    return; // stop game
