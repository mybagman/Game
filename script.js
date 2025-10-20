const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// --- Game Variables ---
let score = 0;
let wave = 1;
let enemies = [];
let bullets = [];
let enemyBullets = [];
let waveInProgress = false;

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

// --- Player Direction ---
let keys = {};
let playerDir = { dx: 1, dy: 0 };

// --- Partner ---
let partner = { x: player.x + 50, y: player.y + 50, size: 15, color: "cyan" };
let lastPartnerShot = 0;
const partnerFireRate = 500;

// --- Enemy & Mega Bot ---
let megaBot = null;
const enemyFireRate = 2000;

// --- Event Listeners ---
window.addEventListener("keydown", e => {
  keys[e.key.toLowerCase()] = true;
  if (e.key === " " && (playerDir.dx !== 0 || playerDir.dy !== 0)) {
    bullets.push({
      x: player.x + player.size/2,
      y: player.y + player.size/2,
      dx: playerDir.dx*10,
      dy: playerDir.dy*10,
      width: 6,
      height: 2,
      owner: "player"
    });
  }
});
window.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

// --- Helper Functions ---
function spawnEnemy(isMega=false){
  const size = isMega ? 60 : 20;
  const health = isMega ? 50 + wave*20 : 2 + wave;
  const color = isMega ? "orange" : "red";
  const e = {
    x: Math.random()*(canvas.width-size),
    y: Math.random()*(canvas.height-size),
    size,
    color,
    health,
    maxHealth: health,
    isMega,
    lastShot: Date.now()
  };
  if(isMega) megaBot = e;
  else enemies.push(e);
}

function startWave(){
  waveInProgress = true;
  const waveEnemiesCount = 5 + wave*2;
  let spawned = 0;
  const interval = setInterval(()=>{
    if(spawned < waveEnemiesCount){
      spawnEnemy();
      spawned++;
    }else clearInterval(interval);
  }, 1000);
}

// --- Start first wave ---
startWave();

// --- Collision Helper ---
function checkCollision(a,b){
  return a.x < b.x+b.size && a.x+a.width > b.x &&
         a.y < b.y+b.size && a.y+a.height > b.y;
}

// --- Game Loop ---
function update(){
  // Player movement
  let dirX=0, dirY=0;
  if(keys["w"]) dirY-=1;
  if(keys["s"]) dirY+=1;
  if(keys["a"]) dirX-=1;
  if(keys["d"]) dirX+=1;

  if(dirX!==0 || dirY!==0){
    const mag = Math.hypot(dirX, dirY);
    playerDir = { dx: dirX/mag, dy: dirY/mag };
    player.x += playerDir.dx*player.speed;
    player.y += playerDir.dy*player.speed;
  }

  // Keep player on screen
  player.x = Math.max(0, Math.min(canvas.width-player.size, player.x));
  player.y = Math.max(0, Math.min(canvas.height-player.size, player.y));

  // Partner follows player
  partner.x += (player.x - partner.x)*0.05;
  partner.y += (player.y - partner.y)*0.05;

  const now = Date.now();

  // Partner auto-shoot
  if(enemies.length>0 && now - lastPartnerShot > partnerFireRate){
    let nearest = enemies[0];
    let minDist = Math.hypot(nearest.x-partner.x, nearest.y-partner.y);
    enemies.forEach(e=>{
      const d = Math.hypot(e.x-partner.x, e.y-partner.y);
      if(d<minDist){ minDist=d; nearest=e; }
    });
    const angle = Math.atan2(nearest.y-partner.y, nearest.x-partner.x);
    bullets.push({
      x: partner.x+partner.size/2,
      y: partner.y+partner.size/2,
      dx: Math.cos(angle)*8,
      dy: Math.sin(angle)*8,
      width:6,
      height:2,
      owner:"partner"
    });
    lastPartnerShot = now;
  }

  // Enemy shooting
  enemies.forEach(e=>{
    if(now - e.lastShot > enemyFireRate){
      const angle = Math.atan2(player.y - e.y, player.x - e.x);
      enemyBullets.push({
        x: e.x+e.size/2,
        y: e.y+e.size/2,
        dx: Math.cos(angle)*5,
        dy: Math.sin(angle)*5,
        width:6,
        height:2,
        owner:"enemy"
      });
      e.lastShot = now;
    }
  });

  // Mega Bot shooting
  if(megaBot && now - megaBot.lastShot > enemyFireRate){
    const angle = Math.atan2(player.y - megaBot.y, player.x - megaBot.x);
    enemyBullets.push({
      x: megaBot.x + megaBot.size/2,
      y: megaBot.y + megaBot.size/2,
      dx: Math.cos(angle)*6,
      dy: Math.sin(angle)*6,
      width:6,
      height:2,
      owner:"enemy"
    });
    megaBot.lastShot = now;
  }

  // Update bullets (player and partner)
  for(let i=bullets.length-1;i>=0;i--){
    const b=bullets[i];
    b.x+=b.dx; b.y+=b.dy;

    // Check enemies
    for(let j=enemies.length-1;j>=0;j--){
      const e=enemies[j];
      if(checkCollision(b,e)){
        e.health-=1;
        bullets.splice(i,1);
        if(e.health<=0){ enemies.splice(j,1); score+=10; }
        break;
      }
    }

    // Check Mega Bot
    if(megaBot && checkCollision(b,megaBot)){
      megaBot.health-=1;
      bullets.splice(i,1);
      if(megaBot.health<=0){ megaBot=null; score+=50; }
      continue;
    }

    // Remove off-screen bullets
    if(b.x>canvas.width||b.x<0||b.y>canvas.height||b.y<0) bullets.splice(i,1);
  }

  // Enemy bullets
  for(let i=enemyBullets.length-1;i>=0;i--){
    const b=enemyBullets[i];
    b.x+=b.dx; b.y+=b.dy;

    if(b.x<player.x+player.size && b.x+b.width>player.x &&
       b.y<player.y+player.size && b.y+b.height>player.y){
      player.health-=5;
      enemyBullets.splice(i,1);
      continue;
    }
    if(b.x>canvas.width||b.x<0||b.y>canvas.height||b.y<0) enemyBullets.splice(i,1);
  }

  // Wave check
  if(!waveInProgress && enemies.length===0 && !megaBot){
    wave++;
    startWave();
  }

  // --- Draw ---
  ctx.fillStyle="black";
  ctx.fillRect(0,0,canvas.width,canvas.height);

  // Player
  ctx.fillStyle=player.color;
  ctx.fillRect(player.x,player.y,player.size,player.size);

  // Player health bar
  ctx.fillStyle="gray";
  ctx.fillRect(20,20,200,20);
  ctx.fillStyle="lime";
  ctx.fillRect(20,20,200*(player.health/player.maxHealth),20);
  ctx.strokeStyle="white";
  ctx.strokeRect(20,20,200,20);

  // Partner
  ctx.fillStyle=partner.color;
  ctx.fillRect(partner.x,partner.y,partner.size,partner.size);

  // Enemies
  enemies.forEach(e=>{
    ctx.fillStyle=e.color;
    ctx.fillRect(e.x,e.y,e.size,e.size);
    ctx.fillStyle="gray";
    ctx.fillRect(e.x,e.y-5,e.size,3);
    ctx.fillStyle="red";
    ctx.fillRect(e.x,e.y-5,e.size*(e.health/e.maxHealth),3);
  });

  // Mega Bot
  if(megaBot){
    ctx.fillStyle=megaBot.color;
    ctx.fillRect(megaBot.x,megaBot.y,megaBot.size,megaBot.size);
    ctx.fillStyle="gray";
    ctx.fillRect(megaBot.x,megaBot.y-10,megaBot.size,5);
    ctx.fillStyle="orange";
    ctx.fillRect(megaBot.x,megaBot.y-10,megaBot.size*(megaBot.health/megaBot.maxHealth),
