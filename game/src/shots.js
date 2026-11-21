// shots.js — deterministic states for the screenshots, driven by ?shot=.
//
//   ?shot=start   title screen (level cards, how to play)
//   ?shot=cover   Level 1 mid-game: 3 found, 4 still hidden, counter visible
//   ?shot=play    Level 2 mid-game: 4 found, 4 still hidden
//   ?shot=win     Level 1 cleared: 3-star victory overlay
//
// A shot freezes the animation clock and the timer, so the same URL always
// renders the same frame. Nothing here changes how the game plays normally:
// with no ?shot= the game simply starts at its title screen.

function markFound(game, ids) {
  for (const id of ids) game.found.add(id);
}

export function applyShot(game) {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (!shot) return null;
  // Freeze time: the frame a screenshot takes must not depend on when it is taken.
  game.frozen = true;
  game.animTime = 1.7;

  if (shot === 'start') {
    game.showTitle();
    return 'start';
  }

  if (shot === 'cover') {
    game.startLevel(0);
    markFound(game, ['moon', 'cat', 'lantern-colour']);
    game.score = 375;
    game.combo = 3;
    game.bestCombo = 3;
    game.timeLeft = 133;
    game.state = 'playing';
    game.hideOverlay();
    game.renderHud();
    game.render();
    return 'cover';
  }

  if (shot === 'play') {
    game.startLevel(1);
    markFound(game, ['balloons', 'tea-sign', 'dead-bulb', 'dog']);
    game.score = 640;
    game.combo = 4;
    game.bestCombo = 4;
    game.timeLeft = 87;
    game.state = 'playing';
    game.hideOverlay();
    game.renderHud();
    game.render();
    return 'play';
  }

  if (shot === 'win') {
    game.startLevel(0);
    markFound(game, game.level.diffs.map((d) => d.id));
    game.score = 1180;
    game.combo = 7;
    game.bestCombo = 7;
    game.timeLeft = 121; // over half the clock left: a 3-star clear
    game.state = 'playing';
    game.showLevelClear();
    game.renderHud();
    game.render();
    return 'win';
  }

  game.frozen = false;
  return null;
}
