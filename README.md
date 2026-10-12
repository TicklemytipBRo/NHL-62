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

## Update 3 — Full Arena 3D

The game again offers only the original Three.js 3D characters for gameplay. The old 2D compatibility module is unused. Chrome/Edge require graphics acceleration and a working WebGL context; the startup panel explains recovery and allows access to team/career menus without a GPU.

- **Dynamic seasons:** balanced home/away simulation, per-save fictional attack/defense ratings, form, winning/losing streaks, short-term injuries, overtime losses, and form effects in played games. Standings conserve one win and one loss/OT loss per fixture.
- **Team Builder:** city, team, arena, abbreviation, colors, three jersey patterns, roster-name overrides, fictional sponsor, custom chant, and twelve cinematic packs. Each pack changes camera offsets, light color, water ripples, and introductory copy. Waterglass is a stylized animated ice surface and spring/damping glass response, not a computational fluid simulation.
- **Be a Pro:** three junior showcases using the available roster opponents, performance-based draft stock, skater or goalie player lock, short shift recovery, personal stats and assists, coach objectives/trust, training, attribute upgrades, XP, levels, media choices, fans, chemistry, salary, contracts, offseason team moves, seasons, playoffs, awards and local saves. This is an original compact browser career—not a full reproduction of EA's game. Training and skill points improve gameplay; trust changes shift length. Team moves are chosen in the offseason, not negotiated with AI general managers.
- **Arena:** original 3D skaters, fictional board sponsors, penalty-box occupants, player benches and animated coaches, glass flex, intro spotlights and rippling ice. Every match begins with its arena sequence.
- **Goalies:** acceleration-limited tracking, delayed reads through traffic, butterfly height/reach tradeoffs, lateral slide damping/recovery, swept puck saves, glove catches and shot-energy-based rebounds.
- **Mouse:** left = shot charge/butterfly, right = pass/glove, middle = check/poke. Any of five mouse buttons can be assigned in each independent layout. Keyboard and touch controls remain supported.
- **Zamboni:** main-menu or intermission mini-game. W/S throttle/reverse, A/D steering, B brake, hold Space/left mouse to resurface. Clean at least 95%, then stop for one second in the east off-ice service bay at x≈68, z≈16. Exit returns to the menu or intermission without losing the match.
- **Broadcast:** one serialized speech queue for arena introductions, goals/scores, period announcements, penalties, saves, faceoffs and crowd chants; new lines do not cancel existing narration. Intros wait for their announcement to finish unless explicitly skipped. Browser voice availability and autoplay permissions vary; captions remain visible. Crowd voices are synthesized, not recorded arena crowds.

All progress is browser-local. Current NHL roster snapshots stay separate from custom-team edits. No official sponsor affiliation is implied.

Verification: `node --test tests/*.test.mjs`. Tests cover season accounting, the full pro-career lifecycle, mouse mapping, player lock, goalie collision/catches, mini-game completion gates and existing gameplay modes.

## Update 4 — Collect, Create, Learn

- Announcer defaults to locally bundled, generic synthesized MP3 voice clips played through the game's unlocked Web Audio context. **Announcer Audio → Enable & Test Announcer** exposes playback status, volume, and optional browser voices for full player/team names. Browser speech that never starts falls back to a bundled clip. The speaker button's first click now enables audio rather than muting an uninitialized sound system. Music/effects duck during narration.
- **Player Packs** are unlimited and free: five independent uniform draws from every unique player in the current published 32-team roster snapshot. Duplicates accumulate. The exact eligible count and per-card odds are visible. No paid currency, purchases, rarity weighting, or gambling rewards exist.
- **My Teams & Lineup** saves multiple custom clubs. Collected players can be assigned to three forward, two defense and one goalie starting slot. Empty positions use the chosen base team's roster. A player cannot fill two slots. Starting lineup IDs reach the match engine; collection data never edits official rosters.
- Custom teams have their own home-selector entry and **Save & Play This Team** action. Crests, six jersey patterns, helmet/pants/socks/pads/number colors, roster selection, arena branding, sponsors, chants and cinematic packs are configurable. Custom identity also carries into a newly created season.
- **Gretzky Hockey School** has six fictional fan-tutorial lessons, a CC0 photograph of Wayne Gretzky above the lesson text, generic computer narration, current key bindings, and buttons to launch matching practice drills. Neither the script nor the voice is an authentic statement by Gretzky. Photo and voice credits are in `assets/CREDITS.md`.

Player availability follows the NHL feeds: retired players and prospects absent from those feeds are not part of the current-player pack pool. Saves and card collections stay in this browser.

## Ice & Coins update
Wallet starts at 0. Complete all four live tutorial objectives to earn 500 once; progress is saved locally. Completed matches award 150 (+100 for a win); successful drills award 100. Tutorial retries do not farm coins. Pack prices/cards: Bronze 500/5, Silver 650/15, Gold 800/25, Emerald 900/32, Diamond 1100/65, Ice Special 5000/50. All synced NHL players are equally eligible in every pack; higher prices do not imply rarity odds. No real money. Local browser saves are not a secure online economy. Existing collections are retained.

Guided tutorial, four themed drills, layered crowd chant, Canadian/US anthem play-or-skip ceremony, cursor-tilted cards and translucent glass panels. Anthems stream from credited external hosts and can always be skipped. 3D requires WebGL; enable graphics acceleration in Windows Chrome/Edge.
