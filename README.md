# RINK 26 — The Next Shift

Unofficial browser hockey game. Play: https://ticklemytipbro.github.io/NHL-62/

## Update 2

- Skating momentum, carving turns and a dedicated hockey stop; directional goalie rebounds.
- AI support players seek space and defenders shade passing lanes.
- Wrist, slap and snap shots, horizontal/height aiming, and one-timers on pass receipt.
- Goalie shot-arrival marker, desperation dive and a 12-shot practice drill.
- Optional **arcade rules**: immediate offside, automatic icing, interference minors lasting 30 gameplay seconds, short-handed play and timed faceoff draws. This is not the full NHL rulebook.
- Three-second goal recordings replayed at half speed, with skip; browser-voice event commentary, captions and reactive crowd sound. Speech availability depends on browser voices.
- Saved custom player: name, number, handedness, helmet/stick/pad colors and four play styles. Replaces your starting center or goalie without modifying official roster data.
- A saved **31-game custom season**, all 32 teams, simulated results for other games, standings and schedule. Top 16 enter four best-of-three playoff rounds. Progress saves after completed matches on this browser; leaving an unfinished game replays that fixture. This is not the official NHL schedule or playoff seeding format.
- Shootout (three attempts each then sudden death), goalie practice, target shooting, passing and skating challenges.
- Daily scheduled complete roster refresh from official NHL current roster feeds. No player count cap; all records in those feeds are retained. Retired players and prospects outside the feeds are not included. A failed refresh keeps the previous complete snapshot.

## Controls

Existing skater/goalie controls remain remappable in **Customize controls**. Added defaults:

| Action | Key |
| --- | --- |
| Hockey stop (hold) | B |
| Cycle wrist / slap / snap shot | T |
| Aim left / right | Left / Right arrows |
| Raise / lower shot | Up / Down arrows |
| One-timer on receiving a pass (hold) | R |
| Win faceoff: tap just before countdown ends | X (pass) |
| Goalie desperation dive | V |
| Skip replay | Space / Enter / Escape |

Custom style effects: speedster +10% skating speed; sniper +6% shot speed; power +15% check impulse and longer stun with -4% skating speed; balanced is neutral.

## Running locally

The playable build is the static files at repository root, plus `vendor/` and `logos/`. Preserve these folders. From this directory, serve with a local static server (for example `python -m http.server 8000`) and open `http://localhost:8000`. Direct `file://` opening does not support the module/data loading used by the game.

No npm install or framework build is required for GitHub Pages. Framework files from the original upload are retained but not used by this static build.

## Roster workflow

`.github/workflows/refresh-rosters.yml` runs daily at **09:23 UTC**, can be run manually in GitHub Actions, and also runs when its workflow or sync script changes. GitHub may delay scheduled jobs. It fetches all 32 feeds, validates them, runs tests, commits `rosters.json`, and explicitly requests a Pages rebuild (bot commits do not themselves trigger Pages builds). The workflow needs contents/write and pages/write permissions. After a published refresh, the game's SYNC button or its 15-minute polling reads that snapshot; it does not query NHL live from the browser.

## Checks

`node --test tests/*.test.mjs`

Covers complete drill lifecycles, shootout rounds, faceoff timing, penalties, offsides/icing, one-timers, replay restoration, player settings, control migration, schedule integrity and complete season/playoff progression.

Team marks and player information belong to their respective owners. This is not an EA or NHL product. Three.js license: `vendor/LICENSE.txt`.
