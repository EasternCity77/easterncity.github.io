'use strict';

// ═══ audio.js ═══
// Procedural audio engine + toggleMute

const Audio = (() => {
  let ac = null;
  let masterGain = null;
  let bgmGain = null;
  let sfxGain = null;
  let _muted = false;
  let bgmActive = false;
  let seqStep = 0;
  let nextNoteTime = 0;
  let seqTimer = null;

  const BPM = 126;
  const STEP = 60 / BPM / 2;  // 16th-note duration in seconds

  // ── Boot ──
  function init() {
    if (ac) return;
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ac.createGain();
      masterGain.gain.value = 1;
      masterGain.connect(ac.destination);

      bgmGain = ac.createGain();
      bgmGain.gain.value = 0.32;
      bgmGain.connect(masterGain);

      sfxGain = ac.createGain();
      sfxGain.gain.value = 0.55;
      sfxGain.connect(masterGain);
    } catch(e) { ac = null; }
  }

  function resume() {
    if (ac && ac.state === 'suspended') ac.resume();
  }

  // ── Low-level synthesis ──
  function osc(type, freq, t, dur, vol, dest, freqEnd) {
    if (!ac) return;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(dest || sfxGain);
    o.start(t); o.stop(t + dur + 0.01);
  }

  function noise(t, dur, vol, lpHz, dest) {
    if (!ac) return;
    const len = Math.ceil(ac.sampleRate * (dur + 0.01));
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ac.createBufferSource();
    src.buffer = buf;
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = lpHz || 4000;
    const g = ac.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(lp); lp.connect(g); g.connect(dest || sfxGain);
    src.start(t); src.stop(t + dur + 0.01);
  }

  // ── BGM Sequencer (16-step, A-minor pentatonic) ──
  // A1=55 C2=65 E2=82 G2=98 A2=110 C3=131 E3=165
  const BASS = [55,0,0,55, 65.4,0,55,0, 82.4,0,0,65.4, 55,0,82.4,0];
  const MELD = [0,0,329.6,0, 0,392,0,0, 440,0,329.6,0, 0,0,392,493.9];
  const PAD_STEPS  = new Set([0, 8]);
  const KICK_STEPS = new Set([0, 4, 8, 12]);
  const SNARE_STEPS= new Set([4, 12]);
  const HAT_STEPS  = new Set([1,3,5,7,9,11,13,15]);

  function schedStep(step, t) {
    // Kick
    if (KICK_STEPS.has(step)) {
      osc('sine', 80, t, 0.28, 0.7, bgmGain, 28);
      noise(t, 0.04, 0.12, 350, bgmGain);
    }
    // Snare
    if (SNARE_STEPS.has(step)) {
      noise(t, 0.14, 0.3, 5000, bgmGain);
      osc('triangle', 220, t, 0.09, 0.18, bgmGain);
    }
    // Hi-hat
    if (HAT_STEPS.has(step)) {
      noise(t, 0.035, 0.055, 9000, bgmGain);
    }
    // Bass
    if (BASS[step]) {
      osc('sawtooth', BASS[step], t, 0.16, 0.4, bgmGain);
      osc('square',   BASS[step]*2, t, 0.1, 0.1, bgmGain);
    }
    // Melody
    if (MELD[step]) {
      osc('square',   MELD[step], t, 0.11, 0.13, bgmGain);
      osc('square',   MELD[step], t, 0.11, 0.06, bgmGain);
      // slight echo
      osc('sine',     MELD[step]*0.5, t + 0.06, 0.08, 0.04, bgmGain);
    }
    // Pad chord (A-minor) at bar start
    if (PAD_STEPS.has(step)) {
      [110, 130.8, 164.8, 196].forEach((f, i) => {
        osc('sine', f, t + i*0.01, 0.95, 0.06, bgmGain);
      });
    }
  }

  function scheduleBGM() {
    if (!bgmActive || !ac) return;
    const lookahead = 0.12;
    while (nextNoteTime < ac.currentTime + lookahead) {
      schedStep(seqStep & 15, nextNoteTime);
      seqStep++;
      nextNoteTime += STEP;
    }
    seqTimer = setTimeout(scheduleBGM, 22);
  }

  function startBGM() {
    if (!ac || bgmActive || _muted) return;
    bgmActive = true;
    seqStep = 0;
    nextNoteTime = ac.currentTime + 0.08;
    scheduleBGM();
  }

  function stopBGM() {
    bgmActive = false;
    if (seqTimer) { clearTimeout(seqTimer); seqTimer = null; }
  }

  // ── SFX ──

  // Eat food - rising blip, pitch scales with combo
  function sfxEat(comboN) {
    if (!ac || _muted) return;
    const t = ac.currentTime;
    const base = 440 + Math.min(comboN, 6) * 80;
    osc('sine', base, t, 0.07, 0.22);
    osc('sine', base * 1.5, t + 0.05, 0.05, 0.12);
  }

  // Combo — ascending blip burst
  function sfxCombo(n) {
    if (!ac || _muted) return;
    const t = ac.currentTime;
    const freqs = [440, 554, 659, 880, 1047, 1319];
    for (let i = 0; i < Math.min(n, freqs.length); i++) {
      osc('square', freqs[i], t + i * 0.055, 0.07, 0.09);
    }
  }

  // Laser fire — descending sawtooth zap
  function sfxLaser() {
    if (!ac || _muted) return;
    const t = ac.currentTime;
    osc('sawtooth', 1200, t, 0.14, 0.25, null, 100);
    noise(t, 0.06, 0.1, 7000);
  }

  // Bullet hits player — low impact thud
  function sfxBulletHit() {
    if (!ac || _muted) return;
    const t = ac.currentTime;
    osc('sawtooth', 160, t, 0.14, 0.35, null, 60);
    noise(t, 0.12, 0.28, 900);
  }

  // Enemy takes damage — short crack
  function sfxEnemyHit() {
    if (!ac || _muted) return;
    const t = ac.currentTime;
    osc('square', 600, t, 0.06, 0.2, null, 300);
    noise(t, 0.05, 0.15, 5000);
  }

  // Enemy killed — descending squawk
  function sfxEnemyDeath() {
    if (!ac || _muted) return;
    const t = ac.currentTime;
    osc('square', 440, t, 0.22, 0.25, null, 40);
    noise(t + 0.05, 0.14, 0.2, 2000);
  }

  // Level up — ascending fanfare
  function sfxLevelUp() {
    if (!ac || _muted) return;
    const t = ac.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      osc('square', f, t + i * 0.09, 0.14, 0.16);
      osc('sine',   f, t + i * 0.09, 0.14, 0.09);
    });
  }

  // Game over — solemn falling tones
  function sfxGameOver() {
    if (!ac || _muted) return;
    const t = ac.currentTime;
    [392, 349.2, 293.7, 246.9, 196].forEach((f, i) => {
      osc('sawtooth', f, t + i * 0.17, 0.22, 0.18);
    });
    noise(t + 0.6, 0.5, 0.12, 600);
  }

  // Threat level up — alert alarm
  function sfxThreat() {
    if (!ac || _muted) return;
    const t = ac.currentTime;
    [0, 0.12, 0.26, 0.38].forEach((dt, i) => {
      osc('square', i % 2 === 0 ? 660 : 880, t + dt, 0.1, 0.22);
    });
  }

  // Speed up pickup — rising sweep
  function sfxSpeedUp() {
    if (!ac || _muted) return;
    const t = ac.currentTime;
    osc('sine', 330, t, 0.18, 0.18, null, 660);
  }

  // Speed down pickup — falling sweep
  function sfxSpeedDown() {
    if (!ac || _muted) return;
    const t = ac.currentTime;
    osc('sine', 550, t, 0.18, 0.18, null, 220);
  }

  // XP ball collected — high ping
  function sfxXP() {
    if (!ac || _muted) return;
    const t = ac.currentTime;
    osc('sine', 1100, t, 0.06, 0.12);
    osc('sine', 1650, t + 0.04, 0.05, 0.08);
  }

  // Toggle mute — returns new muted state
  function toggleMute() {
    _muted = !_muted;
    if (masterGain) masterGain.gain.value = _muted ? 0 : 1;
    if (_muted) stopBGM();
    else if (window.gameActive && !window.gamePaused) startBGM();
    return _muted;
  }

  function isMuted() { return _muted; }

  return {
    init, resume, startBGM, stopBGM, toggleMute, isMuted,
    sfxEat, sfxCombo, sfxLaser, sfxBulletHit, sfxEnemyHit,
    sfxEnemyDeath, sfxLevelUp, sfxGameOver, sfxThreat,
    sfxSpeedUp, sfxSpeedDown, sfxXP,
  };
})();

function toggleMute() {
  const m = Audio.toggleMute();
  const btn = document.getElementById('muteBtn');
  if (btn) { btn.textContent = m ? '♪ OFF' : '♪ ON'; btn.style.color = m ? '#C8281E' : '#7A7670'; }
}

// ═══════════════════════════════════════════════════════════
