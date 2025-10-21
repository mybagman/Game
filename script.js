<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Wave Shooter Game</title>
<style>
  body { margin:0; overflow:hidden; background:black; }
  canvas { display:block; }
</style>
</head>
<body>
<canvas id="gameCanvas"></canvas>
<script>
// ====== Setup ======
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// ====== Game Variables ======
let keys = {};
let bullets = [];
let enemies = [];
let lightning = [];
let explosions = [];
let score = 0;
let wave = 1;
let minionsToAdd = [];

let lastDir = { x: 1, y: 0 };
let canShoot = true;

let player = { x: canvas.width/2, y: canvas.height/2, size:30, speed:5, health:100 };

// ====== Controls ======
document.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
document.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

// ====== Shooting ======
function shoot() {
  let dx = lastDir.x, dy = lastDir.y;
  const mag = Math.hypot(dx,dy)||1;
  dx/=mag; dy/=mag;
  bullets.push({ x:player.x, y:player.y, size:6, dx:dx*10, dy:dy*10 });
}

// ====== Enemy Spawning ======
function spawnEnemies(count){
  for(let i=0;i<count;i++){
    enemies.push({ x:Math.random()*canvas.width, y:Math.random()*canvas.height/2, size:30, speed:2, health:30, type:"normal", shootTimer:0 });
  }
}
function spawnTriangleEnemies(count){
  for(let i=0;i<count;i++){
    enemies.push({ x:Math.random()*canvas.width, y:Math.random()*canvas.height/2, size:30, speed:1.5, health:40, type:"triangle", shootTimer:0 });
  }
}
function spawnBoss(){
  enemies.push({ x:canvas.width/2, y:80, size:80, health:300+wave*100, type:"boss" });
}
function spawnMiniBoss(){
  enemies.push({ x:canvas.width/2, y:80, size:40, health:150+wave*50, type:"mini-boss" });
}

// ====== Update Functions ======
function updateBoss(b){
  b.angle = b.angle||0; b.angle+=0.01;
  b.x = canvas.width/2 + Math.cos(b.angle)*150;
  b.y = 80 + Math.sin(b.angle)*50;
  b.spawnTimer = b.spawnTimer||0; b.spawnTimer++;
  if(b.spawnTimer>200){ b.spawnTimer=0; minionsToAdd.push({ x:b.x+(Math.random()-0.5)*100, y:b.y+(Math.random()-0.5)*100, size:30, speed:2, health:30, type:"normal", shootTimer:0 }); }
  b.shootTimer = b.shootTimer||0; b.shootTimer++;
  if(b.shootTimer>150){ b.shootTimer=0; [ {x:0,y:-1},{x:0,y:1},{x:-1,y:0},{x:1,y:0}].forEach(d=>{ lightning.push({x:b.x, y:b.y, dx:d.x*5, dy:d.y*5, size:6, damage:20}); }); }
}

function updateMiniBoss(b){
  b.angle = b.angle||0; b.angle+=0.02;
  b.x = canvas.width/2 + Math.cos(b.angle)*100;
  b.y = 80 + Math.sin(b.angle)*30;
  b.spawnTimer = b.spawnTimer||0; b.spawnTimer++;
  if(b.spawnTimer>300){ b.spawnTimer=0; minionsToAdd.push({ x:b.x+(Math.random()-0.5)*80, y:b.y+(Math.random()-0.5)*80, size:30, speed:2, health:30, type:"normal", shootTimer:0 }); }
  b.shootTimer = b.shootTimer||0; b.shootTimer++;
  if(b.shootTimer>180){ b.shootTimer=0; [ {x:0,y:-1},{x:0,y:1},{x:-1,y:0},{x:1,y:0}].forEach(d=>{ lightning.push({x:b.x, y:b.y, dx:d.x*5, dy:d.y*5, size:6, damage:10}); }); }
}

// ====== Explosions ======
function createExplosion(x,y,color="red"){ for(let i=0;i<20;i++){ explosions.push({ x:x, y:y, dx:(Math.random()-0.5)*6, dy:(Math.random()-0.5)*6, radius:Math.random()*4+2, color:color, life:30 }); } }

// ====== Player ======
function movePlayer(){
  if(keys["w"]||keys["arrowup"]){ player.y-=player.speed; lastDir={x:0,y:-1}; }
  if(keys["s"]||keys["arrowdown"]){ player.y+=player.speed; lastDir={x:0,y:1}; }
  if(keys["a"]||keys["arrowleft"]){ player.x-=player.speed; lastDir={x:-1,y:0}; }
  if(keys["d"]||keys["arrowright"]){ player.x+=player.speed; lastDir={x:1,y:0}; }
  if(keys["w"]&&keys["a"]){ lastDir={x:-0.707,y:-0.707}; }
  if(keys["w"]&&keys["d"]){ lastDir={x:0.707,y:-0.707}; }
  if(keys["s"]&&keys["a"]){ lastDir={x:-0.707,y:0.707}; }
  if(keys["s"]&&keys["d"]){ lastDir={x:0.707,y:0.707}; }
}

function handleShooting(){ if(keys[" "] && canShoot){ shoot(); canShoot=false; } if(!keys[" "]) canShoot=true; }

function updateBullets(){
  bullets = bullets.filter(b=>{ b.x+=b.dx;b.y+=b.dy; return b.x>=0 && b.x<=canvas.width && b.y>=0 && b.y<=canvas.height; });
}

function updateEnemies(){
  enemies = enemies.filter(e=>{
    if(e.type==="boss"){ updateBoss(e); }
    else if(e.type==="mini-boss"){ updateMiniBoss(e); }
    else if(e.type==="triangle"){
      const dx=player.x-e.x, dy=player.y-e.y, dist=Math.hypot(dx,dy);
      e.x+=(dx/dist)*e.speed; e.y+=(dy/dist)*e.speed;
      e.shootTimer++; if(e.shootTimer>100){ e.shootTimer=0; lightning.push({x:e.x, y:e.y, dx:(dx/dist)*5, dy:(dy/dist)*5, size:6, damage:20}); }
    }
    else if(e.type==="shield"){
      let tri=enemies.find((t,i)=>t.type==="triangle" && i===e.protects);
      if(tri){ e.x = tri.x + (e.x-tri.x); e.y = tri.y + (e.y-tri.y); }
      else{ const dx=player.x-e.x, dy=player.y-e.y, dist=Math.hypot(dx,dy); e.x+=(dx/dist)*e.speed; e.y+=(dy/dist)*e.speed; e.type="normal"; }
    }
    else{ const dx=player.x-e.x, dy=player.y-e.y, dist=Math.hypot(dx,dy); e.x+=(dx/dist)*e.speed; e.y+=(dy/dist)*e.speed; }

    const distPlayer=Math.hypot(player.x-e.x,player.y-e.y);
    if(distPlayer<(player.size/2 + e.size/2)){ player.health-=(e.type==="triangle"?30:20); createExplosion(e.x,e.y,(e.type==="triangle"?"cyan":e.type==="shield"?"orange":"red")); return false; }
    return true;
  });
  if(minionsToAdd.length>0){ enemies.push(...minionsToAdd); minionsToAdd=[]; }
}

function updateLightning(){
  lightning = lightning.filter(l=>{ l.x+=l.dx; l.y+=l.dy; if(Math.hypot(l.x-player.x,l.y-player.y)<player.size/2){ player.health-=l.damage; return false; } return l.x>=0 && l.x<=canvas.width && l.y>=0 && l.y<=canvas.height; });
}

function checkBulletCollisions(){
  for(let bi=bullets.length-1;bi>=0;bi--){ let b=bullets[bi];
    for(let ei=enemies.length-1;ei>=0;ei--){ let e=enemies[ei];
      if(Math.hypot(b.x-e.x,b.y-e.y)<e.size/2){ e.health-=10; bullets.splice(bi,1);
        if(e.health<=0){ createExplosion(e.x,e.y,(e.type==="triangle"?"cyan":e.type==="boss"?"yellow":e.type==="mini-boss"?"magenta":"red")); enemies.splice(ei,1); score+=(e.type==="boss"?100:10); } break;
      }
    }
  }
}

function updateExplosions(){
  explosions = explosions.filter(ex=>{ ctx.fillStyle=ex.color; ctx.beginPath(); ctx.arc(ex.x,ex.y,ex.radius,0,Math.PI*2); ctx.fill(); ex.x+=ex.dx; ex.y+=ex.dy; ex.life--; return ex.life>0; });
}

// ====== Draw Functions ======
function drawPlayer(){ ctx.fillStyle="lime"; ctx.fillRect(player.x-player.size/2,player.y-player.size/2,player.size,player.size); }
function drawBullets(){ bullets.forEach(b=>{ ctx.fillStyle="yellow"; ctx.fillRect(b.x,b.y,b.size,b.size); }); }
function drawEnemies(){
  enemies.forEach(e=>{
    if(e.type==="normal"){ ctx.fillStyle="red"; ctx.fillRect(e.x-e.size/2,e.y-e.size/2,e.size,e.size); }
    else if(e.type==="triangle"){ ctx.fillStyle="cyan"; ctx.beginPath(); ctx.moveTo(e.x,e.y-e.size/2); ctx.lineTo(e.x-e.size/2,e.y+e.size/2); ctx.lineTo(e.x+e.size/2,e.y+e.size/2); ctx.closePath(); ctx.fill(); }
    else if(e.type==="boss"){ ctx.fillStyle="yellow"; ctx.beginPath(); ctx.arc(e.x,e.y,e.size/2,0,Math.PI*2); ctx.fill(); }
    else if(e.type==="shield"){ ctx.fillStyle="orange"; ctx.fillRect(e.x-e.size/2,e.y-e.size/2,e.size,e.size); }
    else if(e.type==="mini-boss"){ ctx.fillStyle="magenta"; ctx.beginPath(); ctx.arc(e.x,e.y,e.size/2,0,Math.PI*2); ctx.fill(); }
  });
}
function drawLightning(){ lightning.forEach(l=>{ ctx.fillStyle="cyan"; ctx.fillRect(l.x,l.y,l.size,l.size); }); }
function drawUI(){ ctx.fillStyle="white"; ctx.font="20px Arial"; ctx.fillText(`Score: ${score}`,20,30); ctx.fillText(`Health: ${player.health}`,20,60); ctx.fillText(`Wave: ${wave}`,20,90); }

// ====== Waves ======
function nextWave(){
  if(enemies.length===0){
    switch(wave){
      case 1: spawnEnemies(3); break;
      case 2: spawnEnemies(4); spawnTriangleEnemies(2); break;
      case 3: spawnBoss(); break;
      case 4:
        let numTriangles=2;
        for(let i=0;i<numTriangles;i++){
          let triX=canvas.width/4 + i*(canvas.width/4), triY=100;
          enemies.push({x:triX,y:triY,size:30,speed:1.5,health:40,type:"triangle",shootTimer:0,shieldSquares:[]});
          for(let j=0;j<4;j++){
            let offsetX=(j%2===0?-1:1)*40, offsetY=(j<2?-1:1)*40;
            enemies.push({x:triX+offsetX,y:triY+offsetY,size:30,speed:2,health:30,type:"shield",protects:i});
          }
        }
        break;
      case 5: spawnEnemies(5); spawnTriangleEnemies(2); spawnMiniBoss(); break;
      default: spawnEnemies(3+wave); spawnTriangleEnemies(Math.floor(wave/2)); if(wave%3===0) spawnBoss(); break;
    }
    wave++;
  }
}

// ====== Main Loop ======
function gameLoop(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  movePlayer(); handleShooting(); updateBullets(); updateEnemies(); updateLightning();
  checkBulletCollisions(); updateExplosions(); drawPlayer(); drawBullets(); drawEnemies(); drawLightning(); drawUI(); nextWave();

  if(player.health>0){ requestAnimationFrame(gameLoop); }
  else{
    ctx.fillStyle="white"; ctx.font="50px Arial"; ctx.fillText("GAME OVER",canvas.width/2-150,canvas.height/2);
    ctx.font="30px Arial"; ctx.fillText(`Final Score: ${score}`,canvas.width/2-100,canvas.height/2+50);
  }
}

// ====== Start Game ======
spawnEnemies(3);
spawnTriangleEnemies(1);
gameLoop();
</script>
</body>
</html>
