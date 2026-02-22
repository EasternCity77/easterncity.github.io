'use strict';

// ═══ ui.js ═══
// Evolution tree, HUD, flash, death screen, game over, i18n, goHome, modeToggle

// ═══ EVOLUTION TREE ═══
const EVO_W=820, EVO_H=480;
const EVO_DIV=316;
function curNodes(){return gameMode==='3d'?EVO_NODES_3D:EVO_NODES;}
function curCodes(){return gameMode==='3d'?NODE_CODES_3D:NODE_CODES;}

function drawEvoTree() {
  const c = evoCtx;
  c.clearRect(0, 0, EVO_W, EVO_H);

  // ── Deep dark base ──
  c.fillStyle = '#07090E';
  c.fillRect(0, 0, EVO_W, EVO_H);

  // ── Pixel grid ──
  c.strokeStyle = 'rgba(0,220,160,0.035)';
  c.lineWidth = 0.5;
  const GS = 20;
  for (let x = 0; x < EVO_W; x += GS) { c.beginPath(); c.moveTo(x,0); c.lineTo(x,EVO_H); c.stroke(); }
  for (let y = 0; y < EVO_H; y += GS) { c.beginPath(); c.moveTo(0,y); c.lineTo(EVO_W,y); c.stroke(); }

  // ── Scanlines ──
  for (let y = 0; y < EVO_H; y += 4) {
    c.fillStyle = 'rgba(0,0,0,0.1)';
    c.fillRect(0, y, EVO_W, 1);
  }

  // ── Section backgrounds ──
  // Combat
  c.fillStyle = 'rgba(232,100,10,0.04)';
  c.fillRect(0, 0, EVO_W, EVO_DIV);
  // Mobility
  c.fillStyle = 'rgba(0,168,150,0.04)';
  c.fillRect(0, EVO_DIV, EVO_W, EVO_H - EVO_DIV);

  // ── Section border outlines ──
  c.strokeStyle = 'rgba(232,100,10,0.12)';
  c.lineWidth = 1;
  c.strokeRect(2, 2, EVO_W - 4, EVO_DIV - 4);
  c.strokeStyle = 'rgba(0,168,150,0.12)';
  c.strokeRect(2, EVO_DIV + 2, EVO_W - 4, EVO_H - EVO_DIV - 4);

  // ── Divider line ──
  c.strokeStyle = 'rgba(100,120,150,0.25)';
  c.lineWidth = 1;
  c.setLineDash([6, 8]);
  c.beginPath(); c.moveTo(0, EVO_DIV); c.lineTo(EVO_W, EVO_DIV); c.stroke();
  c.setLineDash([]);

  // ── Section headers ──
  _evoSectionLabel(c, '> COMBAT MODULE', 12, 14, '#E8640A');
  _evoSectionLabel(c, '> MOBILITY MODULE', 12, EVO_DIV + 14, '#00A896');

  // ── Right info panel (x=424 onwards) ──
  _evoInfoPanel(c);

  // ── Connection lines ──
  _evoConnections(c);

  // ── Nodes ──
  curNodes().forEach(n => drawEvoNode(c, n));
}

function _evoSectionLabel(c, text, x, y, col) {
  c.font = '700 9px "Share Tech Mono", monospace';
  c.fillStyle = col;
  c.globalAlpha = 0.5;
  c.fillText(text, x, y);
  c.globalAlpha = 1;
}

function _evoInfoPanel(c) {
  const px = 430, pw = 380, PADL = 18;

  // Panel background
  c.fillStyle = 'rgba(5,8,14,0.7)';
  c.fillRect(px, 8, pw - 8, EVO_H - 16);
  c.strokeStyle = 'rgba(60,80,110,0.3)';
  c.lineWidth = 1;
  c.strokeRect(px, 8, pw - 8, EVO_H - 16);

  // Panel title
  c.font = '700 8px "Share Tech Mono", monospace';
  c.fillStyle = 'rgba(160,180,200,0.4)';
  c.fillText('OPERATOR LOADOUT', px + PADL, 26);
  c.strokeStyle = 'rgba(60,80,110,0.4)';
  c.lineWidth = 0.5;
  c.beginPath(); c.moveTo(px + PADL, 30); c.lineTo(px + pw - 24, 30); c.stroke();

  // List active upgrades
  const active = curNodes().filter(n => unlocked.has(n.id));
  const sectionColors = { combat: '#E8640A', mobility: '#00A896' };

  if (active.length === 0) {
    c.font = '10px "Share Tech Mono", monospace';
    c.fillStyle = 'rgba(60,80,110,0.6)';
    c.fillText('[ NO UPGRADES ACTIVE ]', px + PADL, 58);
  } else {
    let lineY = 48;
    active.forEach((n, i) => {
      const col = sectionColors[n.section];
      // Bullet
      c.fillStyle = col;
      c.fillRect(px + PADL, lineY - 7, 3, 10);
      // Label
      c.font = '700 12px "Barlow Condensed", sans-serif';
      c.fillStyle = '#C8D4E0';
      c.fillText(n.label, px + PADL + 10, lineY);
      // Description
      c.font = '8px "Share Tech Mono", monospace';
      c.fillStyle = 'rgba(100,130,160,0.65)';
      c.fillText(n.desc, px + PADL + 10, lineY + 11);
      lineY += 28;
    });
  }

  // Selected node detail
  if (selectedEvo) {
    const sn = curNodes().find(n => n.id === selectedEvo);
    if (sn) {
      const detY = EVO_H - 120;
      c.fillStyle = 'rgba(232,100,10,0.06)';
      c.fillRect(px, detY, pw - 8, 108);
      c.strokeStyle = 'rgba(232,100,10,0.25)';
      c.lineWidth = 1;
      c.strokeRect(px, detY, pw - 8, 108);

      c.font = '700 8px "Share Tech Mono", monospace';
      c.fillStyle = 'rgba(232,100,10,0.6)';
      c.fillText('SELECTED >', px + PADL, detY + 16);

      c.font = '700 16px "Barlow Condensed", sans-serif';
      c.fillStyle = '#E8640A';
      c.fillText(sn.label, px + PADL, detY + 36);

      c.font = '9px "Share Tech Mono", monospace';
      c.fillStyle = 'rgba(200,180,150,0.8)';
      c.fillText(sn.desc, px + PADL, detY + 52);

      c.font = '700 8px "Share Tech Mono", monospace';
      c.fillStyle = 'rgba(100,130,160,0.5)';
      c.fillText(`CODE: ${curCodes()[sn.id] || sn.id.toUpperCase()}`, px + PADL, detY + 70);

      // Req status
      if (sn.req.length > 0) {
        const reqNames = sn.req.map(r => curNodes().find(x => x.id === r)?.label || r).join(', ');
        c.fillText(`前置: ${reqNames}`, px + PADL, detY + 84);
      }

      // "PRESS CONFIRM" blink
      if (Math.floor(performance.now() / 500) % 2 === 0) {
        c.font = '700 9px "Share Tech Mono", monospace';
        c.fillStyle = '#E8640A';
        c.fillText('[ PRESS CONFIRM TO INSTALL ]', px + PADL, detY + 100);
      }
    }
  }

  // Unlock count
  c.font = '700 9px "Share Tech Mono", monospace';
  c.fillStyle = 'rgba(100,130,160,0.4)';
  c.fillText(`${unlocked.size} / ${curNodes().length}  INSTALLED`, px + PADL, EVO_H - 14);
}

function _evoConnections(c) {
  curNodes().forEach(n => {
    n.req.forEach(rid => {
      const rn = curNodes().find(x => x.id === rid);
      if (!rn) return;
      const unlRn = unlocked.has(rid);
      const unlN  = unlocked.has(n.id);

      const secCol = n.section === 'combat' ? '#E8640A' : '#00A896';
      let lineCol, lineW, dash, alpha;

      if (unlN) {
        lineCol = '#00E878'; lineW = 2; dash = []; alpha = 0.85;
      } else if (unlRn) {
        lineCol = secCol; lineW = 1.5; dash = [5, 4]; alpha = 0.75;
      } else {
        lineCol = '#1A2230'; lineW = 1; dash = [3, 6]; alpha = 0.5;
      }

      c.save();
      c.globalAlpha = alpha;
      c.strokeStyle = lineCol;
      c.lineWidth = lineW;
      c.setLineDash(dash);
      c.lineCap = 'square';

      // Source: right edge center of parent
      const x1 = rn.x + NW, y1 = rn.y + NH / 2;
      // Target: left edge center of child
      const x2 = n.x,        y2 = n.y  + NH / 2;
      const mx = x1 + (x2 - x1) * 0.45;

      if (Math.abs(y1 - y2) < 2) {
        // Straight horizontal
        c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
      } else {
        // Right-angle elbow: horizontal → vertical → horizontal
        c.beginPath();
        c.moveTo(x1, y1);
        c.lineTo(mx, y1);
        c.lineTo(mx, y2);
        c.lineTo(x2, y2);
        c.stroke();
        // Junction dot at bend
        c.setLineDash([]);
        c.fillStyle = lineCol;
        c.beginPath(); c.arc(mx, y1, 2.5, 0, Math.PI*2); c.fill();
        c.beginPath(); c.arc(mx, y2, 2.5, 0, Math.PI*2); c.fill();
      }

      // Arrow tip
      c.setLineDash([]);
      c.globalAlpha = alpha;
      const AS = 6;
      c.fillStyle = lineCol;
      c.beginPath();
      c.moveTo(x2, y2);
      c.lineTo(x2 - AS, y2 - AS * 0.5);
      c.lineTo(x2 - AS, y2 + AS * 0.5);
      c.closePath(); c.fill();

      c.restore();
    });
  });
}

function nodeState(n) {
  if(unlocked.has(n.id)) return 'unlocked';
  if(n.req.every(r=>unlocked.has(r))) return 'available';
  return 'locked';
}

function drawEvoNode(c, n) {
  const st = nodeState(n);
  const sel = selectedEvo === n.id;
  const x = n.x, y = n.y, w = NW, h = NH;
  const secCol = n.section === 'combat' ? '#E8640A' : '#00A896';
  const blink = Math.floor(performance.now() / 420) % 2 === 0;

  // ── State-dependent colors ──
  let bgCol, accentCol, labelCol, descCol, statusTxt, statusCol, glowCol;

  if (st === 'unlocked') {
    bgCol     = 'rgba(0,40,20,0.9)';
    accentCol = '#00E878';
    labelCol  = '#00E878';
    descCol   = 'rgba(0,232,120,0.55)';
    statusTxt = '■ OK';
    statusCol = '#00E878';
    glowCol   = '0,232,120';
  } else if (st === 'available') {
    if (sel) {
      bgCol     = n.section==='combat' ? 'rgba(70,28,0,0.95)' : 'rgba(0,42,38,0.95)';
      accentCol = secCol;
      labelCol  = '#FFFFFF';
      descCol   = 'rgba(255,255,255,0.6)';
      statusTxt = blink ? '▶ SEL' : '  SEL';
      statusCol = secCol;
      glowCol   = n.section==='combat' ? '232,100,10' : '0,168,150';
    } else {
      bgCol     = 'rgba(10,14,22,0.92)';
      accentCol = secCol;
      labelCol  = secCol;
      descCol   = n.section==='combat' ? 'rgba(232,100,10,0.55)' : 'rgba(0,168,150,0.55)';
      statusTxt = '○ RDY';
      statusCol = secCol;
      glowCol   = n.section==='combat' ? '232,100,10' : '0,168,150';
    }
  } else {
    bgCol     = 'rgba(6,8,14,0.85)';
    accentCol = '#141E2A';
    labelCol  = '#1E2E44';
    descCol   = '#111824';
    statusTxt = '× LCK';
    statusCol = '#1E2E44';
    glowCol   = null;
  }

  // ── Glow halo ──
  if (glowCol && (sel || st === 'unlocked')) {
    c.shadowColor   = `rgba(${glowCol},0.7)`;
    c.shadowBlur    = sel ? 16 : 8;
  }

  // ── Background ──
  c.fillStyle = bgCol;
  c.fillRect(x, y, w, h);
  c.shadowBlur = 0;

  // ── Left accent bar (3px) ──
  c.fillStyle = accentCol;
  c.fillRect(x, y, 3, h);

  // ── Corner bracket decoration ──
  const B = 7;
  c.strokeStyle = accentCol;
  c.lineWidth = st === 'locked' ? 0.7 : 1.5;
  // top-left
  c.beginPath(); c.moveTo(x+B+3, y+0.5); c.lineTo(x+0.5, y+0.5); c.lineTo(x+0.5, y+B+3); c.stroke();
  // top-right
  c.beginPath(); c.moveTo(x+w-B-3, y+0.5); c.lineTo(x+w-0.5, y+0.5); c.lineTo(x+w-0.5, y+B+3); c.stroke();
  // bottom-left
  c.beginPath(); c.moveTo(x+B+3, y+h-0.5); c.lineTo(x+0.5, y+h-0.5); c.lineTo(x+0.5, y+h-B-3); c.stroke();
  // bottom-right
  c.beginPath(); c.moveTo(x+w-B-3, y+h-0.5); c.lineTo(x+w-0.5, y+h-0.5); c.lineTo(x+w-0.5, y+h-B-3); c.stroke();

  // ── Pixel dot pattern (subtle) in bg ──
  if (st !== 'locked') {
    c.fillStyle = `rgba(${glowCol||'100,120,140'},0.06)`;
    for (let dx = 10; dx < w-6; dx += 8) {
      for (let dy = 6; dy < h-4; dy += 8) {
        c.fillRect(x+dx, y+dy, 1, 1);
      }
    }
  }

  // ── Node code ID (top-left) ──
  c.font = '8px "Share Tech Mono", monospace';
  c.fillStyle = st === 'locked' ? '#101820' : 'rgba(100,130,160,0.4)';
  c.textAlign = 'left';
  c.fillText(curCodes()[n.id] || n.id.toUpperCase(), x+6, y+11);

  // ── Status badge (top-right) ──
  c.font = '700 8px "Share Tech Mono", monospace';
  c.fillStyle = statusCol;
  c.textAlign = 'right';
  c.fillText(statusTxt, x+w-5, y+11);

  // ── Separator line ──
  c.strokeStyle = `rgba(${glowCol||'20,30,45'},0.35)`;
  c.lineWidth = 0.5;
  c.beginPath(); c.moveTo(x+4, y+15); c.lineTo(x+w-4, y+15); c.stroke();

  // ── Main label ──
  c.font = '700 15px "Barlow Condensed", sans-serif';
  c.fillStyle = labelCol;
  c.textAlign = 'center';
  // Glow text for active
  if (st !== 'locked' && glowCol) {
    c.shadowColor = `rgba(${glowCol},0.6)`;
    c.shadowBlur  = 6;
  }
  c.fillText(n.label, x+w/2, y+h*0.56);
  c.shadowBlur = 0;

  // ── Description ──
  c.font = '8px "Share Tech Mono", monospace';
  c.fillStyle = descCol;
  c.fillText(n.desc, x+w/2, y+h-7);

  c.textAlign = 'left';
}

function onEvoClick(e) {
  const rect = evoCanvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left) * (EVO_W / rect.width);
  const my = (e.clientY - rect.top)  * (EVO_H / rect.height);
  for (const n of curNodes()) {
    if (mx >= n.x && mx <= n.x+NW && my >= n.y && my <= n.y+NH) {
      if (nodeState(n) === 'available') {
        selectedEvo = n.id;
        document.getElementById('evoWarn').textContent = '';
        drawEvoTree();
      } else if (nodeState(n) === 'unlocked') {
        document.getElementById('evoWarn').textContent = '/ 该节点已激活';
      } else {
        document.getElementById('evoWarn').textContent = '/ 需要先解锁前置节点';
      }
      return;
    }
  }
}

let evoRaf = null;
function startEvoRedraw() {
  if (evoRaf) return;
  function loop() {
    if (!document.getElementById('evoScreen').classList.contains('show')) {
      evoRaf = null; return;
    }
    drawEvoTree();
    evoRaf = requestAnimationFrame(loop);
  }
  evoRaf = requestAnimationFrame(loop);
}

function confirmUpgrade() {
  if(!selectedEvo){document.getElementById('evoWarn').textContent='请先选择一个可用节点';return;}
  const upgId = selectedEvo;
  const upgNode = curNodes().find(n=>n.id===upgId);
  unlocked.add(upgId);
  applyUpgradeEffect(upgId);
  selectedEvo=null;
  if (evoRaf) { cancelAnimationFrame(evoRaf); evoRaf = null; }
  document.getElementById('evoScreen').classList.remove('show');

  // Show 3-second countdown overlay before resuming
  const overlay = document.getElementById('countdownOverlay');
  const numEl   = document.getElementById('countdownNum');
  const nameEl  = document.getElementById('countdownUpgName');
  nameEl.textContent = upgNode ? `◈ ${upgNode.label} 已激活` : '';
  overlay.style.display = 'flex';
  let count = 3;
  numEl.textContent = count;
  const tick = setInterval(() => {
    count--;
    if(count <= 0){
      clearInterval(tick);
      overlay.style.display = 'none';
      gamePaused = false;
      Audio.startBGM();
    } else {
      numEl.textContent = count;
    }
  }, 1000);
}

function applyUpgradeEffect(id) {
  const u=player.upg;
  switch(id){
    // 2D
    case'laser2': u.laserN=2; break;
    case'laser3': u.laserN=3; break;
    case'pierce': u.pierce=true; break;
    case'cd1': u.laserCD=4/5; break;
    case'cd2': u.laserCD=3/5; break;
    case'dmg2': u.laserDmg=2; break;
    case'slow': u.slow=true; break;
    case'spd1': u.spd=1; break;
    case'spd2': u.spd=2; break;
    case'qturn': u.quickTurn=true; break;
    // 3D
    case'sw2': u.swRange=3; break;
    case'sw3': u.swRange=4; break;
    case'swcd1': u.swCDMult=0.75; break;
    case'swcd2': u.swCDMult=0.5; break;
    case'wbreak': u.wallBreak=true; break;
    case'spd1_3d': u.spd=1; break;
    case'spd2_3d': u.spd=2; break;
    case'qturn3d': u.quickTurn=true; break;
  }
}


// ═══ HOME ═══
function goToHome() {
  gameActive = false; deathTime = 0;
  Audio.stopBGM();
  if (animId) { cancelAnimationFrame(animId); animId = null; }
  // 3D cleanup
  if (gameMode === '3d') { cube3D.active = false; document.getElementById('minimap3d').classList.remove('show'); }
  const goEl = document.getElementById('goScreen');
  goEl.classList.remove('show');
  goEl.style.opacity = '';
  goEl.style.transition = '';
  document.getElementById('startScreen').style.display = 'flex';
  
  // Refresh hi score display
  const hi = localStorage.getItem('hexsnake_hi');
  const el = document.getElementById('sHiScore');
  if (el) el.textContent = hi ? 'BEST: ' + hi : 'BEST: —';
  
  // Give DOM time to update layout, then init background
  setTimeout(() => {
    initMenuBg();
  }, 100);
}


// ═══ MODE TOGGLE ═══
function toggleGameMode() {
  gameMode = gameMode === '2d' ? '3d' : '2d';
  const sw = document.getElementById('modeSwitch');
  const sA = document.getElementById('modeSideA');
  const sB = document.getElementById('modeSideB');
  if (gameMode === '3d') {
    sw.classList.add('mode3d');
    sA.classList.remove('active');
    sB.classList.add('active');
  } else {
    sw.classList.remove('mode3d');
    sA.classList.add('active');
    sB.classList.remove('active');
  }
  document.getElementById('launchBtn').textContent = gameMode === '2d' ? '▶ 开始任务' : '▶ 进入立方体';
  // Click feedback sound
  try { Audio.init(); Audio.resume(); } catch(e) {}
}
function setGameMode(m) {
  if (m !== gameMode) toggleGameMode();
}


// ═══ GAME OVER ═══
// ═══ DEATH TRANSITION ═══
function deathTransition() {
  if(deathTime) return;  // already dying
  player.alive = false;
  deathTime = performance.now();
  Audio.stopBGM();
  Audio.sfxGameOver();

  // Schedule game over screen after animation completes
  setTimeout(() => {
    gameActive = false;
    _showGameOverScreen();
  }, 1600);
}

// ═══ GAME OVER i18n ═══
let goLang = 'en';  // 'en' or 'cn'
const GO_I18N = {
  go_status:    { en:'SIGNAL RECOVERED · MISSION LOG',  cn:'信号恢复 · 任务日志' },
  go_newrec:    { en:'★ NEW RECORD',                    cn:'★ 新纪录' },
  go_norec:     { en:'MISSION FAILED',                  cn:'任务失败' },
  go_scorelbl:  { en:'FINAL SCORE',                     cn:'最终得分' },
  go_best:      { en:'BEST:',                           cn:'最高:' },
  go_level:     { en:'LEVEL REACHED',                   cn:'到达等级' },
  go_time:      { en:'SURVIVAL TIME',                   cn:'生存时间' },
  go_length:    { en:'FINAL LENGTH',                    cn:'最终长度' },
  go_combo:     { en:'MAX COMBO',                       cn:'最大连击' },
  go_logheader: { en:'COMBAT LOG · DETAILED REPORT',    cn:'战斗日志 · 详细报告' },
  go_kills:     { en:'ENEMY.KILLS',                     cn:'击杀.敌蛇' },
  go_laser:     { en:'LASER.HITS',                      cn:'激光.命中' },
  go_bullet:    { en:'BULLET.DMG',                      cn:'子弹.伤害' },
  go_statusk:   { en:'STATUS',                          cn:'状态' },
  go_statusv:   { en:'TERMINATED',                      cn:'已终止' },
  go_logend:    { en:'LOG.END',                         cn:'日志.结束' },
  go_quick:     { en:'QUICK RESTART',                   cn:'快速重开' },
  go_home:      { en:'← RETURN HOME',                   cn:'← 返回主界面' },
  go_redeploy:  { en:'▶ REDEPLOY',                      cn:'▶ 重新部署' },
};

function applyGoLang() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if(GO_I18N[key]) el.textContent = GO_I18N[key][goLang];
  });
  const btn = document.getElementById('goLangBtn');
  if(btn) btn.textContent = goLang === 'en' ? 'EN → 中文' : '中文 → EN';
}

function toggleGoLang() {
  goLang = goLang === 'en' ? 'cn' : 'en';
  applyGoLang();
}

function _showGameOverScreen() {
  const prevHi = parseInt(localStorage.getItem('hexsnake_hi')||'0');
  const isNew  = score > prevHi;
  if(isNew) localStorage.setItem('hexsnake_hi', score);
  const hiScore = isNew ? score : prevHi;

  // Fill data
  document.getElementById('goScore').textContent    = score;
  if(isNew) document.getElementById('goScore').classList.add('is-record');
  else document.getElementById('goScore').classList.remove('is-record');
  document.getElementById('goHiScore').textContent  = hiScore;
  document.getElementById('goLevel').textContent    = level;
  document.getElementById('goTime').textContent     = Math.floor(gameTime/1000)+'s';
  document.getElementById('goLen').textContent      = player.body.length;
  document.getElementById('goCombo').textContent    = maxCombo;
  document.getElementById('goKills').textContent    = killCount;
  document.getElementById('goLasHits').textContent  = laserHits;
  document.getElementById('goTimeTag').textContent  =
    goLang === 'cn'
      ? '生存 '+Math.floor(gameTime/1000)+'s · LV.'+level
      : 'SURVIVED '+Math.floor(gameTime/1000)+'s · LV.'+level;
  document.getElementById('goBulletHits').textContent =
    bulletHits > 0 ? bulletHits+' HIT' : '0 HIT ✓';

  document.getElementById('goNewRecord').style.display = isNew ? 'block' : 'none';
  document.getElementById('goNoRecord').style.display  = isNew ? 'none'  : 'block';

  // Apply current language
  applyGoLang();

  // Reset animation states
  const bootline = document.getElementById('goBootline');
  const crt = document.getElementById('goCrt');
  const reveals = document.querySelectorAll('#goScreen .go-reveal');
  bootline.className = 'go-bootline';
  crt.classList.remove('visible');
  reveals.forEach(el => el.classList.remove('shown'));

  // Show screen (black initially)
  const goScreen = document.getElementById('goScreen');
  goScreen.style.opacity = '1';
  goScreen.classList.add('show');

  // Phase 1: CRT boot line (horizontal line appears)
  requestAnimationFrame(() => {
    bootline.classList.add('boot-1');

    // Phase 2: Line expands vertically (after 300ms)
    setTimeout(() => {
      bootline.classList.add('boot-2');
    }, 300);

    // Phase 3: Content becomes visible (after expansion)
    setTimeout(() => {
      crt.classList.add('visible');
      initGoBg();
    }, 650);

    // Phase 4: Stagger reveal each element
    setTimeout(() => {
      const sorted = Array.from(reveals);
      sorted.forEach((el, i) => {
        setTimeout(() => el.classList.add('shown'), i * 120);
      });
    }, 750);
  });

  // Cleanup deathTime after full animation
  setTimeout(() => { deathTime = 0; }, 2500);
}


// ═══ HUD ═══
function updateHUD() {
  document.getElementById('hScore').textContent=score;
  document.getElementById('hLevel').textContent=level;
  document.getElementById('hLen').textContent=player.body.length;
  document.getElementById('hTime').textContent=Math.floor(gameTime/1000)+'s';
  document.getElementById('hSpd').textContent='×'+player.speedMult.toFixed(2);

  // Combo display
  const cs=document.getElementById('hComboSeg');
  const cv=document.getElementById('hCombo');
  if(combo>=2){
    cs.style.opacity='1';
    cv.textContent='×'+comboMult.toFixed(1);
    cv.style.color=combo>=4?'#FF3300':combo>=3?'#E8640A':'#F5920A';
  } else {
    cs.style.opacity='0.3';
    cv.textContent='×1.0';
    cv.style.color='#888882';
  }
  const xpPct=Math.min(100,Math.round(xp/xpNeeded*100));
  document.getElementById('xpFill').style.width=xpPct+'%';
  document.getElementById('hXP').textContent=xp+'/'+xpNeeded;

  const cdMs=LASER_CD_BASE*player.upg.laserCD;
  const cdPct=player.lCD<=0?100:Math.max(0,100-(player.lCD/cdMs*100));
  document.getElementById('lasFill').style.width=cdPct+'%';

  const eb=document.getElementById('effectBar');
  eb.innerHTML='';
  player.effects.forEach(ef=>{
    const t=document.createElement('div');
    t.className='effectTag '+(ef.type==='up'?'tagUp':'tagDown');
    const suf=ef.stacks>1?` ×${ef.stacks}`:'';
    t.textContent=(ef.type==='up'?'▲加速':'▼减速')+suf+' '+Math.ceil(ef.life/1000)+'s';
    eb.appendChild(t);
  });
}


// ═══ FLASH ═══
let flashTimer=null;
function flash(msg) {
  const el=document.getElementById('flashMsg');
  el.textContent=msg; el.style.opacity='1';
  if(flashTimer) clearTimeout(flashTimer);
  flashTimer=setTimeout(()=>{el.style.opacity='0';},1800);
}

