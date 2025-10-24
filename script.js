const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// ======== Setup ========
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// ======== Game Variables ========
let keys = {};
let bullets = [];
let enemies = [];
let lightning = [];
let explosions = [];
let diamonds = [];
let score = 0;
let wave = 0;
let minionsToAdd = [];
let tunnels = [];

let player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 15,
    size: 30,
    speed: 5,
    health: 100,
    maxHealth: 100,
    lives: 3,
    invulnerable: false,
    respawning: false,
    glowTime: 0
};

let shootCooldown = 0;
let waveTransition = false;
const WAVE_BREAK_MS = 2500;
let gameOver = false;

// ======== Controls ========
document.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
document.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

// ======== Shooting ========
function handleShooting() {
    if (shootCooldown > 0) shootCooldown--;

    let dirX = 0, dirY = 0;
    if (keys["arrowup"]) dirY = -1;
    if (keys["arrowdown"]) dirY = 1;
    if (keys["arrowleft"]) dirX = -1;
    if (keys["arrowright"]) dirX = 1;

    if ((dirX !== 0 || dirY !== 0) && shootCooldown === 0) {
        const mag = Math.hypot(dirX, dirY) || 1;
        bullets.push({
            x: player.x,
            y: player.y,
            dx: (dirX / mag) * 10,
            dy: (dirY / mag) * 10,
            size: 6
        });
        shootCooldown = 10;
    }
}

function updateBullets() {
    bullets = bullets.filter(b => {
        b.x += b.dx;
        b.y += b.dy;
        return b.x >= -20 && b.x <= canvas.width + 20 && b.y >= -20 && b.y <= canvas.height + 20;
    });
}

// ======== Spawning Helpers ========
function spawnRedSquares(count) {
    for (let i = 0; i < count; i++) {
        enemies.push({ x: Math.random() * canvas.width, y: Math.random() * (canvas.height / 2), size: 30, speed: 1.8, health: 30, type: "red-square", shootTimer: 0 });
    }
}
function spawnTriangles(count) {
    for (let i = 0; i < count; i++) {
        enemies.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, size: 30, speed: 1.5, health: 40, type: "triangle", shootTimer: 0 });
    }
}
function spawnReflectors(count) {
    for (let i = 0; i < count; i++) spawnReflector(Math.random() * canvas.width, Math.random() * canvas.height);
}
function spawnBoss() {
    enemies.push({ x: canvas.width / 2, y: 100, size: 150, health: 1000, type: "boss", spawnTimer: 0, shootTimer: 0 });
}
function spawnMiniBoss() {
    enemies.push({ x: Math.random() * canvas.width, y: 120 + Math.random() * 60, size: 80, health: 500, type: "mini-boss", spawnTimer: 0, shootTimer: 0 });
}
function spawnReflector(x, y) {
    enemies.push({ x, y, width: 40, height: 20, angle: 0, speed: 0.8, health: 200, type: "reflector" });
}
function spawnDiamondEnemy(x = canvas.width / 2, y = canvas.height / 3) {
    diamonds.push({ x, y, size: 40, health: 200, type: "diamond", attachments: [], canReflect: false, angle: Math.random() * Math.PI*2, shootTimer: 0, pulse: 0 });
}

// ======== Tunnel ========
function spawnTunnel() {
    const wallHeight = canvas.height / 3;
    const wallWidth = 600;
    const topWall = { x: canvas.width, y: 0, width: wallWidth, height: wallHeight, speed: 2, damage: 30, active: true };
    const bottomWall = { x: canvas.width, y: canvas.height - wallHeight, width: wallWidth, height: wallHeight, speed: 2, damage: 30, active: true };
    tunnels.push(topWall, bottomWall);
}
function updateTunnels() {
    for (let i = tunnels.length-1; i>=0; i--) {
        const t = tunnels[i];
        if (!t.active) continue;
        t.x -= t.speed;
        ctx.fillStyle = "rgba(0,255,255,0.5)";
        ctx.fillRect(t.x, t.y, t.width, t.height);
        if (t.x + t.width < 0) tunnels.splice(i,1);
    }
}

// ======== Explosions ========
function createExplosion(x,y,color="red"){
    for(let i=0;i<20;i++){
        explosions.push({ x, y, dx:(Math.random()-0.5)*6, dy:(Math.random()-0.5)*6, radius:Math.random()*4+2, color, life:30 });
    }
}
function updateExplosions() {
    explosions = explosions.filter(ex => {
        ctx.fillStyle = ex.color;
        ctx.beginPath();
        ctx.arc(ex.x, ex.y, ex.radius, 0, Math.PI*2);
        ctx.fill();
        ex.x += ex.dx;
        ex.y += ex.dy;
        ex.life--;
        return ex.life > 0;
    });
}

// ======== Diamond Logic ========
function attachToDiamond(d, e){
    e.attachedTo = d;
    e.orbitAngle = Math.random()*Math.PI*2;
    if (e.type==="triangle") e.fireRateBoost = true;
    if (e.type==="red-square") e.spawnMini = true;
    if (e.type==="reflector") d.canReflect = true;
    e.speed = 0;
    d.attachments.push(e);
}
function attractEnemiesToDiamond(d, allEnemies){
    for (let i = allEnemies.length-1;i>=0;i--){
        const e = allEnemies[i];
        if (!e || e === d || e.attachedTo || ["boss","mini-boss"].includes(e.type)) continue;
        const dx = d.x - e.x, dy = d.y - e.y;
        const dist = Math.hypot(dx,dy);
        if(dist<260 && d.attachments.length<15){
            const pull = 0.04 + (1 - Math.min(dist/260,1))*0.06;
            e.x += dx*pull;
            e.y += dy*pull;
            if(dist<28){ allEnemies.splice(i,1); attachToDiamond(d,e); }
        }
    }
}
function diamondDeath(d){
    createExplosion(d.x,d.y,"white");
    d.attachments.forEach(a=>{
        enemies.push({
            x:a.x+(Math.random()-0.5)*10,
            y:a.y+(Math.random()-0.5)*10,
            size:Math.max(12,a.size*0.6),
            speed:2,
            health:Math.max(10,(a.health||20)*0.5),
            type: a.type==="reflector"?"reflector":(a.type==="triangle"?"triangle":"red-square"),
            shootTimer:0
        });
    });
}

// ======== Enemy Update ========
function updateDiamond(d){
    const roamSpeed = 1.6;
    let nearest = null, nd = Infinity;
    for(const e of enemies){
        if(!e || ["diamond","boss","mini-boss"].includes(e.type)) continue;
        const dist = Math.hypot(e.x-d.x,e.y-d.y);
        if(dist<nd){ nd=dist; nearest=e; }
    }
    if(nearest && nd<800){
        const dx = nearest.x-d.x, dy = nearest.y-d.y, mag = Math.hypot(dx,dy)||1;
        d.x += (dx/mag)*Math.min(roamSpeed,mag);
        d.y += (dy/mag)*Math.min(roamSpeed,mag);
    } else { d.angle+=0.01; const r=Math.min(300,Math.max(120,(canvas.width+canvas.height)/8)); d.x=canvas.width/2+Math.cos(d.angle)*r; d.y=canvas.height/2+Math.sin(d.angle)*r; }

    attractEnemiesToDiamond(d,enemies);

    d.attachments.forEach(a=>{
        a.orbitAngle=(a.orbitAngle||0)+0.06+(a.type==="reflector"?0.02:0);
        const orbitRadius = d.size + 28 + (a.type==="reflector"?14:0);
        a.x = d.x + Math.cos(a.orbitAngle)*orbitRadius;
        a.y = d.y + Math.sin(a.orbitAngle)*orbitRadius;

        if(a.type==="triangle" || a.type==="red-square"){
            a.shootTimer=(a.shootTimer||0)+1;
            const fireRate = a.type==="triangle"?(a.fireRateBoost?40:100):120;
            if(a.shootTimer>fireRate){
                a.shootTimer=0;
                const dx=player.x-a.x, dy=player.y-a.y, mag=Math.hypot(dx,dy)||1;
                lightning.push({ x:a.x, y:a.y, dx:(dx/mag)*5, dy:(dy/mag)*5, size:6, damage:a.type==="triangle"?15:10 });
            }
        }

        if(a.type==="reflector"){
            for(let bi=bullets.length-1;bi>=0;bi--){
                const b=bullets[bi];
                if(Math.hypot(b.x-a.x,b.y-a.y)<40){
                    lightning.push({ x:b.x, y:b.y, dx:-b.dx, dy:-b.dy, size:6, damage:12 });
                    bullets.splice(bi,1);
                }
            }
        }
    });

    d.shootTimer=(d.shootTimer||0)+1;
    d.pulse = Math.sin(d.shootTimer*0.1)*4;
    if(d.canReflect){
        for(let bi=bullets.length-1;bi>=0;bi--){
            const b=bullets[bi];
            if(Math.hypot(b.x-d.x,b.y-d.y)<90){
                lightning.push({ x:b.x, y:b.y, dx:-b.dx, dy:-b.dy, size:6, damage:12 });
                bullets.splice(bi,1);
            }
        }
    }

    if(d.attachments.some(a=>a.spawnMini) && d.shootTimer%200===0){
        minionsToAdd.push({ x:d.x+(Math.random()-0.5)*80, y:d.y+(Math.random()-0.5)*80, size:25, speed:2, health:30, type:"red-square", shootTimer:0 });
    }

    if(d.attachments.length>=3 && d.shootTimer%180===0){
        [{x:0,y:-1},{x:0,y:1},{x:-1,y:0},{x:1,y:0}].forEach(dv=>{
            lightning.push({ x:d.x, y:d.y, dx:dv.x*6, dy:dv.y*6, size:8, damage:20 });
        });
    }

    if(Math.hypot(d.x-player.x,d.y-player.y)<(d.size/2+player.size/2)){
        player.health -=30;
        d.health -=80;
        createExplosion(d.x,d.y,"white");
    }
}

function updateEnemies(){
    for(let di=diamonds.length-1;di>=0;di--){
        const d=diamonds[di];
        updateDiamond(d);
        if(d.health<=0){ diamondDeath(d); diamonds.splice(di,1); score+=200; }
    }

    enemies = enemies.filter(e=>{
        if(!e) return false;
        if(e.type==="boss") { updateBoss(e); return true; }
        if(e.type==="mini-boss") { updateMiniBoss(e); return true; }
        const dx=player.x-e.x, dy=player.y-e.y, dist=Math.hypot(dx,dy)||1;

        if(e.type==="triangle" || e.type==="red-square"){
            e.x+=(dx/dist)*e.speed;
            e.y+=(dy/dist)*e.speed;
            if(e.type==="triangle"){ e.shootTimer=(e.shootTimer||0)+1; if(e.shootTimer>100){ e.shootTimer=0; lightning.push({ x:e.x, y:e.y, dx:(dx/dist)*5, dy:(dy/dist)*5, size:6, damage:15 }); } }
            if(Math.hypot(e.x-player.x,e.y-player.y)<(e.size/2+player.size/2)){ player.health-=(e.type==="triangle"?25:15); createExplosion(e.x,e.y,e.type==="triangle"?"cyan":"red"); return false; }
        }

        if(e.type==="reflector"){
            if(bullets.length>0){
                let closest = bullets.reduce((p,c)=>Math.hypot(c.x-e.x,c.y-e.y)<Math.hypot(p.x-e.x,p.y-e.y)?c:p);
                const dx = closest.x-e.x, dy=closest.y-e.y, dist=Math.hypot(dx,dy)||1;
                if(dist<300){ const move=Math.min(2,dist/20); e.x+=(dx/dist)*move; e.y+=(dy/dist)*move; }
            }
            e.angle=(e.angle||0)+0.1;
            if(Math.hypot(e.x-player.x,e.y-player.y)<(e.size/2+player.size/2||20)){ player.health-=15; createExplosion(e.x,e.y,"magenta"); return false; }
        }

        return true;
    });

    if(minionsToAdd.length>0){ enemies.push(...minionsToAdd); minionsToAdd=[]; }
}

// ======== Lightning ========
function updateLightning(){
    lightning = lightning.filter(l=>{
        l.x+=l.dx; l.y+=l.dy;
        if(Math.hypot(l.x-player.x,l.y-player.y)<player.size/2){ player.health-=l.damage; return false; }
        return l.x>=-20 && l.x<=canvas.width+20 && l.y>=-20 && l.y<=canvas.height+20;
    });
}

// ======== Bullet Collisions ========
function checkBulletCollisions(){
    for(let bi=bullets.length-1;bi>=0;bi--){
        const b=bullets[bi];
        for(let ei=enemies.length-1;ei>=0;ei--){
            const e=enemies[ei]; if(!e) continue;
            if(e.type==="reflector"){
                if(Math.hypot(b.x-e.x,b.y-e.y)<Math.max(e.width,e.height)){
                    lightning.push({ x:b.x, y:b.y, dx:-b.dx, dy:-b.dy, size:6, damage:15 });
                    bullets.splice(bi,1);
                    e.health-=5;
                    if(e.health<=0){ createExplosion(e.x,e.y,"purple"); enemies.splice(ei,1); score+=20; }
                    break;
                }
            } else if(Math.hypot(b.x-e.x,b.y-e.y)<(e.size/2)){ e.health-=10; bullets.splice(bi,1); if(e.health<=0){ createExplosion(e.x,e.y,"red"); enemies.splice(ei,1); score+=10; } break; }
        }

        for(let di=diamonds.length-1;di>=0;di--){
            const d=diamonds[di];
            for(let ai=d.attachments.length-1;ai>=0;ai--){
                const a=d.attachments[ai]; const radius=(a.size||20)/2;
                if(Math.hypot(b.x-a.x,b.y-a.y)<radius){ a.health=(a.health||30)-10; bullets.splice(bi,1); if(a.health<=0){ createExplosion(a.x,a.y,"white"); d.attachments.splice(ai,1); score+=5; if(!d.attachments.some(at=>at.type==="reflector")) d.canReflect=false; } ai=-1; break; }
            }
        }
    }
}

// ======== HUD/UI ========
function drawUI(){
    ctx.fillStyle="gray"; ctx.fillRect(20,20,200,20);
    ctx.fillStyle="lime"; ctx.fillRect(20,20,200*Math.max(0,player.health/player.maxHealth),20);
    ctx.strokeStyle="black"; ctx.strokeRect(20,20,200,20);
    ctx.fillStyle="white"; ctx.font="20px Arial";
    ctx.fillText(`Lives: ${player.lives}`,20,100);
    ctx.fillText(`Score: ${score}`,20,60);
    ctx.fillText(`Wave: ${wave}`,20,90);
    if(waveTransition){ ctx.fillStyle="rgba(0,0,0,0.6)"; ctx.fillRect(canvas.width/2-160,canvas.height/2-40,320,80); ctx.fillStyle="white"; ctx.font="24px Arial"; ctx.fillText("Wave Complete",canvas.width/2-80,canvas.height/2); }
}

// ======== Waves ========
const waves = [
    { enemies:[{type:"red-square",count:2}] },
    { enemies:[{type:"red-square",count:3},{type:"triangle",count:2}] },
    { enemies:[{type:"red-square",count:5},{type:"triangle",count:4}] },
    { enemies:[{type:"red-square",count:3},{type:"triangle",count:2},{type:"reflector",count:1}] },
    { tunnel:true, enemies:[{type:"red-square",count:5},{type:"triangle",count:4},{type:"reflector",count:1}] },
    { enemies:[{type:"boss",count:1},{type:"triangle",count:3}] },
    { enemies:[{type:"reflector",count:2},{type:"triangle",count:5}] },
    { tunnel:true, enemies:[{type:"red-square",count:5},{type:"triangle",count:5},{type:"reflector",count:1},{type:"mini-boss",count:1}] },
    { enemies:[{type:"mini-boss",count:3},{type:"boss",count:1},{type:"triangle",count:5},{type:"reflector",count:1}] },
    { tunnel:true, enemies:[{type:"triangle",count:8},{type:"reflector",count:3}] },
    { enemies:[{type:"red-square",count:5},{type:"triangle",count:5},{type:"reflector",count:3},{type:"diamond",count:1}] }
];

function spawnWave(waveIndex){
    if(waveIndex<0||waveIndex>=waves.length) return;
    const waveData=waves[waveIndex];
    if(waveData.tunnel) spawnTunnel();
    if(waveData.enemies) waveData.enemies.forEach(group=>{
        if(group.type==="red-square") spawnRedSquares(group.count);
        else if(group.type==="triangle") spawnTriangles(group.count);
        else if(group.type==="reflector") spawnReflectors(group.count);
        else if(group.type==="boss") for(let i=0;i<group.count;i++) spawnBoss();
        else if(group.type==="mini-boss") for(let i=0;i<group.count;i++) spawnMiniBoss();
        else if(group.type==="diamond") for(let i=0;i<group.count;i++) spawnDiamondEnemy();
    });
}

// ======== Wave progression ========
function tryAdvanceWave(){
    if(enemies.length===0 && diamonds.length===0 && tunnels.length===0 && !waveTransition){
        if(wave>=waves.length-1){ waveTransition=true; return; }
        waveTransition=true;
        setTimeout(()=>{ wave++; spawnWave(wave); waveTransition=false; }, WAVE_BREAK_MS);
    }
}

// ======== Main Loop ========
function gameLoop(){
    if(gameOver){ ctx.fillStyle="white"; ctx.font="48px Arial"; ctx.fillText("Game Over",canvas.width/2-120,canvas.height/2); return; }

    ctx.clearRect(0,0,canvas.width,canvas.height);

    // Player movement
    let newX=player.x, newY=player.y;
    if(keys["w"]) newY-=player.speed;
    if(keys["s"]) newY+=player.speed;
    if(keys["a"]) newX-=player.speed;
    if(keys["d"]) newX+=player.speed;

    let blocked=false;
    for(const t of tunnels){
        if(newX+player.size/2>t.x && newX-player.size/2<t.x+t.width && newY+player.size/2>t.y && newY-player.size/2<t.y+t.height){
            blocked=true; player.health--; createExplosion(player.x,player.y,"cyan"); break;
        }
    }
    if(!blocked){ player.x=newX; player.y=newY; }

    handleShooting();
    updateBullets();
    updateEnemies();
    updateLightning();
    checkBulletCollisions();
    updateExplosions();
    updateTunnels();

    // Draw
    drawUI();
    drawPlayer();
    drawBullets();
    drawEnemies();
    drawDiamonds();
    drawLightning();
    drawExplosions();

    tryAdvanceWave();

    // Player life system
    if(player.health<=0 && !player.respawning){
        player.lives--;
        createExplosion(player.x,player.y,"red");
        if(player.lives>0){
            player.respawning=true; player.invulnerable=true; player.health=player.maxHealth;
            player.x=canvas.width/2; player.y=canvas.height/2; player.glowTime=Date.now()+2000;
            setTimeout(()=>{ player.invulnerable=false; player.respawning=false; },2000);
        } else { gameOver=true; }
    }

    requestAnimationFrame(gameLoop);
}

// ======== Draw Functions ========
function drawPlayer(){
    ctx.shadowBlur=0;
    if(player.invulnerable && Date.now()<player.glowTime){
        ctx.shadowColor="rgba(255,255,0,0.7)"; ctx.shadowBlur=15;
    }
    ctx.beginPath(); ctx.arc(player.x,player.y,player.radius,0,Math.PI*2); ctx.fillStyle=player.invulnerable?"rgba(255,255,255,0.8)":"cyan"; ctx.fill(); ctx.closePath(); ctx.shadowBlur=0;
}
function drawBullets(){ ctx.fillStyle="yellow"; bullets.forEach(b=>ctx.fillRect(b.x-b.size/2,b.y-b.size/2,b.size,b.size)); }
function drawEnemies(){
    enemies.forEach(e=>{
        if(!e) return;
        if(e.type==="red-square"){ ctx.fillStyle="red"; ctx.fillRect(e.x-e.size/2,e.y-e.size/2,e.size,e.size); }
        else if(e.type==="triangle"){ ctx.fillStyle="cyan"; ctx.beginPath(); ctx.moveTo(e.x,e.y-e.size/2); ctx.lineTo(e.x-e.size/2,e.y+e.size/2); ctx.lineTo(e.x+e.size/2,e.y+e.size/2); ctx.closePath(); ctx.fill(); }
        else if(e.type==="boss"){ ctx.fillStyle="yellow"; ctx.beginPath(); ctx.arc(e.x,e.y,e.size/2,0,Math.PI*2); ctx.fill(); }
        else if(e.type==="mini-boss"){ ctx.fillStyle="orange"; ctx.beginPath(); ctx.arc(e.x,e.y,e.size/2,0,Math.PI*2); ctx.fill(); }
        else if(e.type==="reflector"){ ctx.save(); ctx.translate(e.x,e.y); ctx.rotate(e.angle||0); ctx.fillStyle="purple"; ctx.fillRect(-e.width/2,-e.height/2,e.width,e.height); ctx.restore(); }
    });
}
function drawDiamonds(){
    diamonds.forEach(d=>{
        ctx.save(); ctx.translate(d.x,d.y); ctx.rotate(d.angle||0); ctx.strokeStyle=d.canReflect?"cyan":"white"; ctx.lineWidth=3;
        ctx.beginPath(); ctx.moveTo(0,-d.size/2-d.pulse); ctx.lineTo(d.size/2+d.pulse,0); ctx.lineTo(0,d.size/2+d.pulse); ctx.lineTo(-d.size/2-d.pulse,0); ctx.closePath(); ctx.stroke(); ctx.restore();
        d.attachments.forEach(a=>{
            if(a.type==="triangle"){ ctx.fillStyle="cyan"; ctx.beginPath(); ctx.moveTo(a.x,a.y-(a.size||20)/2); ctx.lineTo(a.x-(a.size||20)/2,a.y+(a.size||20)/2); ctx.lineTo(a.x+(a.size||20)/2,a.y+(a.size||20)/2); ctx.closePath(); ctx.fill(); }
            else if(a.type==="reflector"){ ctx.save(); ctx.translate(a.x,a.y); ctx.rotate(a.orbitAngle||0); ctx.fillStyle="magenta"; ctx.fillRect(-(a.width||20)/2,-(a.height||10)/2,a.width||20,a.height||10); ctx.restore(); }
            else{ ctx.fillStyle="lime"; ctx.fillRect(a.x-(a.size||20)/2,a.y-(a.size||20)/2,a.size||20,a.size||20); }
        });
    });
}
function drawLightning(){ ctx.fillStyle="cyan"; lightning.forEach(l=>ctx.fillRect(l.x-(l.size||6)/2,l.y-(l.size||6)/2,l.size||6,l.size||6)); }

// ======== Start Game ========
spawnWave(0);
gameLoop();