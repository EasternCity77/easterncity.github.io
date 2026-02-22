'use strict';

// ═══ main.js ═══
// Boot: DOMContentLoaded, canvas init, event listeners

// ═══ BOOT ═══
window.addEventListener('DOMContentLoaded', () => {
  canvas=document.getElementById('gameCanvas');
  ctx=canvas.getContext('2d');
  evoCanvas=document.getElementById('evoCanvas');
  evoCtx=evoCanvas.getContext('2d');
  // DPR scaling for crisp rendering
  (function(){
    const dpr=window.devicePixelRatio||1;
    evoCanvas.width=EVO_W*dpr;
    evoCanvas.height=EVO_H*dpr;
    evoCanvas.style.width=EVO_W+'px';
    evoCanvas.style.height=EVO_H+'px';
    evoCtx.scale(dpr,dpr);
  })();
  evoCanvas.addEventListener('click',onEvoClick);
  document.addEventListener('keydown',onKey);
  window.addEventListener('resize',resizeGame);
  resizeGame();

  // Hi score
  const hi = localStorage.getItem('hexsnake_hi');
  const hiEl = document.getElementById('sHiScore');
  if (hiEl) hiEl.textContent = hi ? 'BEST: '+hi : 'BEST: —';

  // Live clock in topbar
  function updateClock() {
    const el = document.getElementById('s-clock');
    if (!el) return;
    const n = new Date();
    const h = String(n.getHours()).padStart(2,'0');
    const m = String(n.getMinutes()).padStart(2,'0');
    const s = String(n.getSeconds()).padStart(2,'0');
    el.textContent = `TIME · ${h}:${m}:${s}`;
  }
  updateClock();
  setInterval(updateClock, 1000);

  // Resize demo preview on window resize
  window.addEventListener('resize', () => { DemoGame.resize(); });

  // Start animated background with delay to ensure layout
  setTimeout(() => {
    initMenuBg();
  }, 100);
});
