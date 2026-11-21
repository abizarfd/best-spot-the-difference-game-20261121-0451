// scenes.js — every picture in Lantern Light, drawn procedurally on canvas.
//
// A level is { id, name, tagline, timeLimit, diffs, drawBase }.
// drawBase(ctx, W, H, t) paints everything both panels share.
// Each difference is { id, name, x, y, r, draw(ctx, variant, t) }:
//   variant 0 is the left panel, variant 1 the right panel. draw() paints ONLY
//   the thing that differs, so the two panels are identical everywhere else.
// Nothing here uses Math.random: every star, bulb and stalk sits at a fixed
// spot, so a scene renders the same on every machine. `t` is seconds of
// animation time (lantern flicker, twinkle) and is frozen for screenshots.

const TAU = Math.PI * 2;

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function sky(ctx, W, H, stops) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  for (const [at, color] of stops) g.addColorStop(at, color);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function starField(ctx, stars, t) {
  for (const s of stars) {
    const tw = 0.55 + 0.45 * Math.sin(t * 1.6 + s[2]);
    ctx.globalAlpha = tw;
    ctx.fillStyle = '#fff8d6';
    ctx.beginPath();
    ctx.arc(s[0], s[1], s[3] ?? 1.6, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function sparkle(ctx, x, y, r, color, t) {
  const pulse = 0.8 + 0.2 * Math.sin(t * 2.4 + x);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(pulse, pulse);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.quadraticCurveTo(0, 0, 0, r);
  ctx.quadraticCurveTo(0, 0, -r, 0);
  ctx.quadraticCurveTo(0, 0, 0, -r);
  ctx.fill();
  ctx.restore();
}

function glow(ctx, x, y, r, color, alpha) {
  const g = ctx.createRadialGradient(x, y, 2, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.restore();
}

// One paper lantern: rounded body, ribs, caps, glow and a tassel.
function lantern(ctx, x, y, w, h, body, t, lit = true) {
  const flick = lit ? 0.85 + 0.15 * Math.sin(t * 3 + x * 0.7) : 0.25;
  if (lit) glow(ctx, x, y, w * 1.15, body, 0.35 * flick);
  ctx.save();
  ctx.globalAlpha = lit ? flick : 0.55;
  ctx.fillStyle = body;
  rr(ctx, x - w / 2, y - h / 2, w, h, w * 0.28);
  ctx.fill();
  ctx.strokeStyle = 'rgba(60,20,10,0.55)';
  ctx.lineWidth = 1.5;
  for (const off of [-w * 0.22, 0, w * 0.22]) {
    ctx.beginPath();
    ctx.moveTo(x + off, y - h / 2 + 3);
    ctx.quadraticCurveTo(x + off * 1.25, y, x + off, y + h / 2 - 3);
    ctx.stroke();
  }
  ctx.fillStyle = '#7a4a12';
  ctx.fillRect(x - w * 0.22, y - h / 2 - 5, w * 0.44, 5);
  ctx.fillRect(x - w * 0.22, y + h / 2, w * 0.44, 5);
  ctx.strokeStyle = '#e8b23a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y + h / 2 + 5);
  ctx.lineTo(x, y + h / 2 + 16);
  ctx.stroke();
  ctx.restore();
}

function sittingCat(ctx, x, y, s, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = color;
  ctx.beginPath(); // body
  ctx.ellipse(0, -16, 15, 20, 0, 0, TAU);
  ctx.fill();
  ctx.beginPath(); // head
  ctx.arc(2, -42, 11, 0, TAU);
  ctx.fill();
  ctx.beginPath(); // ears
  ctx.moveTo(-6, -49); ctx.lineTo(-9, -60); ctx.lineTo(-1, -52); ctx.closePath();
  ctx.moveTo(8, -50); ctx.lineTo(12, -60); ctx.lineTo(14, -49); ctx.closePath();
  ctx.fill();
  ctx.beginPath(); // tail curling round the front
  ctx.ellipse(14, -2, 12, 5, -0.5, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function reeds(ctx, x, y, count, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  for (let i = 0; i < count; i++) {
    const rx = x + (i - (count - 1) / 2) * 13;
    const lean = (i - (count - 1) / 2) * 4;
    const h = 52 + ((i * 37) % 23);
    ctx.beginPath();
    ctx.moveTo(rx, y);
    ctx.quadraticCurveTo(rx + lean, y - h * 0.6, rx + lean * 1.6, y - h);
    ctx.stroke();
    ctx.fillStyle = '#8a6b3a';
    ctx.beginPath();
    ctx.ellipse(rx + lean * 1.6, y - h - 4, 3.5, 9, 0.15, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function rowboat(ctx, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = '#5a3018';
  ctx.beginPath();
  ctx.moveTo(-42, 0); ctx.lineTo(42, 0); ctx.lineTo(30, 14); ctx.lineTo(-30, 14);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#7a4526';
  ctx.fillRect(-42, -3, 84, 5);
  ctx.strokeStyle = '#3a1e0e';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, -4); ctx.lineTo(0, -34);
  ctx.stroke();
  lantern(ctx, 0, -46, 16, 20, '#ff9d2e', 0, true);
  ctx.restore();
}

function balloon(ctx, x, y, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 1.15, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.ellipse(x - r * 0.35, y - r * 0.4, r * 0.25, r * 0.35, -0.4, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(220,220,220,0.7)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y + r * 1.15);
  ctx.quadraticCurveTo(x + 6, y + r * 1.9, x - 2, y + r * 2.4);
  ctx.stroke();
}

function lyingDog(ctx, x, y, s, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = color;
  ctx.beginPath(); // body
  ctx.ellipse(0, 0, 34, 13, 0, 0, TAU);
  ctx.fill();
  ctx.beginPath(); // head resting on paws
  ctx.arc(34, -4, 11, 0, TAU);
  ctx.fill();
  ctx.beginPath(); // ear
  ctx.moveTo(28, -12); ctx.lineTo(24, -22); ctx.lineTo(34, -14); ctx.closePath();
  ctx.fill();
  ctx.beginPath(); // tail
  ctx.ellipse(-34, -6, 12, 4, 0.6, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#f5e6c8';
  ctx.beginPath(); // belly patch
  ctx.ellipse(2, 5, 20, 6, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function bicycle(ctx, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.strokeStyle = '#c8ccd4';
  ctx.lineWidth = 3;
  ctx.beginPath(); // wheels
  ctx.arc(-26, 0, 15, 0, TAU);
  ctx.arc(26, 0, 15, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = '#d94f3d';
  ctx.lineWidth = 3.5;
  ctx.beginPath(); // frame
  ctx.moveTo(-26, 0); ctx.lineTo(-6, -22); ctx.lineTo(22, -22); ctx.lineTo(26, 0);
  ctx.moveTo(-6, -22); ctx.lineTo(4, 0); ctx.lineTo(26, 0);
  ctx.moveTo(-6, -22); ctx.lineTo(-14, -30);
  ctx.moveTo(22, -22); ctx.lineTo(30, -32);
  ctx.stroke();
  ctx.strokeStyle = '#2a2a2a';
  ctx.lineWidth = 3;
  ctx.beginPath(); // handlebar + seat
  ctx.moveTo(24, -34); ctx.lineTo(34, -30);
  ctx.moveTo(-18, -32); ctx.lineTo(-8, -32);
  ctx.stroke();
  ctx.restore();
}

function fireworkBurst(ctx, x, y, rays, len, color, t) {
  ctx.save();
  ctx.translate(x, y);
  glow(ctx, 0, 0, len * 1.1, color, 0.5);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * TAU + 0.3;
    const wob = 1 + 0.06 * Math.sin(t * 2 + i);
    const r1 = len * 0.35;
    const r2 = len * wob;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
    ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
    ctx.stroke();
    ctx.fillStyle = '#fff6c8';
    ctx.beginPath();
    ctx.arc(Math.cos(a) * r2, Math.sin(a) * r2, 2.6, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = '#fff2a8';
  ctx.beginPath();
  ctx.arc(0, 0, 5, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function kite(ctx, x, y, s, t) {
  const sway = Math.sin(t * 1.2) * 4;
  ctx.save();
  ctx.translate(x + sway, y);
  ctx.scale(s, s);
  ctx.fillStyle = '#e84a5f';
  ctx.beginPath();
  ctx.moveTo(0, -26); ctx.lineTo(20, 0); ctx.lineTo(0, 26); ctx.lineTo(-20, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, -26); ctx.lineTo(0, 26);
  ctx.moveTo(-20, 0); ctx.lineTo(20, 0);
  ctx.stroke();
  ctx.strokeStyle = '#ddd';
  ctx.beginPath();
  ctx.moveTo(0, 26);
  ctx.quadraticCurveTo(8, 44, -2, 58);
  ctx.stroke();
  ctx.fillStyle = '#ffd23e';
  ctx.beginPath();
  ctx.arc(-2, 58, 4, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function smoke(ctx, x, y, t) {
  ctx.save();
  for (let i = 0; i < 4; i++) {
    const p = ((t * 0.25 + i / 4) % 1);
    const sy = y - p * 70;
    const sx = x + Math.sin(p * 5 + i) * 10 + p * 14;
    ctx.globalAlpha = 0.5 * (1 - p);
    ctx.fillStyle = '#cfc8dd';
    ctx.beginPath();
    ctx.arc(sx, sy, 7 + p * 9, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- Level 1

const L1_STARS = [
  [30, 40, 0, 1.5], [150, 28, 1, 1.2], [210, 60, 2, 1.8], [330, 35, 3, 1.3],
  [500, 45, 4, 1.6], [480, 180, 5, 1.4], [40, 130, 0, 1.2], [380, 210, 1, 1.5],
  [120, 210, 2, 1.1], [260, 30, 3, 1.4], [500, 260, 4, 1.3],
];

function drawLanternRow(ctx, t, skipU) {
  // A string of lanterns sagging across the sky, hung from one cord.
  // skipU is the u (0..1) along the cord whose lantern is a difference
  // (drawn by the diff itself), so the row leaves that spot empty.
  const pts = [];
  for (let i = 0; i <= 10; i++) {
    const u = i / 10;
    const x = 24 + u * 472;
    const y = 128 + Math.sin(u * Math.PI) * 58 + (u < 0.5 ? u * 22 : (1 - u) * 22);
    pts.push([x, y]);
  }
  ctx.strokeStyle = '#3a2a1a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (const [x, y] of pts.slice(1)) ctx.lineTo(x, y);
  ctx.stroke();
  const colors = ['#ff5a3c', '#ffb02e', '#ff5a3c', '#ff7a4d', '#ffb02e', '#ff5a3c', '#ffb02e'];
  for (let i = 0; i < 7; i++) {
    const u = (i + 1) / 8;
    if (Math.abs(u - skipU) < 0.03) continue;
    const x = 24 + u * 472;
    const y = 128 + Math.sin(u * Math.PI) * 58 + (u < 0.5 ? u * 22 : (1 - u) * 22);
    lantern(ctx, x, y + 34, 34, 44, colors[i], t, true);
  }
}

const LEVEL_1 = {
  id: 'lantern-row',
  name: 'Lantern Row',
  tagline: 'A quiet riverside, lit by paper lanterns.',
  timeLimit: 180,
  drawBase(ctx, W, H, t) {
    sky(ctx, W, H, [[0, '#0a0f2e'], [0.55, '#241a4e'], [0.75, '#3a2358'], [1, '#1a1430']]);
    starField(ctx, L1_STARS, t);
    // distant hills
    ctx.fillStyle = '#171233';
    ctx.beginPath();
    ctx.moveTo(0, 380); ctx.quadraticCurveTo(140, 330, 280, 372);
    ctx.quadraticCurveTo(400, 405, 520, 360); ctx.lineTo(520, 420); ctx.lineTo(0, 420);
    ctx.closePath(); ctx.fill();
    // river — moonlit, so the lower half stays readable
    const rg = ctx.createLinearGradient(0, 400, 0, H);
    rg.addColorStop(0, '#2a4a80'); rg.addColorStop(1, '#122046');
    ctx.fillStyle = rg; ctx.fillRect(0, 400, W, H - 400);
    ctx.strokeStyle = 'rgba(255,210,110,0.4)';
    ctx.lineWidth = 2;
    for (const [y, x0, len] of [[440, 60, 90], [470, 300, 120], [510, 120, 70], [550, 340, 100], [590, 40, 80], [455, 200, 60], [530, 420, 70]]) {
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + len, y); ctx.stroke();
    }
    // riverside stall (right): posts + counter, awning is a difference
    ctx.fillStyle = '#4a2c14';
    ctx.fillRect(392, 330, 8, 92); ctx.fillRect(492, 330, 8, 92);
    ctx.fillStyle = '#6b4423';
    ctx.fillRect(380, 415, 132, 14);
    ctx.fillStyle = '#8a5a2e';
    ctx.fillRect(380, 429, 132, 8);
    ctx.fillStyle = '#c98a3a';
    ctx.fillRect(396, 396, 100, 16); // goods shelf
    ctx.fillStyle = '#7a4a8a'; ctx.fillRect(404, 384, 12, 12);
    ctx.fillStyle = '#3a7a5a'; ctx.fillRect(424, 384, 12, 12);
    ctx.fillStyle = '#c95a3a'; ctx.fillRect(444, 384, 12, 12);
    // wooden dock (bottom left), sun-warmed planks
    ctx.fillStyle = '#7a5230';
    ctx.fillRect(0, 540, 300, 80);
    ctx.strokeStyle = '#4a2e14';
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath(); ctx.moveTo(0, 556 + i * 16); ctx.lineTo(300, 556 + i * 16); ctx.stroke();
    }
    for (const x of [60, 140, 220]) {
      ctx.beginPath(); ctx.moveTo(x, 540); ctx.lineTo(x, 620); ctx.stroke();
    }
    // fixed reeds bottom-right (not a difference)
    reeds(ctx, 492, 612, 4, '#2f5a3a');
    drawLanternRow(ctx, t, 0.5);
  },
  diffs: [
    {
      id: 'moon', name: 'The moon’s shape', x: 95, y: 85, r: 42,
      draw(ctx, v) {
        glow(ctx, 95, 85, 70, '#ffe9a8', 0.55);
        ctx.fillStyle = '#ffe9a8';
        if (v === 0) {
          ctx.beginPath(); ctx.arc(95, 85, 32, 0, TAU); ctx.fill();
          ctx.fillStyle = 'rgba(210,170,90,0.6)';
          ctx.beginPath(); ctx.arc(85, 78, 6, 0, TAU); ctx.arc(105, 95, 4, 0, TAU); ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(95, 85, 32, 0, TAU);
          ctx.arc(108, 78, 28, 0, TAU);
          ctx.fill('evenodd');
        }
      },
    },
    {
      id: 'cat', name: 'The cat on the dock', x: 150, y: 520, r: 36,
      draw(ctx, v) { if (v === 0) sittingCat(ctx, 150, 520, 1, '#14101f'); },
    },
    {
      id: 'lantern-colour', name: 'One lantern’s colour', x: 260, y: 231, r: 32,
      draw(ctx, v, t) { lantern(ctx, 260, 231, 34, 44, v === 0 ? '#ff5a3c' : '#2ec8a8', t, true); },
    },
    {
      id: 'boat', name: 'The little boat', x: 390, y: 478, r: 42,
      draw(ctx, v) { if (v === 0) rowboat(ctx, 390, 478, 1.2); },
    },
    {
      id: 'awning', name: 'The stall awning’s stripes', x: 446, y: 322, r: 38,
      draw(ctx, v) {
        const stripe = v === 0 ? '#d94f3d' : '#2e7ac8';
        ctx.fillStyle = stripe;
        ctx.fillRect(380, 300, 132, 26);
        ctx.fillStyle = '#f5e6c8';
        for (let i = 0; i < 4; i++) ctx.fillRect(396 + i * 33, 300, 16, 26);
        ctx.fillStyle = stripe;
        for (let i = 0; i < 8; i++) {
          ctx.beginPath(); ctx.arc(388 + i * 16.5, 326, 8, 0, Math.PI); ctx.fill();
        }
        ctx.fillStyle = '#f5e6c8';
        for (let i = 0; i < 4; i++) {
          ctx.beginPath(); ctx.arc(404 + i * 33, 326, 8, 0, Math.PI); ctx.fill();
        }
      },
    },
    {
      id: 'bright-star', name: 'The brightest star', x: 455, y: 72, r: 30,
      draw(ctx, v, t) { if (v === 0) sparkle(ctx, 455, 72, 16, '#fff3b0', t); },
    },
    {
      id: 'reeds', name: 'The reeds by the dock', x: 48, y: 578, r: 38,
      draw(ctx, v) { reeds(ctx, 48, 612, v === 0 ? 5 : 3, '#2f5a3a'); },
    },
  ],
};

// ---------------------------------------------------------------- Level 2

const L2_STARS = [
  [24, 30, 0, 1.4], [90, 55, 1, 1.1], [180, 26, 2, 1.5], [300, 48, 3, 1.2],
  [420, 30, 4, 1.4], [500, 60, 5, 1.2], [250, 70, 0, 1.1], [60, 90, 1, 1.3],
];

function stringLights(ctx, t, deadX) {
  const pts = [];
  for (let i = 0; i <= 12; i++) {
    const u = i / 12;
    pts.push([20 + u * 480, 62 + Math.sin(u * Math.PI) * 42]);
  }
  ctx.strokeStyle = '#2a1a10';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (const [x, y] of pts.slice(1)) ctx.lineTo(x, y);
  ctx.stroke();
  for (let i = 1; i < 12; i++) {
    const [x, y] = pts[i];
    if (Math.abs(x - deadX) < 4) continue;
    const colors = ['#ffd23e', '#ff7a4d', '#7ae0a8', '#ff9ec8'];
    glow(ctx, x, y + 12, 16, colors[i % 4], 0.5);
    ctx.fillStyle = colors[i % 4];
    ctx.beginPath(); ctx.arc(x, y + 12, 5, 0, TAU); ctx.fill();
  }
}

function stall(ctx, x, y, w, awningA, awningB) {
  ctx.fillStyle = '#4a2c14';
  ctx.fillRect(x, y + 130, 8, 60); ctx.fillRect(x + w - 8, y + 130, 8, 60);
  ctx.fillStyle = '#6b4423';
  ctx.fillRect(x - 6, y + 124, w + 12, 14);
  ctx.fillStyle = '#8a5a2e';
  ctx.fillRect(x - 6, y + 138, w + 12, 8);
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = i % 2 === 0 ? awningA : awningB;
    ctx.fillRect(x + (i * w) / 6, y, w / 6, 26);
  }
  ctx.fillStyle = awningA;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath(); ctx.arc(x + (i * w) / 6 + w / 12, y + 26, w / 12, 0, Math.PI); ctx.fill();
  }
}

const LEVEL_2 = {
  id: 'night-market',
  name: 'Night Market',
  tagline: 'Stalls, string lights and something missing.',
  timeLimit: 150,
  drawBase(ctx, W, H, t) {
    sky(ctx, W, H, [[0, '#160b2e'], [0.4, '#2c1445'], [0.7, '#4a2140'], [1, '#241430']]);
    starField(ctx, L2_STARS, t);
    // buildings behind the market
    ctx.fillStyle = '#1c1233';
    ctx.fillRect(0, 130, 150, 120);
    ctx.fillRect(180, 100, 160, 150);
    ctx.fillRect(370, 140, 150, 110);
    ctx.fillStyle = '#241a40';
    ctx.fillRect(150, 170, 30, 80); ctx.fillRect(340, 150, 30, 100);
    // lit windows (the dark-window difference is drawn by the diff)
    ctx.fillStyle = '#ffd23e';
    ctx.fillRect(36, 160, 22, 26); ctx.fillRect(90, 200, 22, 26);
    ctx.fillRect(220, 130, 22, 26); ctx.fillRect(280, 180, 22, 26);
    ctx.fillRect(400, 170, 22, 26);
    stringLights(ctx, t, 340);
    // three stalls
    stall(ctx, 36, 300, 150, '#d94f3d', '#f5e6c8');
    stall(ctx, 200, 300, 150, '#2e7a4d', '#f5e6c8');
    stall(ctx, 364, 300, 150, '#2e5ac8', '#f5e6c8');
    // fruit stall goods (the green apple is a difference)
    ctx.fillStyle = '#c95a3a';
    for (const [x, y] of [[70, 420], [92, 420], [114, 420], [81, 404], [103, 404]]) {
      ctx.beginPath(); ctx.arc(x, y, 9, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = '#ffb02e';
    for (const [x, y] of [[140, 420], [160, 420], [150, 404]]) {
      ctx.beginPath(); ctx.arc(x, y, 9, 0, TAU); ctx.fill();
    }
    // tea stall jars
    ctx.fillStyle = '#7a4a8a'; ctx.fillRect(230, 400, 16, 22);
    ctx.fillStyle = '#3a7a5a'; ctx.fillRect(252, 400, 16, 22);
    ctx.fillStyle = '#c98a3a'; ctx.fillRect(274, 400, 16, 22);
    ctx.fillStyle = '#8a5a2e'; ctx.fillRect(296, 400, 16, 22);
    // fan stall goods
    ctx.strokeStyle = '#e8b23a'; ctx.lineWidth = 2;
    for (const [x, y] of [[400, 410], [440, 410], [480, 410]]) {
      ctx.beginPath(); ctx.arc(x, y, 12, Math.PI, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - 12, y); ctx.lineTo(x, y - 12); ctx.lineTo(x + 12, y); ctx.stroke();
    }
    // ground
    ctx.fillStyle = '#2a1a2e';
    ctx.fillRect(0, 520, W, H - 520);
    ctx.fillStyle = 'rgba(255,210,62,0.12)';
    ctx.fillRect(0, 520, W, 4);
    // balloon strings anchor (balloons are a difference)
    ctx.strokeStyle = 'rgba(220,220,220,0.6)';
    ctx.beginPath(); ctx.moveTo(90, 300); ctx.lineTo(90, 200); ctx.stroke();
  },
  diffs: [
    {
      id: 'balloons', name: 'The bunch of balloons', x: 90, y: 122, r: 38,
      draw(ctx, v) {
        if (v === 0) {
          balloon(ctx, 66, 118, 15, '#e84a5f');
          balloon(ctx, 92, 104, 16, '#ffd23e');
          balloon(ctx, 118, 122, 14, '#2e7ac8');
        } else {
          balloon(ctx, 78, 112, 15, '#e84a5f');
          balloon(ctx, 106, 124, 14, '#2e7ac8');
        }
      },
    },
    {
      id: 'bicycle', name: 'The bicycle by the stall', x: 424, y: 528, r: 42,
      draw(ctx, v) { if (v === 0) bicycle(ctx, 424, 528, 1); },
    },
    {
      id: 'dog', name: 'The dog asleep by the tea stall', x: 262, y: 552, r: 36,
      draw(ctx, v) { if (v === 0) lyingDog(ctx, 262, 552, 1, '#8a6b4a'); },
    },
    {
      id: 'tea-sign', name: 'The TEA sign’s colour', x: 272, y: 196, r: 36,
      draw(ctx, v) {
        ctx.fillStyle = v === 0 ? '#d94f3d' : '#2e7a4d';
        rr(ctx, 232, 176, 80, 40, 6); ctx.fill();
        ctx.fillStyle = '#f5e6c8';
        ctx.font = 'bold 24px Georgia, serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('TEA', 272, 197);
        ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(252, 176); ctx.lineTo(252, 168);
        ctx.moveTo(292, 176); ctx.lineTo(292, 168); ctx.stroke();
      },
    },
    {
      id: 'dead-bulb', name: 'The dead bulb in the lights', x: 340, y: 110, r: 26,
      draw(ctx, v) {
        if (v === 0) {
          glow(ctx, 340, 110, 16, '#7ae0a8', 0.5);
          ctx.fillStyle = '#7ae0a8';
          ctx.beginPath(); ctx.arc(340, 110, 5, 0, TAU); ctx.fill();
        } else {
          ctx.fillStyle = '#3a3348';
          ctx.beginPath(); ctx.arc(340, 110, 5, 0, TAU); ctx.fill();
        }
      },
    },
    {
      id: 'green-apple', name: 'The green apple', x: 150, y: 404, r: 26,
      draw(ctx, v) {
        ctx.fillStyle = v === 0 ? '#7ac84f' : '#c95a3a';
        ctx.beginPath(); ctx.arc(150, 404, 10, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#5a7a2e'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(150, 396); ctx.lineTo(152, 388); ctx.stroke();
      },
    },
    {
      id: 'flag', name: 'The little flag’s colour', x: 388, y: 212, r: 30,
      draw(ctx, v) {
        ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(388, 238); ctx.lineTo(388, 186); ctx.stroke();
        ctx.fillStyle = v === 0 ? '#e84a5f' : '#ffd23e';
        ctx.beginPath(); ctx.moveTo(388, 188); ctx.lineTo(416, 196); ctx.lineTo(388, 206); ctx.closePath(); ctx.fill();
      },
    },
    {
      id: 'dark-window', name: 'The dark window', x: 468, y: 158, r: 30,
      draw(ctx, v) {
        ctx.fillStyle = v === 0 ? '#ffd23e' : '#14101f';
        ctx.fillRect(456, 144, 24, 28);
        if (v === 0) {
          ctx.strokeStyle = '#8a6b1a'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(468, 144); ctx.lineTo(468, 172);
          ctx.moveTo(456, 158); ctx.lineTo(480, 158); ctx.stroke();
        }
      },
    },
  ],
};

// ---------------------------------------------------------------- Level 3

const L3_STARS = [
  [40, 50, 0, 1.4], [170, 30, 1, 1.2], [300, 60, 2, 1.5], [480, 40, 3, 1.3],
  [220, 90, 4, 1.1], [500, 130, 5, 1.4], [60, 160, 0, 1.2], [340, 180, 1, 1.3],
  [140, 110, 2, 1.1], [470, 210, 3, 1.2],
];

const LEVEL_3 = {
  id: 'firework-sky',
  name: 'Firework Sky',
  tagline: 'Fireworks over the rooftops — look sharp.',
  timeLimit: 120,
  drawBase(ctx, W, H, t) {
    sky(ctx, W, H, [[0, '#04061c'], [0.5, '#141038'], [0.8, '#2a1a4e'], [1, '#120a24']]);
    starField(ctx, L3_STARS, t);
    // smaller fireworks (shared)
    fireworkBurst(ctx, 120, 240, 8, 34, '#7ae0a8', t);
    fireworkBurst(ctx, 440, 230, 9, 30, '#ff9ec8', t);
    // rooftops
    ctx.fillStyle = '#160f2e';
    ctx.beginPath();
    ctx.moveTo(0, 470); ctx.lineTo(0, 620); ctx.lineTo(520, 620); ctx.lineTo(520, 450);
    ctx.lineTo(430, 450); ctx.lineTo(380, 420); ctx.lineTo(300, 420); ctx.lineTo(260, 450);
    ctx.lineTo(170, 450); ctx.lineTo(120, 430); ctx.lineTo(60, 430); ctx.lineTo(0, 470);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#0c0720'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(120, 430); ctx.lineTo(120, 620); ctx.moveTo(300, 420); ctx.lineTo(300, 620); ctx.stroke();
    // chimneys
    ctx.fillStyle = '#241a40';
    ctx.fillRect(138, 380, 30, 70);
    ctx.fillRect(288, 392, 30, 60);
    ctx.fillStyle = '#31244f';
    ctx.fillRect(132, 372, 42, 10);
    ctx.fillRect(282, 384, 42, 10);
    // lit windows (the dark-window difference is drawn by the diff)
    ctx.fillStyle = '#ffd23e';
    ctx.fillRect(60, 500, 26, 30); ctx.fillRect(180, 520, 26, 30);
    ctx.fillRect(400, 500, 26, 30); ctx.fillRect(460, 540, 26, 30);
    // lamp post (lantern head is a difference)
    ctx.fillStyle = '#1c1233';
    ctx.fillRect(56, 330, 8, 140);
    ctx.beginPath(); ctx.arc(60, 330, 5, 0, TAU); ctx.fill();
    // flag pole (flag is a difference)
    ctx.strokeStyle = '#1c1233'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(470, 330); ctx.lineTo(470, 262); ctx.stroke();
  },
  diffs: [
    {
      id: 'firework-rays', name: 'The big firework’s rays', x: 260, y: 150, r: 62,
      draw(ctx, v, t) { fireworkBurst(ctx, 260, 150, v === 0 ? 12 : 8, 66, '#ffb02e', t); },
    },
    {
      id: 'moon', name: 'The moon’s shape', x: 90, y: 85, r: 42,
      draw(ctx, v) {
        glow(ctx, 90, 85, 64, '#ffe9a8', 0.5);
        ctx.fillStyle = '#ffe9a8';
        if (v === 0) {
          ctx.beginPath(); ctx.arc(90, 85, 30, 0, TAU); ctx.fill();
        } else {
          ctx.beginPath(); ctx.arc(90, 85, 30, -Math.PI / 2, Math.PI / 2); ctx.closePath(); ctx.fill();
        }
      },
    },
    {
      id: 'kite', name: 'The kite in the sky', x: 430, y: 130, r: 36,
      draw(ctx, v, t) { if (v === 0) kite(ctx, 430, 130, 1, t); },
    },
    {
      id: 'chimney-smoke', name: 'The chimney smoke', x: 155, y: 330, r: 36,
      draw(ctx, v, t) { if (v === 0) smoke(ctx, 155, 360, t); },
    },
    {
      id: 'dark-window', name: 'The dark window', x: 320, y: 490, r: 30,
      draw(ctx, v) {
        ctx.fillStyle = v === 0 ? '#ffd23e' : '#0c0720';
        ctx.fillRect(306, 474, 26, 30);
        if (v === 0) {
          ctx.strokeStyle = '#8a6b1a'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(319, 474); ctx.lineTo(319, 504);
          ctx.moveTo(306, 489); ctx.lineTo(332, 489); ctx.stroke();
        }
      },
    },
    {
      id: 'flag', name: 'The rooftop flag’s colour', x: 478, y: 276, r: 30,
      draw(ctx, v) {
        ctx.fillStyle = v === 0 ? '#e84a5f' : '#2e7ac8';
        ctx.beginPath(); ctx.moveTo(470, 264); ctx.lineTo(500, 272); ctx.lineTo(470, 282); ctx.closePath(); ctx.fill();
      },
    },
    {
      id: 'shooting-star', name: 'The shooting star', x: 380, y: 70, r: 36,
      draw(ctx, v, t) {
        if (v !== 0) return;
        const x = 380 + Math.sin(t * 0.8) * 3;
        ctx.strokeStyle = '#fff3b0';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x - 34, 88); ctx.lineTo(x + 6, 62); ctx.stroke();
        sparkle(ctx, x + 8, 60, 7, '#fff3b0', t);
      },
    },
    {
      id: 'pole-lantern', name: 'The lamp-post lantern', x: 60, y: 312, r: 34,
      draw(ctx, v, t) {
        if (v === 0) lantern(ctx, 60, 312, 22, 28, '#ffb02e', t, true);
        else lantern(ctx, 60, 312, 22, 28, '#3a3348', t, false);
      },
    },
    {
      id: 'chimney-cat', name: 'The cat on the chimney', x: 303, y: 372, r: 30,
      draw(ctx, v) { if (v === 0) sittingCat(ctx, 303, 378, 0.7, '#0c0720'); },
    },
    {
      id: 'antenna', name: 'The rooftop antenna', x: 430, y: 400, r: 34,
      draw(ctx, v) {
        if (v !== 0) return;
        ctx.strokeStyle = '#c8ccd4'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(430, 450); ctx.lineTo(430, 386); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(414, 404); ctx.lineTo(446, 404); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(420, 392); ctx.lineTo(440, 392); ctx.stroke();
        ctx.fillStyle = '#ff5a3c';
        ctx.beginPath(); ctx.arc(430, 384, 4, 0, TAU); ctx.fill();
      },
    },
  ],
};

export const LEVELS = [LEVEL_1, LEVEL_2, LEVEL_3];
export const PANEL_W = 520;
export const PANEL_H = 620;
