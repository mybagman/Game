// NOTE: This is an updated version of script.js with the following changes:
// 1) Fixed the syntax error (removed corrupted/duplicated fragments).
// 2) Implemented "mother diamond" (diamond) behavior: when its graviton blast triggers
//    it will also shoot all its attachments outward and fully detach them.
// 3) Tanks and walkers are now restricted to walk along the bottom of the screen
//    (spawn and movement constrained).
// 4) Colliding with active tunnels damages the player (with a short tunnel damage cooldown).
//
// The rest of the code is preserved as much as possible. Only relevant logic was adjusted.

let canvas, ctx;

function drawClouds() {
  cloudParticles.forEach(c => {
    ctx.fillStyle = `rgba(220,230,240,${c.opacity})`;
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.size, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawCityBackground() {
  // Simple city silhouette
  ctx.fillStyle = "rgba(20,20,30,0.8)";
  for (let i = 0; i < 20; i++) {
    const x = i * (canvas.width / 20);
    const height = 100 + Math.sin(i) * 50;
    ctx.fillRect(x, canvas.height - height, canvas.width / 20 - 5, height);
  }
}

function drawPlayer() {
  const invulFlash = player.invulnerable && Math.floor(Date.now()/100)%2 === 0;
  ctx.fillStyle = invulFlash ? "rgba(0,255,0,0.5)" : "lime";
  ctx.fillRect(player.x-player.size/2, player.y-player.size/2, player.size, player.size);

  if (goldStarAura.active && (shootCooldown > 0 || (keys["arrowup"] || keys["arrowdown"] || keys["arrowleft"] || keys["arrowright"]))) {
    const indicatorDistance = player.size / 2 + 8;
    const dotX = player.x + Math.cos(firingIndicatorAngle) * indicatorDistance;
    const dotY = player.y + Math.sin(firingIndicatorAngle) * indicatorDistance;
    
    ctx.shadowBlur = 10;
    ctx.shadowColor = "yellow";
    ctx.fillStyle = "yellow";
    ctx.beginPath();
    ctx.arc(dotX, dotY, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    
    firingIndicatorAngle += 0.15;
  }

  if (player.reflectAvailable) {
    ctx.strokeStyle = "cyan";
    ctx.lineWidth = 2;
    ctx.beginPath(); 
    ctx.arc(player.x, player.y, player.size/2 + 14, 0, Math.PI*2); 
    ctx.stroke();
  }
}

function drawBullets() { 
  ctx.fillStyle = "yellow"; 
  bullets.forEach(b => ctx.fillRect(b.x-b.size/2, b.y-b.size/2, b.size, b.size)); 
}

function drawEnemies() {
  enemies.forEach(e => {
    if (!e) return;
    
    if (e.type === "red-square") { 
      ctx.shadowBlur = 15;
      ctx.shadowColor = "red";
      ctx.fillStyle = "red"; 
      ctx.fillRect(e.x-e.size/2, e.y-e.size/2, e.size, e.size);
      ctx.shadowBlur = 0;
      
      const pulse = Math.sin(frameCount * 0.1) * 0.3 + 0.7;
      ctx.strokeStyle = `rgba(255,100,100,${pulse})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(e.x-e.size/2, e.y-e.size/2, e.size, e.size);

      try {
        const eyeTriggerDist = 140;
        const dxP = player.x - e.x, dyP = player.y - e.y, dP = Math.hypot(dxP, dyP);
        const dxG = goldStar.x - e.x, dyG = goldStar.y - e.y, dG = Math.hypot(dxG, dyG);
        let target = null, td = Infinity;
        if (dP < eyeTriggerDist) { target = {x: player.x, y: player.y}; td = dP; }
        if (dG < eyeTriggerDist && dG < td) { target = {x: goldStar.x, y: goldStar.y}; td = dG; }
        if (target) {
          const insideRadius = Math.min(6, e.size/4);
          const dirX = target.x - e.x, dirY = target.y - e.y;
          const mag = Math.hypot(dirX, dirY) || 1;
          const eyeOffset = Math.min(insideRadius, Math.max(2, insideRadius * 0.8));
          const eyeX = e.x + (dirX / mag) * eyeOffset;
          const eyeY = e.y + (dirY / mag) * eyeOffset;
          ctx.beginPath();
          ctx.fillStyle = "rgba(160,200,255,0.95)";
          ctx.arc(eyeX, eyeY, 5, 0, Math.PI*2);
          ctx.fill();
        }
      } catch (err) {}
    }
    else if (e.type === "triangle") { 
      ctx.shadowBlur = 15;
      ctx.shadowColor = "cyan";
      ctx.fillStyle = "cyan"; 
      ctx.beginPath(); 
      ctx.moveTo(e.x, e.y-e.size/2); 
      ctx.lineTo(e.x-e.size/2, e.y+e.size/2); 
      ctx.lineTo(e.x+e.size/2, e.y+e.size/2); 
      ctx.closePath(); 
      ctx.fill();
      ctx.shadowBlur = 0;
      
      const pulse = Math.sin(frameCount * 0.08 + e.x) * 0.4 + 0.6;
      ctx.strokeStyle = `rgba(100,255,255,${pulse})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); 
      ctx.moveTo(e.x, e.y-e.size/2); 
      ctx.lineTo(e.x-e.size/2, e.y+e.size/2); 
      ctx.lineTo(e.x+e.size/2, e.y+e.size/2); 
      ctx.closePath(); 
      ctx.stroke();

      try {
        const fireRate = 100;
        const chargeTime = 30;
        const chargeStart = Math.max(0, fireRate - chargeTime);
        const st = e.shootTimer || 0;
        if (st > chargeStart) {
          const progress = Math.min(1, (st - chargeStart) / chargeTime);
          const cx = e.x, cy = e.y;
          const tx = e.x, ty = e.y - e.size/2;
          const dotX = cx + (tx - cx) * progress;
          const dotY = cy + (ty - cy) * progress;
          ctx.beginPath();
          ctx.fillStyle = `rgba(255,50,50,${0.4 + progress*0.6})`;
          const r = 3 + progress * 4;
          ctx.arc(dotX, dotY, r, 0, Math.PI*2);
          ctx.fill();
          if (progress >= 1) {
            ctx.beginPath();
            ctx.fillStyle = "rgba(255,80,80,0.6)";
            ctx.arc(tx, ty, 6, 0, Math.PI*2);
            ctx.fill();
          }
        }
      } catch (err) {}
    }
    else if (e.type === "boss") { 
      const pulse = Math.sin(frameCount * 0.05) * 10 + e.size/2;
      ctx.shadowBlur = 30;
      ctx.shadowColor = "yellow";
      ctx.fillStyle = "yellow"; 
      ctx.beginPath(); 
      ctx.arc(e.x, e.y, pulse, 0, Math.PI*2); 
      ctx.fill();
      ctx.shadowBlur = 0;
      
      ctx.strokeStyle = "rgba(255,255,0,0.5)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(e.x, e.y, pulse + 10, 0, Math.PI*2);
      ctx.stroke();
    }
    else if (e.type === "mini-boss") { 
      const pulse = Math.sin(frameCount * 0.07) * 5 + e.size/2;
      ctx.shadowBlur = 25;
      ctx.shadowColor = "orange";
      ctx.fillStyle = "orange"; 
      ctx.beginPath(); 
      ctx.arc(e.x, e.y, pulse, 0, Math.PI*2); 
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    else if (e.type === "reflector") {
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.rotate(e.angle||0);
      
      if (e.shieldActive) {
        ctx.shadowBlur = 20;
        ctx.shadowColor = "purple";
      }
      ctx.fillStyle = e.shieldActive ? "rgba(138,43,226,0.8)" : "purple";
      ctx.fillRect(-e.width/2, -e.height/2, e.width, e.height);
      ctx.shadowBlur = 0;
      
      if (e.shieldActive) {
        const shieldPulse = Math.sin(frameCount * 0.1) * 5 + 60;
        ctx.strokeStyle = `rgba(138,43,226,${0.5 + Math.sin(frameCount * 0.1) * 0.3})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, shieldPulse, 0, Math.PI*2);
        ctx.stroke();
      }
      ctx.restore();
    }
    else if (e.type === "mother-core") {
      // Draw main core
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.rotate(e.angle);
      
      const glowIntensity = Math.sin(frameCount * 0.05) * 0.3 + 0.7;
      ctx.shadowBlur = 50;
      ctx.shadowColor = "rgba(0,200,255,0.8)";
      ctx.strokeStyle = `rgba(0,150,255,${glowIntensity})`;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(0, -e.size/2);
      ctx.lineTo(e.size/2, 0);
      ctx.lineTo(0, e.size/2);
      ctx.lineTo(-e.size/2, 0);
      ctx.closePath();
      ctx.fillStyle = "rgba(20,40,80,0.9)";
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.restore();
      
      // Draw rotating cores
      e.cores.forEach(core => {
        ctx.save();
        ctx.shadowBlur = 20;
        ctx.shadowColor = "cyan";
        ctx.fillStyle = "cyan";
        ctx.beginPath();
        ctx.arc(core.x, core.y, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();
      });
      
      // Health bar
      const barWidth = e.size;
      const barHeight = 10;
      ctx.fillStyle = "rgba(50,50,50,0.8)";
      ctx.fillRect(e.x - barWidth/2, e.y - e.size/2 - 30, barWidth, barHeight);
      ctx.fillStyle = "red";
      ctx.fillRect(e.x - barWidth/2, e.y - e.size/2 - 30, barWidth * (e.health / e.maxHealth), barHeight);
    }
  });
}

function drawTanks() {
  tanks.forEach(tank => {
    ctx.save();
    ctx.translate(tank.x, tank.y);
    
    // Tank body
    ctx.fillStyle = "rgba(100,100,100,0.9)";
    ctx.fillRect(-tank.width/2, -tank.height/2, tank.width, tank.height);
    
    // Turret
    ctx.rotate(tank.turretAngle);
    ctx.fillStyle = "rgba(80,80,80,0.9)";
    ctx.fillRect(0, -5, 25, 10);
    
    ctx.restore();
  });
}

function drawWalkers() {
  walkers.forEach(walker => {
    ctx.save();
    ctx.translate(walker.x, walker.y);
    
    // Body
    ctx.fillStyle = "rgba(120,120,150,0.9)";
    ctx.fillRect(-walker.width/2, -walker.height/2, walker.width, walker.height/2);
    
    // Legs
    const legOffset = Math.sin(walker.legPhase) * 10;
    ctx.strokeStyle = "rgba(100,100,130,0.9)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-10, walker.height/4);
    ctx.lineTo(-10 + legOffset, walker.height/2 + 10);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(10, walker.height/4);
    ctx.lineTo(10 - legOffset, walker.height/2 + 10);
    ctx.stroke();
    
    ctx.restore();
  });
}

function drawMechs() {
  mechs.forEach(mech => {
    ctx.save();
    ctx.translate(mech.x, mech.y);
    
    // Shield
    if (mech.shieldActive) {
      const pulse = Math.sin(frameCount * 0.1) * 5;
      ctx.strokeStyle = "rgba(100,200,255,0.6)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, mech.size/2 + 15 + pulse, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    // Body
    ctx.fillStyle = "rgba(150,50,50,0.9)";
    ctx.beginPath();
    ctx.arc(0, 0, mech.size/2, 0, Math.PI * 2);
    ctx.fill();
    
    // Weapons
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + frameCount * 0.02;
      ctx.fillStyle = "rgba(200,100,100,0.9)";
      ctx.fillRect(Math.cos(angle) * 30 - 3, Math.sin(angle) * 30 - 3, 6, 6);
    }
    
    ctx.restore();
  });
}

function drawDebris() {
  debris.forEach(d => {
    const alpha = d.life / d.maxLife;
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.rotate(d.rotation);
    ctx.fillStyle = `rgba(150,150,150,${alpha})`;
    ctx.fillRect(-d.size/2, -d.size/2, d.size, d.size);
    ctx.restore();
  });
}

function drawDiamonds() {
  diamonds.forEach(d => {
    ctx.save(); 
    ctx.translate(d.x, d.y); 
    ctx.rotate(d.angle||0);
    
    // Graviton pull visual effect
    if (d.gravitonActive && d.gravitonCharge < 600) {
      const pullIntensity = d.gravitonCharge / 600;
      ctx.strokeStyle = `rgba(100,200,255,${pullIntensity * 0.5})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, d.size/2 + 60 + Math.sin(frameCount * 0.1) * 20, 0, Math.PI * 2);
      ctx.stroke();
      
      // Inner rings
      ctx.strokeStyle = `rgba(150,220,255,${pullIntensity * 0.3})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, d.size/2 + 30, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    // Vulnerable state glow
    if (d.vulnerable) {
      const vulnPulse = Math.sin(frameCount * 0.2) * 0.3 + 0.7;
      ctx.shadowBlur = 40;
      ctx.shadowColor = `rgba(255,100,100,${vulnPulse})`;
    }
    
    const glowIntensity = Math.sin(frameCount * 0.05) * 0.3 + 0.7;
    ctx.shadowBlur = d.vulnerable ? 40 : 30;
    ctx.shadowColor = d.canReflect ? "cyan" : (d.vulnerable ? "red" : "white");
    ctx.strokeStyle = d.canReflect ? `rgba(0,255,255,${glowIntensity})` : (d.vulnerable ? `rgba(255,100,100,${glowIntensity})` : `rgba(255,255,255,${glowIntensity})`);
    ctx.lineWidth = 3;
    ctx.beginPath(); 
    ctx.moveTo(0, -d.size/2 - d.pulse); 
    ctx.lineTo(d.size/2 + d.pulse, 0); 
    ctx.lineTo(0, d.size/2 + d.pulse); 
    ctx.lineTo(-d.size/2 - d.pulse, 0); 
    ctx.closePath(); 
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();
    
    d.attachments.forEach(a => {
      if (a.type === "triangle") {
        ctx.fillStyle = "cyan";
        ctx.beginPath(); 
        ctx.moveTo(a.x, a.y-(a.size||20)/2); 
        ctx.lineTo(a.x-(a.size||20)/2, a.y+(a.size||20)/2); 
        ctx.lineTo(a.x+(a.size||20)/2, a.y+(a.size||20)/2); 
        ctx.closePath(); 
        ctx.fill();
      }
      else if (a.type === "reflector") {
        ctx.save(); 
        ctx.translate(a.x, a.y); 
        ctx.rotate(a.orbitAngle||0); 
        ctx.fillStyle = "magenta"; 
        ctx.fillRect(-(a.width||20)/2, -(a.height||10)/2, a.width||20, a.height||10); 
        ctx.restore();
      }
      else {
        ctx.fillStyle = "lime"; 
        ctx.fillRect(a.x-(a.size||20)/2, a.y-(a.size||20)/2, a.size||20, a.size||20);
      }
    });
  });
}

function drawLightning() { 
  lightning.forEach(l => {
    ctx.shadowBlur = 8;
    ctx.shadowColor = "cyan";
    ctx.fillStyle = "cyan"; 
    ctx.fillRect(l.x-(l.size||6)/2, l.y-(l.size||6)/2, l.size||6, l.size||6);
    ctx.shadowBlur = 0;
  });
}

function drawExplosions(){ 
  explosions.forEach(ex => { 
    ctx.fillStyle = ex.color; 
    ctx.beginPath(); 
    ctx.arc(ex.x, ex.y, ex.radius, 0, Math.PI*2); 
    ctx.fill(); 
  }); 
}

function drawTunnels() { 
  tunnels.forEach(t => { 
    if (t.active) { 
      ctx.fillStyle = "rgba(0,255,255,0.5)"; 
      ctx.fillRect(t.x, t.y, t.width, t.height); 
    }
  }); 
}

function drawPowerUps() {
  powerUps.forEach(p => {
    ctx.save(); 
    ctx.translate(p.x, p.y);
    
    const pulse = Math.sin(frameCount * 0.1) * 0.3 + 0.7;
    ctx.shadowBlur = 15 * pulse;
    
    if (p.type === "red-punch") {
      ctx.shadowColor = "red";
      ctx.fillStyle = "red";
      ctx.beginPath(); 
      ctx.arc(0, 0, p.size/2, 0, Math.PI*2); 
      ctx.fill();
      ctx.fillStyle = "white"; 
      ctx.fillRect(-2, -6, 4, 4);
    }
    else if (p.type === "blue-cannon") {
      ctx.shadowColor = "cyan";
      ctx.fillStyle = "cyan";
      ctx.beginPath(); 
      ctx.arc(0, 0, p.size/2, 0, Math.PI*2); 
      ctx.fill();
      ctx.fillStyle = "white"; 
      ctx.fillRect(-2, -6, 4, 4);
    }
    else if (p.type === "health") {
      ctx.shadowColor = "magenta";
      ctx.fillStyle = "magenta";
      ctx.beginPath(); 
      ctx.arc(0, 0, p.size/2, 0, Math.PI*2); 
      ctx.fill();
      ctx.fillStyle = "white"; 
      ctx.fillRect(-2, -6, 4, 4);
    }
    else if (p.type === "reflect") {
      ctx.shadowColor = "purple";
      ctx.fillStyle = "purple";
      ctx.beginPath(); 
      ctx.arc(0, 0, p.size/2, 0, Math.PI*2); 
      ctx.fill();
      ctx.strokeStyle = "cyan";
      ctx.lineWidth = 2;
      ctx.beginPath(); 
      ctx.arc(0, 0, p.size/2 + 4, 0, Math.PI*2); 
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    ctx.restore();
  });
}

function drawGoldStar() {
  if (!goldStar.alive) return;
  if (goldStar.collecting) {
    const progress = 1 - (goldStar.collectTimer / GOLD_STAR_PICKUP_FRAMES);
    const maxRadius = goldStar.size/2 + 18;
    const currentRadius = goldStar.size/2 + 10 + (progress * 8);
    ctx.strokeStyle = `rgba(255, 255, 0, ${progress})`;
    ctx.lineWidth = 3 * progress;
    ctx.beginPath(); 
    ctx.arc(goldStar.x, goldStar.y, currentRadius, 0, Math.PI*2); 
    ctx.stroke();
  }
  ctx.save(); 
  ctx.translate(goldStar.x, goldStar.y); 
  ctx.fillStyle = "gold";
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const angle = (i*4*Math.PI)/5 - Math.PI/2;
    const radius = i%2===0 ? goldStar.size/2 : goldStar.size/4;
    const x = Math.cos(angle)*radius, y = Math.sin(angle)*radius;
    if (i === 0) ctx.moveTo(x,y); 
    else ctx.lineTo(x,y);
  }
  ctx.closePath(); 
  ctx.fill();
  ctx.restore();
  
  const barWidth = 50; 
  ctx.fillStyle = "gray"; 
  ctx.fillRect(goldStar.x-barWidth/2, goldStar.y-goldStar.size-10, barWidth, 5);
  ctx.fillStyle = "gold"; 
  ctx.fillRect(goldStar.x-barWidth/2, goldStar.y-goldStar.size-10, barWidth*(goldStar.health/goldStar.maxHealth), 5);

  if (goldStar.reflectAvailable) {
    ctx.strokeStyle = "cyan";
    ctx.lineWidth = 2;
    ctx.beginPath(); 
    ctx.arc(goldStar.x, goldStar.y, goldStar.size/2 + 14, 0, Math.PI*2); 
    ctx.stroke();
  }
}

function drawRedPunchEffects() {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  redPunchEffects.forEach(e => {
    const lifeFactor = Math.max(0, e.life / e.maxLife);
    if (e.fill) {
      ctx.beginPath();
      ctx.fillStyle = e.color;
      ctx.globalAlpha = lifeFactor * 0.9;
      ctx.arc(e.x, e.y, Math.max(2, e.r), 0, Math.PI*2);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else {
      ctx.beginPath();
      ctx.strokeStyle = e.color;
      ctx.lineWidth = 6 * lifeFactor;
      ctx.arc(e.x, e.y, Math.max(2, e.r), 0, Math.PI*2);
      ctx.stroke();
    }
  });
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = r || 6;
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawUI() {
  const pad = 12;
  const hudW = 260;
  const hudH = 84;
  const x = pad;
  const y = pad;

  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.shadowColor = "rgba(0,255,255,0.08)";
  ctx.shadowBlur = 18;
  ctx.fillStyle = "rgba(10,14,20,0.6)";
  roundRect(ctx, x, y, hudW, hudH, 10);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = "rgba(0,255,255,0.12)";
  ctx.lineWidth = 1;
  roundRect(ctx, x+0.5, y+0.5, hudW-1, hudH-1, 10);
  ctx.stroke();
  ctx.restore();

  ctx.font = "12px 'Orbitron', monospace";
  ctx.textBaseline = "top";

  const hbX = x + 12, hbY = y + 10, hbW = hudW - 24, hbH = 10;
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  roundRect(ctx, hbX, hbY, hbW, hbH, 6);
  ctx.fill();

  const healthRatio = Math.max(0, player.health / player.maxHealth);
  const grad = ctx.createLinearGradient(hbX, hbY, hbX+hbW, hbY);
  grad.addColorStop(0, "rgba(0,255,180,0.95)");
  grad.addColorStop(0.5, "rgba(0,200,255,0.95)");
  grad.addColorStop(1, "rgba(100,50,255,0.95)");

  ctx.save();
  ctx.shadowColor = "rgba(0,200,255,0.15)";
  ctx.shadowBlur = 8;
  ctx.fillStyle = grad;
  roundRect(ctx, hbX+1, hbY+1, (hbW-2) * healthRatio, hbH-2, 6);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = "rgba(220,230,255,0.95)";
  ctx.font = "11px 'Orbitron', monospace";
  ctx.fillText(`HP ${Math.floor(player.health)}/${player.maxHealth}`, hbX + 6, hbY - 14);

  ctx.fillStyle = "rgba(200,220,255,0.95)";
  ctx.font = "12px 'Orbitron', monospace";
  ctx.fillText(`SCORE: ${score}`, hbX, hbY + hbH + 10);
  ctx.fillText(`BEST: ${highScore}`, hbX + 100, hbY + hbH + 10);
  ctx.fillText(`WAVE: ${wave+1}`, hbX + 180, hbY + hbH + 10);

  const livesX = x + hudW - 12 - 18;
  const livesY = y + 12;
  for (let i = 0; i < 5; i++) {
    const cx = livesX - i * 14;
    ctx.beginPath();
    ctx.arc(cx, livesY, 5, 0, Math.PI*2);
    if (i < player.lives) {
      ctx.fillStyle = "rgba(255,120,80,0.98)";
      ctx.shadowColor = "rgba(255,80,40,0.35)";
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.shadowBlur = 0;
    } else {
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      ctx.fill();
    }
    ctx.closePath();
  }
  ctx.fillStyle = "rgba(180,200,255,0.8)";
  ctx.font = "10px 'Orbitron', monospace";
  ctx.fillText("LIVES", livesX - 3*14, livesY + 10);

  const badgeX = x + hudW - 62, badgeY = y + hudH - 26;
  roundRect(ctx, badgeX, badgeY, 50, 16, 6);
  ctx.fillStyle = player.reflectAvailable ? "rgba(0,220,255,0.08)" : "rgba(255,255,255,0.03)";
  ctx.fill();
  ctx.strokeStyle = player.reflectAvailable ? "rgba(0,220,255,0.35)" : "rgba(255,255,255,0.04)";
  ctx.lineWidth = 1;
  roundRect(ctx, badgeX + 0.5, badgeY + 0.5, 49, 15, 6);
  ctx.stroke();

  ctx.fillStyle = player.reflectAvailable ? "rgba(0,220,255,0.95)" : "rgba(180,200,255,0.35)";
  ctx.font = "11px 'Orbitron', monospace";
  ctx.fillText("REFLECT", badgeX + 6, badgeY + 2);

  const gsX = x + hudW + 12;
  const gsY = y + 8;
  ctx.save();
  ctx.fillStyle = "rgba(10,14,20,0.5)";
  roundRect(ctx, gsX, gsY, 150, 56, 8);
  ctx.fill();
  ctx.strokeStyle = "rgba(100,120,255,0.06)";
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = goldStar.alive ? "rgba(255,210,90,0.98)" : "rgba(255,100,100,0.9)";
  ctx.font = "12px 'Orbitron', monospace";
  ctx.fillText("GOLD STAR", gsX + 10, gsY + 6);

  const alX = gsX + 10, alY = gsY + 26;
  ctx.font = "10px 'Orbitron', monospace";
  ctx.fillStyle = "rgba(190,210,255,0.9)";
  ctx.fillText(`Aura Lv ${goldStarAura.level}`, alX, alY - 12);

  const barW = 110, barH = 8;
  ctx.fillStyle = "rgba(255,255,255,0.04)";
  roundRect(ctx, alX, alY, barW, barH, 6);
  ctx.fill();

  const fillRatio = Math.min(1, goldStarAura.level / 5);
  const auraGrad = ctx.createLinearGradient(alX, alY, alX + barW, alY);
  auraGrad.addColorStop(0, "rgba(255,220,100,0.9)");
  auraGrad.addColorStop(1, "rgba(255,100,40,0.9)");

  ctx.fillStyle = auraGrad;
  roundRect(ctx, alX + 1, alY + 1, (barW - 2) * fillRatio, barH - 2, 5);
  ctx.fill();

  ctx.fillStyle = "rgba(180,200,255,0.75)";
  ctx.font = "10px 'Orbitron', monospace";
  ctx.fillText(`R: ${Math.floor(goldStarAura.radius)}`, alX + barW - 38, alY - 12);

  let iconX = alX + barW + 8;
  const iconY = alY - 8;
  ctx.font = "10px 'Orbitron', monospace";
  if (goldStar.redPunchLevel > 0) {
    ctx.fillStyle = "red";
    ctx.fillRect(iconX, iconY, 12, 12);
    ctx.fillStyle = "rgba(220,230,255,0.95)";
    ctx.fillText(goldStar.redPunchLevel.toString(), iconX + 16, iconY + 1);
    iconX += 34;
  }
  if (goldStar.blueCannonnLevel > 0) {
    ctx.fillStyle = "cyan";
    ctx.beginPath();
    ctx.moveTo(iconX + 6, iconY);
    ctx.lineTo(iconX, iconY + 12);
    ctx.lineTo(iconX + 12, iconY + 12);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(220,230,255,0.95)";
    ctx.fillText(goldStar.blueCannonnLevel.toString(), iconX + 16, iconY + 1);
    iconX += 34;
  }

  if (waveTransition) {
    const bannerW = 320, bannerH = 48;
    const bx = (canvas.width - bannerW) / 2;
    const by = 22;
    ctx.save();
    ctx.fillStyle = "rgba(5,6,10,0.75)";
    roundRect(ctx, bx, by, bannerW, bannerH, 10);
    ctx.fill();

    ctx.strokeStyle = "rgba(0,200,255,0.14)";
    ctx.lineWidth = 1;
    roundRect(ctx, bx + 0.5, by + 0.5, bannerW - 1, bannerH - 1, 10);
    ctx.stroke();

    ctx.fillStyle = "rgba(200,230,255,0.96)";
    ctx.font = "14px 'Orbitron', monospace";
    ctx.fillText("WAVE CLEARED", bx + 18, by + 8);
    const timeRemaining = Math.ceil((WAVE_BREAK_MS - waveTransitionTimer * (1000/60)) / 1000);
    ctx.fillStyle = "rgba(160,200,255,0.86)";
    ctx.font = "12px 'Orbitron', monospace";
    ctx.fillText(`Next in ${timeRemaining}s`, bx + 18, by + 28);
    ctx.restore();
  }
}

const waves = [
  { enemies: [{ type: "red-square", count: 2 }] },
  { enemies: [{ type: "red-square", count: 3 }, { type: "triangle", count: 2 }] },
  { enemies: [{ type: "red-square", count: 5 }, { type: "triangle", count: 4 }] },
  { enemies: [{ type: "red-square", count: 3 }, { type: "triangle", count: 2 }, { type: "reflector", count: 1 }] },
  { tunnel: true, enemies: [{ type: "red-square", count: 5 }, { type: "triangle", count: 4 }, { type: "reflector", count: 1 }] },
  { enemies: [{ type: "boss", count: 1 }, { type: "triangle", count: 3 }] },
  { enemies: [{ type: "reflector", count: 2 }, { type: "triangle", count: 5 }] },
  { tunnel: true, enemies: [{ type: "red-square", count: 5 }, { type: "triangle", count: 5 }, { type: "reflector", count: 1 }, { type: "mini-boss", count: 1 }] },
  { enemies: [{ type: "mini-boss", count: 3 }, { type: "boss", count: 1 }, { type: "triangle", count: 5 }, { type: "reflector", count: 1 }] },
  { tunnel: true, enemies: [{ type: "triangle", count: 8 }, { type: "reflector", count: 3 }] },
  { enemies: [{ type: "red-square", count: 5 }, { type: "triangle", count: 5 }, { type: "reflector", count: 3 }, { type: "diamond", count: 1 }] },
  // Wave 12: Atmospheric Entry
  { 
    theme: "atmospheric-entry",
    enemies: [{ type: "red-square", count: 8 }, { type: "triangle", count: 6 }]
  },
  // Wave 13: Cloud Combat
  {
    theme: "cloud-combat",
    clouds: true,
    enemies: [{ type: "triangle", count: 10 }, { type: "reflector", count: 2 }]
  },
  // Wave 14: Descent to City
  {
    theme: "city-descent",
    enemies: [{ type: "red-square", count: 6 }, { type: "triangle", count: 6 }, { type: "tank", count: 2 }]
  },
  // Wave 15: Ruined City
  {
    theme: "ruined-city",
    enemies: [{ type: "tank", count: 4 }, { type: "walker", count: 3 }, { type: "mech", count: 1 }]
  },
  // Wave 16: Siege Defense
  {
    theme: "siege-defense",
    enemies: [{ type: "tank", count: 3 }, { type: "walker", count: 4 }, { type: "mech", count: 2 }, { type: "triangle", count: 5 }]
  },
  // Wave 17: Calm Before the Storm
  {
    theme: "calm",
    enemies: [{ type: "reflector", count: 3 }, { type: "triangle", count: 4 }]
  },
  // Wave 18: Counter-Offensive Begins
  {
    theme: "counter-offensive",
    enemies: [{ type: "red-square", count: 10 }, { type: "triangle", count: 10 }, { type: "tank", count: 5 }, { type: "walker", count: 3 }]
  },
  // Wave 19: Full Assault
  {
    theme: "full-assault",
    enemies: [{ type: "tank", count: 6 }, { type: "walker", count: 6 }, { type: "mech", count: 3 }, { type: "mini-boss", count: 2 }]
  },
  // Wave 20: The Last Stand
  {
    theme: "last-stand",
    enemies: [{ type: "red-square", count: 15 }, { type: "triangle", count: 15 }, { type: "tank", count: 5 }, { type: "walker", count: 5 }, { type: "mech", count: 4 }, { type: "boss", count: 1 }]
  },
  // Wave 21: MOTHER CORE
  {
    theme: "mother-core",
    enemies: [{ type: "mother-core", count: 1 }, { type: "triangle", count: 8 }, { type: "reflector", count: 4 }]
  }
];

function spawnWave(waveIndex) {
  if (waveIndex < 0 || waveIndex >= waves.length) return;
  const waveData = waves[waveIndex];
  
  // Handle special themes
  if (waveData.theme === "cloud-combat" || waveData.clouds) {
    spawnCloudParticles(50);
  }
  
  if (waveData.tunnel) spawnTunnel();
  if (waveData.enemies) {
    waveData.enemies.forEach(group => {
      if (group.type === "red-square") spawnRedSquares(group.count);
      else if (group.type === "triangle") spawnTriangles(group.count);
      else if (group.type === "reflector") spawnReflectors(group.count);
      else if (group.type === "boss") for (let i = 0; i < group.count; i++) spawnBoss();
      else if (group.type === "mini-boss") for (let i = 0; i < group.count; i++) spawnMiniBoss();
      else if (group.type === "diamond") for (let i = 0; i < group.count; i++) spawnDiamondEnemy();
      else if (group.type === "tank") spawnTank(group.count);
      else if (group.type === "walker") spawnWalker(group.count);
      else if (group.type === "mech") spawnMech(group.count);
      else if (group.type === "mother-core") spawnMotherCore();
    });
  }
}

function tryAdvanceWave() {
  const allEnemiesClear = enemies.length === 0 && diamonds.length === 0 && tunnels.length === 0 && 
                          tanks.length === 0 && walkers.length === 0 && mechs.length === 0;
  
  if (allEnemiesClear && !waveTransition) {
    bullets = [];
    lightning = [];

    if (wave >= waves.length-1) { 
      waveTransition = true; 
      waveTransitionTimer = 0; 
      return; 
    }
    waveTransition = true;
    waveTransitionTimer = 0;
  }

  if (waveTransition) {
    waveTransitionTimer++;
    if (waveTransitionTimer >= WAVE_BREAK_MS / (1000/60)) {
      wave++;
      if (wave < waves.length) {
        spawnWave(wave);
      }
      waveTransition = false;
      waveTransitionTimer = 0;
    }
  }
}

function updateAndDrawReflectionEffects() {
  for (let i = reflectionEffects.length - 1; i >= 0; i--) {
    const r = reflectionEffects[i];
    r.life--;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = "rgba(180,240,255," + (r.life / (r.maxLife || 20)) + ")";
    ctx.beginPath();
    ctx.arc(r.x, r.y, Math.max(1, r.life / 3), 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
    if (r.life <= 0) reflectionEffects.splice(i, 1);
  }
}

function gameLoop(now) {
  if (cinematic.playing) return;

  frameCount++;

  updatePlayerMovement();
  handleShooting();
  updateBullets();
  updateLightning();
  updateExplosions();
  updatePowerUps();
  updateTunnels();
  updateRedPunchEffects();
  updateGoldStarAura();
  updateGoldStar();
  updateEnemies();
  updateDebris();
  updateCloudParticles();
  checkBulletCollisions();
  tryAdvanceWave();

  if (player.health <= 0) {
    player.lives--;
    if (player.lives > 0) {
      respawnPlayer();
    } else {
      gameOver = true;
      saveHighScoresOnGameOver();
    }
  }

  if (!ensureCanvas()) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawBackground(wave);
  drawTunnels();
  drawDiamonds();
  drawEnemies();
  drawTanks();
  drawWalkers();
  drawMechs();
  drawDebris();
  drawBullets();
  drawLightning();
  drawExplosions();
  drawPowerUps();
  drawGoldStar();
  drawGoldStarAura(ctx);
  drawRedPunchEffects();
  drawPlayer();
  updateAndDrawReflectionEffects();
  drawUI();

  if (gameOver) {
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";
    ctx.font = "48px Arial";
    ctx.textAlign = "center";
    ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 20);
    ctx.font = "20px Arial";
    ctx.fillText("Press R to restart", canvas.width / 2, canvas.height / 2 + 30);
    ctx.restore();
    return;
  }

  requestAnimationFrame(gameLoop);
}

function spawnPowerUp(x, y, type) {
  powerUps.push({x, y, type, size: 18, lifetime: 600, active: true});
}

function updateTanks() {
  // Tanks are constrained to the bottom area. They only move horizontally towards player.
  const groundY = canvas.height - 20; // baseline for bottom
  for (let i = tanks.length - 1; i >= 0; i--) {
    const tank = tanks[i];

    // Move horizontally toward player's x (stay at groundY)
    const dx = player.x - tank.x;
    const distX = Math.abs(dx) || 1;
    const dirX = dx / distX;
    tank.x += dirX * tank.speed;

    // Keep tanks on bottom
    tank.y = Math.max(tank.height/2 + 6, canvas.height - tank.height/2 - 10);

    tank.turretAngle = Math.atan2(player.y - tank.y, player.x - tank.x);

    tank.shootTimer = (tank.shootTimer || 0) + 1;
    if (tank.shootTimer > 120) {
      tank.shootTimer = 0;
      lightning.push({
        x: tank.x,
        y: tank.y,
        dx: Math.cos(tank.turretAngle) * 4,
        dy: Math.sin(tank.turretAngle) * 4,
        size: 8,
        damage: 20
      });
    }
    
    if (tank.health <= 0) {
      createExplosion(tank.x, tank.y, "orange");
      spawnDebris(tank.x, tank.y, 8);
      tanks.splice(i, 1);
      score += 30;
      spawnPowerUp(tank.x, tank.y, Math.random() > 0.5 ? "red-punch" : "blue-cannon");
    }
  }
}

function updateWalkers() {
  // Walkers constrained to bottom; they can still shoot but will stay on the ground row.
  const groundY = canvas.height - 30;
  for (let i = walkers.length - 1; i >= 0; i--) {
    const walker = walkers[i];
    
    // Move mainly horizontally toward player's x; slight vertical bobbing only
    const dx = player.x - walker.x;
    const distX = Math.abs(dx) || 1;
    const dirX = dx / distX;
    walker.x += dirX * walker.speed;

    // small bobbing
    walker.legPhase = (walker.legPhase || 0) + 0.15;
    walker.y = Math.max(walker.height/2 + 6, canvas.height - walker.height/2 - 6 + Math.sin(walker.legPhase) * 2);

    walker.shootTimer = (walker.shootTimer || 0) + 1;
    if (walker.shootTimer > 90) {
      walker.shootTimer = 0;
      for (let j = -1; j <= 1; j++) {
        const angle = Math.atan2(player.y - walker.y, player.x - walker.x) + j * 0.2;
        lightning.push({
          x: walker.x,
          y: walker.y,
          dx: Math.cos(angle) * 5,
          dy: Math.sin(angle) * 5,
          size: 6,
          damage: 15
        });
      }
    }
    
    if (walker.health <= 0) {
      createExplosion(walker.x, walker.y, "cyan");
      spawnDebris(walker.x, walker.y, 10);
      walkers.splice(i, 1);
      score += 40;
      spawnPowerUp(walker.x, walker.y, "health");
    }
  }
}

function updateMechs() {
  for (let i = mechs.length - 1; i >= 0; i--) {
    const mech = mechs[i];
    
    const dx = player.x - mech.x;
    const dy = player.y - mech.y;
    const dist = Math.hypot(dx, dy) || 1;
    
    mech.x += (dx / dist) * mech.speed;
    mech.y += (dy / dist) * mech.speed;
    
    mech.shootTimer = (mech.shootTimer || 0) + 1;
    if (mech.shootTimer > 60) {
      mech.shootTimer = 0;
      const angles = [0, Math.PI/4, Math.PI/2, 3*Math.PI/4, Math.PI, -3*Math.PI/4, -Math.PI/2, -Math.PI/4];
      angles.forEach(angle => {
        lightning.push({
          x: mech.x,
          y: mech.y,
          dx: Math.cos(angle) * 6,
          dy: Math.sin(angle) * 6,
          size: 8,
          damage: 25
        });
      });
    }
    
    if (mech.health <= 0) {
      createExplosion(mech.x, mech.y, "yellow");
      spawnDebris(mech.x, mech.y, 15);
      mechs.splice(i, 1);
      score += 60;
      spawnPowerUp(mech.x, mech.y, "reflect");
      spawnPowerUp(mech.x, mech.y, "health");
    }
  }
}

function updateMotherCore(core) {
  core.angle = (core.angle || 0) + 0.005;
  
  core.phaseTimer = (core.phaseTimer || 0) + 1;
  
  // Phase transitions
  if (core.health < core.maxHealth * 0.66 && core.phase === 1) {
    core.phase = 2;
    createExplosion(core.x, core.y, "white");
  }
  if (core.health < core.maxHealth * 0.33 && core.phase === 2) {
    core.phase = 3;
    createExplosion(core.x, core.y, "red");
  }
  
  // Update rotating cores
  core.cores.forEach((c, idx) => {
    c.angle += 0.02;
    const x = core.x + Math.cos(c.angle) * c.distance;
    const y = core.y + Math.sin(c.angle) * c.distance;
    c.x = x;
    c.y = y;
  });
  
  core.shootTimer = (core.shootTimer || 0) + 1;
  
  // Phase 1: Basic attacks
  if (core.phase === 1 && core.shootTimer > 100) {
    core.shootTimer = 0;
    const dx = player.x - core.x;
    const dy = player.y - core.y;
    const mag = Math.hypot(dx, dy) || 1;
    lightning.push({
      x: core.x,
      y: core.y,
      dx: (dx / mag) * 6,
      dy: (dy / mag) * 6,
      size: 10,
      damage: 30
    });
  }
  
  // Phase 2: Spiral attacks
  if (core.phase === 2 && core.shootTimer > 60) {
    core.shootTimer = 0;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + core.angle;
      lightning.push({
        x: core.x,
        y: core.y,
        dx: Math.cos(angle) * 7,
        dy: Math.sin(angle) * 7,
        size: 8,
        damage: 25
      });
    }
  }
  
  // Phase 3: Chaos mode
  if (core.phase === 3 && core.shootTimer > 40) {
    core.shootTimer = 0;
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      lightning.push({
        x: core.x + Math.cos(angle) * 80,
        y: core.y + Math.sin(angle) * 80,
        dx: Math.cos(angle) * 8,
        dy: Math.sin(angle) * 8,
        size: 10,
        damage: 35
      });
    }
  }
  
  // Spawn minions periodically
  if (core.phaseTimer % 300 === 0) {
    spawnRedSquares(2, true);
    spawnTriangles(2, true);
  }
}

function updateEnemies() {
  if (player.invulnerable) { player.invulnerableTimer--; if (player.invulnerableTimer <= 0) player.invulnerable = false; }

  for (let di = diamonds.length-1; di >= 0; di--) {
    const d = diamonds[di];
    updateDiamond(d);
    if (d.health <= 0) {
      createExplosion(d.x, d.y, "white");
      d.attachments.forEach(a => { a.attachedTo = null; enemies.push(a); });
      diamonds.splice(di,1);
      score += 200;
    }
  }

  enemies = enemies.filter(e => {
    if (!e) return false;
    if (e.type === "boss") { updateBoss(e); return e.health > 0; }
    if (e.type === "mini-boss") { updateMiniBoss(e); return e.health > 0; }
    if (e.type === "mother-core") { updateMotherCore(e); return e.health > 0; }

    if (e.type === "triangle" || e.type === "red-square") {
      const dx = player.x - e.x, dy = player.y - e.y, dist = Math.hypot(dx,dy)||1;
      e.x += (dx/dist)*e.speed; e.y += (dy/dist)*e.speed;
      if (e.type === "triangle") {
        e.shootTimer = (e.shootTimer||0) + 1;
        if (e.shootTimer > 100) { e.shootTimer = 0; lightning.push({x: e.x, y: e.y, dx: (dx/dist)*5, dy: (dy/dist)*5, size:6, damage:15}); }
      }
      const distToPlayer = Math.hypot(e.x-player.x, e.y-player.y);
      if (distToPlayer < (e.size/2 + player.size/2)) {
        if (!player.invulnerable) player.health -= (e.type === "triangle" ? 25 : 15);
        createExplosion(e.x, e.y, "red");
        e.health -= 100;
      }
      const distToGoldStar = Math.hypot(e.x-goldStar.x, e.y-goldStar.y);
      if (goldStar.alive && distToGoldStar < (e.size/2 + goldStar.size/2)) {
        goldStar.health -= (e.type === "triangle" ? 20 : 12);
        createExplosion(e.x, e.y, "orange");
        if (goldStar.health <= 0) { goldStar.alive = false; goldStar.respawnTimer = 0; createExplosion(goldStar.x, goldStar.y, "gold"); }
      }
      if (e.health <= 0) {
        if (!e.fromBoss) {
          if (e.type === "triangle") { score += 10; spawnPowerUp(e.x, e.y, "blue-cannon"); }
          else if (e.type === "red-square") { score += 10; spawnPowerUp(e.x, e.y, "red-punch"); }
        }
        return false;
      }
      return true;
    }

    if (e.type === "reflector") {
      let nearestAlly = null, minDist = Infinity;
      enemies.forEach(ally => {
        if (ally !== e && ally.type !== "reflector") {
          const dist = Math.hypot(ally.x - e.x, ally.y - e.y);
          if (dist < minDist && dist < 150) { minDist = dist; nearestAlly = ally; }
        }
      });

      if (nearestAlly) {
        const dx = nearestAlly.x - e.x, dy = nearestAlly.y - e.y, dist = Math.hypot(dx,dy)||1;
        e.x += (dx/dist) * e.speed;
        e.y += (dy/dist) * e.speed;
        e.shieldActive = true;
      } else {
        const dx = player.x - e.x, dy = player.y - e.y, dist = Math.hypot(dx,dy)||1;
        e.x += (dx/dist) * e.speed * 0.5;
        e.y += (dy/dist) * e.speed * 0.5;
        e.shieldActive = false;
      }

      e.angle = (e.angle||0)+0.1;

      for (let bi = bullets.length-1; bi >= 0; bi--) {
        const b = bullets[bi];
        const dist = Math.hypot(b.x - e.x, b.y - e.y);
        if (dist < 50) {
          lightning.push({x: b.x, y: b.y, dx: -b.dx, dy: -b.dy, size: 6, damage: 15});
          reflectionEffects.push({x: b.x, y: b.y, dx: -b.dx, dy: -b.dy, life: 24, maxLife: 24});
          bullets.splice(bi,1);
          e.health -= 5;
        }
      }

      if (e.health <= 0) {
        createExplosion(e.x, e.y, "purple");
        if (!e.fromBoss) { score += 20; spawnPowerUp(e.x, e.y, "health"); spawnPowerUp(e.x, e.y, "reflect"); }
        return false;
      }

      const distToPlayer = Math.hypot(e.x-player.x, e.y-player.y);
      if (distToPlayer < 30) { if (!player.invulnerable) player.health -= 15; createExplosion(e.x, e.y, "magenta"); e.health -= 50; }
      const distToGoldStar = Math.hypot(e.x-goldStar.x, e.y-goldStar.y);
      if (goldStar.alive && distToGoldStar < 30) {
        goldStar.health -= 15; createExplosion(e.x, e.y, "magenta");
        if (goldStar.health <= 0) { goldStar.alive = false; goldStar.respawnTimer = 0; createExplosion(goldStar.x, goldStar.y, "gold"); }
      }

      return true;
    }

    return true;
  });

  updateTanks();
  updateWalkers();
  updateMechs();

  if (minionsToAdd.length > 0) { enemies.push(...minionsToAdd); minionsToAdd = []; }
}

function updateLightning() {
  lightning = lightning.filter(l => {
    l.x += l.dx; l.y += l.dy;

    if (Math.hypot(l.x-player.x, l.y-player.y) < player.size/2) {
      if (player.reflectAvailable) {
        lightning.push({x: l.x, y: l.y, dx: -l.dx, dy: -l.dy, size: l.size || 6, damage: l.damage || 15});
        reflectionEffects.push({x: l.x, y: l.y, dx: -l.dx, dy: -l.dy, life: 18, maxLife: 18});
        player.reflectAvailable = false;
        createExplosion(player.x, player.y, "cyan");
        return false;
      } else {
        if (!player.invulnerable) player.health -= l.damage;
        return false;
      }
    }

    if (goldStar.alive && Math.hypot(l.x-goldStar.x, l.y-goldStar.y) < goldStar.size/2) {
      if (goldStar.reflectAvailable) {
        lightning.push({x: l.x, y: l.y, dx: -l.dx, dy: -l.dy, size: l.size || 6, damage: l.damage || 15});
        reflectionEffects.push({x: l.x, y: l.y, dx: -l.dx, dy: -l.dy, life: 18, maxLife: 18});
        goldStar.reflectAvailable = false;
        createExplosion(goldStar.x, goldStar.y, "cyan");
        return false;
      } else {
        goldStar.health -= l.damage;
        if (goldStar.health <= 0) { goldStar.alive = false; goldStar.respawnTimer = 0; createExplosion(goldStar.x, goldStar.y, "gold"); }
        return false;
      }
    }
    return l.x >= -20 && l.x <= canvas.width+20 && l.y >= -20 && l.y <= canvas.height+20;
  });
}

function checkBulletCollisions() {
  for (let bi = bullets.length-1; bi >= 0; bi--) {
    const b = bullets[bi];
    
    // Check collisions with tanks
    for (let ti = tanks.length - 1; ti >= 0; ti--) {
      const tank = tanks[ti];
      if (Math.hypot(b.x - tank.x, b.y - tank.y) < 30) {
        tank.health -= 10;
        bullets.splice(bi, 1);
        createExplosion(tank.x, tank.y, "orange");
        break;
      }
    }
    
    // Check collisions with walkers
    for (let wi = walkers.length - 1; wi >= 0; wi--) {
      const walker = walkers[wi];
      if (Math.hypot(b.x - walker.x, b.y - walker.y) < 25) {
        walker.health -= 10;
        bullets.splice(bi, 1);
        createExplosion(walker.x, walker.y, "cyan");
        break;
      }
    }
    
    // Check collisions with mechs
    for (let mi = mechs.length - 1; mi >= 0; mi--) {
      const mech = mechs[mi];
      if (Math.hypot(b.x - mech.x, b.y - mech.y) < 45) {
        if (mech.shieldActive && mech.shieldHealth > 0) {
          mech.shieldHealth -= 10;
          if (mech.shieldHealth <= 0) {
            mech.shieldActive = false;
          }
        } else {
          mech.health -= 10;
        }
        bullets.splice(bi, 1);
        createExplosion(mech.x, mech.y, "yellow");
        break;
      }
    }
    
    for (let ei = enemies.length-1; ei >= 0; ei--) {
      const e = enemies[ei]; if (!e) continue;
      
      if (e.type === "mother-core") {
        // Check collisions with rotating cores
        for (let ci = e.cores.length - 1; ci >= 0; ci--) {
          const core = e.cores[ci];
          if (Math.hypot(b.x - core.x, b.y - core.y) < 25) {
            core.health -= 10;
            bullets.splice(bi, 1);
            createExplosion(core.x, core.y, "cyan");
            if (core.health <= 0) {
              e.cores.splice(ci, 1);
              score += 50;
            }
            break;
          }
        }
        
        // Main core takes damage only if all small cores destroyed
        if (e.cores.length === 0 && Math.hypot(b.x - e.x, b.y - e.y) < e.size / 2) {
          e.health -= 15;
          bullets.splice(bi, 1);
          createExplosion(e.x, e.y, "red");
          if (e.health <= 0) {
            createExplosion(e.x, e.y, "white");
            enemies.splice(ei, 1);
            score += 500;
          }
          break;
        }
        continue;
      }
      
      if (e.type === "reflector") {
        const dx = b.x-e.x, dy = b.y-e.y, dist = Math.hypot(dx,dy);
        if (dist < Math.max(e.width,e.height)) {
          lightning.push({x: b.x, y: b.y, dx: -b.dx, dy: -b.dy, size: 6, damage: 15});
          reflectionEffects.push({x: b.x, y: b.y, dx: -b.dx, dy: -b.dy, life: 22, maxLife: 22});
          bullets.splice(bi,1); e.health -= 5;
          if (e.health <= 0) { createExplosion(e.x, e.y, "purple"); enemies.splice(ei,1); if (!e.fromBoss) { score += 20; spawnPowerUp(e.x, e.y, "health"); spawnPowerUp(e.x, e.y, "reflect"); } }
          break;
        }
      } else {
        if (Math.hypot(b.x-e.x, b.y-e.y) < (e.size||20)/2) {
          e.health -= (b.owner === "player" ? 10 : 6);
          bullets.splice(bi,1);
          if (e.health <= 0) {
            createExplosion(e.x, e.y, e.type === "triangle" ? "cyan" : e.type === "boss" ? "yellow" : e.type === "mini-boss" ? "orange" : "red");
            enemies.splice(ei,1);
            if (!e.fromBoss) {
              if (e.type === "boss") score += 100;
              else if (e.type === "mini-boss") score += 50;
              else if (e.type === "triangle") { score += 10; spawnPowerUp(e.x, e.y, "blue-cannon"); }
              else if (e.type === "red-square") { score += 10; spawnPowerUp(e.x, e.y, "red-punch"); }
            }
          }
          break;
        }
      }
    }

    for (let di = diamonds.length-1; di >= 0; di--) {
      const d = diamonds[di];
      for (let ai = d.attachments.length-1; ai >= 0; ai--) {
        const a = d.attachments[ai], radius = (a.size||20)/2 || 10;
        if (Math.hypot(b.x-a.x, b.y-a.y) < radius) {
          a.health = (a.health||30) - (b.owner === "player" ? 10 : 6); bullets.splice(bi,1);
          if (a.health <= 0) {
            createExplosion(a.x, a.y, "white");
            if (a.type === "reflector" && !a.fromBoss) {
              spawnPowerUp(a.x, a.y, "health");
              spawnPowerUp(a.x, a.y, "reflect");
              score += 20;
            }
            d.attachments.splice(ai,1);
            score += 5;
            if (!d.attachments.some(at => at.type === "reflector")) d.canReflect = false;
          }
          ai = -1;
        }
      }
      if (bi >= 0 && bi < bullets.length && Math.hypot(bullets[bi].x-d.x, bullets[bi].y-d.y) < d.size/2) {
        // Apply damage multiplier if vulnerable
        const damageMultiplier = d.vulnerable ? 1 : 0.3;
        d.health -= (bullets[bi].owner === "player" ? 12 : 6) * damageMultiplier;
        bullets.splice(bi,1);
        if (d.health <= 0) { createExplosion(d.x, d.y, "white"); d.attachments.forEach(a => enemies.push(a)); diamonds.splice(di,1); score += 100; }
        break;
      }
    }
  }
}

function handlePowerUpCollections() {
  return;
}

function drawBackground(waveNum) {
  // Different backgrounds for different wave themes
  if (waveNum >= 12 && waveNum <= 21) {
    // Atmospheric/Earth backgrounds
    if (waveNum === 12) {
      // Re-entry fire
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, "#1a0a0a");
      grad.addColorStop(0.5, "#4a1a0a");
      grad.addColorStop(1, "#8a3a1a");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Fire particles
      for (let i = 0; i < 30; i++) {
        const x = Math.random() * canvas.width;
        const y = (frameCount * 3 + i * 50) % canvas.height;
        ctx.fillStyle = `rgba(255,${100 + Math.random() * 100},0,${Math.random() * 0.5})`;
        ctx.fillRect(x, y, 3, 10);
      }
    } else if (waveNum === 13) {
      // Clouds
      ctx.fillStyle = "#6a8a9a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      drawClouds();
    } else if (waveNum >= 14 && waveNum <= 19) {
      // City/ground
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, "#2a2a3a");
      grad.addColorStop(1, "#4a3a2a");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      drawCityBackground();
    } else if (waveNum >= 20) {
      // Dark stormy night
      ctx.fillStyle = "#0a0a1a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      if (frameCount % 60 < 3) {
        ctx.fillStyle = `rgba(255,255,255,${(3 - frameCount % 60) / 3 * 0.3})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  } else {
    // Space background
    ctx.fillStyle = "#000814";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < 100; i++) {
      const x = (i * 137 + backgroundOffset) % canvas.width;
      const y = (i * 241) % canvas.height;
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.fillRect(x, y, 2, 2);
    }
  }
  
  backgroundOffset += 0.5;
}

function spawnTunnel() {
  const h = Math.floor(canvas.height / 3);
  const w = 600;
  // spawn top and bottom tunnels that move left across the screen
  tunnels.push({
    x: canvas.width + 20,
    y: 0,
    width: w,
    height: h,
    speed: 2,
    active: true,
    damageCooldown: 0
  }, {
    x: canvas.width + 20,
    y: canvas.height - h,
    width: w,
    height: h,
    speed: 2,
    active: true,
    damageCooldown: 0
  });
}

function createExplosion(x,y,color="red"){ 
  for (let i=0;i<20;i++) explosions.push({x, y, dx:(Math.random()-0.5)*6, dy:(Math.random()-0.5)*6, radius:Math.random()*4+2, color, life:30}); 
}

function handleShooting() {
  if (shootCooldown > 0) shootCooldown--;
  let dirX = 0, dirY = 0;
  if (keys["arrowup"]) dirY = -1; if (keys["arrowdown"]) dirY = 1;
  if (keys["arrowleft"]) dirX = -1; if (keys["arrowright"]) dirX = 1;
  if ((dirX !== 0 || dirY !== 0) && shootCooldown === 0) {
    const mag = Math.hypot(dirX, dirY) || 1;
    bullets.push({x: player.x, y: player.y, dx: (dirX/mag)*10, dy: (dirY/mag)*10, size: 6, owner: "player"});
    shootCooldown = Math.max(5, Math.floor(10 / player.fireRateBoost));
    
    firingIndicatorAngle += Math.PI / 2;
  }
}

function updatePlayerMovement() {
  let mx = 0, my = 0;
  if (keys["w"]) my = -1;
  if (keys["s"]) my = 1;
  if (keys["a"]) mx = -1;
  if (keys["d"]) mx = 1;
  const mag = Math.hypot(mx, my) || 0;
  if (mag > 0) {
    player.x += (mx / mag) * player.speed;
    player.y += (my / mag) * player.speed;
    player.x = Math.max(player.size/2, Math.min(canvas.width - player.size/2, player.x));
    player.y = Math.max(player.size/2, Math.min(canvas.height - player.size/2, player.y));
  }
}

function updateBullets() {
  bullets = bullets.filter(b => {
    b.x += b.dx; b.y += b.dy;
    return b.x >= -40 && b.x <= canvas.width+40 && b.y >= -40 && b.y <= canvas.height+40;
  });
}

function updatePowerUps() {
  powerUps = powerUps.filter(p => { p.lifetime--; return p.lifetime > 0; });
}

function updateTunnels() { 
  for (let i = tunnels.length-1; i >= 0; i--) { 
    const t = tunnels[i]; 
    if (!t.active) continue; 
    t.x -= t.speed; 
    if (t.x+t.width < -50) tunnels.splice(i,1);

    // player collision: if player intersects tunnel, damage player periodically
    if (t.damageCooldown > 0) t.damageCooldown--;
    if (player.x >= t.x && player.x <= t.x + t.width && player.y >= t.y && player.y <= t.y + t.height) {
      if (t.damageCooldown <= 0) {
        if (!player.invulnerable) {
          player.health -= 8; // damage per hit
          createExplosion(player.x, player.y, "cyan");
        }
        t.damageCooldown = 15; // cooldown frames before next damage
      }
    }
  }
}

function updateExplosions(){ 
  explosions = explosions.filter(ex => { 
    ex.x += ex.dx; 
    ex.y += ex.dy; 
    ex.life--; 
    return ex.life>0; 
  }); 
}

function updateRedPunchEffects() {
  for (let i = redPunchEffects.length-1; i >= 0; i--) {
    const e = redPunchEffects[i];
    e.life--;
    e.r = e.maxR * (1 - e.life / e.maxLife);
    if (e.life <= 0) redPunchEffects.splice(i,1);
  }
}

function updateDebris() {
  for (let i = debris.length - 1; i >= 0; i--) {
    const d = debris[i];
    d.x += d.dx;
    d.y += d.dy;
    d.rotation += d.rotationSpeed;
    d.life--;
    if (d.life <= 0) {
      debris.splice(i, 1);
    }
  }
}

function updateCloudParticles() {
  cloudParticles.forEach(c => {
    c.x -= c.speed;
    if (c.x + c.size < 0) {
      c.x = canvas.width + c.size;
    }
  });
}

function performRedPunch() {
  const baseRadius = 80;
  const radius = baseRadius + Math.max(0, (goldStar.redPunchLevel - 1)) * 40;
  let punches = Math.max(1, Math.min(goldStar.redPunchLevel, 8));
  const damage = 40 * goldStar.redPunchLevel;
  const knockbackForce = goldStar.redPunchLevel >= 3 ? 15 + (goldStar.redPunchLevel - 3) * 5 : 0;

  const nearby = enemies
    .map(e => ({ e, d: Math.hypot((e.x || 0) - goldStar.x, (e.y || 0) - goldStar.y) }))
    .filter(o => o.d <= radius)
    .sort((a, b) => a.d - b.d)
    .slice(0, punches);

  nearby.forEach(o => {
    if (!o.e) return;
    o.e.health -= damage;
    createExplosion(o.e.x, o.e.y, goldStar.redPunchLevel >= 3 ? "magenta" : "orange");

    if (knockbackForce > 0 && o.d > 0) {
      const dx = o.e.x - goldStar.x;
      const dy = o.e.y - goldStar.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      o.e.x += (dx / dist) * knockbackForce;
      o.e.y += (dy / dist) * knockbackForce;
    }

    if (o.e.health <= 0) {
      const idx = enemies.indexOf(o.e);
      if (idx !== -1) {
        const e = enemies[idx];
        if (!e.fromBoss) {
          if (e.type === "triangle") { score += 10; spawnPowerUp(e.x, e.y, "blue-cannon"); }
          else if (e.type === "red-square") { score += 10; spawnPowerUp(e.x, e.y, "red-punch"); }
          else if (e.type === "boss") score += 100;
          else if (e.type === "mini-boss") score += 50;
        }
        if (e.type === "reflector" && !e.fromBoss) {
          spawnPowerUp(e.x, e.y, "health");
          spawnPowerUp(e.x, e.y, "reflect");
          score += 20;
        }
        enemies.splice(idx, 1);
      }
    }
  });

  if (goldStar.redPunchLevel <= 1) {
    redPunchEffects.push({x: goldStar.x, y: goldStar.y, maxR: radius, r: 0, life: 18, maxLife: 18, color: "rgba(255,220,120,0.9)", fill: true});
    for (let i = 0; i < 8; i++) explosions.push({x: goldStar.x, y: goldStar.y, dx:(Math.random()-0.5)*8, dy:(Math.random()-0.5)*8, radius:Math.random()*6+2, color:"rgba(255,200,100,0.9)", life:12});
  } else if (goldStar.redPunchLevel === 2) {
    redPunchEffects.push({x: goldStar.x, y: goldStar.y, maxR: radius + 30, r: 0, life: 24, maxLife: 24, color: "rgba(255,160,60,0.95)", fill: true});
    for (let i = 0; i < 14; i++) {
      explosions.push({x: goldStar.x, y: goldStar.y, dx: (Math.random() - 0.5) * 10, dy: (Math.random() - 0.5) * 10, radius: Math.random() * 8 + 3, color: "rgba(255,140,50,0.95)", life: 16});
    }
  } else {
    redPunchEffects.push({x: goldStar.x, y: goldStar.y, maxR: radius + 60, r: 0, life: 36, maxLife: 36, color: "rgba(255,60,255,0.95)", fill: false, ring: true});
    explosions.push({x: goldStar.x, y: goldStar.y, dx:0, dy:0, radius: 40, color:"rgba(255,255,255,0.95)", life:8});
    for (let i = 0; i < 20; i++) explosions.push({x: goldStar.x, y: goldStar.y, dx:(Math.random()-0.5)*12, dy:(Math.random()-0.5)*12, radius:Math.random()*6+2, color:"rgba(255,50,200,0.9)", life:22});
  }

  if (goldStar.redPunchLevel >= 3) {
    createExplosion(goldStar.x, goldStar.y, "magenta");
  }
}

function updateGoldStar() {
  if (!goldStar.alive) {
    if (goldStarAura.level !== 0 || auraSparks.length || auraShockwaves.length) {
      resetAuraOnDeath();
    }
    goldStar.respawnTimer++;
    if (goldStar.respawnTimer >= 300) respawnGoldStar();
    return;
  }

  if (goldStar.collecting) {
    goldStar.collectTimer++;
    if (goldStar.collectTimer >= GOLD_STAR_PICKUP_FRAMES) {
      if (goldStar.targetPowerUp) {
        const centerPU = goldStar.targetPowerUp;
        const picked = powerUps.filter(p => Math.hypot(p.x - centerPU.x, p.y - centerPU.y) <= PICKUP_RADIUS);

        for (const pu of picked) {
          if (pu.type === "red-punch") {
            goldStar.redKills++;
            if (goldStar.redKills % 5 === 0 && goldStar.redPunchLevel < 5) {
              goldStar.redPunchLevel++;
              levelUpGoldStar();
            }
            createExplosion(pu.x, pu.y, "orange");
            score += 8;
          }
          else if (pu.type === "blue-cannon") {
            goldStar.blueKills++;
            if (goldStar.blueKills % 5 === 0 && goldStar.blueCannonnLevel < 5) {
              goldStar.blueCannonnLevel++;
              levelUpGoldStar();
            }
            createExplosion(pu.x, pu.y, "cyan");
            score += 8;
          }
          else if (pu.type === "health") {
            goldStar.health = Math.min(goldStar.maxHealth, goldStar.health+30);
            player.health = Math.min(player.maxHealth, player.health+30);
            createExplosion(pu.x, pu.y, "magenta");
            score += 5;
          }
          else if (pu.type === "reflect") {
            goldStar.reflectAvailable = true;
            player.reflectAvailable = true;
            createExplosion(pu.x, pu.y, "magenta");
            score += 12;
          }
        }
        powerUps = powerUps.filter(p => !picked.includes(p));
      }
      goldStar.collecting = false; 
      goldStar.collectTimer = 0; 
      goldStar.targetPowerUp = null;
    }
    return;
  }

  let dangerX = 0, dangerY = 0, dangerCount = 0;
  const DANGER_RADIUS = 120;

  enemies.forEach(e => {
    const dist = Math.hypot(e.x - goldStar.x, e.y - goldStar.y);
    if (dist < DANGER_RADIUS && dist > 0) {
      const weight = (DANGER_RADIUS - dist) / DANGER_RADIUS;
      dangerX += (goldStar.x - e.x) / dist * weight;
      dangerY += (goldStar.y - e.y) / dist * weight;
      dangerCount++;
    }
  });

  lightning.forEach(l => {
    const dist = Math.hypot(l.x - goldStar.x, l.y - goldStar.y);
    if (dist < DANGER_RADIUS && dist > 0) {
      const weight = (DANGER_RADIUS - dist) / DANGER_RADIUS * 1.5;
      dangerX += (goldStar.x - l.x) / dist * weight;
      dangerY += (goldStar.y - l.y) / dist * weight;
      dangerCount++;
    }
  });

  let nearest = null, minDist = Infinity;
  for (const pu of powerUps) {
    const dist = Math.hypot(pu.x-goldStar.x, pu.y-goldStar.y);
    if (dist < minDist) { minDist = dist; nearest = pu; }
  }

  let moveX = 0, moveY = 0;

  if (dangerCount > 0) {
    moveX = dangerX;
    moveY = dangerY;
  } else if (nearest && minDist < 300) {
    const dx = nearest.x-goldStar.x, dy = nearest.y-goldStar.y, mag = Math.hypot(dx,dy)||1;
    moveX = dx/mag;
    moveY = dy/mag;
    if (minDist < 25) {
      goldStar.collecting = true;
      goldStar.targetPowerUp = nearest;
      goldStar.collectTimer = 0;
      return;
    }
  } else {
    const dx = player.x-goldStar.x, dy = player.y-goldStar.y, dist = Math.hypot(dx,dy);
    if (dist > 100) {
      const mag = dist||1;
      moveX = dx/mag * 0.7;
      moveY = dy/mag * 0.7;
    }
  }

  const moveMag = Math.hypot(moveX, moveY);
  if (moveMag > 0) {
    goldStar.x += (moveX / moveMag) * goldStar.speed;
    goldStar.y += (moveY / moveMag) * goldStar.speed;
  }

  goldStar.x = Math.max(50, Math.min(canvas.width-50, goldStar.x));
  goldStar.y = Math.max(50, Math.min(canvas.height-50, goldStar.y));

  if (goldStar.redPunchLevel > 0) {
    goldStar.punchCooldown++;
    if (goldStar.punchCooldown >= 300) {
      goldStar.punchCooldown = 0;
      performRedPunch();
    }
  }

  if (goldStar.blueCannonnLevel > 0) {
    goldStar.cannonCooldown++;
    if (goldStar.cannonCooldown > 50) {
      goldStar.cannonCooldown = 0;
      if (enemies.length > 0) {
        const target = enemies[0], dx = target.x-goldStar.x, dy = target.y-goldStar.y, mag = Math.hypot(dx,dy)||1;
        if (goldStar.blueCannonnLevel === 1) bullets.push({x: goldStar.x, y: goldStar.y, dx: (dx/mag)*8, dy: (dy/mag)*8, size: 8, owner: "gold"});
        else if (goldStar.blueCannonnLevel === 2) {
          bullets.push({x: goldStar.x, y: goldStar.y-5, dx: (dx/mag)*8, dy: (dy/mag)*8, size: 8, owner: "gold"});
          bullets.push({x: goldStar.x, y: goldStar.y+5, dx: (dx/mag)*8, dy: (dy/mag)*8, size: 8, owner: "gold"});
        }
        else if (goldStar.blueCannonnLevel === 3) {
          for (let i = -1; i <= 1; i++) { 
            const angle = Math.atan2(dy,dx)+i*0.3; 
            bullets.push({x: goldStar.x, y: goldStar.y, dx: Math.cos(angle)*8, dy: Math.sin(angle)*8, size: 8, owner: "gold"}); 
          }
        }
        else if (goldStar.blueCannonnLevel === 4) {
          for (let i = -2; i <= 2; i++) { 
            const angle = Math.atan2(dy,dx)+i*0.25; 
            bullets.push({x: goldStar.x, y: goldStar.y, dx: Math.cos(angle)*8, dy: Math.sin(angle)*8, size: 8, owner: "gold"}); 
          }
        }
        else if (goldStar.blueCannonnLevel === 5) {
          for (let i = 0; i < 5; i++) bullets.push({x: goldStar.x+(dx/mag)*i*20, y: goldStar.y+(dy/mag)*i*20, dx: (dx/mag)*12, dy: (dy/mag)*12, size: 10, owner: "gold"});
        }
      }
    }
  }
}

function updateBoss(boss) {
  boss.angle = boss.angle||0; boss.angle += 0.01;
  boss.x = canvas.width/2 + Math.cos(boss.angle)*150;
  boss.y = 80 + Math.sin(boss.angle)*50;
  boss.spawnTimer = boss.spawnTimer||0; boss.spawnTimer++;
  if (boss.spawnTimer > 200) {
    boss.spawnTimer = 0;
    minionsToAdd.push({x: boss.x+(Math.random()-0.5)*100, y: boss.y+(Math.random()-0.5)*100, size: 25, speed: 2, health: 30, type: "red-square", fromBoss: true});
  }
  boss.shootTimer = boss.shootTimer||0; boss.shootTimer++;
  if (boss.shootTimer > 150) {
    boss.shootTimer = 0;
    [{x:0,y:-1},{x:0,y:1},{x:-1,y:0},{x:1,y:0}].forEach(d => lightning.push({x: boss.x, y: boss.y, dx: d.x*6, dy: d.y*6, size: 8, damage: 20}));
  }
}

function updateMiniBoss(boss) {
  boss.angle = boss.angle||Math.random()*Math.PI*2; boss.angle += 0.02;
  boss.x = canvas.width/2 + Math.cos(boss.angle)*100;
  boss.y = 80 + Math.sin(boss.angle)*30;
  boss.spawnTimer = boss.spawnTimer||0; boss.spawnTimer++;
  if (boss.spawnTimer > 300) {
    boss.spawnTimer = 0;
    minionsToAdd.push({x: boss.x+(Math.random()-0.5)*80, y: boss.y+(Math.random()-0.5)*80, size: 25, speed: 2.2, health: 30, type: "triangle", fromBoss: true});
  }
  boss.shootTimer = boss.shootTimer||0; boss.shootTimer++;
  if (boss.shootTimer > 180) {
    boss.shootTimer = 0;
    [{x:0,y:-1},{x:0,y:1},{x:-1,y:0},{x:1,y:0},{x:1,y:1},{x:1,y:-1},{x:-1,y:1},{x:-1,y:-1}].forEach(d => lightning.push({x: boss.x, y: boss.y, dx: d.x*5, dy: d.y*5, size: 6, damage: 12}));
  }
}

function updateDiamond(d) {
  // GRAVITON CORE ABILITY
  d.gravitonTimer = (d.gravitonTimer || 0) + 1;
  
  // Every 10 seconds (600 frames), activate graviton pull
  if (d.gravitonTimer >= 600 && !d.gravitonActive) {
    d.gravitonActive = true;
    d.gravitonCharge = 0;
    d.pulledEnemies = [];
    d.gravitonTimer = 0;
  }

  if (d.gravitonActive) {
    d.gravitonCharge++;
    
    // Pull phase (0-600 frames = 10 seconds)
    if (d.gravitonCharge < 600) {
      const pullRadius = 400;
      enemies.forEach(e => {
        if (e === d || e.type === "boss" || e.type === "mini-boss" || e.type === "mother-core") return;
        const dx = d.x - e.x;
        const dy = d.y - e.y;
        const dist = Math.hypot(dx, dy);
        
        if (dist < pullRadius) {
          const pullStrength = 0.08 + (1 - dist / pullRadius) * 0.12;
          e.x += (dx / dist) * pullStrength * 10;
          e.y += (dy / dist) * pullStrength * 10;
          
          // Track pulled enemies
          if (!d.pulledEnemies.find(pe => pe === e)) {
            d.pulledEnemies.push(e);
          }
        }
      });
      
      // Visual pull effect
      if (d.gravitonCharge % 10 === 0) {
        for (let i = 0; i < 3; i++) {
          const angle = Math.random() * Math.PI * 2;
          const dist = 200 + Math.random() * 200;
          explosions.push({
            x: d.x + Math.cos(angle) * dist,
            y: d.y + Math.sin(angle) * dist,
            dx: -Math.cos(angle) * 2,
            dy: -Math.sin(angle) * 2,
            radius: 4,
            color: "rgba(100,200,255,0.8)",
            life: 20
          });
        }
      }
    }
    
    // Blast phase (at 600 frames)
    else if (d.gravitonCharge === 600) {
      // Release massive energy blast - shoot enemies outward
      d.pulledEnemies.forEach(e => {
        const dx = e.x - d.x;
        const dy = e.y - d.y;
        const dist = Math.hypot(dx, dy) || 1;
        
        // Convert enemies to projectiles
        lightning.push({
          x: e.x,
          y: e.y,
          dx: (dx / dist) * 12,
          dy: (dy / dist) * 12,
          size: e.size || 8,
          damage: 30
        });
        
        // Remove enemy from game
        const idx = enemies.indexOf(e);
        if (idx !== -1) enemies.splice(idx, 1);
      });

      // Shoot all attachments outward so the diamond is fully detached
      d.attachments.forEach(a => {
        const dx = a.x - d.x;
        const dy = a.y - d.y;
        const dist = Math.hypot(dx, dy) || 1;
        // Launch each attachment as a projectile away from the diamond
        lightning.push({
          x: a.x,
          y: a.y,
          dx: (dx / dist) * 10,
          dy: (dy / dist) * 10,
          size: a.size || 8,
          damage: 20
        });
        // Optional: small explosion visual
        createExplosion(a.x, a.y, "white");
      });

      // Fully detach attachments
      d.attachments = [];
      d.canReflect = false;

      // Massive explosion visual
      for (let i = 0; i < 50; i++) {
        const angle = (i / 50) * Math.PI * 2;
        explosions.push({
          x: d.x,
          y: d.y,
          dx: Math.cos(angle) * 8,
          dy: Math.sin(angle) * 8,
          radius: 8,
          color: "rgba(255,200,100,0.9)",
          life: 30
        });
      }
      
      // Enter vulnerable state
      d.vulnerable = true;
      d.vulnerableTimer = 360; // 6 seconds
      d.gravitonActive = false;
      d.pulledEnemies = [];
    }
  }
  
  // Vulnerable state countdown
  if (d.vulnerable) {
    d.vulnerableTimer--;
    if (d.vulnerableTimer <= 0) {
      d.vulnerable = false;
    }
  }

  const roamSpeed = 1.6;
  let nearest = null, nd = Infinity;
  for (const e of enemies) {
    if (!e || e.type === "diamond" || ["boss","mini-boss"].includes(e.type)) continue;
    const dist = Math.hypot(e.x-d.x, e.y-d.y);
    if (dist < nd) { nd = dist; nearest = e; }
  }
  if (nearest && nd < 800) {
    const dx = nearest.x-d.x, dy = nearest.y-d.y, mag = Math.hypot(dx,dy)||1;
    d.x += (dx/mag)*Math.min(roamSpeed, mag); d.y += (dy/mag)*Math.min(roamSpeed, mag);
  } else {
    d.angle += 0.01;
    const radius = Math.min(300, Math.max(120, (canvas.width+canvas.height)/8));
    d.x = canvas.width/2 + Math.cos(d.angle) * radius;
    d.y = canvas.height/2 + Math.sin(d.angle) * radius;
  }

  for (let i = enemies.length-1; i >= 0; i--) {
    const e = enemies[i];
    if (!e || e === d || e.attachedTo || e.type === "boss" || e.type === "mini-boss") continue;
    const dx = d.x - e.x, dy = d.y - e.y, dist = Math.hypot(dx,dy);
    if (dist < 260 && d.attachments.length < 15) {
      const pull = 0.04 + (1 - Math.min(dist/260,1)) * 0.06;
      e.x += dx * pull; e.y += dy * pull;
      if (dist < 28) {
        enemies.splice(i,1);
        e.attachedTo = d;
        e.orbitAngle = Math.random()*Math.PI*2;
        if (e.type === "triangle") e.fireRateBoost = true;
        if (e.type === "red-square") e.spawnMini = true;
        if (e.type === "reflector") d.canReflect = true;
        e.speed = 0;
        d.attachments.push(e);
      }
    }
  }

  for (let i = 0; i < d.attachments.length; i++) {
    const a = d.attachments[i];
    a.orbitAngle = (a.orbitAngle||0) + 0.06 + (a.type === "reflector" ? 0.02 : 0);
    const orbitRadius = d.size/2 + 28 + (a.type === "reflector" ? 14 : 0);
    a.x = d.x + Math.cos(a.orbitAngle) * orbitRadius;
    a.y = d.y + Math.sin(a.orbitAngle) * orbitRadius;

    a.shootTimer = (a.shootTimer||0) + 1;
    const fireRate = a.type === "triangle" ? (a.fireRateBoost ? 40 : 100) : 120;
    if (a.shootTimer > fireRate) {
      a.shootTimer = 0;
      const dxp = player.x - a.x, dyp = player.y - a.y, mag = Math.hypot(dxp,dyp)||1;
      lightning.push({x: a.x, y: a.y, dx: (dxp/mag)*5, dy: (dyp/mag)*5, size: 6, damage: 15});
    }
  }
}

// Ensure canvas exists and context is available
function ensureCanvas() {
  canvas = document.getElementById("gameCanvas");
  if (!canvas) {
    try {
      canvas = document.createElement("canvas");
      canvas.id = "gameCanvas";
      document.body.appendChild(canvas);
      canvas.style.position = "fixed";
      canvas.style.left = "0";
      canvas.style.top = "0";
      canvas.style.zIndex = "999";
    } catch (err) {
      // only change console usage here per user's note: use console.warn instead of console.error
      console.warn("Failed to create canvas element:", err);
      return false;
    }
  }
  ctx = canvas.getContext("2d");
  if (!ctx) {
    // only change console usage here per user's note: use console.warn instead of console.error
    console.warn("Failed to get 2D context from canvas.");
    return false;
  }
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  return true;
}

window.addEventListener('load', init);

function init() {
  if (!ensureCanvas()) return;

  window.addEventListener('resize', () => {
    if (!ensureCanvas()) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });

  player.x = canvas.width / 2;
  player.y = canvas.height / 2;
  goldStar.x = canvas.width / 4;
  goldStar.y = canvas.height / 2;

  loadHighScores();

  wave = 0; waveTransition = false; waveTransitionTimer = 0;
  startCutscene();
}

// ==============================
// Enhanced Cinematic cutscene system
// ==============================

let cinematic = {
  playing: false,
  playerName: "Pilot"
};

// Typing renderer for cinematic text: reveal (0..1)
function drawTextBox(lines, x, y, maxW, lineHeight = 26, align = "left", reveal = 1) {
  // Combine lines including newlines to compute total characters to reveal
  const joined = lines.join("\n");
  const totalChars = joined.length;
  const revealChars = Math.floor(totalChars * Math.max(0, Math.min(1, reveal)));

  // Build visible lines up to revealChars
  let remaining = revealChars;
  const visibleLines = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (remaining >= line.length) {
      visibleLines.push(line);
      remaining -= line.length;
    } else if (remaining > 0) {
      visibleLines.push(line.slice(0, remaining));
      remaining = 0;
    } else {
      visibleLines.push("");
    }
  }

  // Cursor / caret blinking (sped up for snappier typing)
  const showCursor = revealChars < totalChars && (Math.floor(Date.now() / 200) % 2 === 0);

  ctx.save();
  // Futuristic CPU style textbox
  ctx.font = "18px 'Courier New', monospace";
  const padding = 14;
  const h = visibleLines.length * lineHeight + padding*2;
  // Slight translucent panel with subtle outline
  ctx.fillStyle = "rgba(5,10,15,0.88)";
  ctx.fillRect(x, y - padding, maxW, h);
  // Outer glow border
  ctx.strokeStyle = "rgba(40,200,255,0.12)";
  ctx.lineWidth = 2;
  roundRect(ctx, x + 0.5, y - padding + 0.5, maxW - 1, h - 1, 8);
  ctx.stroke();

  // Typing color and glow
  ctx.fillStyle = "rgba(140,240,255,0.95)";
  ctx.textAlign = align;
  ctx.shadowColor = "rgba(0,200,255,0.25)";
  ctx.shadowBlur = 8;

  // Render each visible line; if a line is partially revealed we add a cursor after it
  let drawX = x + 12;
  if (align === "center") drawX = x + maxW / 2;
  else if (align === "right") drawX = x + maxW - 12;

  for (let i = 0; i < visibleLines.length; i++) {
    const line = visibleLines[i];
    ctx.fillText(line, drawX, y + (i+1)*lineHeight);
  }

  // If typing is mid-line, draw a small cursor after the last visible character
  if (showCursor) {
    // find last non-empty rendered line index (prefer last line)
    let li = visibleLines.length - 1;
    while (li >= 0 && visibleLines[li] === "") li--;
    if (li >= 0) {
      const textBefore = visibleLines[li];
      // measure width using same font
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(140,240,255,0.95)";
      const metrics = ctx.measureText(textBefore);
      let cursorX = drawX + metrics.width;
      if (align === "center") cursorX = drawX - metrics.width/2 + metrics.width;
      else if (align === "right") cursorX = drawX - metrics.width;
      const cursorY = y + (li+1)*lineHeight - 14;
      // block cursor
      ctx.fillRect(cursorX + 2, cursorY, 8, 14);
    } else {
      // No chars yet: draw cursor at start of box
      const cursorX = x + 18;
      const cursorY = y + lineHeight - 14;
      ctx.fillRect(cursorX, cursorY, 8, 14);
    }
  }

  ctx.restore();
}

// Improved launch bay with hoses that disconnect as p -> 1
function drawLaunchBayScene(t, p) {
  // p is scene progress 0..1
  ctx.fillStyle = "#000814";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Starfield / hangar atmosphere
  for (let i = 0; i < 140; i++) {
    const x = (i * 137) % canvas.width;
    const y = (i * 241) % canvas.height;
    const alpha = 0.25 + Math.abs(Math.sin((t||0) * 0.001 + i)) * 0.4;
    ctx.fillStyle = `rgba(255,255,255,${0.12 * alpha})`;
    ctx.fillRect(x, y, 2, 2);
  }

  // Hangar interior: big panel with gradient
  const hangarX = canvas.width * 0.15, hangarW = canvas.width * 0.7;
  const hangarY = canvas.height * 0.28, hangarH = canvas.height * 0.52;
  // subtle gradient
  const g = ctx.createLinearGradient(hangarX, hangarY, hangarX, hangarY+hangarH);
  g.addColorStop(0, "#0f1721");
  g.addColorStop(1, "#121827");
  ctx.fillStyle = g;
  ctx.fillRect(hangarX, hangarY, hangarW, hangarH);

  // Panels and beams
  ctx.strokeStyle = "#1e2b3a";
  ctx.lineWidth = 2;
  for (let i = 0; i < 12; i++) {
    const x = hangarX + (hangarW / 12) * i;
    ctx.beginPath();
    ctx.moveTo(x, hangarY);
    ctx.lineTo(x, hangarY + hangarH);
    ctx.stroke();
  }

  // Ground grid subtle
  ctx.strokeStyle = "rgba(50,80,100,0.08)";
  ctx.lineWidth = 1;
  for (let j = 0; j < 10; j++) {
    const gy = canvas.height * 0.6 + j * 20;
    ctx.beginPath();
    ctx.moveTo(hangarX, gy);
    ctx.lineTo(hangarX + hangarW, gy);
    ctx.stroke();
  }

  // Central Green Square (launching unit)
  const squareSize = 60;
  const squareX = canvas.width / 2 - squareSize / 2;
  const squareY = canvas.height / 2 - squareSize / 2;

  // Add hoses connecting left/right anchors to square; they detach as p increases
  const leftAnchor = { x: hangarX + 40, y: squareY + squareSize / 2 - 6 };
  const rightAnchor = { x: hangarX + hangarW - 40, y: squareY + squareSize / 2 - 6 };
  const disconnectProgress = Math.max(0, Math.min(1, p * 1.6)); // hoses detach earlier
  const hoseFade = 1 - disconnectProgress;
  const hoseRetract = disconnectProgress * 60; // how much they retract towards anchors

  function drawHose(from, to, seed) {
    ctx.save();
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    ctx.strokeStyle = `rgba(40,200,120,${0.95 * hoseFade})`;
    ctx.beginPath();
    const ctrlX = (from.x + to.x) / 2 + Math.sin((t||0)*0.002 + seed) * 30 * (1 - disconnectProgress);
    const ctrlY = (from.y + to.y) / 2 + Math.cos((t||0)*0.002 + seed) * 10 * (1 - disconnectProgress);
    // retract end toward anchor as it disconnects
    const targetX = to.x + (from.x - to.x) * (hoseRetract / 120);
    const targetY = to.y + (from.y - to.y) * (hoseRetract / 120);
    ctx.moveTo(from.x, from.y);
    ctx.quadraticCurveTo(ctrlX, ctrlY, targetX, targetY);
    ctx.stroke();

    // little clamp at near-square end which fades/flies off
    const clampProgress = Math.min(1, disconnectProgress * 1.6);
    ctx.fillStyle = `rgba(80,240,180,${0.9 * hoseFade})`;
    const clampX = targetX + (Math.random() - 0.5) * 2;
    const clampY = targetY - clampProgress * 40;
    ctx.beginPath();
    ctx.arc(clampX, clampY, 6 * (1 - clampProgress * 0.8), 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
  }

  // draw two hoses from left and right
  drawHose({ x: squareX + 8, y: squareY + squareSize/2 }, leftAnchor, 1);
  drawHose({ x: squareX + squareSize - 8, y: squareY + squareSize/2 }, rightAnchor, 2);

  // Sparks and small cable bits when nearly disconnected
  if (disconnectProgress > 0.6) {
    for (let i = 0; i < 6; i++) {
      const bx = squareX + (Math.random() - 0.5) * squareSize * 1.2;
      const by = squareY + (Math.random() - 0.5) * squareSize * 1.2;
      ctx.fillStyle = `rgba(160,255,200,${Math.random() * 0.6})`;
      ctx.fillRect(bx, by, 3, 3);
    }
  }

  // green square glow
  ctx.shadowBlur = 30 * (1 - disconnectProgress * 0.6);
  ctx.shadowColor = "lime";
  ctx.fillStyle = "lime";
  ctx.fillRect(squareX, squareY, squareSize, squareSize);
  ctx.shadowBlur = 0;

  // New: as hoses disconnect the green square activates with a red eye that scans left->right
  // eye appears gradually as disconnectProgress increases
  const eyeAppear = Math.max(0, Math.min(1, disconnectProgress * 1.4));
  if (eyeAppear > 0.02) {
    const innerPad = 8;
    const travelWidth = squareSize - innerPad * 2;
    const eyeProgress = Math.max(0, Math.min(1, (disconnectProgress - 0.05) / 0.95)); // start slightly after
    const eyeX = squareX + innerPad + travelWidth * eyeProgress;
    const eyeY = squareY + squareSize / 2;
    ctx.save();
    // glow and scanner effect
    ctx.shadowBlur = 18 * eyeAppear;
    // Changed scanning eye colour to yellow (no pupil)
    ctx.shadowColor = "rgba(255,220,80,0.9)";
    ctx.fillStyle = `rgba(255,220,80,${0.6 + eyeAppear * 0.4})`;
    ctx.beginPath();
    ctx.arc(eyeX, eyeY, 8 + 4 * eyeAppear, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    // pupil removed per user request: keep only glow (no black pupil)
    // small scanning beam when fully active
    if (eyeProgress > 0.6) {
      ctx.globalAlpha = Math.min(0.6, (eyeProgress - 0.6) / 0.4 * 0.6);
      ctx.fillStyle = "rgba(255,220,80,0.12)";
      ctx.fillRect(squareX, eyeY - 2, squareSize * (0.4 + 0.6 * Math.sin(Date.now()*0.004)), 4);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  // Add Year 2050 and location text (slightly dimmer)
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.font = "24px Arial";
  ctx.textAlign = "center";
  ctx.fillText("YEAR 2050", canvas.width / 2, 60);
  ctx.font = "18px Arial";
  ctx.fillStyle = "rgba(200,220,255,0.7)";
  ctx.fillText("Earth's Orbit - Hangar 7", canvas.width / 2, 90);
}

function drawEnemyScene(t, p) {
  ctx.fillStyle = "#05000a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  for (let i = 0; i < 150; i++) {
    const x = (i * 171) % canvas.width;
    const y = (i * 293) % canvas.height;
    const brightness = 0.3 + Math.sin(t * 0.001 + i) * 0.3;
    ctx.fillStyle = `rgba(255,100,100,${brightness})`;
    ctx.fillRect(x, y, 1, 1);
  }
  
  ctx.save();
  ctx.translate(canvas.width * 0.5, canvas.height * 0.35);
  const pulse = Math.sin(t * 0.003) * 20;
  ctx.rotate(t * 0.0005);
  
  ctx.strokeStyle = `rgba(255,50,50,${0.6 + Math.sin(t * 0.002) * 0.3})`;
  ctx.lineWidth = 4;
  ctx.shadowBlur = 40;
  ctx.shadowColor = "red";
  
  const dSize = 150 + pulse;
  ctx.beginPath();
  ctx.moveTo(0, -dSize);
  ctx.lineTo(dSize, 0);
  ctx.lineTo(0, dSize);
  ctx.lineTo(-dSize, 0);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
  
  // Green squares being destroyed
  for (let i = 0; i < 5; i++) {
    const xOffset = Math.sin(t * 0.001 + i) * 100;
    const yPos = canvas.height * 0.6 + i * 40;
    const size = 25 + Math.sin(t * 0.002 + i) * 5;
    const destruction = Math.min(1, (t / 4500) + i * 0.1);
    
    ctx.fillStyle = `rgba(0,255,0,${(0.6 - destruction * 0.6) + Math.sin(t * 0.002 + i) * 0.3})`;
    ctx.fillRect(canvas.width * 0.3 + xOffset + i * 80, yPos, size * (1 - destruction * 0.5), size * (1 - destruction * 0.5));
    
    // Destruction particles
    if (destruction > 0.3) {
      for (let j = 0; j < 3; j++) {
        const px = canvas.width * 0.3 + xOffset + i * 80 + (Math.random() - 0.5) * 40 * destruction;
        const py = yPos + (Math.random() - 0.5) * 40 * destruction;
        ctx.fillStyle = `rgba(0,255,0,${(1 - destruction) * 0.5})`;
        ctx.fillRect(px, py, 3, 3);
      }
    }
  }
  
  for (let i = 0; i < 4; i++) {
    const xOffset = Math.cos(t * 0.0015 + i) * 120;
    const yPos = canvas.height * 0.7 + i * 35;
    const size = 30;
    
    ctx.fillStyle = `rgba(0,255,255,${0.5 + Math.cos(t * 0.002 + i) * 0.3})`;
    ctx.beginPath();
    ctx.moveTo(canvas.width * 0.6 + xOffset + i * 70, yPos - size/2);
    ctx.lineTo(canvas.width * 0.6 + xOffset + i * 70 - size/2, yPos + size/2);
    ctx.lineTo(canvas.width * 0.6 + xOffset + i * 70 + size/2, yPos + size/2);
    ctx.closePath();
    ctx.fill();
  }
}

// New cinematic helper: diamond destroying green squares scene (used for the "Mother Diamond has been destroying..." line)
function drawDiamondDestructionScene(t, p) {
  // background
  ctx.fillStyle = "#040812";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // stars
  for (let i = 0; i < 120; i++) {
    const x = (i * 97) % canvas.width;
    const y = (i * 199) % canvas.height;
    ctx.fillStyle = `rgba(180,255,200,${0.15 + Math.abs(Math.sin((t||0)*0.001 + i))*0.4})`;
    ctx.fillRect(x, y, 1, 1);
  }

  // mother diamond center (big and ominous)
  const centerX = canvas.width * 0.6;
  const centerY = canvas.height * 0.45;
  ctx.save();
  ctx.translate(centerX, centerY);
  const s = 220 + Math.sin((t||0)*0.001)*8 + p*60;
  ctx.rotate((t||0)*0.0002);
  ctx.shadowBlur = 50;
  ctx.shadowColor = "rgba(0,200,255,0.8)";
  ctx.strokeStyle = "rgba(0,150,255,0.9)";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(0, -s/2);
  ctx.lineTo(s/2, 0);
  ctx.lineTo(0, s/2);
  ctx.lineTo(-s/2, 0);
  ctx.closePath();
  ctx.fillStyle = "rgba(20,40,80,0.9)";
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  ctx.shadowBlur = 0;

  // Green squares being pulled and destroyed
  for (let i = 0; i < 10; i++) {
    const tOff = (t||0)*0.001 + i;
    const baseX = canvas.width * 0.2 + i * (canvas.width*0.6/10);
    const baseY = canvas.height * 0.65 + Math.sin(tOff) * 30;
    const pull = Math.min(1, (p*2) + Math.max(0, 1 - ((Math.hypot(baseX-centerX, baseY-centerY) - 50) / 600)));
    const size = 30 * (1 - pull*0.8);
    const x = baseX + (centerX - baseX) * pull + (Math.random()-0.5)*10*pull;
    const y = baseY + (centerY - baseY) * pull + (Math.random()-0.5)*10*pull;
    ctx.fillStyle = `rgba(0,200,0,${0.6 - pull*0.5})`;
    ctx.fillRect(x - size/2, y - size/2, Math.max(4,size), Math.max(4,size));
    // destruction sparks when pulled close
    if (pull > 0.6) {
      for (let j=0;j<3;j++){
        ctx.fillStyle = `rgba(0,255,120,${0.6 - pull*0.4})`;
        ctx.fillRect(x + (Math.random()-0.5)*20, y + (Math.random()-0.5)*20, 3, 3);
      }
    }
  }

  // Add cinematic: diamond powers up and fires a large laser blast when the commander line plays
  // Bias the reveal to make the text appear earlier; we also use p to control charge/fire timing
  const chargeStart = 0.12;
  const chargePhase = Math.max(0, Math.min(1, (p - chargeStart) / (1 - chargeStart))); // 0..1
  if (chargePhase > 0.05) {
    const charge = Math.min(1, chargePhase * 1.6);
    // pulsing ring around diamond to show power build
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(255,80,80,${0.55 * charge})`;
    ctx.lineWidth = 6 + 24 * charge;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 120 + 80 * charge, 0, Math.PI*2);
    ctx.stroke();
    ctx.restore();
  }

  // Fire the beam when chargePhase passes threshold
  if (chargePhase > 0.65) {
    const fireAlpha = Math.min(1, (chargePhase - 0.65) / 0.35);
    // large vertical laser beam (visual)
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    // core
    ctx.fillStyle = `rgba(255,40,40,${0.85 * fireAlpha})`;
    ctx.fillRect(centerX - 6, 0, 12, canvas.height);
    // outer glow
    ctx.fillStyle = `rgba(255,120,80,${0.6 * fireAlpha})`;
    ctx.fillRect(centerX - 24, 0, 48, canvas.height);
    // beam flare near diamond
    ctx.shadowBlur = 60 * fireAlpha;
    ctx.shadowColor = 'rgba(255,140,100,0.9)';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 80 * fireAlpha, 0, Math.PI*2);
    ctx.fillStyle = `rgba(255,220,160,${0.6 * fireAlpha})`;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();

    // small debris particles streaking away
    for (let i = 0; i < 8 * Math.ceil(fireAlpha*2); i++) {
      const sx = centerX + (Math.random()-0.5)*80;
      const sy = centerY + (Math.random()-0.5)*40;
      ctx.fillStyle = `rgba(255,150,120,${0.3 * fireAlpha})`;
      ctx.fillRect(sx + (Math.random()*400 - 200) * fireAlpha, sy + (Math.random()*400 - 200) * fireAlpha, 3, 3);
    }
  }

  // overlay text - use typing effect reveal based on p, typed faster and held longer
  if (p > 0.12) {
    // bias reveal: speed up typing (1.9x), ensure it appears earlier
    const reveal = Math.max(0, Math.min(1, (p - 0.12) / (1 - 0.12) * 1.9));
    drawTextBox([
      'Commander: "The Mother Diamond has been',
      'destroying all the Green Squares on Earth.',
      'We\'re the last ones left."'
    ], 50, canvas.height - 170, canvas.width - 100, 26, "left", reveal);
  }
}

// New cinematic helper: mother diamond and enemies scene (used for the "Pilot, you must reach..." line)
function drawMotherDiamondAndEnemiesScene(t, p) {
  // dim background
  ctx.fillStyle = "#02010a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Distant enemies flying past like an invasion - many small silhouettes streaking across
  const invasionCount = 24;
  for (let i = 0; i < invasionCount; i++) {
    const speed = 0.6 + (i % 4) * 0.2 + p * 2.0; // speed increases with approach
    const x = ((t||0) * 0.08 * speed + i * 350) % (canvas.width * 1.6) - canvas.width * 0.3 - (p * canvas.width * 0.8);
    const y = (i * 37) % canvas.height;
    const size = 8 + (i % 3) * 4 + p * 6;
    const alpha = 0.2 + 0.8 * Math.max(0, p * 1.2 - Math.abs((y / canvas.height) - 0.5));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(200,60,60,${alpha})`;
    // tiny streak
    ctx.fillRect(x, y, Math.max(2, size * (1 + p*1.5)), Math.max(2, size*0.6));
    ctx.restore();
  }

  // distant mother diamond (smaller than previous scene but with enemies orbiting)
  const centerX = canvas.width * 0.55;
  const centerY = canvas.height * 0.35;
  ctx.save();
  ctx.translate(centerX, centerY);
  const s = 140 + p*40;
  ctx.rotate(Math.sin((t||0)*0.0005)*0.2);
  ctx.shadowBlur = 40;
  ctx.shadowColor = "rgba(255,60,60,0.7)";
  ctx.fillStyle = "#220022";
  ctx.beginPath();
  ctx.moveTo(0, -s/2);
  ctx.lineTo(s/2, 0);
  ctx.lineTo(0, s/2);
  ctx.lineTo(-s/2, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.shadowBlur = 0;

  // enemies around the diamond (triangles and red squares)
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI*2 + (t||0)*0.0006 + p*1.2;
    const dist = 160 + Math.sin((t||0)*0.001 + i)*20 + p*40;
    const ex = centerX + Math.cos(angle) * dist;
    const ey = centerY + Math.sin(angle) * dist;
    // alternate shape
    if (i % 2 === 0) {
      // triangle
      const size = 28 + Math.sin((t||0)*0.002 + i)*4;
      ctx.fillStyle = "rgba(100,200,255,0.9)";
      ctx.beginPath();
      ctx.moveTo(ex, ey - size/2);
      ctx.lineTo(ex - size/2, ey + size/2);
      ctx.lineTo(ex + size/2, ey + size/2);
      ctx.closePath();
      ctx.fill();
      // brief red charge dot near tip for dramatic effect
      const charge = Math.min(1, Math.max(0, p + (Math.sin((t||0)*0.005 + i)*0.5 + 0.5)));
      if (charge > 0.6) {
        const cp = (charge - 0.6) / 0.4;
        ctx.fillStyle = `rgba(255,60,60,${cp})`;
        const tx = ex, ty = ey - size/2;
        ctx.beginPath();
        ctx.arc(tx, ty + (1-cp)*6, 4 + cp*6, 0, Math.PI*2);
        ctx.fill();
      }
    } else {
      // red square
      const size = 26 + Math.cos((t||0)*0.002 + i)*3;
      ctx.fillStyle = "rgba(255,60,60,0.95)";
      ctx.fillRect(ex - size/2, ey - size/2, size, size);
      // green sparks to show hostility
      if (p > 0.4) {
        ctx.fillStyle = `rgba(0,255,0,${0.3 + (Math.random()*0.4)})`;
        ctx.fillRect(ex + (Math.random()-0.5)*10, ey + (Math.random()-0.5)*10, 3, 3);
      }
    }
  }

  // caption - use typing reveal based on p, sped up
  const reveal = Math.max(0, Math.min(1, p * 1.9));
  drawTextBox([
    `Commander: "${cinematic.playerName || "Pilot"}, you must reach the`,
    'Mother Diamond and destroy it.',
    'Then we can take back Earth."'
  ], 50, canvas.height - 170, canvas.width - 100, 26, "left", reveal);
}

function drawGoldStarLaunch(t, p) {
  ctx.fillStyle = "#000814";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  for (let i = 0; i < 100; i++) {
    const x = ((i * 137) % canvas.width) - p * canvas.width * 0.5;
    const y = (i * 241) % canvas.height;
    const speed = 1 + (i % 3);
    ctx.fillStyle = `rgba(255,255,255,${0.6 - p * 0.4})`;
    ctx.fillRect(x - speed * p * 200, y, 2 + speed * p * 3, 2);
  }
  
  const startX = canvas.width * 0.3;
  const startY = canvas.height * 0.5;
  const endX = canvas.width * 0.5;
  const endY = canvas.height * 0.5;
  
  const gsX = startX + (endX - startX) * p;
  const gsY = startY + (endY - startY) * p;
  const gsSize = 40 + p * 60;
  
  // Also animate the green square to blast off alongside the gold star
  const greenStartX = startX - 90;
  const greenEndX = endX - 60;
  const greenX = greenStartX + (greenEndX - greenStartX) * Math.max(0, Math.min(1, (p + 0.05)));
  const greenY = startY - (p * 80); // slightly upward trajectory
  const greenSize = 36 + p * 36;

  if (p > 0.4) {
    const blastIntensity = Math.min(1, (p - 0.4) / 0.3);
    
    for (let i = 0; i < 20; i++) {
      const trailP = i / 20;
      const tx = gsX - (30 + i * 15) * blastIntensity;
      const ty = gsY + (Math.random() - 0.5) * 20 * blastIntensity;
      const tSize = (20 - i) * blastIntensity;
      
      ctx.fillStyle = `rgba(255,${150 - i * 7},0,${(1 - trailP) * 0.8})`;
      ctx.beginPath();
      ctx.arc(tx, ty, tSize, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // gold blast
    ctx.shadowBlur = 40;
    ctx.shadowColor = "orange";
    ctx.fillStyle = `rgba(255,200,0,${blastIntensity})`;
    ctx.beginPath();
    ctx.arc(gsX - 25, gsY, 15 * blastIntensity, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // green square blast (less intense, green/orange mix)
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 12; i++) {
      const txg = greenX - (20 + i * 10) * blastIntensity * 0.8;
      const tyg = greenY + (Math.random() - 0.5) * 14 * blastIntensity;
      const tSizeg = (12 - i) * blastIntensity;
      ctx.fillStyle = `rgba(${200 - i*10},255,100,${(1 - i/12) * 0.7})`;
      ctx.beginPath();
      ctx.arc(txg, tyg, Math.max(1, tSizeg), 0, Math.PI*2);
      ctx.fill();
    }
    ctx.restore();
  }
  
  // draw gold star
  ctx.save();
  ctx.translate(gsX, gsY);
  ctx.shadowBlur = 30 + p * 20;
  ctx.shadowColor = "gold";
  ctx.fillStyle = "gold";
  
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
    const radius = i % 2 === 0 ? gsSize / 2 : gsSize / 4;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // draw green square launching next to it
  ctx.save();
  ctx.translate(greenX, greenY);
  ctx.shadowBlur = 20 + p * 10;
  ctx.shadowColor = "lime";
  ctx.fillStyle = "lime";
  ctx.fillRect(-greenSize/2, -greenSize/2, greenSize, greenSize);
  ctx.shadowBlur = 0;
  ctx.restore();
  
  if (p > 0.85) {
    const flashIntensity = (p - 0.85) / 0.15;
    ctx.fillStyle = `rgba(255,255,255,${flashIntensity * 0.9})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

// Create cutscene scenes with typing and increased display time for the "Believe in the Gold Star!" script
function makeCutsceneScenes() {
  const scenes = [];

  // Increased duration for hangar so hoses detaching are visible
  scenes.push({
    duration: 3500,
    draw: (t, p) => {
      drawLaunchBayScene(t, p);
    }
  });

  // Scene 2: when commander speaks about Mother Diamond destroying green squares -> show diamond-destruction scene
  // Increase duration so text stays on screen longer
  scenes.push({
    duration: 6500,
    draw: (t, p) => {
      drawDiamondDestructionScene(t, p);
    }
  });

  // Scene 3: when the commander says the player must reach the Mother Diamond -> show mother diamond + enemies
  scenes.push({
    duration: 5500,
    draw: (t, p) => {
      drawMotherDiamondAndEnemiesScene(t, p);
    }
  });

  // Scene 4: Gold Star launching + dialog (kept longer so final "Believe..." remains visible longer)
  scenes.push({
    duration: 7000,
    draw: (t, p) => {
      drawGoldStarLaunch(t, p);
      
      // Show dialog typed in realtime using reveal biased to complete earlier for readability (faster typing)
      const reveal = Math.max(0, Math.min(1, p * 1.6));
      drawTextBox([
        'Pilot: "I\'m going!"',
        'Commander: "Believe in the Gold Star!"'
      ], 50, canvas.height - 140, 520, 24, "left", reveal);
    }
  });

  scenes.push({
    duration: 2500,
    draw: (t, p) => {
      const fadeOut = 1 - p;
      ctx.fillStyle = `rgba(255,255,255,${fadeOut * 0.8})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      if (p > 0.4) {
        const countdown = Math.ceil(2.5 - (p * 2.5));
        ctx.fillStyle = "white";
        ctx.font = "48px Arial";
        ctx.textAlign = "center";
        ctx.fillText("WAVE 1 STARTING IN", canvas.width / 2, canvas.height / 2 - 40);
        ctx.font = "72px Arial";
        ctx.fillStyle = countdown <= 1 ? "red" : "yellow";
        ctx.fillText(countdown.toString(), canvas.width / 2, canvas.height / 2 + 40);
        ctx.font = "32px Arial";
        ctx.fillStyle = "cyan";
        ctx.fillText("GET READY FOR BATTLE", canvas.width / 2, canvas.height / 2 + 100);
      }
    }
  });

  return scenes;
}

let cinematicScenes = [];
let cinematicIndex = 0;
let cinematicStartTime = 0;

function startCutscene() {
  const name = typeof prompt === 'function' ? (prompt("Enter your pilot name:", "Pilot") || "Pilot") : "Pilot";
  cinematic.playerName = name;
  cinematic.playing = true;
  cinematicScenes = makeCutsceneScenes();
  cinematicIndex = 0;
  cinematicStartTime = performance.now();

  if (!cinematicScenes || cinematicScenes.length === 0) {
    cinematic.playing = false;
    endCutscene();
    return;
  }

  requestAnimationFrame(cinematicTick);
}

function cinematicTick(now) {
  if (!cinematic.playing) return;

  // Guard: ensure scene exists
  const scene = cinematicScenes[cinematicIndex];
  if (!scene) {
    cinematic.playing = false;
    endCutscene();
    return;
  }

  let elapsedBefore = 0;
  for (let i = 0; i < cinematicIndex; i++) elapsedBefore += cinematicScenes[i].duration;
  const sceneElapsed = now - (cinematicStartTime + elapsedBefore);
  const progress = Math.max(0, Math.min(1, sceneElapsed / scene.duration));

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  scene.draw(now, progress);

  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.font = "14px Arial";
  ctx.textAlign = "right";
  ctx.fillText("Press ESC to skip intro", canvas.width - 20, 30);

  if (sceneElapsed >= scene.duration) {
    cinematicIndex++;
    if (cinematicIndex >= cinematicScenes.length) {
      cinematic.playing = false;
      endCutscene();
      return;
    }
  }

  requestAnimationFrame(cinematicTick);
}

window.addEventListener("keydown", e => {
  if (e.key === "Escape" && cinematic.playing) {
    cinematic.playing = false;
    endCutscene();
  }
});
