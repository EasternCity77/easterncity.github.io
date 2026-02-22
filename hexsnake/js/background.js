'use strict';

// ═══ background.js ═══
// Cassette futurism background engine, demo game preview

// ═══ CASSETTE FUTURISM BACKGROUND ENGINE ═══
// VHS·NASA·Atompunk animated background for all overlay screens
let menuBgRaf = null;

function makeMenuBg(canvasId) {
  const cv = document.getElementById(canvasId);
  if (!cv) return null;
  const cx = cv.getContext('2d');
  let W, H;

  function resize() {
    const parent = cv.parentElement;
    const rect = parent ? parent.getBoundingClientRect() : null;
    W = (rect && rect.width > 0) ? rect.width : window.innerWidth;
    H = (rect && rect.height > 0) ? rect.height : window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    cx.scale(dpr, dpr);
    cx.clearRect(0, 0, W, H);
  }

  // ── Palette ──
  const C = {
    r: '#FF2840', y: '#FFE040', c: '#00F4E8',
    g: '#00FF88', am: '#FFB830', am2: '#FFD060',
  };

  // ── Floating geometric shapes ──
  const COLS = [C.r, C.y, C.c, C.g, C.am];
  const shapes = Array.from({length:26}, () => ({
    x: 0.42 + Math.random()*0.58,  // right 58% only (dark side)
    y: Math.random(),
    vx: (Math.random()-.5)*0.00008,
    vy: (Math.random()-.5)*0.00008,
    r: 7 + Math.random()*22,
    col: COLS[Math.floor(Math.random()*COLS.length)],
    type: Math.floor(Math.random()*4),
    phase: Math.random()*Math.PI*2,
    speed: 0.2 + Math.random()*0.55,
  }));

  // ── Data stream (falling chars) ──
  const CHARS = '01∞Ω△◆●◎∝∮∇ABCDF◈◉◫';
  const streams = Array.from({length:16}, () => ({
    x: 0.42 + Math.random()*0.55,  // right side
    y: Math.random(),
    spd: 0.00022 + Math.random()*0.0005,
    chars: Array.from({length:5+Math.floor(Math.random()*7)}, ()=>CHARS[Math.floor(Math.random()*CHARS.length)]),
    col: COLS[Math.floor(Math.random()*4)],
    alpha: 0.03 + Math.random()*0.045,
  }));

  // ── Radar — right-center area (CRT panel) ──
  let radarAng = 0;
  const BLIPS = [
    {a:0.6, d:0.58, life:0},{a:2.3, d:0.75, life:0},{a:4.1, d:0.42, life:0},
    {a:5.2, d:0.65, life:0},
  ];

  // ── Orbit system ──
  const orbits = [
    {bx:0.73, by:0.26, rx:0.065, ry:0.032, phase:0,   spd:0.009, r:4,   col:C.am},
    {bx:0.73, by:0.26, rx:0.12,  ry:0.060, phase:1.6, spd:0.006, r:3,   col:C.c},
    {bx:0.73, by:0.26, rx:0.18,  ry:0.090, phase:3.2, spd:0.004, r:2.5, col:C.g},
  ];

  // ── Glitch state ──
  let glitchCd = 120 + Math.floor(Math.random()*100);
  let glitchStrips = [];

  // ── VHS Roll artifact ──
  let rollY = -1;
  let rollActive = false;
  let rollCd = 200 + Math.floor(Math.random()*300);

  // ── Scan line ──
  let scanY = 0;
  let t = 0;

  // ── Phosphor bloom pulses ──
  const blooms = Array.from({length:5}, () => ({
    x: 0.5 + Math.random()*0.48,
    y: Math.random(),
    r: 20 + Math.random()*60,
    col: COLS[Math.floor(Math.random()*COLS.length)],
    phase: Math.random()*Math.PI*2,
    speed: 0.3 + Math.random()*0.5,
  }));

  function drawHex(x, y, r, col, a) {
    cx.save(); cx.globalAlpha = a; cx.strokeStyle = col; cx.lineWidth = 0.9;
    cx.beginPath();
    for (let i=0;i<6;i++){const ang=Math.PI/6+i*Math.PI/3;i===0?cx.moveTo(x+r*Math.cos(ang),y+r*Math.sin(ang)):cx.lineTo(x+r*Math.cos(ang),y+r*Math.sin(ang));}
    cx.closePath(); cx.stroke();
    cx.globalAlpha = a * 0.06; cx.fillStyle = col; cx.fill();
    cx.restore();
  }
  function drawCross(x, y, r, col, a) {
    cx.save(); cx.globalAlpha = a; cx.strokeStyle = col; cx.lineWidth = 0.8;
    const gap = r * 0.28;
    cx.beginPath();
    cx.moveTo(x-r,y); cx.lineTo(x-gap,y); cx.moveTo(x+gap,y); cx.lineTo(x+r,y);
    cx.moveTo(x,y-r); cx.lineTo(x,y-gap); cx.moveTo(x,y+gap); cx.lineTo(x,y+r);
    cx.stroke();
    cx.beginPath(); cx.arc(x,y,gap,0,Math.PI*2); cx.stroke();
    cx.globalAlpha = a*0.28;
    cx.beginPath(); cx.arc(x,y,r,0,Math.PI*2); cx.stroke();
    cx.restore();
  }
  function drawSquare(x, y, r, col, a) {
    cx.save(); cx.globalAlpha = a; cx.strokeStyle = col; cx.lineWidth = 0.8;
    cx.strokeRect(x-r*0.7, y-r*0.7, r*1.4, r*1.4);
    const b = r*0.22;
    [[x-r*0.7,y-r*0.7,1,1],[x+r*0.7,y-r*0.7,-1,1],[x-r*0.7,y+r*0.7,1,-1],[x+r*0.7,y+r*0.7,-1,-1]]
      .forEach(([px,py,sx,sy])=>{
        cx.beginPath(); cx.moveTo(px+sx*b,py); cx.lineTo(px,py); cx.lineTo(px,py+sy*b); cx.stroke();
      });
    cx.restore();
  }

  function frame() {
    t += 0.008;
    cx.clearRect(0, 0, W, H);

    // ── Base: deep warm dark ──
    cx.fillStyle = '#040302';
    cx.fillRect(0, 0, W, H);

    // ── Fine amber grid (right side only) ──
    const GS = 36;
    const gridLeft = W * 0.39;
    cx.strokeStyle = 'rgba(255,184,48,0.04)';
    cx.lineWidth = 0.4;
    for (let x = gridLeft; x < W; x += GS) { cx.beginPath(); cx.moveTo(x,0); cx.lineTo(x,H); cx.stroke(); }
    for (let y = 0; y < H; y += GS) { cx.beginPath(); cx.moveTo(gridLeft,y); cx.lineTo(W,y); cx.stroke(); }

    // ── PHOSPHOR BLOOM PULSES ──
    blooms.forEach(b => {
      const a = 0.018 + 0.012*Math.sin(t*b.speed + b.phase);
      const grd = cx.createRadialGradient(b.x*W, b.y*H, 0, b.x*W, b.y*H, b.r);
      grd.addColorStop(0, b.col.replace(')', `,${a*3})`).replace('rgb', 'rgba'));
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      cx.fillStyle = grd;
      cx.fillRect(0, 0, W, H);
    });

    // ── FLOATING SHAPES ──
    shapes.forEach(sh => {
      sh.x += sh.vx; sh.y += sh.vy;
      if (sh.x < 0.4) { sh.x = 0.4; sh.vx *= -1; }
      if (sh.x > 1.05) { sh.x = 1.05; sh.vx *= -1; }
      if (sh.y < -0.05) { sh.y = -0.05; sh.vy *= -1; }
      if (sh.y > 1.05) { sh.y = 1.05; sh.vy *= -1; }
      const pulse = 0.82 + 0.18*Math.sin(t*sh.speed + sh.phase);
      const alpha = 0.05 + 0.038*Math.sin(t*sh.speed*0.7 + sh.phase);
      const sx = sh.x*W, sy = sh.y*H, sr = sh.r*pulse;
      if      (sh.type===0) drawHex(sx,sy,sr,sh.col,alpha);
      else if (sh.type===1) {cx.save();cx.globalAlpha=alpha;cx.strokeStyle=sh.col;cx.lineWidth=0.7;cx.beginPath();cx.arc(sx,sy,sr,0,Math.PI*2);cx.stroke();cx.restore();}
      else if (sh.type===2) drawCross(sx,sy,sr,sh.col,alpha);
      else drawSquare(sx,sy,sr,sh.col,alpha);
    });

    // ── AMBER WEB CONNECTIONS ──
    for (let i=0;i<shapes.length;i++) {
      for (let j=i+1;j<shapes.length;j++) {
        const a=shapes[i], b=shapes[j];
        const dx=(a.x-b.x)*W, dy=(a.y-b.y)*H, d=Math.sqrt(dx*dx+dy*dy);
        if (d < 160) {
          cx.strokeStyle = `rgba(255,184,48,${(1-d/160)*0.055})`;
          cx.lineWidth = 0.5;
          cx.beginPath(); cx.moveTo(a.x*W,a.y*H); cx.lineTo(b.x*W,b.y*H); cx.stroke();
        }
      }
    }

    // ── DATA STREAMS ──
    cx.font = '9px "Share Tech Mono", monospace';
    streams.forEach(s => {
      s.y += s.spd;
      if (s.y > 1.1) { s.y = -0.1; s.x = 0.42 + Math.random()*0.55; }
      s.chars.forEach((ch, i) => {
        const a = s.alpha * Math.max(0, 1 - i/s.chars.length);
        cx.fillStyle = s.col; cx.globalAlpha = a;
        cx.fillText(ch, s.x*W, s.y*H - i*11);
      });
    });
    cx.globalAlpha = 1;

    // ── VHS HORIZONTAL COLOUR STRIPES ──
    const stripeY = H * (0.18 + 0.02*Math.sin(t*0.3));
    [[C.r,0],[C.y,0.005],[C.c,0.01],[C.g,0.015]].forEach(([col,dy])=>{
      cx.fillStyle = col; cx.globalAlpha = 0.014;
      cx.fillRect(W*0.39, stripeY + dy*H, W*0.61, 1.8);
    });
    cx.globalAlpha = 1;

    // ── MAIN SCAN LINE ──
    scanY = (scanY + 0.5) % H;
    const sg = cx.createLinearGradient(0, scanY-95, 0, scanY+4);
    sg.addColorStop(0, 'rgba(255,184,48,0)');
    sg.addColorStop(0.75, 'rgba(255,184,48,0.05)');
    sg.addColorStop(1, 'rgba(255,184,48,0)');
    cx.fillStyle = sg; cx.fillRect(0, scanY-95, W, 99);
    cx.fillStyle = 'rgba(255,184,48,0.065)'; cx.fillRect(0, scanY, W, 1.5);

    // ── VHS ROLL ARTIFACT (occasional) ──
    rollCd--;
    if (rollCd <= 0 && !rollActive) {
      rollCd = 180 + Math.floor(Math.random()*280);
      if (Math.random() < 0.55) {
        rollActive = true;
        rollY = -8;
      }
    }
    if (rollActive) {
      rollY += 6;
      // Bright band
      cx.fillStyle = 'rgba(255,255,255,0.04)';
      cx.fillRect(0, rollY, W, 5);
      // Color fringing above
      cx.fillStyle = 'rgba(0,244,232,0.05)'; cx.fillRect(4, rollY-2, W-8, 2);
      cx.fillStyle = 'rgba(255,40,64,0.05)'; cx.fillRect(-4, rollY+5, W-8, 2);
      // Horizontal shift strip
      cx.fillStyle = `rgba(255,184,48,0.035)`;
      cx.fillRect(0, rollY, W*0.8, 3);
      if (rollY > H + 10) { rollActive = false; rollY = -8; }
    }

    // ── PHOSPHOR NOISE ──
    if (Math.random() < 0.055) {
      const nx = W*0.4 + Math.random()*(W*0.6);
      const ny = Math.random()*H;
      const nc = COLS[Math.floor(Math.random()*COLS.length)];
      cx.fillStyle = nc; cx.globalAlpha = 0.4;
      cx.fillRect(nx, ny, 2, 1); cx.globalAlpha = 1;
    }

    // ── VHS GLITCH STRIPS ──
    glitchCd--;
    if (glitchCd <= 0) {
      glitchCd = 80 + Math.floor(Math.random()*180);
      if (Math.random() < 0.45) {
        glitchStrips = Array.from({length: 2+Math.floor(Math.random()*5)}, () => ({
          y: Math.random()*H,
          h: 1 + Math.floor(Math.random()*10),
          dx: (Math.random()-0.5)*44,
          life: 2 + Math.floor(Math.random()*5),
        }));
      }
    }
    glitchStrips = glitchStrips.filter(s => {
      s.life--;
      if (s.life <= 0) return false;
      cx.save(); cx.globalAlpha = 0.3;
      cx.fillStyle = 'rgba(255,40,64,0.45)'; cx.fillRect(Math.max(0,s.dx+3), s.y, W*0.6, s.h);
      cx.fillStyle = 'rgba(0,244,232,0.45)'; cx.fillRect(Math.max(0,s.dx-3), s.y+s.h, W*0.6, s.h);
      // Yellow middle strip
      cx.fillStyle = 'rgba(255,224,64,0.15)'; cx.fillRect(0, s.y+s.h/2, W, 1);
      cx.restore();
      return true;
    });

    // ── FILM GRAIN (subtle noise layer) ──
    if (Math.floor(t*60) % 3 === 0) {
      for (let i=0; i<30; i++) {
        const gx = W*0.39 + Math.random()*W*0.61;
        const gy = Math.random()*H;
        cx.fillStyle = `rgba(255,255,255,${0.012 + Math.random()*0.018})`;
        cx.fillRect(gx, gy, 1, 1);
      }
    }

    // ── CORNER HUD BRACKETS ──
    const bSize = 18, bW = 1;
    [[14,0,1,1,'rgba(255,184,48,0.22)'],[W-14,0,-1,1,'rgba(255,40,64,0.22)'],
     [14,H,-1,-1,'rgba(0,244,232,0.2)'],[W-14,H,1,-1,'rgba(0,255,136,0.2)']
    ].forEach(([px,py,sx,sy,col])=>{
      cx.strokeStyle=col; cx.lineWidth=bW;
      cx.beginPath(); cx.moveTo(px+sx*bSize,py); cx.lineTo(px,py); cx.lineTo(px,py+sy*bSize); cx.stroke();
    });

    return { frame };
  }

  const onResize = () => { resize(); };
  window.addEventListener('resize', onResize);
  const instance = { frame, resize, cleanup: () => window.removeEventListener('resize', onResize) };
  requestAnimationFrame(() => resize());
  return instance;
}

let _menuBgInst = null;
let _goBgInst   = null;

// ═══════════════════════════════════════════════════════════
// ═══ DEMO GAME PREVIEW (auto-playing snake on start screen)
// ═══════════════════════════════════════════════════════════
const DemoGame = (() => {
  const COLS=14, ROWS=10;
  let cvs, cx, cellSz;
  let snake, food, enemy, walls, dir, score, kills, alive, tickCD, restartCD;

  function init() {
    cvs = document.getElementById('previewCanvas');
    if(!cvs) return;
    cx = cvs.getContext('2d');
    reset();
  }

  function reset() {
    const mx=Math.floor(COLS/2), my=Math.floor(ROWS/2);
    snake = [{x:mx,y:my},{x:mx-1,y:my},{x:mx-2,y:my}];
    dir = {x:1,y:0};
    score=0; kills=0; alive=true; tickCD=0; restartCD=0;
    enemy = [];  // must init before spawnItem calls isOcc
    enemyDir = {x:0,y:1};
    enemyGrow = 0;
    enemyCD = 0;
    // spawn walls
    walls = [];
    for(let i=0;i<3;i++){
      const wx=2+Math.floor(Math.random()*(COLS-4));
      const wy=2+Math.floor(Math.random()*(ROWS-4));
      const horiz=Math.random()<0.5;
      const len=2+Math.floor(Math.random()*2);
      for(let j=0;j<len;j++){
        const cx_=horiz?wx+j:wx, cy_=horiz?wy:wy+j;
        if(cx_>=0&&cx_<COLS&&cy_>=0&&cy_<ROWS) walls.push({x:cx_,y:cy_});
      }
    }
    food = spawnItem();
    // enemy snake
    let ep = spawnItem();
    enemy = ep ? [{...ep}] : [{x:2,y:2}];
  }

  let enemyDir, enemyGrow;
  let enemyCD = 0;

  function isOcc(x,y,skipSnake){
    if(x<0||x>=COLS||y<0||y>=ROWS) return true;
    if(walls.some(w=>w.x===x&&w.y===y)) return true;
    if(!skipSnake && snake.some(s=>s.x===x&&s.y===y)) return true;
    if(enemy.some(s=>s.x===x&&s.y===y)) return true;
    return false;
  }

  function spawnItem(){
    for(let a=0;a<200;a++){
      const x=Math.floor(Math.random()*COLS), y=Math.floor(Math.random()*ROWS);
      if(!isOcc(x,y) && !(food&&food.x===x&&food.y===y)) return {x,y};
    }
    return {x:0,y:0};
  }

  // Simple greedy AI toward food
  function pickDir(){
    if(!food) return dir;
    const h=snake[0];
    const dx=food.x-h.x, dy=food.y-h.y;
    // Build preference list
    const dirs=[];
    if(Math.abs(dx)>=Math.abs(dy)){
      dirs.push({x:Math.sign(dx)||1,y:0});
      dirs.push({x:0,y:Math.sign(dy)||1});
      dirs.push({x:0,y:-(Math.sign(dy)||1)});
      dirs.push({x:-(Math.sign(dx)||1),y:0});
    } else {
      dirs.push({x:0,y:Math.sign(dy)||1});
      dirs.push({x:Math.sign(dx)||1,y:0});
      dirs.push({x:-(Math.sign(dx)||1),y:0});
      dirs.push({x:0,y:-(Math.sign(dy)||1)});
    }
    for(const d of dirs){
      // don't reverse
      if(d.x===-dir.x&&d.y===-dir.y&&snake.length>1) continue;
      const nx=h.x+d.x, ny=h.y+d.y;
      if(!isOcc(nx,ny,true)||((food&&nx===food.x&&ny===food.y))) return d;
    }
    return dir; // stuck
  }

  function tick(){
    if(!alive) return;
    dir = pickDir();
    const h=snake[0];
    const nh={x:h.x+dir.x, y:h.y+dir.y};
    // death check
    if(nh.x<0||nh.x>=COLS||nh.y<0||nh.y>=ROWS||
       walls.some(w=>w.x===nh.x&&w.y===nh.y)||
       snake.some(s=>s.x===nh.x&&s.y===nh.y)){
      alive=false; restartCD=120; return;
    }
    // eat enemy
    const ei=enemy.findIndex(s=>s.x===nh.x&&s.y===nh.y);
    if(ei>=0){
      enemy.splice(ei,1);
      score+=50; kills++;
      if(enemy.length===0){
        const ep=spawnItem();
        enemy=[ep||{x:1,y:1}]; enemyGrow=0;
      }
    }
    snake.unshift(nh);
    if(food&&nh.x===food.x&&nh.y===food.y){
      score+=10; food=spawnItem();
      // cap length for visual clarity
      if(snake.length>18) snake.pop();
    } else { snake.pop(); }

    // enemy movement
    enemyCD++;
    if(enemyCD>=2){
      enemyCD=0;
      moveEnemy();
    }
  }

  function moveEnemy(){
    if(enemy.length===0) return;
    const eh=enemy[0];
    const dirs=[[1,0],[-1,0],[0,1],[0,-1]].sort(()=>Math.random()-0.5);
    // 50% chance chase food, 50% random
    if(food && Math.random()<0.5){
      dirs.sort((a,b)=>{
        const da=Math.abs(eh.x+a[0]-food.x)+Math.abs(eh.y+a[1]-food.y);
        const db=Math.abs(eh.x+b[0]-food.x)+Math.abs(eh.y+b[1]-food.y);
        return da-db;
      });
    }
    for(const [dx,dy] of dirs){
      const nx=eh.x+dx, ny=eh.y+dy;
      if(nx<0||nx>=COLS||ny<0||ny>=ROWS) continue;
      if(walls.some(w=>w.x===nx&&w.y===ny)) continue;
      if(enemy.some(s=>s.x===nx&&s.y===ny)) continue;
      if(snake.some(s=>s.x===nx&&s.y===ny)) continue;
      enemy.unshift({x:nx,y:ny});
      if(food&&nx===food.x&&ny===food.y){ enemyGrow+=2; food=spawnItem(); }
      if(enemyGrow>0) enemyGrow--; else enemy.pop();
      enemyDir={x:dx,y:dy};
      return;
    }
  }

  function resize(){
    if(!cvs) return;
    const rect = cvs.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio||1;
    cvs.width = rect.width*dpr;
    cvs.height = rect.height*dpr;
    cx.scale(dpr,dpr);
    cellSz = Math.floor(Math.min((rect.width-40)/COLS, (rect.height-50)/ROWS));
  }

  function render(){
    if(!cvs||!cx) return;
    const W=cvs.width/(window.devicePixelRatio||1);
    const H=cvs.height/(window.devicePixelRatio||1);
    cx.clearRect(0,0,W,H);

    // Dark background
    cx.fillStyle='#080604';
    cx.fillRect(0,0,W,H);

    if(!cellSz) resize();
    const cs=cellSz||20;
    const ox=Math.floor((W-COLS*cs)/2);
    const oy=Math.floor((H-ROWS*cs)/2)-4;

    // Board
    cx.fillStyle='#DEDAD0';
    cx.fillRect(ox,oy,COLS*cs,ROWS*cs);

    // Grid
    cx.strokeStyle='#C0BAB0'; cx.lineWidth=0.5;
    for(let x=0;x<=COLS;x++){cx.beginPath();cx.moveTo(ox+x*cs,oy);cx.lineTo(ox+x*cs,oy+ROWS*cs);cx.stroke();}
    for(let y=0;y<=ROWS;y++){cx.beginPath();cx.moveTo(ox,oy+y*cs);cx.lineTo(ox+COLS*cs,oy+y*cs);cx.stroke();}

    // Border
    cx.strokeStyle='#1A1A18'; cx.lineWidth=2;
    cx.strokeRect(ox,oy,COLS*cs,ROWS*cs);
    cx.strokeStyle='#E8640A'; cx.lineWidth=1;
    cx.strokeRect(ox+2,oy+2,COLS*cs-4,ROWS*cs-4);

    function dHex(hx,hy,r,fill,border){
      cx.beginPath();
      for(let i=0;i<6;i++){
        const ang=Math.PI/6+i*Math.PI/3;
        const px_=hx+r*Math.cos(ang), py_=hy+r*Math.sin(ang);
        i===0?cx.moveTo(px_,py_):cx.lineTo(px_,py_);
      }
      cx.closePath();cx.fillStyle=fill;cx.fill();
      cx.strokeStyle=border;cx.lineWidth=1.2;cx.stroke();
    }

    // Walls
    walls.forEach(w=>{
      const wx=ox+w.x*cs, wy=oy+w.y*cs;
      cx.fillStyle='rgba(20,18,16,0.9)';cx.fillRect(wx+1,wy+1,cs-2,cs-2);
      cx.strokeStyle='rgba(232,100,10,0.6)';cx.lineWidth=0.8;cx.strokeRect(wx+1,wy+1,cs-2,cs-2);
    });

    // Food
    if(food){
      const px=ox+food.x*cs+cs/2, py=oy+food.y*cs+cs/2;
      const r=cs*0.28;
      cx.save();cx.translate(px,py);cx.rotate(Math.PI/4);
      cx.fillStyle='#E8640A';cx.fillRect(-r*0.7,-r*0.7,r*1.4,r*1.4);
      cx.restore();
      cx.fillStyle='#F5F0E8';
      cx.beginPath();cx.arc(px,py,r*0.2,0,Math.PI*2);cx.fill();
    }

    // Draw a demo snake
    function drawDemoSnake(body,isP,d){
      const N=body.length;
      for(let i=N-1;i>=0;i--){
        const s=body[i];
        const sx=ox+s.x*cs+cs/2, sy=oy+s.y*cs+cs/2;
        const r=cs*0.40;
        const fade=Math.max(0.4,1-i/N*0.5);
        let fill,border;
        if(isP){
          fill=i===0?'#E8640A':i<3?'#2A2926':'#222220';
          border=i===0?'#F5920A':'#111110';
        } else {
          fill=i===0?'#C8281E':i<3?'#381A18':'#2A1412';
          border=i===0?'#E83020':'#111110';
        }
        if(fade<1){cx.save();cx.globalAlpha=fade*0.85+0.15;}
        dHex(sx,sy,r,fill,border);
        if(fade<1) cx.restore();
      }
      // Eyes
      if(body.length>0 && d){
        const hd=body[0];
        const hx_=ox+hd.x*cs+cs/2, hy_=oy+hd.y*cs+cs/2;
        const perp={x:d.y,y:-d.x};
        const eyeR=cs*0.065, eyeOff=cs*0.15, eyeFwd=cs*0.12;
        [1,-1].forEach(s=>{
          const ex=hx_+d.x*eyeFwd+perp.x*eyeOff*s;
          const ey=hy_+d.y*eyeFwd+perp.y*eyeOff*s;
          cx.fillStyle='#EDEAE2';cx.beginPath();cx.arc(ex,ey,eyeR,0,Math.PI*2);cx.fill();
          cx.fillStyle='#0A0A09';cx.beginPath();cx.arc(ex+d.x*eyeR*0.35,ey+d.y*eyeR*0.35,eyeR*0.5,0,Math.PI*2);cx.fill();
        });
      }
    }

    if(enemy.length>0) drawDemoSnake(enemy,false,enemyDir);
    drawDemoSnake(snake,true,dir);

    // Dead overlay
    if(!alive){
      cx.fillStyle='rgba(8,4,2,0.5)';cx.fillRect(ox,oy,COLS*cs,ROWS*cs);
      cx.font="bold "+Math.round(cs*1.2)+"px 'Barlow Condensed',sans-serif";
      cx.fillStyle='rgba(255,40,64,0.8)';cx.textAlign='center';
      cx.fillText('TERMINATED',ox+COLS*cs/2,oy+ROWS*cs/2+cs*0.3);
      cx.textAlign='left';
    }

    // Update HUD
    const elScore=document.getElementById('demo-score');
    const elLen=document.getElementById('demo-len');
    const elKills=document.getElementById('demo-kills');
    const elStatus=document.getElementById('demo-status');
    if(elScore) elScore.textContent=score;
    if(elLen) elLen.textContent=snake.length;
    if(elKills) elKills.textContent=kills;
    if(elStatus){
      if(!alive){elStatus.textContent='DEAD';elStatus.style.color='var(--vhs-r)';}
      else{elStatus.textContent='HUNTING';elStatus.style.color='var(--phosphor)';}
    }
  }

  function update(){
    tickCD++;
    if(!alive){
      restartCD--;
      if(restartCD<=0) reset();
      return;
    }
    if(tickCD>=6){ tickCD=0; tick(); }
  }

  return { init, reset, resize, render, update };
})();

function initMenuBg() {
  if (menuBgRaf) { 
    cancelAnimationFrame(menuBgRaf); 
    menuBgRaf = null; 
  }
  
  // Clean up previous instance
  if (_menuBgInst && _menuBgInst.cleanup) {
    _menuBgInst.cleanup();
  }
  
  // Ensure startScreen is visible
  const ss = document.getElementById('startScreen');
  if (ss) {
    ss.style.display = 'flex';
  }
  
  // Delay initialization to ensure DOM is updated
  setTimeout(() => {
    _menuBgInst = makeMenuBg('startBg');
    if (!_menuBgInst) return;
    
    // Initialize demo game preview
    DemoGame.init();
    DemoGame.resize();
    
    function loop() {
      const ss = document.getElementById('startScreen');
      if (!ss || ss.style.display === 'none') return;
      _menuBgInst.frame();
      DemoGame.update();
      DemoGame.render();
      menuBgRaf = requestAnimationFrame(loop);
    }
    menuBgRaf = requestAnimationFrame(loop);
  }, 50); // 50ms delay ensures layout is complete
}

function initGoBg() {
  // Clean up previous instance
  if (_goBgInst && _goBgInst.cleanup) {
    _goBgInst.cleanup();
  }
  
  // Delay initialization
  setTimeout(() => {
    _goBgInst = makeMenuBg('goBg');
    if (!_goBgInst) return;
    
    let raf;
    function loop() {
      const gs = document.getElementById('goScreen');
      if (!gs || !gs.classList.contains('show')) { 
        cancelAnimationFrame(raf); 
        return; 
      }
      _goBgInst.frame();
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
  }, 50);
}

