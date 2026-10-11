# RINK 26 — NHL roster and goalie update

An unofficial 3D browser hockey game with all 32 NHL teams. Team marks and player information belong to their respective owners. It is not an EA or NHL product.

## What's included

- An 18-second real-time cinematic at launch and before each match, with arena camera cuts, team introductions, soundtrack, skip, replay, and reduced-motion handling.
- All players in all 32 official current NHL roster feeds, without roster truncation. The bundled 2026-10-10 snapshot contains 773 unique players. Current feeds may include reserves or injured players but are not a historical or all-prospect database.
- Same-origin roster API, automatic refresh at launch and every 15 minutes while open, manual sync, per-team timestamps, and dated fallback data. Active matches retain their starting roster snapshot.
- Searchable player directory with real names, numbers, positions, handedness, height, weight, and portraits. Every listed skater and goalie is selectable. Skater line rotations reach the entire bench.
- Independently saved, remappable keyboard controls for skater and goalie modes. Duplicate bindings swap; Escape stays reserved. Touch controls change with the mode.
- A locked goalie mode with a view from behind the home net, manual movement, butterfly, lateral slides, glove catches, poke checks, freezes, passing, and recentering. Teammates are AI controlled. Freezes produce a defensive-zone faceoff.

## Default controls

Skater: WASD move, Space hold/release shot, X pass, E check, Q switch, Shift sprint, F next line, C camera, P/Escape pause.

Goalie: WASD move relative to the goalie camera, Space hold butterfly, Q/E slide left/right, Shift glove, F poke, R freeze, X clear, Z hold recenter, C camera, P/Escape pause.

## Structure

The Vinext root redirects to `/game/index.html`. The original game is preserved in `public/game/`. `/api/nhl/roster/[team]` reads only whitelisted official NHL roster feeds and caches each roster for 15 minutes. No external proxy service or API key is required.

`public/game/engine.mjs` contains the hockey simulation. `controls.mjs`, `roster-store.mjs`, `render.mjs`, `audio.mjs`, and `app.mjs` own their respective game features. `scripts/sync-nhl.mjs` refreshes the checked-in fallback data and team logos and respects upstream rate limits.

The three regulation periods, overtime, rink, puck rebounds, and checks remain arcade simulations; the game does not implement the full NHL rulebook or licensed player ratings.

## Validation

All 773 snapshot players were checked for individual selection; all bench skaters were reached by line rotation. Simulation checks cover goalie lock, movement, lateral slides, low/high save distinction, glove catch and clearing, freeze/faceoff, control conflicts and persistence, upstream errors and cached fallbacks. Full matches completed in both modes at all three difficulty settings. Production build verified. Browser visual/audio QA was unavailable in the environment.
