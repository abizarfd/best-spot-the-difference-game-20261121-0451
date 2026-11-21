// game.js — Lantern Light's state machine, input, timer, score and render.
//
// States: title → playing ⇄ paused → levelClear → (next level | complete),
// playing → timeUp on an empty clock. Everything the player sees is drawn
// on two canvases (one per panel) by render(); the HUD is plain DOM.

import { LEVELS, PANEL_W, PANEL_H } from './scenes.js';
import { SoundFX } from './audio.js';

const TAU = Math.PI * 2;
const WRONG_PTS = 15;
const WRONG_SECS = 3;
const HINT_PTS = 50;
const HINTS_PER_LEVEL = 3;
const FIND_PTS = 100;

function fmtTime(secs) {
  const s = Math.max(0, Math.ceil(secs));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function starsFor(timeLeft, limit, wrongs) {
  if (timeLeft > limit * 0.5 && wrongs <= 1) return 3;
  if (timeLeft > limit * 0.25 && wrongs <= 3) return 2;
  return 1;
}

export class Game {
  constructor(els) {
    this.els = els;
    this.canvasA = els.canvasA;
    this.canvasB = els.canvasB;
    this.ctxA = this.canvasA.getContext('2d');
    this.ctxB = this.canvasB.getContext('2d');
    this.sound = new SoundFX();
    this.state = 'title';
    this.levelIndex = 0;
    this.level = LEVELS[0];
    this.found = new Set();
    this.score = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.hintsLeft = HINTS_PER_LEVEL;
    this.timeLeft = this.level.timeLimit;
    this.wrongs = 0;
    this.stars = [0, 0, 0];
    this.crosshair = { x: PANEL_W / 2, y: PANEL_H / 2, visible: false };
    this.flashes = []; // {x, y, kind, at}
    this.hintPulse = null; // {diff, until}
    this.animTime = 0;
    this.frozen = false; // screenshots: freeze the clock and the animation
    this.lastTick = 0;
    this.lastSecond = -1;
    this.hudCache = {};
    this.overlayAction = null;
    this.bindInput();
    this.showTitle();
    requestAnimationFrame((ts) => this.frame(ts));
  }

  // ------------------------------------------------------------ flow

  get totalDiffs() { return this.level.diffs.length; }
  get foundCount() { return this.found.size; }
  get totalStars() { return this.stars.reduce((a, b) => a + b, 0); }

  startLevel(i) {
    this.levelIndex = i;
    this.level = LEVELS[i];
    this.found = new Set();
    this.combo = 0;
    this.hintsLeft = HINTS_PER_LEVEL;
    this.timeLeft = this.level.timeLimit;
    this.wrongs = 0;
    this.flashes = [];
    this.hintPulse = null;
    this.state = 'playing';
    this.hideOverlay();
    this.sound.resume();
    this.sound.start();
    this.renderHud();
  }

  showTitle() {
    this.state = 'title';
    const cards = LEVELS.map((lv, i) => {
      const stars = '★'.repeat(this.stars[i]) + '☆'.repeat(3 - this.stars[i]);
      return `<button class="level-card" data-action="level" data-level="${i}">
        <span class="level-num">Level ${i + 1}</span>
        <span class="level-name">${lv.name}</span>
        <span class="level-tag">${lv.tagline}</span>
        <span class="level-meta">${lv.diffs.length} differences · ${fmtTime(lv.timeLimit)}</span>
        <span class="level-stars">${stars}</span>
      </button>`;
    }).join('');
    this.showOverlay(`
      <div class="title-screen">
        <div class="title-lantern">🏮</div>
        <h1>Lantern Light</h1>
        <p class="subtitle">A spot-the-difference hunt through three lantern-lit nights.</p>
        <p class="howto">Two pictures hang side by side. They look the same — they are not.
        Click a difference on either picture to mark it. Find them all before the lanterns burn down.</p>
        <div class="level-cards">${cards}</div>
        <p class="keys">Click or press Enter to mark · Arrows move the crosshair · H hint (−${HINT_PTS}) · P pause · R restart · M sound</p>
      </div>`);
  }

  showLevelClear() {
    const stars = starsFor(this.timeLeft, this.level.timeLimit, this.wrongs);
    this.stars[this.levelIndex] = Math.max(this.stars[this.levelIndex], stars);
    const bonus = Math.round(this.timeLeft) * 10;
    this.score += bonus;
    this.state = 'levelClear';
    this.sound.win();
    const last = this.levelIndex === LEVELS.length - 1;
    this.showOverlay(`
      <div class="panel-box">
        <h2>${last ? 'All lanterns lit!' : 'Level clear!'}</h2>
        <div class="big-stars">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>
        <p class="score-line">You found all ${this.totalDiffs} differences in ${this.level.name}.</p>
        <p class="score-line">Time bonus +${bonus} · Score ${this.score} · Best combo ${this.bestCombo} in a row</p>
        ${last
          ? `<p class="score-line">Total stars: ${this.totalStars} / 9</p>
             <button class="big-btn" data-action="title">Play again</button>`
          : `<button class="big-btn" data-action="next">Next level: ${LEVELS[this.levelIndex + 1].name} →</button>
             <button class="ghost-btn" data-action="replay">Replay this level</button>`}
      </div>`);
    this.renderHud();
  }

  showTimeUp() {
    this.state = 'timeUp';
    this.sound.lose();
    this.showOverlay(`
      <div class="panel-box">
        <h2>The lanterns burned down…</h2>
        <p class="score-line">You found ${this.foundCount} of ${this.totalDiffs} differences in ${this.level.name}.</p>
        <p class="score-line">Score ${this.score}</p>
        <button class="big-btn" data-action="replay">Try again</button>
        <button class="ghost-btn" data-action="title">Back to title</button>
      </div>`);
  }

  showPause() {
    this.state = 'paused';
    this.showOverlay(`
      <div class="panel-box">
        <h2>Paused</h2>
        <p class="score-line">${this.level.name} · ${this.foundCount} / ${this.totalDiffs} found · ${fmtTime(this.timeLeft)} left</p>
        <button class="big-btn" data-action="resume">Resume</button>
        <button class="ghost-btn" data-action="replay">Restart level</button>
        <button class="ghost-btn" data-action="title">Back to title</button>
      </div>`);
  }

  // ------------------------------------------------------------ play

  markAt(x, y) {
    if (this.state !== 'playing') return;
    const diff = this.level.diffs.find((d) => !this.found.has(d.id) &&
      Math.hypot(d.x - x, d.y - y) <= d.r);
    if (diff) {
      this.found.add(diff.id);
      this.combo += 1;
      this.bestCombo = Math.max(this.bestCombo, this.combo);
      const mult = Math.min(3, 1 + 0.25 * (this.combo - 1));
      const pts = Math.round(FIND_PTS * mult);
      this.score += pts;
      this.flashes.push({ x: diff.x, y: diff.y, kind: 'found', at: this.animTime, pts });
      this.sound.found(this.combo);
      if (this.found.size === this.totalDiffs) {
        this.renderHud();
        this.showLevelClear();
        return;
      }
    } else {
      this.combo = 0;
      this.wrongs += 1;
      this.score = Math.max(0, this.score - WRONG_PTS);
      this.timeLeft = Math.max(0, this.timeLeft - WRONG_SECS);
      this.flashes.push({ x, y, kind: 'wrong', at: this.animTime });
      this.sound.wrong();
      if (this.timeLeft <= 0) { this.renderHud(); this.showTimeUp(); return; }
    }
    this.renderHud();
  }

  useHint() {
    if (this.state !== 'playing' || this.hintsLeft <= 0) return;
    const remaining = this.level.diffs.filter((d) => !this.found.has(d.id));
    if (remaining.length === 0) return;
    const diff = remaining[Math.floor(Math.random() * remaining.length)];
    this.hintsLeft -= 1;
    this.score = Math.max(0, this.score - HINT_PTS);
    this.hintPulse = { diff, until: this.animTime + 3.5 };
    this.sound.hint();
    this.renderHud();
  }

  togglePause() {
    if (this.state === 'playing') this.showPause();
    else if (this.state === 'paused') { this.state = 'playing'; this.hideOverlay(); }
  }

  // ------------------------------------------------------------ input

  bindInput() {
    const toScene = (canvas, ev) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (ev.clientX - rect.left) * (PANEL_W / rect.width),
        y: (ev.clientY - rect.top) * (PANEL_H / rect.height),
      };
    };
    for (const canvas of [this.canvasA, this.canvasB]) {
      canvas.addEventListener('pointerdown', (ev) => {
        const p = toScene(canvas, ev);
        this.crosshair = { x: p.x, y: p.y, visible: true };
        this.sound.click();
        this.markAt(p.x, p.y);
      });
      canvas.addEventListener('pointermove', (ev) => {
        const p = toScene(canvas, ev);
        this.crosshair = { x: p.x, y: p.y, visible: true };
      });
    }
    window.addEventListener('keydown', (ev) => {
      if (ev.repeat && !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(ev.key)) return;
      const step = ev.shiftKey ? 28 : 9;
      switch (ev.key) {
        case 'ArrowLeft': this.crosshair.x = Math.max(0, this.crosshair.x - step); this.crosshair.visible = true; ev.preventDefault(); break;
        case 'ArrowRight': this.crosshair.x = Math.min(PANEL_W, this.crosshair.x + step); this.crosshair.visible = true; ev.preventDefault(); break;
        case 'ArrowUp': this.crosshair.y = Math.max(0, this.crosshair.y - step); this.crosshair.visible = true; ev.preventDefault(); break;
        case 'ArrowDown': this.crosshair.y = Math.min(PANEL_H, this.crosshair.y + step); this.crosshair.visible = true; ev.preventDefault(); break;
        case 'Enter':
          if (this.state === 'playing') { this.sound.click(); this.markAt(this.crosshair.x, this.crosshair.y); }
          break;
        case 'h': case 'H': this.useHint(); break;
        case 'p': case 'P': case 'Escape': this.togglePause(); break;
        case 'r': case 'R': if (this.state !== 'title') this.startLevel(this.levelIndex); break;
        case 'm': case 'M': this.sound.toggleMute(); this.renderHud(); break;
        default: break;
      }
    });
    this.els.overlay.addEventListener('click', (ev) => {
      const btn = ev.target.closest('[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;
      if (action === 'level') this.startLevel(Number(btn.dataset.level));
      else if (action === 'next') this.startLevel(this.levelIndex + 1);
      else if (action === 'replay') this.startLevel(this.levelIndex);
      else if (action === 'resume') { this.state = 'playing'; this.hideOverlay(); }
      else if (action === 'title') this.showTitle();
    });
    this.els.hintBtn.addEventListener('click', () => this.useHint());
    this.els.pauseBtn.addEventListener('click', () => this.togglePause());
    this.els.restartBtn.addEventListener('click', () => { if (this.state !== 'title') this.startLevel(this.levelIndex); });
    this.els.soundBtn.addEventListener('click', () => { this.sound.toggleMute(); this.renderHud(); });
    this.els.levelsBtn.addEventListener('click', () => this.showTitle());
  }

  // ------------------------------------------------------------ HUD

  showOverlay(html) {
    this.els.overlay.innerHTML = html;
    this.els.overlay.classList.remove('hidden');
  }

  hideOverlay() {
    this.els.overlay.classList.add('hidden');
    this.els.overlay.innerHTML = '';
  }

  setText(id, value) {
    if (this.hudCache[id] !== value) {
      this.hudCache[id] = value;
      this.els[id].textContent = value;
    }
  }

  renderHud() {
    this.setText('levelName', `Level ${this.levelIndex + 1} · ${this.level.name}`);
    this.setText('counter', `Found ${this.foundCount} / ${this.totalDiffs}`);
    this.setText('score', `Score ${this.score}`);
    this.setText('timerText', fmtTime(this.timeLeft));
    this.setText('hintBtn', `💡 Hint (${this.hintsLeft})`);
    this.setText('soundBtn', this.sound.muted ? '🔇 Muted' : '🔊 Sound');
    const pct = Math.max(0, (this.timeLeft / this.level.timeLimit) * 100);
    this.els.timerFill.style.width = `${pct}%`;
    this.els.timerFill.classList.toggle('low', this.timeLeft <= 30 && this.state === 'playing');
    this.els.hintBtn.disabled = this.hintsLeft <= 0 || this.state !== 'playing';
    const list = this.els.checklist;
    const html = this.level.diffs.map((d) => {
      const got = this.found.has(d.id);
      return `<li class="${got ? 'found' : ''}">${got ? '✓' : '·'} ${got ? d.name : '???'}</li>`;
    }).join('');
    if (this.hudCache.checklist !== html) {
      this.hudCache.checklist = html;
      list.innerHTML = html;
    }
    this.setText('combo', this.combo >= 2 ? `Combo ×${Math.min(3, 1 + 0.25 * (this.combo - 1)).toFixed(2).replace(/\.?0+$/, '')} (${this.combo} in a row)` : '');
  }

  // ------------------------------------------------------------ loop

  frame(ts) {
    requestAnimationFrame((next) => this.frame(next));
    const dt = this.lastTick ? (ts - this.lastTick) / 1000 : 0;
    this.lastTick = ts;
    if (!this.frozen) {
      this.animTime += Math.min(dt, 0.1);
      if (this.state === 'playing') {
        this.timeLeft -= dt;
        const sec = Math.ceil(this.timeLeft);
        if (sec !== this.lastSecond) {
          this.lastSecond = sec;
          if (this.timeLeft <= 10 && this.timeLeft > 0) this.sound.tick();
        }
        if (this.timeLeft <= 0) {
          this.timeLeft = 0;
          this.renderHud();
          this.showTimeUp();
          this.render();
          return;
        }
      }
    }
    this.renderHud();
    this.render();
  }

  // ------------------------------------------------------------ render

  render() {
    this.drawPanel(this.ctxA, 0);
    this.drawPanel(this.ctxB, 1);
  }

  drawPanel(ctx, variant) {
    const W = PANEL_W;
    const H = PANEL_H;
    const t = this.animTime;
    ctx.clearRect(0, 0, W, H);
    this.level.drawBase(ctx, W, H, t);
    for (const d of this.level.diffs) d.draw(ctx, variant, t);
    // hint pulse
    if (this.hintPulse && t < this.hintPulse.until && this.state === 'playing') {
      const d = this.hintPulse.diff;
      const pulse = 1 + 0.18 * Math.sin(t * 8);
      ctx.save();
      ctx.strokeStyle = '#ffd23e';
      ctx.lineWidth = 4;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r * pulse, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
    // found markers on both panels
    for (const d of this.level.diffs) {
      if (!this.found.has(d.id)) continue;
      ctx.save();
      ctx.strokeStyle = '#37d67a';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r * 0.85, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = 'rgba(55,214,122,0.18)';
      ctx.fill();
      ctx.strokeStyle = '#37d67a';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const r = d.r * 0.42;
      ctx.beginPath();
      ctx.moveTo(d.x - r, d.y);
      ctx.lineTo(d.x - r * 0.25, d.y + r * 0.7);
      ctx.lineTo(d.x + r, d.y - r * 0.75);
      ctx.stroke();
      ctx.restore();
    }
    // wrong-click flashes (fade out over 0.7 s)
    this.flashes = this.flashes.filter((f) => t - f.at < 0.9);
    for (const f of this.flashes) {
      const age = t - f.at;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - age / 0.9);
      if (f.kind === 'wrong') {
        ctx.strokeStyle = '#ff4d4d';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(f.x - 12, f.y - 12); ctx.lineTo(f.x + 12, f.y + 12);
        ctx.moveTo(f.x + 12, f.y - 12); ctx.lineTo(f.x - 12, f.y + 12);
        ctx.stroke();
      } else if (f.pts) {
        ctx.fillStyle = '#37d67a';
        ctx.font = 'bold 20px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillText(`+${f.pts}`, f.x, f.y - f.r - 8 - age * 14);
      }
      ctx.restore();
    }
    // crosshair (keyboard play)
    if (this.crosshair.visible && this.state === 'playing') {
      const { x, y } = this.crosshair;
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 14, 0, TAU);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - 22, y); ctx.lineTo(x - 8, y);
      ctx.moveTo(x + 8, y); ctx.lineTo(x + 22, y);
      ctx.moveTo(x, y - 22); ctx.lineTo(x, y - 8);
      ctx.moveTo(x, y + 8); ctx.lineTo(x, y + 22);
      ctx.stroke();
      ctx.restore();
    }
    // dim the panels when not playing (title sits behind the overlay)
    if (this.state === 'title' || this.state === 'paused') {
      ctx.fillStyle = 'rgba(8,6,20,0.45)';
      ctx.fillRect(0, 0, W, H);
    }
  }
}
