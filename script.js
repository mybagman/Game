const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
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

let player = {
  x: canvas.width/2,
  y: canvas.height/2,
  size: 30,
  speed: 5,
  health: 100,
  angle: 0
};

// ======== Controls ========
document.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
document.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);
canvas.addEventListener("click", shoot);

// ======== Shoot Function ========
function shoot() {
  bullets.push({
    x: player.x,
    y: player.y,
    size: 6,
    dx: Math.cos(player.angle) * 10,
    dy: Math.sin(player.angle) * 10
  });
}

// ======== Spawn Enemies ========
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

// ======== Explosion Function ========
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

// ======== Game Functions ========
function movePlayer() {
  if(keys["w"]||keys["arrowup"]){ player.y-=player.speed; }
  if(keys["s"]||keys["arrowdown"]){ player.y+=player.speed; }
  if(keys["a"]||keys["arrowleft"]){ player.x-=player.speed; }
  if(keys["d"]||keys["arrowright"]){ player.x+=player.speed; }

  canvas.onmousemove = function(e){
    player.angle = Math.atan2(e.clientY-player.y, e.clientX-player.x);
  };
}

function updateBullets(){
  bullets.forEach((b,i)=>{
    b.x+=b.dx;
    b.y+=b.dy;
    if(b.x<0||b.x>canvas.width||b.y<0||b.y>canvas.height) bullets.splice(i,1);
  });
}

function updateEnemies(){
  enemies.forEach((e,ei)=>{
    if(e.type!=="boss"){
      let dx = player.x - e.x;
      let dy = player.y - e.y;
      let dist = Math.hypot(dx,dy);
      e.x += (dx/dist)*e.speed;
      e.y += (dy/dist)*e.speed;

      // Triangle enemy shooting
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

      // Contact with player
      if(dist < (player.size/2 + e.size/2)){
        player.health -= (e.type==="triangle"?30:20);
        createExplosion(e.x,e.y,(e.type==="triangle"?"cyan":"red"));
        enemies.splice(ei,1);
      }
    }
  });
}

function updateLightning(){
  lightning.forEach((l,i)=>{
    l.x+=l.dx;
    l.y+=l.dy;
    if(Math.hypot(l.x-player.x,l.y-player.y)<player.size/2){
      player.health-=l.damage;
      lightning.splice(i,1);
    }
    if(l.x<0||l.x>canvas.width||l.y<0||l.y>canvas.height) lightning.splice(i,1);
  });
}

function checkBulletCollisions(){
  enemies.forEach((e,ei)=>{
    bullets.forEach((b,bi)=>{
      if(Math.hypot(b.x-e.x,b.y-e.y)<e.size/2){
        e.health-=10;
        bullets.splice(bi,1);
        if(e.health<=0){
          createExplosion(e.x,e.y,(e.type==="triangle"?"cyan":e.type==="boss"?"yellow":"red"));
          enemies.splice(ei,1);
          score += (e.type==="boss"?100:10);
        }
      }
    });
  });
}

function updateExplosions(){
  explosions.forEach((ex,i)=>{
    ctx.fillStyle = ex.color;
    ctx.beginPath();
    ctx.arc(ex.x,ex.y,ex.radius,0,Math.PI*2);
    ctx.fill();
    ex.x+=ex.dx;
    ex.y+=ex.dy;
    ex.life--;
    if(ex.life<=0) explosions.splice(i,1);
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
    if(wave%3===0) spawnBoss();
    else{
      spawnEnemies(3+wave);
      spawnTriangleEnemies(Math.floor(wave/2));
    }
  }
}

function gameLoop(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  movePlayer();
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
