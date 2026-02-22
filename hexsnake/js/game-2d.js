'use strict';

// ═══ game-2d.js ═══
// 2D mode: init, start, loop, tick, food, enemies, bullets, laser, input, render

// ═══ INIT ═══


function resizeGame() {
  const dpr = window.devicePixelRatio||1;
  const W=window.innerWidth, H=window.innerHeight;
  canvas.style.width=W+'px'; canvas.style.height=H+'px';
  canvas.width=W*dpr; canvas.height=H*dpr;
  ctx.scale(dpr,dpr);
  recalcCell();
}

function recalcCell() {
  const W=window.innerWidth, H=window.innerHeight-HUD_H;
  cS = Math.max(8, Math.floor(Math.min(W/gCols, H/gRows)));
}


// ═══ START ═══
function startGame() {
  document.getElementById('startScreen').style.display='none';
  const goEl = document.getElementById('goScreen');
  goEl.classList.remove('show');
  goEl.style.opacity = '';
  goEl.style.transition = '';
  // Stop menu background animation
  if (menuBgRaf) { cancelAnimationFrame(menuBgRaf); menuBgRaf = null; }
  document.getElementById('evoScreen').classList.remove('show');
  canvas.style.display='block'; // restore after 3D death may have hidden it

  gCols=20; gRows=20; recalcCell(); resizeGame();
  score=0; level=1; xp=0; xpNeeded=5; gameTime=0;
  gamePaused=false; gameActive=true; deathTime=0;

  const mx=Math.floor(gCols/2), my=Math.floor(gRows/2);
  player={
    body:[{x:mx,y:my}], prev:[{x:mx,y:my}],
    dir:{x:1,y:0}, ndir:{x:1,y:0},
    grow:0, lCD:0,
    speedMult:1, speedTarget:1,    effects:[],
    upg:{laserN:1,laserDmg:1,laserCD:1.0,pierce:false,slow:false,spd:0,quickTurn:false},
    alive:true,
  };
  enemies=[]; bullets=[]; walls=[]; speedItems=[]; xpBalls=[]; laserVis=null;
  unlocked=new Set(); selectedEvo=null; enemyAccum=0; enemyTickT=0;
  combo=0; comboMult=1; lastFoodTS=0; maxCombo=0;
  threatLevel=0; lastThreatTS=0; threatNotif=null;
  killCount=0; bulletHits=0; laserHits=0;
  food = spawnFood();

  const now=performance.now();
  lastFrame=now; lastTick=now; lastBulletTick=now; lastSpeedTS=now; lastEnemyTS=now;
  tickT=0;
  if(animId) cancelAnimationFrame(animId);
  animId=requestAnimationFrame(loop);
  Audio.init();
  Audio.resume();
  Audio.stopBGM();
  Audio.startBGM();
  updateHUD();
}


// ═══ LAUNCH TRANSITION (button → game board morph) ═══
function launchGame() {
  const _startFn = gameMode==='3d' ? startGame3D : startGame;
  Audio.init();
  Audio.resume();

  const btn = document.getElementById('launchBtn');
  const overlay = document.getElementById('launchTransition');
  if (!btn || !overlay) { _startFn(); return; }

  // Disable button to prevent double-click
  btn.style.pointerEvents = 'none';

  // Get button position
  const rect = btn.getBoundingClientRect();

  // Phase 1: position overlay exactly at button
  overlay.className = '';
  overlay.style.cssText = `
    position:fixed;z-index:999;pointer-events:none;
    left:${rect.left}px;top:${rect.top}px;
    width:${rect.width}px;height:${rect.height}px;
    opacity:1;background:var(--amber);border-radius:4px;
  `;

  // Force layout
  overlay.offsetHeight;

  // Phase 2: expand to full screen
  overlay.style.transition = 'all 0.7s cubic-bezier(0.4,0,0.2,1)';
  overlay.style.left = '0px';
  overlay.style.top = '0px';
  overlay.style.width = '100vw';
  overlay.style.height = '100vh';
  overlay.style.borderRadius = '0';

  // Phase 3: color shift midway
  setTimeout(() => {
    overlay.style.background = '#DEDAD0';
  }, 350);

  // Phase 4: expansion complete — start game underneath the overlay
  setTimeout(() => {
    // Start game while overlay still covers everything
    _startFn();

    // Let game render one frame underneath
    requestAnimationFrame(() => {
      // Phase 5: slowly fade out overlay to reveal game
      overlay.style.transition = 'opacity 0.8s ease';
      overlay.style.opacity = '0';

      // Phase 6: cleanup after fade completes
      setTimeout(() => {
        overlay.style.cssText = 'position:fixed;z-index:999;pointer-events:none;opacity:0;';
        btn.style.pointerEvents = '';
      }, 850);
    });
  }, 750);
}

// ═══ REDEPLOY TRANSITION (amber expansion, same as launch) ═══
function launchRedeploy(btn) {
  const _startFn = gameMode==='3d' ? startGame3D : startGame;
  Audio.init();
  Audio.resume();

  const overlay = document.getElementById('launchTransition');
  if (!btn || !overlay) { _startFn(); return; }

  btn.style.pointerEvents = 'none';
  const rect = btn.getBoundingClientRect();

  overlay.style.cssText = `
    position:fixed;z-index:999;pointer-events:none;
    left:${rect.left}px;top:${rect.top}px;
    width:${rect.width}px;height:${rect.height}px;
    opacity:1;background:var(--amber);border-radius:4px;
  `;
  overlay.offsetHeight;

  overlay.style.transition = 'all 0.6s cubic-bezier(0.4,0,0.2,1)';
  overlay.style.left = '0px';
  overlay.style.top = '0px';
  overlay.style.width = '100vw';
  overlay.style.height = '100vh';
  overlay.style.borderRadius = '0';

  setTimeout(() => { overlay.style.background = '#DEDAD0'; }, 300);

  setTimeout(() => {
    _startFn();
    requestAnimationFrame(() => {
      overlay.style.transition = 'opacity 0.8s ease';
      overlay.style.opacity = '0';
      setTimeout(() => {
        overlay.style.cssText = 'position:fixed;z-index:999;pointer-events:none;opacity:0;';
        btn.style.pointerEvents = '';
      }, 850);
    });
  }, 650);
}

// ═══ RETURN HOME TRANSITION (cinematic: black → white panel slides in → UI reveals) ═══
function launchHome(btn) {
  const overlay = document.getElementById('launchTransition');
  if (!btn || !overlay) { goToHome(); return; }

  btn.style.pointerEvents = 'none';

  // ─── Phase 1: Fade to black (0.6s) ───
  overlay.style.cssText = `
    position:fixed;z-index:999;pointer-events:none;
    left:0;top:0;width:100vw;height:100vh;
    opacity:0;background:#080604;border-radius:0;
  `;
  overlay.offsetHeight;
  overlay.style.transition = 'opacity 0.6s ease';
  overlay.style.opacity = '1';

  setTimeout(() => {
    // ─── Phase 2: Screen is fully black. Switch to home underneath ───
    goToHome();

    // Prepare cinematic entry states
    const ss = document.getElementById('startScreen');
    const panelW = document.getElementById('panelWhite');
    const panelD = document.getElementById('panelDark');
    const topB   = document.getElementById('topBar');
    const botB   = document.getElementById('bottomBar');
    const reveals = document.querySelectorAll('[data-reveal]');

    // Activate cinematic mode
    if(ss) ss.classList.add('cinematic-entry');

    // Hide everything initially
    if(panelW) { panelW.classList.add('home-slide'); panelW.classList.remove('home-in'); }
    if(panelD) { panelD.classList.add('home-dark'); panelD.classList.remove('home-in'); }
    if(topB)   { topB.classList.add('home-bar'); topB.classList.remove('home-in'); }
    if(botB)   { botB.classList.add('home-bar'); botB.classList.remove('home-in'); }
    reveals.forEach(el => el.classList.remove('revealed'));

    // ─── Phase 3: Fade out black overlay (0.5s) ───
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        overlay.style.transition = 'opacity 0.5s ease';
        overlay.style.opacity = '0';

        // ─── Phase 4: White panel slides in from left (starts 200ms into fade) ───
        setTimeout(() => {
          if(panelW) panelW.classList.add('home-in');
          // Top bar appears
          if(topB) { topB.classList.add('home-in'); }
        }, 200);

        // ─── Phase 5: Dark panel fades in (after white panel mostly in) ───
        setTimeout(() => {
          if(panelD) panelD.classList.add('home-in');
          if(botB) { botB.classList.add('home-in'); }
        }, 500);

        // ─── Phase 6: UI elements reveal with stagger ───
        setTimeout(() => {
          // Sort by data-reveal order
          const sorted = Array.from(reveals).sort((a,b) =>
            parseInt(a.dataset.reveal) - parseInt(b.dataset.reveal)
          );
          sorted.forEach((el, i) => {
            setTimeout(() => el.classList.add('revealed'), i * 100);
          });
        }, 550);

        // ─── Phase 7: Cleanup after all animations done ───
        setTimeout(() => {
          overlay.style.cssText = 'position:fixed;z-index:999;pointer-events:none;opacity:0;';
          btn.style.pointerEvents = '';
          // Remove animation classes so normal display works
          if(ss)     ss.classList.remove('cinematic-entry');
          if(panelW) { panelW.classList.remove('home-slide','home-in'); }
          if(panelD) { panelD.classList.remove('home-dark','home-in'); }
          if(topB)   { topB.classList.remove('home-bar','home-in'); }
          if(botB)   { botB.classList.remove('home-bar','home-in'); }
          reveals.forEach(el => el.classList.remove('revealed'));
        }, 2200);
      });
    });
  }, 650);
}


// ═══ LOOP ═══
function loop(ts) {
  if(!gameActive && !deathTime){return;}
  animId=requestAnimationFrame(loop);
  const dt=Math.min(ts-lastFrame, 80);
  lastFrame=ts;

  if(!gamePaused && player.alive) {
    gameTime+=dt;
    const ti=tickInterval();
    if(ts-lastTick>=ti){gameTick(); lastTick=ts;}
    tickT=Math.min(1,(ts-lastTick)/Math.max(1,tickInterval()));

    // Enemy movement: independent real-time clock, unaffected by player speed
    enemyAccum+=dt;
    if(enemyAccum>=ENEMY_TICK_BASE){
      enemies.forEach(e=>{ e.prev=e.body.map(s=>({...s})); });
      updateEnemies();
      enemyAccum-=ENEMY_TICK_BASE;
    }
    enemyTickT=Math.min(1,enemyAccum/ENEMY_TICK_BASE);

    if(ts-lastBulletTick>=Math.max(60, BULLET_TICK - threatLevel*8)){updateBullets(); lastBulletTick=ts;}
    if(ts-lastSpeedTS>=SPEED_ITEM_CD){trySpawnSpeed(); lastSpeedTS=ts;}
    trySpawnEnemy(ts);
    checkThreatEscalation();
    updateTimers(dt);
    lerpSpeed(dt);
    if(player.lCD>0) player.lCD-=dt;
    updateHUD();
  }
  render();
}

function tickInterval() {
  let t=BASE_TICK/player.speedMult;
  if(player.upg.spd>=1) t/=1.2;
  if(player.upg.spd>=2) t/=1.2;
  return Math.max(50,t);
}

function updateTimers(dt) {
  walls=walls.filter(w=>{w.life-=dt;return w.life>0;});
  speedItems=speedItems.filter(s=>{s.life-=dt;return s.life>0;});
  player.effects=player.effects.filter(e=>{e.life-=dt;return e.life>0;});
  if(laserVis){laserVis.life-=dt; if(laserVis.life<=0)laserVis=null;}
  enemies.forEach(e=>{if(e.slowTimer>0)e.slowTimer-=dt;});
  if(threatNotif){threatNotif.life-=dt; if(threatNotif.life<=0)threatNotif=null;}
  recalcSpeed();

  // Combo reset if player hasn't eaten in COMBO_RESET_MS
  if(combo>0 && gameTime-lastFoodTS>COMBO_RESET_MS){
    combo=0; comboMult=1;
  }
}


// ═══ TICK ═══
function gameTick() {
  player.prev=player.body.map(s=>({...s}));
  const newDir={...player.ndir};
  const isReverse = newDir.x===-player.dir.x && newDir.y===-player.dir.y;

  // ── QuickTurn 180° reversal: reverse the body array so old tail becomes new head ──
  if(isReverse && player.upg.quickTurn && player.body.length>=2){
    player.body.reverse();
    // Set prev to match reversed body so there's no interpolation jump on the reversal frame
    player.prev=player.body.map(s=>({...s}));
    player.dir=newDir;
    player.ndir=newDir;
    // After reversal, move one step in the new direction
    const h=player.body[0];
    const nh={x:h.x+player.dir.x, y:h.y+player.dir.y};
    if(nh.x<0||nh.x>=gCols||nh.y<0||nh.y>=gRows){deathTransition();return;}
    if(isWall(nh.x,nh.y)){deathTransition();return;}
    if(player.body.some(s=>s.x===nh.x&&s.y===nh.y)){deathTransition();return;}
    player.body.unshift(nh);
    if(player.grow>0) player.grow--; else player.body.pop();
    syncPrev(player);
    if(food&&nh.x===food.x&&nh.y===food.y) eatFood();
    speedItems=speedItems.filter(it=>{
      if(nh.x===it.x&&nh.y===it.y){applySpeed(it.type);return false;}
      return true;
    });
    xpBalls=xpBalls.filter(b=>{
      if(nh.x===b.x&&nh.y===b.y){addXP();return false;}
      return true;
    });
    return;
  }

  // ── Normal movement ──
  player.dir={...newDir};
  const h=player.body[0];
  const nh={x:h.x+player.dir.x, y:h.y+player.dir.y};

  if(nh.x<0||nh.x>=gCols||nh.y<0||nh.y>=gRows){deathTransition();return;}
  if(isWall(nh.x,nh.y)){deathTransition();return;}
  if(player.body.some(s=>s.x===nh.x&&s.y===nh.y)){deathTransition();return;}

  player.body.unshift(nh);
  if(player.grow>0) player.grow--; else player.body.pop();
  syncPrev(player);

  if(food&&nh.x===food.x&&nh.y===food.y) eatFood();
  speedItems=speedItems.filter(it=>{
    if(nh.x===it.x&&nh.y===it.y){applySpeed(it.type);return false;}
    return true;
  });
  xpBalls=xpBalls.filter(b=>{
    if(nh.x===b.x&&nh.y===b.y){addXP();return false;}
    return true;
  });
}

function syncPrev(snake) {
  while(snake.prev.length<snake.body.length) snake.prev.push({...snake.prev[snake.prev.length-1]});
  while(snake.prev.length>snake.body.length) snake.prev.pop();
}


// ═══ FOOD ═══
function spawnFood() {
  let pos=randomEmpty();
  if(!pos) return food;
  const n=Math.random()<0.5?1:2;
  for(let w=0;w<n;w++){
    for(let a=0;a<12;a++){
      const wc=makeWallNear(pos);
      if(!wc) continue;
      if(bfsOK(player.body[0],pos,wc)){
        walls.push({cells:wc, life:WALL_LIFE_MIN+Math.random()*(WALL_LIFE_MAX-WALL_LIFE_MIN)});
        break;
      }
    }
  }
  return pos;
}

function makeWallNear(food) {
  const len=2+Math.floor(Math.random()*3);
  const horiz=Math.random()<0.5;
  const dist=2+Math.floor(Math.random()*2);
  const side=Math.random()<0.5?1:-1;
  const jit=Math.floor(Math.random()*3)-1;
  let sx,sy;
  if(horiz){sx=food.x-Math.floor(len/2)+jit; sy=food.y+dist*side;}
  else{sx=food.x+dist*side; sy=food.y-Math.floor(len/2)+jit;}
  const cells=[];
  // Build an occupancy set: existing walls + food + player body
  const bodySet = new Set(player ? player.body.map(s=>`${s.x},${s.y}`) : []);
  for(let i=0;i<len;i++){
    const x=horiz?sx+i:sx, y=horiz?sy:sy+i;
    if(x>=0&&x<gCols&&y>=0&&y<gRows
       &&!isWall(x,y)
       &&!(food&&x===food.x&&y===food.y)
       &&!bodySet.has(`${x},${y}`))
      cells.push({x,y});
  }
  return cells.length>=2?cells:null;
}

function eatFood() {
  // ── Combo ──
  combo++;
  if(combo>maxCombo) maxCombo=combo;
  comboMult=Math.min(4, 1 + (combo-1)*0.5);  // ×1 / ×1.5 / ×2 / ×2.5 / ×3 / ×3.5 / ×4 cap
  lastFoodTS=gameTime;

  const pts=Math.round(10*comboMult);
  score+=pts;
  player.grow++;

  Audio.sfxEat(combo);
  if(combo>=2) { Audio.sfxCombo(combo); flash(`COMBO ×${combo}  +${pts}`); }
  else flash('');

  const toSpawn=Math.random()<0.45?2:1;
  for(let i=0;i<toSpawn&&xpBalls.length<XP_MAP_CAP;i++){
    const p=randomEmpty(); if(p)xpBalls.push(p);
  }
  food=spawnFood();
}

function trySpawnSpeed() {
  if(speedItems.length>=2) return;
  const pos=randomEmpty(); if(!pos) return;
  speedItems.push({x:pos.x,y:pos.y,type:Math.random()<0.5?'up':'down',life:SPEED_DUR});
}

function applySpeed(type) {
  type==='up' ? Audio.sfxSpeedUp() : Audio.sfxSpeedDown();
  const ex=player.effects.find(e=>e.type===type);
  if(ex){ex.life=SPEED_DUR;ex.stacks++;}
  else{player.effects.push({type,life:SPEED_DUR,stacks:1});}
  recalcSpeed();
}

function recalcSpeed() {
  let m=1;
  player.effects.forEach(e=>{
    const f=e.type==='up'?1.5:(1/1.5);
    for(let i=0;i<e.stacks;i++) m*=f;
  });
  player.speedTarget=Math.max(0.2,Math.min(8,m));
}

// Smooth speed transition — called each frame with dt in ms
function lerpSpeed(dt) {
  const rate=3.0; // convergence speed: ~330ms to reach 95% of target
  const t=1-Math.exp(-rate*dt/1000);
  player.speedMult+=(player.speedTarget-player.speedMult)*t;
  // Snap if very close
  if(Math.abs(player.speedMult-player.speedTarget)<0.005) player.speedMult=player.speedTarget;
}

function addXP() {
  Audio.sfxXP();
  xp++;
  if(xp>=xpNeeded){xp=0;xpNeeded+=3;doLevelUp();}
}

function doLevelUp() {
  level++;
  gCols+=5; gRows+=5; recalcCell(); resizeGame();
  Audio.stopBGM();
  Audio.sfxLevelUp();
  gamePaused=true; selectedEvo=null;
  document.getElementById('evoWarn').textContent='';
  document.getElementById('evoScreen').classList.add('show');
  drawEvoTree();
  startEvoRedraw();
  flash('等级提升！地图扩大');
}


// ═══ ENEMIES ═══
function trySpawnEnemy(ts) {
  if(gameTime<ENEMY_DELAY) return;
  const maxE=1+Math.floor((gameTime-ENEMY_DELAY)/40000);
  if(enemies.length>=maxE) return;
  if(ts-lastEnemyTS<ENEMY_SPAWN_CD) return;
  let pos=null;
  for(let a=0;a<200;a++){
    const x=Math.floor(Math.random()*gCols),y=Math.floor(Math.random()*gRows);
    const d=Math.abs(x-player.body[0].x)+Math.abs(y-player.body[0].y);
    if(d>=7&&!isWall(x,y)&&!(food&&x===food.x&&y===food.y)){pos={x,y};break;}
  }
  if(!pos) return;
  enemies.push({body:[{...pos}],prev:[{...pos}],dir:{x:1,y:0},bCD:ENEMY_BULLET_CD+Math.random()*3000,slowTimer:0,grow:0});
  lastEnemyTS=ts;
}

const THREAT_MSGS=[
  '威胁等级上升 — 敌蛇反应加快',
  '警告 — 敌蛇弹道速度提升',
  '危险 — 新增敌蛇上限',
  '极危 — 所有威胁强化',
  '终极威胁 — 全面压制',
];
function checkThreatEscalation() {
  if(gameTime<ENEMY_DELAY) return;
  const elapsed=gameTime-ENEMY_DELAY;
  const newLevel=Math.floor(elapsed/THREAT_INTERVAL)+1;
  if(newLevel>threatLevel){
    threatLevel=newLevel;
    const msg=THREAT_MSGS[Math.min(threatLevel-1,THREAT_MSGS.length-1)];
    threatNotif={text:`⚠ THREAT LV.${threatLevel}  ${msg}`, life:4000};
    Audio.sfxThreat();
  }
}

function updateEnemies() {
  const ws=wallKeySet();
  for(let ei=enemies.length-1;ei>=0;ei--){
    const e=enemies[ei];
    if(e.slowTimer>0&&Math.random()<0.35){e.bCD-=tickInterval()*2;checkEnemyBullet(e,ei);continue;}

    const target=food||player.body[0];
    const obs=new Set(ws);
    e.body.slice(1).forEach(s=>obs.add(`${s.x},${s.y}`));
    const path=astar(e.body[0],target,obs);

    let moved=false;
    if(path&&path.length>0){
      const nx=path[0];
      e.dir={x:nx.x-e.body[0].x,y:nx.y-e.body[0].y};
      e.body.unshift(nx); moved=true;
    } else {
      const dirs=[[1,0],[-1,0],[0,1],[0,-1]].sort(()=>Math.random()-.5);
      for(const [dx,dy] of dirs){
        const nx=e.body[0].x+dx,ny=e.body[0].y+dy;
        if(nx>=0&&nx<gCols&&ny>=0&&ny<gRows&&!ws.has(`${nx},${ny}`)&&!e.body.some(s=>s.x===nx&&s.y===ny)){
          e.dir={x:dx,y:dy}; e.body.unshift({x:nx,y:ny}); moved=true; break;
        }
      }
    }
    if(!moved){e.bCD-=tickInterval()*2;checkEnemyBullet(e,ei);continue;}
    if(e.grow>0)e.grow--; else e.body.pop();
    // prev was already captured pre-move at the start of gameTick.
    // syncPrev just adjusts array length to match body after grow/shrink.
    syncPrev(e);

    const eh=e.body[0];
    if(food&&eh.x===food.x&&eh.y===food.y){score-=5;e.grow++;food=spawnFood();}
    const pi=player.body.findIndex(s=>s.x===eh.x&&s.y===eh.y);
    if(pi>=0){
      if(player.body.length>1){player.body.splice(pi,1);score=Math.max(0,score-20);}
      else{deathTransition();return;}
    }
    e.bCD-=tickInterval()*2;
    checkEnemyBullet(e,ei);
  }
}

function checkEnemyBullet(e,ei) {
  if(e.bCD<=0){fireEnemyBullet(e);e.bCD=ENEMY_BULLET_CD;}
}


// ═══ BULLETS ═══
function fireEnemyBullet(enemy) {
  const eh=enemy.body[0];
  const ws=wallKeySet();
  const targets=[player.body[player.body.length-1],player.body[0]];
  for(const tgt of targets){
    const tdx=tgt.x-eh.x,tdy=tgt.y-eh.y;
    for(const[dx,dy] of[[1,0],[-1,0],[0,1],[0,-1]]){
      const ok=(dx===1&&tdx>0&&tdy===0)||(dx===-1&&tdx<0&&tdy===0)||
               (dy===1&&tdy>0&&tdx===0)||(dy===-1&&tdy<0&&tdx===0);
      if(ok&&hasLOS(eh,tgt,dx,dy,ws)){bullets.push({x:eh.x,y:eh.y,dx,dy});return;}
    }
  }
  if(enemy.dir.x!==0||enemy.dir.y!==0) bullets.push({x:eh.x,y:eh.y,dx:enemy.dir.x,dy:enemy.dir.y});
}

function hasLOS(from,to,dx,dy,ws) {
  let x=from.x+dx,y=from.y+dy;
  while(x>=0&&x<gCols&&y>=0&&y<gRows){
    if(ws.has(`${x},${y}`)) return false;
    if(x===to.x&&y===to.y) return true;
    x+=dx;y+=dy;
  }
  return false;
}

function updateBullets() {
  if(!player.alive) return;
  const ws=wallKeySet();
  bullets=bullets.filter(b=>{
    b.x+=b.dx; b.y+=b.dy;
    if(b.x<0||b.x>=gCols||b.y<0||b.y>=gRows) return false;
    if(ws.has(`${b.x},${b.y}`)) return false;
    const hi=player.body.findIndex(s=>s.x===b.x&&s.y===b.y);
    if(hi>=0){
      if(player.body.length>1){player.body.splice(hi,1);score=Math.max(0,score-20);bulletHits++;Audio.sfxBulletHit();flash('被子弹击中！-20分');}
      else{deathTransition();}
      return false;
    }
    return true;
  });
}


// ═══ LASER ═══
function fireLaser() {
  if(!gameActive||gamePaused||!player.alive) return;
  const cdMs=LASER_CD_BASE*player.upg.laserCD;
  if(player.lCD>0) return;
  player.lCD=cdMs;
  Audio.sfxLaser();
  const dir=player.dir;
  const perp={x:dir.y,y:-dir.x};
  const n=player.upg.laserN;
  const ws=wallKeySet();

  const offsets=[];
  if(n===1) offsets.push({ox:0,oy:0});
  else if(n===2){offsets.push({ox:perp.x*-1,oy:perp.y*-1});offsets.push({ox:perp.x,oy:perp.y});}
  else{offsets.push({ox:perp.x*-1,oy:perp.y*-1});offsets.push({ox:0,oy:0});offsets.push({ox:perp.x,oy:perp.y});}

  const beams=[];  // each beam: {sx, sy, cells:[]}
  offsets.forEach(off=>{
    const sx=player.body[0].x+off.ox, sy=player.body[0].y+off.oy;
    if(sx<0||sx>=gCols||sy<0||sy>=gRows||ws.has(`${sx},${sy}`)) return;
    let x=sx,y=sy,pierce=player.upg.pierce?1:0;
    const beamCells=[];
    while(true){
      x+=dir.x; y+=dir.y;
      if(x<0||x>=gCols||y<0||y>=gRows) break;
      if(ws.has(`${x},${y}`)) break;
      beamCells.push({x,y});
      let hitCell=false;
      for(let ei=enemies.length-1;ei>=0;ei--){
        const e=enemies[ei];
        const si=e.body.findIndex(s=>s.x===x&&s.y===y);
        if(si<0) continue;
        hitCell=true;
        score+=15*player.upg.laserDmg;
        laserHits++;
        Audio.sfxEnemyHit();
        for(let d=0;d<player.upg.laserDmg;d++){
          if(e.body.length>1) e.body.pop();
          else{score+=50;killCount++;Audio.sfxEnemyDeath();enemies.splice(ei,1);break;}
        }
        if(player.upg.slow&&enemies[ei]) enemies[ei].slowTimer=3000;
      }
      if(hitCell&&pierce<=0) break;
      if(hitCell) pierce--;
    }
    if(beamCells.length>0) beams.push({sx,sy,cells:beamCells});
  });
  laserVis={beams,life:LASER_VIS_MS};
}


// ═══ INPUT ═══
function onKey(e) {
  // Enter on game-over screen → restart with transition
  if(e.key==='Enter'){
    const go=document.getElementById('goScreen');
    if(go&&go.classList.contains('show')){
      e.preventDefault();
      const btn=document.getElementById('redeployBtn');
      if(btn) launchRedeploy(btn);
      else { Audio.init(); Audio.resume(); if(gameMode==='3d')startGame3D();else startGame(); }
      return;
    }
  }
  if(!gameActive) return;
  if(gamePaused) return;

  // 3D mode input
  if(gameMode==='3d' && cube3D.active){
    const map3d={ArrowUp:0,ArrowRight:1,ArrowDown:2,ArrowLeft:3,w:0,W:0,d:1,D:1,s:2,S:2,a:3,A:3};
    const sd=map3d[e.key];
    if(sd!==undefined){cube3D.handleKey(sd);e.preventDefault();return;}
    if(e.key===' '||e.key==='j'||e.key==='J'){cube3D.fireShockwave();e.preventDefault();return;}
    if(e.key==='m'||e.key==='M'){toggleMute();e.preventDefault();}
    return;
  }

  const dm={'ArrowUp':{x:0,y:-1},'w':{x:0,y:-1},'W':{x:0,y:-1},
            'ArrowDown':{x:0,y:1},'s':{x:0,y:1},'S':{x:0,y:1},
            'ArrowLeft':{x:-1,y:0},'a':{x:-1,y:0},'A':{x:-1,y:0},
            'ArrowRight':{x:1,y:0},'d':{x:1,y:0},'D':{x:1,y:0}};
  const nd=dm[e.key];
  if(nd){
    const curDir=player.dir;
    const rev=nd.x===-curDir.x&&nd.y===-curDir.y;
    if(!rev||player.upg.quickTurn||player.body.length===1) player.ndir=nd;
    // Early tick: if past 60% of interval, trigger tick now for snappy response
    const now=performance.now();
    if(tickT>0.6 && player.alive && !gamePaused && now-lastTick>60){
      gameTick(); lastTick=now;
    }
    e.preventDefault(); return;
  }
  if(e.key==='j'||e.key==='J'){fireLaser();e.preventDefault();}
  if(e.key==='m'||e.key==='M'){toggleMute();e.preventDefault();}
  if(e.key==='F2'){debugLevelUp();e.preventDefault();}
}

// ── Debug: instantly trigger level-up / open evo screen ──
function debugLevelUp() {
  if(!gameActive) return;
  doLevelUp();
}


// ═══════════════════════════════════════════════════════════
// ═══ RENDER ═══
// ═══════════════════════════════════════════════════════════
function render() {
  const W=window.innerWidth, H=window.innerHeight;
  ctx.clearRect(0,0,W,H);

  // Death screen shake
  if(deathTime){
    const elapsed = performance.now() - deathTime;
    if(elapsed < 400){
      const intensity = (1 - elapsed/400) * 8;
      deathShakeX = (Math.random()-0.5) * intensity;
      deathShakeY = (Math.random()-0.5) * intensity;
    } else { deathShakeX=0; deathShakeY=0; }
    ctx.save();
    ctx.translate(deathShakeX, deathShakeY);
  }

  // Body background
  ctx.fillStyle='#111110'; ctx.fillRect(0,0,W,H);

  const ox=Math.floor((W-gCols*cS)/2);
  const oy=HUD_H+Math.floor((H-HUD_H-gRows*cS)/2);

  // ── Board background ──
  // Outer shadow/margin
  ctx.fillStyle='#0A0A09';
  ctx.fillRect(ox-8,oy-8,gCols*cS+16,gRows*cS+16);

  // Board face - cream
  ctx.fillStyle='#DEDAD0';
  ctx.fillRect(ox,oy,gCols*cS,gRows*cS);

  // Grid lines - fine, stone color
  ctx.strokeStyle='#C0BAB0'; ctx.lineWidth=0.6;
  for(let x=0;x<=gCols;x++){
    ctx.beginPath();ctx.moveTo(ox+x*cS,oy);ctx.lineTo(ox+x*cS,oy+gRows*cS);ctx.stroke();
  }
  for(let y=0;y<=gRows;y++){
    ctx.beginPath();ctx.moveTo(ox,oy+y*cS);ctx.lineTo(ox+gCols*cS,oy+y*cS);ctx.stroke();
  }

  // Board border - double line, orange accent
  ctx.strokeStyle='#1A1A18'; ctx.lineWidth=2.5;
  ctx.strokeRect(ox,oy,gCols*cS,gRows*cS);
  ctx.strokeStyle='#E8640A'; ctx.lineWidth=1;
  ctx.strokeRect(ox+3,oy+3,gCols*cS-6,gRows*cS-6);

  // Corner marks
  const cm=10;
  ctx.fillStyle='#E8640A';
  [[ox,oy],[ox+gCols*cS,oy],[ox,oy+gRows*cS],[ox+gCols*cS,oy+gRows*cS]].forEach(([px,py])=>{
    ctx.fillRect(px-2,py-2,4,4);
  });
  // Corner tick lines
  ctx.strokeStyle='#E8640A'; ctx.lineWidth=1.5;
  [[ox,oy,1,1],[ox+gCols*cS,oy,-1,1],[ox,oy+gRows*cS,1,-1],[ox+gCols*cS,oy+gRows*cS,-1,-1]].forEach(([px,py,sx,sy])=>{
    ctx.beginPath();ctx.moveTo(px+sx*2,py);ctx.lineTo(px+sx*cm,py);ctx.stroke();
    ctx.beginPath();ctx.moveTo(px,py+sy*2);ctx.lineTo(px,py+sy*cm);ctx.stroke();
  });

  const GCX=x=>ox+x*cS+cS/2;
  const GCY=y=>oy+y*cS+cS/2;

  // ── Walls ──
  walls.forEach(w=>{
    const alpha=w.life<5000?(w.life/5000):1;
    w.cells.forEach(c=>{
      const wx=ox+c.x*cS, wy=oy+c.y*cS;
      // Dark fill
      ctx.fillStyle=`rgba(20,18,16,${0.92*alpha})`;
      ctx.fillRect(wx+1,wy+1,cS-2,cS-2);
      // Orange border
      ctx.strokeStyle=`rgba(232,100,10,${0.7*alpha})`;
      ctx.lineWidth=1;
      ctx.strokeRect(wx+1,wy+1,cS-2,cS-2);
      // X mark
      ctx.strokeStyle=`rgba(232,100,10,${0.35*alpha})`;
      ctx.lineWidth=0.8;
      ctx.beginPath();
      ctx.moveTo(wx+4,wy+4);ctx.lineTo(wx+cS-4,wy+cS-4);
      ctx.moveTo(wx+cS-4,wy+4);ctx.lineTo(wx+4,wy+cS-4);
      ctx.stroke();
    });
  });

  // ── Food ──
  if(food){
    const px=GCX(food.x), py=GCY(food.y);
    const t2=(Date.now()%900)/900;
    const pulse=0.88+0.12*Math.sin(t2*Math.PI*2);
    const r=cS*0.30*pulse;
    // Diamond shape
    ctx.save();
    ctx.translate(px,py);ctx.rotate(Math.PI/4);
    ctx.fillStyle='#E8640A';
    ctx.fillRect(-r*0.7,-r*0.7,r*1.4,r*1.4);
    ctx.strokeStyle='#111110'; ctx.lineWidth=1.5;
    ctx.strokeRect(-r*0.7,-r*0.7,r*1.4,r*1.4);
    ctx.restore();
    // Inner dot
    ctx.fillStyle='#F5F0E8';
    ctx.beginPath();ctx.arc(px,py,r*0.22,0,Math.PI*2);ctx.fill();
    // Subtle glow on board
    ctx.fillStyle='rgba(232,100,10,0.08)';
    ctx.beginPath();ctx.arc(px,py,r*2,0,Math.PI*2);ctx.fill();
  }

  // ── Speed items ──
  speedItems.forEach(it=>{
    const px=GCX(it.x), py=GCY(it.y);
    const isUp=it.type==='up';
    const r=cS*0.26;
    const col=isUp?'#E8640A':'#00A896';
    // Background square
    ctx.fillStyle='rgba(20,18,16,0.85)';
    ctx.fillRect(px-r,py-r,r*2,r*2);
    ctx.strokeStyle=col; ctx.lineWidth=1.5;
    ctx.strokeRect(px-r,py-r,r*2,r*2);
    // Arrow
    ctx.fillStyle=col;
    ctx.beginPath();
    if(isUp){
      ctx.moveTo(px,py-r*0.55);ctx.lineTo(px+r*0.55,py+r*0.4);ctx.lineTo(px-r*0.55,py+r*0.4);
    } else {
      ctx.moveTo(px,py+r*0.55);ctx.lineTo(px+r*0.55,py-r*0.4);ctx.lineTo(px-r*0.55,py-r*0.4);
    }
    ctx.closePath();ctx.fill();
  });

  // ── XP balls ──
  xpBalls.forEach(b=>{
    const px=GCX(b.x), py=GCY(b.y);
    const t3=(Date.now()%1400)/1400;
    const r=cS*0.21*(0.9+0.1*Math.sin(t3*Math.PI*2));
    // Teal circle with dark background
    ctx.fillStyle='rgba(20,18,16,0.8)';
    ctx.beginPath();ctx.arc(px,py,r*1.3,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#00A896'; ctx.lineWidth=1.5;
    ctx.beginPath();ctx.arc(px,py,r,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle='#00A896';
    ctx.beginPath();ctx.arc(px,py,r*0.45,0,Math.PI*2);ctx.fill();
  });

  // ── Enemy bullets ──
  bullets.forEach(b=>{
    const px=GCX(b.x), py=GCY(b.y);
    const r=cS*0.15;
    ctx.fillStyle='#C8281E';
    ctx.beginPath();ctx.arc(px,py,r,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='rgba(200,40,30,0.25)';
    ctx.beginPath();ctx.arc(px,py,r*2.2,0,Math.PI*2);ctx.fill();
  });

  // ── Laser beam ──
  if(laserVis&&laserVis.beams&&laserVis.beams.length>0&&player){
    const alpha=Math.max(0,laserVis.life/LASER_VIS_MS);
    ctx.save();
    ctx.globalAlpha=alpha;
    ctx.lineCap='square';
    laserVis.beams.forEach(beam=>{
      if(beam.cells.length===0) return;
      const startX=GCX(beam.sx), startY=GCY(beam.sy);
      const endC=beam.cells[beam.cells.length-1];
      const endX=GCX(endC.x), endY=GCY(endC.y);
      // Outer wide glow
      ctx.strokeStyle='rgba(232,100,10,0.18)'; ctx.lineWidth=cS*0.55;
      ctx.beginPath();ctx.moveTo(startX,startY);ctx.lineTo(endX,endY);ctx.stroke();
      // Core beam
      ctx.strokeStyle='#E8640A'; ctx.lineWidth=cS*0.12;
      ctx.beginPath();ctx.moveTo(startX,startY);ctx.lineTo(endX,endY);ctx.stroke();
      // White center
      ctx.strokeStyle='rgba(255,240,220,0.9)'; ctx.lineWidth=cS*0.04;
      ctx.beginPath();ctx.moveTo(startX,startY);ctx.lineTo(endX,endY);ctx.stroke();
    });
    ctx.restore();
  }

  // ── Draw hex cell ──
  function drawHex(c,hx,hy,r,fillCol,borderCol){
    c.beginPath();
    for(let i=0;i<6;i++){
      const ang=Math.PI/6+i*Math.PI/3;
      const px=hx+r*Math.cos(ang), py=hy+r*Math.sin(ang);
      i===0?c.moveTo(px,py):c.lineTo(px,py);
    }
    c.closePath();
    c.fillStyle=fillCol; c.fill();
    c.strokeStyle=borderCol; c.lineWidth=1.4; c.stroke();
  }

  // ── Draw snake ──
  function drawSnake(snake,isPlayer){
    if(!snake.body.length) return;
    const N=snake.body.length;
    const t = isPlayer ? tickT : enemyTickT;

    for(let i=N-1;i>=0;i--){
      const cur=snake.body[i], prv=snake.prev[i]||cur;
      const ix=ox+cS*(prv.x+(cur.x-prv.x)*t)+cS/2;
      const iy=oy+cS*(prv.y+(cur.y-prv.y)*t)+cS/2;
      const r=cS*0.42;
      const fade=Math.max(0.35,1-i/N*0.55);

      let fill,border;
      if(isPlayer){
        // Dark charcoal body, orange accents toward head
        const hue=i===0?'#E8640A':i<3?'#2A2926':'#222220';
        fill=hue;
        border=i===0?'#F5920A':'#111110';
      } else {
        fill=i===0?'#C8281E':i<3?'#381A18':'#2A1412';
        border=i===0?'#E83020':'#111110';
      }

      // Slight opacity fade for tail
      if(fade<1){ ctx.save(); ctx.globalAlpha=fade*0.85+0.15; }
      drawHex(ctx,ix,iy,r,fill,border);
      if(fade<1) ctx.restore();
    }

    // Head detail: eyes
    const hCur=snake.body[0], hPrv=snake.prev[0]||hCur;
    const hx=ox+cS*(hPrv.x+(hCur.x-hPrv.x)*t)+cS/2;
    const hy=oy+cS*(hPrv.y+(hCur.y-hPrv.y)*t)+cS/2;
    const d=snake.dir||{x:1,y:0};
    const perp={x:d.y,y:-d.x};
    const eyeR=cS*0.075, eyeOff=cS*0.17, eyeFwd=cS*0.15;
    [[1],[-1]].forEach(([s])=>{
      const ex=hx+d.x*eyeFwd+perp.x*eyeOff*s;
      const ey=hy+d.y*eyeFwd+perp.y*eyeOff*s;
      ctx.fillStyle='#EDEAE2';
      ctx.beginPath();ctx.arc(ex,ey,eyeR,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#0A0A09';
      ctx.beginPath();ctx.arc(ex+d.x*eyeR*0.35,ey+d.y*eyeR*0.35,eyeR*0.5,0,Math.PI*2);ctx.fill();
    });
  }

  enemies.forEach(e=>drawSnake(e,false));
  if(player&&player.alive) drawSnake(player,true);

  // ── Laser cooldown arc on board (near head) ──
  if(player&&player.alive&&player.lCD>0){
    const hCur=player.body[0], hPrv=player.prev[0]||hCur;
    const hx=ox+cS*(hPrv.x+(hCur.x-hPrv.x)*tickT)+cS/2;
    const hy=oy+cS*(hPrv.y+(hCur.y-hPrv.y)*tickT)+cS/2;
    const cdMs=LASER_CD_BASE*player.upg.laserCD;
    const frac=player.lCD/cdMs;
    ctx.beginPath();
    ctx.arc(hx,hy,cS*0.52,-Math.PI/2,-Math.PI/2+Math.PI*2*frac);
    ctx.strokeStyle='rgba(232,100,10,0.5)'; ctx.lineWidth=2; ctx.stroke();
  }

  // ── Enemy countdown ──
  if(player&&gameTime<ENEMY_DELAY){
    const remaining=Math.ceil((ENEMY_DELAY-gameTime)/1000);
    ctx.font=`bold 10px 'Share Tech Mono', monospace`;
    ctx.fillStyle='rgba(20,18,16,0.45)';
    ctx.textAlign='right';
    ctx.fillText(`ENEMY IN ${remaining}s`, ox+gCols*cS-8, oy+gRows*cS-8);
    ctx.textAlign='left';
  }

  // ── Threat escalation banner ──
  if(threatNotif&&threatNotif.life>0){
    const alpha=Math.min(1, threatNotif.life/600) * Math.min(1,(threatNotif.life)/200<1?threatNotif.life/200:1);
    const fadedAlpha=Math.min(1, threatNotif.life/400);
    const bw=Math.min(gCols*cS, 580);
    const bx=ox+(gCols*cS-bw)/2;
    const by=oy+14;
    ctx.save();
    ctx.globalAlpha=fadedAlpha;
    ctx.fillStyle='#C8281E';
    ctx.fillRect(bx, by, bw, 28);
    ctx.fillStyle='rgba(200,40,30,0.3)';
    ctx.fillRect(bx-2, by-2, bw+4, 32);
    ctx.font=`bold 11px 'Share Tech Mono', monospace`;
    ctx.fillStyle='#F8F6F2';
    ctx.textAlign='center';
    ctx.fillText(threatNotif.text, ox+gCols*cS/2, by+18);
    ctx.textAlign='left';
    ctx.restore();
  }

  // ── Combo flash on board ──
  if(combo>=2&&gameTime-lastFoodTS<500){
    const frac=(gameTime-lastFoodTS)/500;
    const alpha=(1-frac)*0.9;
    const hCur=player&&player.body[0];
    if(hCur){
      const px=GCX(hCur.x), py=GCY(hCur.y)-cS*0.8;
      ctx.save();
      ctx.globalAlpha=alpha;
      ctx.font=`bold ${Math.round(cS*0.55)}px 'Barlow Condensed', sans-serif`;
      ctx.fillStyle='#E8640A';
      ctx.textAlign='center';
      ctx.fillText(`COMBO ×${combo}`, px, py);
      ctx.restore();
    }
  }

  // ── Death transition overlay ──
  if(deathTime){
    // Restore shake transform first so overlays are stable
    ctx.restore();

    const elapsed = performance.now() - deathTime;

    // Phase 1: Red flash (0-250ms)
    if(elapsed < 250){
      const flashAlpha = (1 - elapsed/250) * 0.55;
      ctx.fillStyle = `rgba(200,40,30,${flashAlpha})`;
      ctx.fillRect(0,0,W,H);
    }

    // Phase 2: Gradual darken with vignette (200ms-1600ms)
    if(elapsed > 200){
      const darkProgress = Math.min(1, (elapsed-200)/1400);
      const darkAlpha = darkProgress * darkProgress * 0.92;
      ctx.fillStyle = `rgba(6,5,10,${darkAlpha})`;
      ctx.fillRect(0,0,W,H);

      // Vignette closing in
      const vigR = Math.max(50, W*0.7*(1-darkProgress*0.6));
      const vig = ctx.createRadialGradient(W/2,H/2,vigR*0.3,W/2,H/2,vigR);
      vig.addColorStop(0,'rgba(6,5,10,0)');
      vig.addColorStop(1,`rgba(6,5,10,${darkProgress*0.7})`);
      ctx.fillStyle = vig;
      ctx.fillRect(0,0,W,H);

      // Noise/scanline effect
      if(darkProgress > 0.2){
        const noiseAlpha = Math.min(0.12, (darkProgress-0.2)*0.15);
        ctx.fillStyle = `rgba(255,255,255,${noiseAlpha})`;
        for(let i=0;i<Math.floor(darkProgress*60);i++){
          const nx=Math.random()*W, ny=Math.random()*H;
          ctx.fillRect(nx,ny,1,1);
        }
        // Horizontal glitch lines
        if(Math.random()<darkProgress*0.3){
          const gy=Math.random()*H, gh=1+Math.random()*2;
          ctx.fillStyle=`rgba(200,40,30,${0.08+darkProgress*0.12})`;
          ctx.fillRect(0,gy,W,gh);
        }
      }

      // "SIGNAL LOST" text fade in
      if(darkProgress > 0.5){
        const txtAlpha = (darkProgress-0.5)*2;
        ctx.save();
        ctx.globalAlpha = txtAlpha * 0.6;
        ctx.font = `bold ${Math.round(cS*0.8)}px 'Share Tech Mono', monospace`;
        ctx.fillStyle = '#C8281E';
        ctx.textAlign = 'center';
        ctx.fillText('/// SIGNAL LOST ///', W/2, H/2);
        if(Math.floor(performance.now()/400)%2===0){
          ctx.font = `${Math.round(cS*0.4)}px 'Share Tech Mono', monospace`;
          ctx.fillStyle = 'rgba(200,40,30,0.4)';
          ctx.fillText('OPERATOR TERMINATED', W/2, H/2+cS*0.7);
        }
        ctx.textAlign = 'left';
        ctx.restore();
      }
    }
  }
}

