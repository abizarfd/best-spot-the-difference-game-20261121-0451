# Lantern Light — a spot-the-difference game

Two pictures hang side by side. They look the same — they are not. Find every
difference before the lanterns burn down, across three lantern-lit nights:

1. **Lantern Row** — a quiet riverside, 7 differences, 3:00
2. **Night Market** — stalls and string lights, 8 differences, 2:30
3. **Firework Sky** — fireworks over the rooftops, 10 differences, 2:00

Click a difference on either picture to mark it: a green ring and a check
appear on both panels. Wrong clicks cost 15 points and 3 seconds; hints cost
50 points (3 per level). Finds build a combo multiplier up to ×3, and the
time left over becomes a bonus. Clear a level to earn 1–3 stars.

## Controls

- Mouse: click a difference on either picture
- Arrow keys: move the crosshair · Enter: mark at the crosshair
- H: hint · P: pause · R: restart · M: mute

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

Static files only — every picture is drawn procedurally on canvas and every
sound is synthesised with WebAudio, so the game makes zero network requests.

## Files

- `game/index.html` — the page
- `game/styles.css` — the lantern-lit look
- `game/src/scenes.js` — the three scenes and their differences
- `game/src/game.js` — state machine, input, timer, score, render
- `game/src/audio.js` — synthesised sounds
- `game/src/shots.js` — deterministic `?shot=` states for screenshots
- `game/src/main.js` — bootstrap
- `main.ts` — the entrypoint: copies game/ + screenshots/ to /output and
  writes /output/dossier.json
- `shots.json` — the four screenshot states

## License

MIT — see LICENSE.
