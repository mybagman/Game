const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Set canvas size to match viewport
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// ======== Game Variables ========
let keys = {};
let bullets = [];
let enemies = [];
let lightning = [];
let explosions = [];
let score = 0;
let wave = 1;

let lastDir = { x: 1, y: 0 };
let canShoot = true;

let player = {
  x: canvas.width/2,
  y: canvas.height/2,
  size: 30,
  speed: 5,
  health: 100
};

// ======== Controls ========
document.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
document.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

// ======== Shoot Function ========
function shoot() {
  let dx = lastDir.x;
  let dy = lastDir.y;
  const mag = Math.hypot(dx, dy) || 1;
  dx /= mag;
  dy /= mag;

  bullets.push({
    x: player.x,
    y: player.y,
    size: 6,
    dx: dx * 10,
    dy: dy * 10
  });
}

// ======== Enemy Spawning ========
function spawnEnemies(count) {
  for(let i=0;i<count;i++){
    enemies.push({
      x: Math.random()*canvas.width,
      y: Math.random()*canvas.height/2,
      size: 30,
      speed: 2,
      health: 30,
      type: "normal",
      shootTimer: 0
    });
  }
}

function spawnTriangleEnemies(count) {
  for(let i=0;i<count;i++){
    enemies.push({
      x: Math.random()*canvas.width,
      y: Math.random()*canvas.height/2,
      size: 30,
      speed: 1.5,
      health: 40,
      type: "triangle",
      shootTimer: 0
    });
  }
}

function spawnBoss() {
  enemies.push({
    x: canvas.width/2,
    y: 80,
    size: 80,
    health: 300 + wave*100,
    type: "boss"
  });
}

// ======== Boss Update Function ========
function updateBoss(boss) {
  // Move boss slowly in a sine/cos pattern
  boss.angle = boss.angle || 0; // initialize
  boss.angle += 0.01; // speed of circular motion
  boss.x = canvas.width/2 + Math.cos(boss.angle) * 150;
  boss.y = 80 + Math.sin(boss.angle) * 50;

  // Spawn minions randomly every 200 frames
  boss.spawnTimer = boss.spawnTimer || 0;
  boss.spawnTimer++;
  if(boss.spawnTimer > 200){
    boss.spawnTimer = 0;
    enemies.push({
      x: boss.x + (Math.random()-0.5)*100,
      y: boss.y + (Math.random()-0.5)*100,
      size: 30,
      speed: 2,
      health: 30,
      type: "normal",
      shootTimer: 0
    });
  }

  // Shoot in 4 directions every 150 frames
  boss.shootTimer = boss.shootTimer || 0;
  boss.shootTimer++;
  if(boss.shootTimer > 150){
    boss.shootTimer = 0;
    let dirs = [
      {x:0, y:-1}, // up
      {x:0, y:1},  // down
      {x:-1, y:0}, // left
      {x:1, y:0}   // right
    ];
    dirs.forEach(d => {
      lightning.push({
        x: boss.x,
        y: boss.y,
        dx: d.x*5,
        dy: d.y*5,
        size:6,
        damage:20
      });
    });
  }
}

// ======== Explosions ========
function createExplosion(x, y, color="red") {
  for(let i=0;i<20;i++){
    explosions.push({
      x: x,
      y: y,
      dx: (Math.random()-0.5)*6,
      dy: (Math.random()-0.5)*6,
      radius: Math.random()*4+2,
      color: color,
      life: 30
    });
  }
}

// ======== Game Logic ========
function movePlayer() {
  if(keys["w"]||keys["arrowup"]){ player.y-=player.speed; lastDir.y=-1; lastDir.x=0; }
  if(keys["s"]||keys["arrowdown"]){ player.y+=player.speed; lastDir.y=1; lastDir.x=0; }
  if(keys["a"]||keys["arrowleft"]){ player.x-=player.speed; lastDir.x=-1; lastDir.y=0; }
  if(keys["d"]||keys["arrowright"]){ player.x+=player.speed; lastDir.x=1; lastDir.y=0; }

  // Diagonal movement
  if(keys["w"]&&keys["a"]){ lastDir.x=-0.707; lastDir.y=-0.707; }
  if(keys["w"]&&keys["d"]){ lastDir.x=0.707; lastDir.y=-0.707; }
  if(keys["s"]&&keys["a"]){ lastDir.x=-0.707; lastDir.y=0.707; }
  if(keys["s"]&&keys["d"]){ lastDir.x=0.707; lastDir.y=0.707; }
}

function handleShooting() {
  if(keys[" "] && canShoot){
    shoot();
    canShoot = false; 
  }
  if(!keys[" "]){
    canShoot = true; 
  }
}

function updateBullets(){
  bullets = bullets.filter(b => {
    b.x += b.dx;
    b.y += b.dy;
    return b.x>=0 && b.x<=canvas.width && b.y>=0 && b.y<=canvas.height;
  });
}

function updateEnemies(){
  enemies = enemies.filter(e => {
    if(e.type!=="boss"){
      const dx = player.x - e.x;
      const dy = player.y - e.y;
      const dist = Math.hypot(dx,dy);
      e.x += (dx/dist)*e.speed;
      e.y += (dy/dist)*e.speed;

      // Triangle shooting
      if(e.type==="triangle"){
        e.shootTimer++;
        if(e.shootTimer>100){
          e.shootTimer=0;
          lightning.push({
            x:e.x,
            y:e.y,
            dx:(dx/dist)*5,
            dy:(dy/dist)*5,
            size:6,
            damage:20
          });
        }
      }

      // Collision with player
      if(dist < (player.size/2 + e.size/2)){
        player.health -= (e.type==="triangle"?30:20);
        createExplosion(e.x,e.y,(e.type==="triangle"?"cyan":"red"));
        return false;
      }
    }
    return true;
  });
}

function updateLightning(){
  lightning = lightning.filter(l => {
    l.x += l.dx;
    l.y += l.dy;
    if(Math.hypot(l.x-player.x,l.y-player.y)<player.size/2){
      player.health-=l.damage;
      return false;
    }
    return l.x>=0 && l.x<=canvas.width && l.y>=0 && l.y<=canvas.height;
  });
}

function checkBulletCollisions(){
  for(let bi = bullets.length - 1; bi >= 0; bi--){
    let b = bullets[bi];
    for(let ei = enemies.length - 1; ei >= 0; ei--){
      let e = enemies[ei];
      if(Math.hypot(b.x - e.x, b.y - e.y) < e.size/2){
        e.health -= 10;
        bullets.splice(bi, 1);
        if(e.health <= 0){
          createExplosion(e.x, e.y, (e.type==="triangle"?"cyan":e.type==="boss"?"yellow":"red"));
          enemies.splice(ei, 1);
          score += (e.type==="boss"?100:10);
        }
        break;
      }
    }
  }
}

function updateExplosions(){
  explosions = explosions.filter(ex => {
    ctx.fillStyle = ex.color;
    ctx.beginPath();
    ctx.arc(ex.x,ex.y,ex.radius,0,Math.PI*2);
    ctx.fill();
    ex.x += ex.dx;
    ex.y += ex.dy;
    ex.life--;
    return ex.life > 0;
  });
}

function drawPlayer(){
  ctx.fillStyle="lime";
  ctx.fillRect(player.x-player.size/2,player.y-player.size/2,player.size,player.size);
}

function drawBullets(){
  bullets.forEach(b=>{
    ctx.fillStyle="yellow";
    ctx.fillRect(b.x,b.y,b.size,b.size);
  });
}

function drawEnemies(){
  enemies.forEach(e=>{
    if(e.type==="normal"){
      ctx.fillStyle="red";
      ctx.fillRect(e.x-e.size/2,e.y-e.size/2,e.size,e.size);
    } else if(e.type==="triangle"){
      ctx.fillStyle="cyan";
      ctx.beginPath();
      ctx.moveTo(e.x, e.y-e.size/2);
      ctx.lineTo(e.x-e.size/2,e.y+e.size/2);
      ctx.lineTo(e.x+e.size/2,e.y+e.size/2);
      ctx.closePath();
      ctx.fill();
    } else if(e.type==="boss"){
      ctx.fillStyle="yellow";
      ctx.beginPath();
      ctx.arc(e.x,e.y,e.size/2,0,Math.PI*2);
      ctx.fill();
    }
  });
}

function drawLightning(){
  lightning.forEach(l=>{
    ctx.fillStyle="cyan";
    ctx.fillRect(l.x,l.y,l.size,l.size);
  });
}

function drawUI(){
  ctx.fillStyle="white";
  ctx.font="20px Arial";
  ctx.fillText(`Score: ${score}`,20,30);
  ctx.fillText(`Health: ${player.health}`,20,60);
  ctx.fillText(`Wave: ${wave}`,20,90);
}

function nextWave(){
  if(enemies.length===0){
    wave++;
    if(wave % 3 === 0) spawnBoss();
    else{
      spawnEnemies(3+wave);
      spawnTriangleEnemies(Math.floor(wave/2));
    }
  }
}

function updateEnemies(){
  enemies = enemies.filter(e => {
    if(e.type === "boss"){
      updateBoss(e);
      // Collision with player
      const dist = Math.hypot(player.x - e.x, player.y - e.y);
      if(dist < (player.size/2 + e.size/2)){
        player.health -= 40;
        createExplosion(e.x, e.y, "yellow");
      }
      return true;
    } else {
      // existing normal & triangle logic...
      const dx = player.x - e.x;
      const dy = player.y - e.y;
      const dist = Math.hypot(dx, dy);
      e.x += (dx/dist)*e.speed;
      e.y += (dy/dist)*e.speed;

      if(e.type==="triangle"){
        e.shootTimer++;
        if(e.shootTimer>100){
          e.shootTimer=0;
          lightning.push({
            x:e.x,
            y:e.y,
            dx:(dx/dist)*5,
            dy:(dy/dist)*5,
            size:6,
            damage:20
          });
        }
      }

      if(dist < (player.size/2 + e.size/2)){
        player.health -= (e.type==="triangle"?30:20);
        createExplosion(e.x,e.y,(e.type==="triangle"?"cyan":"red"));
        return false;
      }
      return true;
    }
  });
}
// ======== Main Game Loop ========
function gameLoop(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  movePlayer();
  handleShooting();
  updateBullets();
  updateEnemies();
  updateLightning();
  checkBulletCollisions();
  updateExplosions();
  drawPlayer();
  drawBullets();
  drawEnemies();
  drawLightning();
  drawUI();
  nextWave();

  if(player.health>0){
    requestAnimationFrame(gameLoop);
  } else {
    ctx.fillStyle="white";
    ctx.font="50px Arial";
    ctx.fillText("GAME OVER",canvas.width/2-150,canvas.height/2);
    ctx.font="30px Arial";
    ctx.fillText(`Final Score: ${score}`,canvas.width/2-100,canvas.height/2+50);
  }
}

// ======== Start Game ========
spawnEnemies(3);
spawnTriangleEnemies(1);
gameLoop();
