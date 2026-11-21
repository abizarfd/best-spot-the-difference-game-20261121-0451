// main.js — bootstrap for Lantern Light.
//
// Wires the page's elements into a Game, applies a deterministic ?shot=
// state when one is given (screenshots only), and leaves a small handle on
// window.__game so the game can be driven and inspected from a test script.

import { Game } from './game.js';
import { applyShot } from './shots.js';

const $ = (id) => document.getElementById(id);

const els = {
  canvasA: $('panel-a'),
  canvasB: $('panel-b'),
  overlay: $('overlay'),
  levelName: $('level-name'),
  counter: $('counter'),
  score: $('score'),
  timerText: $('timer-text'),
  timerFill: $('timer-fill'),
  hintBtn: $('hint-btn'),
  pauseBtn: $('pause-btn'),
  restartBtn: $('restart-btn'),
  soundBtn: $('sound-btn'),
  levelsBtn: $('levels-btn'),
  checklist: $('checklist'),
  combo: $('combo'),
};

const game = new Game(els);
applyShot(game);

// A test handle: window.__game.state, .foundCount, .score, .timeLeft and
// .markAt(x, y) let a headless browser play the game end to end.
window.__game = game;
