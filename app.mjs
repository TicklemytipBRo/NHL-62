import {installClubhouse} from './clubhouse-ui.mjs';
import { TEAMS, clamp } from './engine.mjs';
import { EliteGame as HockeyGame } from './elite-engine.mjs';
import {installElite} from './elite-ui.mjs';
import {customizeRoster,teamPresentation,teamPack} from './team-builder.mjs';
import { installExpansion } from './expansion-ui.mjs';
let expansion=null;
import { RinkRenderer } from './render.mjs';
import { ArenaAudio } from './audio.mjs';
import { Controls, LABELS, keyLabel, DEFAULTS } from './controls.mjs';
import { RosterStore } from './roster-store.mjs';
const $=id=>document.getElementById(id);
const audio=new ArenaAudio();let view=null,previousMode='menu',lastCountdown=0,modalClose=null,toastTimer=0,rafLast=0,accumulator=0,uiClock=0;
const controls=new Controls();const keys=new Set(),touch={x:0,z:0,shoot:false,sprint:false,butterfly:false,recenter:false};
let playerMode='skater',binding=null,controlTab='skater',intro=null,introPhase=-1,rosterSignature='',rosterDialogTeam=null;
const chosenSkaters={},chosenGoalies={};
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let home=0,away=1;
const game=new HockeyGame({onEvent:event=>{
  audio.event(event.type);expansion?.onEvent(event);
  if(event.type==='goal'){view?.goal(event.team);}
  if(event.type==='hit'&&event.team===0)toast('BIG HIT');
  if(event.type==='post')toast('OFF THE POST');
  if(event.type==='linechange'&&event.team===0)toast('FRESH LINE ON THE ICE');
  if(event.type==='lineblocked')toast('Release the puck before changing lines');
  if(event.type==='save'&&event.manual)toast('SAVE');
}});
const rosterStore=new RosterStore(onRosterChange);
for(const t of TEAMS){const i=TEAMS.indexOf(t);for(const id of ['home-team','away-team']){const o=document.createElement('option');o.value=i;o.textContent=t.fullName;$(id).appendChild(o);}}
$('home-team').value=home;$('away-team').value=away;
function updateTeams(changed){
  const isClub=$('home-team').value==='club';home=isClub?(expansion?.club().baseTeam||0):Number($('home-team').value);away=Number($('away-team').value);if(expansion){expansion.setClubEnabled(isClub);game.settings.club={...expansion.club()};}
  if(home===away){if(changed==='away'){if(isClub){away=(home+1)%TEAMS.length;$('away-team').value=away;}else{home=(away+1)%TEAMS.length;$('home-team').value=home;}}else{away=(home+1)%TEAMS.length;$('away-team').value=away;}}
  const h=teamPresentation({...game.settings,home,away},0,TEAMS),a=TEAMS[away];document.documentElement.style.setProperty('--home',h.color);document.documentElement.style.setProperty('--away',a.color);
  $('home-badge').firstElementChild.src=h.logo;$('home-badge').firstElementChild.alt=h.fullName;$('away-badge').firstElementChild.src=a.logo;$('away-badge').firstElementChild.alt=a.fullName;$('home-name').textContent=h.name;$('away-name').textContent=a.name;
  $('home-abbr').textContent=h.short;$('away-abbr').textContent=a.short;game.settings.home=home;game.settings.away=away;refreshPlayerPicker();applyRosterPreview();view?.rebuildPlayers();
}
$('home-team').addEventListener('change',()=>updateTeams('home'));$('away-team').addEventListener('change',()=>updateTeams('away'));updateTeams();
const touchDevice=matchMedia('(pointer: coarse)').matches||navigator.maxTouchPoints>0;
if(touchDevice)document.body.classList.add('touch-device');
function toast(text){$('toast').textContent=text;$('toast').classList.remove('hidden');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.add('hidden'),1500);}
function resetInput(){keys.clear();touch.x=touch.z=0;touch.shoot=touch.sprint=touch.butterfly=touch.recenter=touch.stop=touch.oneTimer=false;game.charge=0;$('joystick-knob').style.transform='';document.querySelectorAll('.touch-buttons button').forEach(b=>b.classList.remove('active'));}
function start(type="exhibition"){
  if(typeof type!=="string")type="exhibition";if(type==='club')refreshClub();
  if(!view){toast('Enable graphics acceleration and reload to play in 3D.');return;}const h=rosterStore.get(TEAMS[home].short),a=rosterStore.get(TEAMS[away].short);if(!h||!a){toast('Wait for both team rosters to load');return;}
  audio.unlock().catch(()=>{});resetInput();hideModal();
  const matchOptions=expansion.options(type);if(matchOptions.club.enabled){const roster=expansion.homeRoster(h.players,matchOptions.club);chosenSkaters[TEAMS[home].short]=roster.find(p=>!['D','G'].includes(p.position))?.id;chosenGoalies[TEAMS[home].short]=roster.find(p=>p.position==='G')?.id;}game.start({...matchOptions,home,away,difficulty:$('difficulty').value,periodLength:Number($('period-length').value),playerMode,homeSkater:chosenSkaters[TEAMS[home].short],homeGoalie:chosenGoalies[TEAMS[home].short],awaySkater:chosenSkaters[TEAMS[away].short],awayGoalie:chosenGoalies[TEAMS[away].short]},[customizeRoster(expansion.homeRoster(h.players,matchOptions.club),matchOptions.club),a.players]);
  view.rebuildPlayers();$('home-abbr').textContent=teamPresentation(game.settings,0,TEAMS).short;$('camera').querySelector('span').textContent=playerMode==='goalie'?'Goalie':view.cameraMode==='broadcast'?'Broadcast':'Follow';$('menu').classList.add('hidden');$('hud').classList.add('hidden');$('pause').classList.add('hidden');document.body.classList.add('playing');document.body.classList.toggle('goalie-mode',playerMode==='goalie');$('touch-controls').classList.add('hidden');$('start').blur();previousMode='';refreshHints();beginIntro('match');
}
function beginIntro(kind='opening'){
  if(!view)return;hideModal();resetInput();intro={kind,time:0};introPhase=-1;game.mode='intro';view.cinematic={time:0};$('cinematic').classList.remove('hidden');document.body.classList.add('watching-intro');const homePresentation=teamPresentation(game.settings,0,TEAMS);$('cinema-home').src=homePresentation.logo;$('cinema-home').alt=homePresentation.fullName;$('cinema-away').src=TEAMS[away].logo;$('cinema-away').alt=TEAMS[away].fullName;
  if(kind==='match'){audio.cinematic();expansion.intro();}$('skip-intro').focus();
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)finishIntro();
}
function finishIntro(){
  if(!intro)return;const kind=intro.kind;intro=null;view.cinematic=null;audio.stopCinematic?.();$('cinematic').classList.add('hidden');document.body.classList.remove('watching-intro');
  if(kind==='match'){if(game.drill){game.mode='faceoff';game.phaseTimer=1.5;}else game.faceoff();$('hud').classList.remove('hidden');$('pause').classList.remove('hidden');$('touch-controls').classList.toggle('hidden',!touchDevice);syncUI();}
  else{game.mode='menu';$('start').focus();}
}
function advanceIntro(dt){
  if(!intro)return;intro.time+=dt;view.cinematic.time=intro.time;const phase=Math.min(3,Math.floor(intro.time/4.5));$('cinema-progress').style.width=`${Math.min(100,intro.time/18*100)}%`;
  if(phase!==introPhase){introPhase=phase;const match=intro.kind==='match',goalie=playerMode==='goalie';const names=[['32 NHL TEAMS','THE LEAGUE.<br>YOUR ICE.','Every shift starts here.'],['OWN THE CREASE',goalie?'THIS IS<br>YOUR NET.':'BUILT FOR<br>THE MOMENT.',match?(game.players[goalie?5:game.selected].name):'Timing. Positioning. Instinct.'],['TONIGHT’S MATCHUP',`${esc(TEAMS[home].name.toUpperCase())}<br><em>VS ${esc(TEAMS[away].name.toUpperCase())}</em>`,`${TEAMS[home].fullName} · ${TEAMS[away].fullName}`],['VERY BAD GAMES PRESENTS','RINK <em>26.</em>',match?(goalie?'Protect the crease.':'Take the ice.'):'Your rink. Your rivalry.']];if(game.settings.club?.enabled){const club=game.settings.club;names[0]=[club.arena.toUpperCase(),esc(club.city.toUpperCase())+'<br>'+esc(club.name.toUpperCase()),teamPack(club).line];names[2]=['TONIGHT’S MATCHUP',esc(club.name.toUpperCase())+'<br><em>VS '+esc(TEAMS[away].name.toUpperCase())+'</em>',club.arena];}const [k,title,detail]=names[phase];$('cinema-kicker').textContent=k;$('cinema-title').innerHTML=title;$('cinema-detail').textContent=detail;$('cinema-teams').classList.toggle('hidden',phase!==2);$('cinema-copy').classList.remove('cinema-enter');void $('cinema-copy').offsetWidth;$('cinema-copy').classList.add('cinema-enter');}
  if(intro.time>=18&&!expansion.broadcast.introBusy)finishIntro();
}
function returnToMenu(){game.zamboni=null;if(intro)finishIntro();hideModal();resetInput();game.mode='menu';$('menu').classList.remove('hidden');$('hud').classList.add('hidden');$('pause').classList.add('hidden');$('touch-controls').classList.add('hidden');document.body.classList.remove('playing','goalie-mode');applyRosterPreview();$('start').focus();}
function hideModal(){ $('modal-layer').classList.add('hidden');$('modal').replaceChildren();modalClose=null;binding=null;rosterDialogTeam=null;$('modal').classList.remove('wide-modal'); }
function showModal(html,close=null){$('modal').innerHTML=html;$('modal-layer').classList.remove('hidden');modalClose=close;$('modal').querySelector('button')?.focus();resetInput();}
function showPause(){
  if(!['paused','play','faceoff','goal','frozen'].includes(game.mode))return;game.pause();
  showModal('<div class="eyebrow">TIMEOUT</div><h2 id="modal-title">TAKE A BREATHER.</h2><p>The ice will be here.</p><button class="primary" id="resume-match">RESUME MATCH</button><button class="secondary" id="pause-controls">Customize controls</button><button class="secondary" id="pause-roster">Full team roster</button><button class="secondary" id="exit-match">Back to team selection</button>',resume);
  $('pause-roster').onclick=()=>showRoster(TEAMS[home].short,true);$('resume-match').onclick=resume;$('pause-controls').onclick=showControls;$('exit-match').onclick=returnToMenu;
}
function resume(){hideModal();resetInput();game.resume();$('pause').blur();}
function showControls(){
  const prior=game.mode;game.pause();controlTab=playerMode;
  const close=()=>{hideModal();refreshHints();if(prior==='paused')showPause();else if(['play','faceoff','goal','frozen'].includes(prior))game.resume();};
  showModal(`<button class="modal-close" id="close-controls" aria-label="Close controls">×</button><div class="eyebrow">YOUR KEYS. YOUR GAME.</div><h2 id="modal-title">CUSTOMIZE CONTROLS.</h2><div class="control-tabs"><button id="tab-skater">Skater</button><button id="tab-goalie">Goalie</button></div><p class="binding-note" id="binding-note">Click a binding, then press a key or mouse button. Conflicts swap automatically.</p><div id="binding-list"></div><p class="controls-tip" id="control-mode-tip"></p><div class="control-footer"><button class="secondary" id="reset-keys">Reset this layout</button><button class="primary" id="controls-done">DONE</button></div><small class="setting-note">Layouts are saved in this browser. Esc always pauses or cancels.</small>`,close);
  $('close-controls').onclick=close;$('controls-done').onclick=close;$('tab-skater').onclick=()=>{binding=null;controlTab='skater';drawBindings();};$('tab-goalie').onclick=()=>{binding=null;controlTab='goalie';drawBindings();};$('reset-keys').onclick=()=>{controls.reset(controlTab);binding=null;drawBindings();refreshHints();};drawBindings();
}
function drawBindings(){
  $('tab-skater').classList.toggle('active',controlTab==='skater');$('tab-goalie').classList.toggle('active',controlTab==='goalie');
  $('binding-list').innerHTML=Object.entries(controls.maps[controlTab]).map(([action,key])=>`<div class="bind-row"><span>${LABELS[action]}</span><button data-bind="${action}" aria-label="Change ${LABELS[action]} key">${keyLabel(key)}</button></div>`).join('');
  $('binding-list').querySelectorAll('[data-bind]').forEach(button=>button.onclick=()=>{binding={mode:controlTab,action:button.dataset.bind};$('binding-note').textContent='Press a key or mouse button. Esc cancels.';button.textContent='PRESS KEY…';button.classList.add('listening');});
  $('control-mode-tip').textContent=controlTab==='goalie'?'Your movement is relative to the view from behind your net. Butterfly protects low shots; the glove reaches high shots. Slide across the crease, poke nearby pucks, freeze loose pucks, or pass after a catch.':'Hold shoot for power, then release. Pass toward your movement direction. Sprint uses stamina. All roster players can be selected before a match; line changes rotate the bench.';
}
function refreshHints(){
  const mode=game.mode==='menu'?playerMode:game.settings.playerMode,map=controls.maps[mode];const actions=mode==='goalie'?[['butterfly','Butterfly'],['slideLeft','Slide left'],['slideRight','Slide right'],['glove','Glove'],['freeze','Freeze'],['clear','Clear']]:[['shoot','Hold to shoot'],['pass','Pass'],['check','Check'],['switch','Switch'],['sprint','Sprint'],['line','Next line']];
  $('key-hints').innerHTML=`<span><kbd>${keyLabel(map.up)} ${keyLabel(map.left)} ${keyLabel(map.down)} ${keyLabel(map.right)}</kbd> ${mode==='goalie'?'Position':'Skate'}</span>`+actions.map(([a,label])=>`<span><kbd>${keyLabel(map[a])}</kbd> ${label}</span>`).join('');$('shot-release-hint').textContent=`Release ${keyLabel(controls.maps.skater.shoot)} to shoot`;$('attack-hint').textContent=mode==='goalie'?'PROTECT YOUR NET':'ATTACK RIGHT ›';
}
function setMode(mode){
  playerMode=mode;game.settings.playerMode=mode;$('mode-skater').classList.toggle('active',mode==='skater');$('mode-goalie').classList.toggle('active',mode==='goalie');$('mode-skater').setAttribute('aria-pressed',String(mode==='skater'));$('mode-goalie').setAttribute('aria-pressed',String(mode==='goalie'));$('mode-description').textContent=mode==='goalie'?'Lock into goal. Your skaters play as AI teammates.':'Control your skaters. Build the play.';$('mode-note').textContent=mode==='goalie'?'YOU DEFEND THE NET':'YOU ATTACK RIGHT';refreshPlayerPicker();refreshHints();configureTouch();
}
function refreshPlayerPicker(){
  const code=TEAMS[home].short,roster=rosterStore.get(code),keeper=playerMode==='goalie';$('player-select-label').textContent=keeper?'STARTING GOALIE':'STARTING SKATER';
  const activeRoster=expansion?.club().enabled?expansion.homeRoster(roster?.players??[],expansion.club()):roster?.players??[];const players=activeRoster.filter(p=>keeper?p.position==='G':p.position!=='G');const choices=keeper?chosenGoalies:chosenSkaters;if(expansion?.club().enabled)choices[code]=players[0]?.id;$('home-player').disabled=!!expansion?.club().enabled;
  if(!players.some(p=>p.id===choices[code]))choices[code]=(players.find(p=>p.lastName==='McDavid')??players[0])?.id;
  $('home-player').innerHTML=players.length?players.map(p=>`<option value="${p.id}">#${esc(p.number??'–')} ${esc(p.name)} · ${esc(p.position)}</option>`).join(''):'<option>Loading roster…</option>';
  if(choices[code])$('home-player').value=choices[code];$('start').disabled=!view||!roster||!rosterStore.get(TEAMS[away].short);
  for(const side of ['home','away']){const team=TEAMS[side==='home'?home:away],r=rosterStore.get(team.short);$(side+'-roster').textContent=r?`${r.count} players · Roster`:'View roster';}
}
function applyRosterPreview(){
  if(!['menu','intro'].includes(game.mode)||(intro&&intro.kind==='match'))return;const h=rosterStore.get(TEAMS[home].short),a=rosterStore.get(TEAMS[away].short);if(!h||!a)return;
  const signature=[JSON.stringify(expansion?.club()),h.team,h.fetchedAt,a.team,a.fetchedAt,chosenSkaters[h.team],chosenGoalies[h.team]].join('|');if(signature===rosterSignature)return;rosterSignature=signature;const mode=game.mode;game.rosters=[expansion?.club().enabled?customizeRoster(expansion.homeRoster(h.players,expansion.club()),expansion.club()):h.players,a.players];Object.assign(game.settings,{homeSkater:chosenSkaters[h.team],homeGoalie:chosenGoalies[h.team]});game.setupPlayers();game.faceoff(false);game.mode=mode;
}
function onRosterChange(status){
  $('roster-status').textContent=status.syncing?`Syncing ${status.done}/32 · ${status.players} players loaded`:status.failures.length?`${status.teams}/32 teams · ${status.players} players · ${status.failures.length} using saved rosters`:`${status.teams}/32 teams · ${status.players} players · Published roster ${status.oldest?new Date(status.oldest).toLocaleString():''}`;
  $('sync-now').disabled=status.syncing;$('sync-now').textContent=status.syncing?'SYNCING…':'SYNC';refreshPlayerPicker();applyRosterPreview();
}
function showRoster(teamCode=null,fromPause=false){
  const close=()=>{hideModal();if(fromPause)showPause();};
  showModal(`<button class="modal-close" id="close-roster" aria-label="Close roster">×</button><div class="eyebrow">OFFICIAL NHL CURRENT ROSTERS</div><h2 id="modal-title">EVERY SHIFT STARTS HERE.</h2><div class="roster-filters"><label>TEAM<select id="roster-team"><option value="ALL">All 32 teams</option>${TEAMS.map(t=>`<option value="${t.short}">${esc(t.fullName)}</option>`).join('')}</select></label><label>FIND A PLAYER<input id="roster-search" type="search" placeholder="Player name, number, position…"></label></div><p class="roster-summary" id="roster-summary"></p><div id="roster-grid"></div><p class="setting-note">All players returned by the NHL’s current roster feeds are included. These feeds may include injured or reserve players; they do not cover every prospect or retired player. Selection changes apply to your next match.</p><button class="primary" id="roster-done">DONE</button>`,close);
  $('modal').classList.add('wide-modal');$('roster-team').value=teamCode??'ALL';rosterDialogTeam=teamCode??'ALL';$('close-roster').onclick=close;$('roster-done').onclick=close;$('roster-team').onchange=()=>{rosterDialogTeam=$('roster-team').value;drawRoster();};$('roster-search').oninput=drawRoster;drawRoster();
}
function drawRoster(){
  const filter=$('roster-team').value,q=$('roster-search').value.trim().toLocaleLowerCase();let count=0;
  const rows=[];for(const team of TEAMS){if(filter!=='ALL'&&filter!==team.short)continue;const roster=rosterStore.get(team.short);if(!roster){rows.push(`<p>${esc(team.fullName)} · Roster unavailable</p>`);continue;}const players=roster.players.filter(p=>`${p.name} ${p.number} ${p.position}`.toLocaleLowerCase().includes(q));count+=players.length;if(!players.length)continue;
    rows.push(`<div class="roster-team-heading"><img src="${team.logo}" alt=""><div><h3>${esc(team.fullName)}</h3><small>${roster.count} players · ${roster.localSource==='live'?'Synced':'Saved roster'} ${new Date(roster.fetchedAt).toLocaleString()}</small></div><a href="${roster.source}" target="_blank" rel="noopener">Source</a></div><div class="roster-players">`);
    for(const p of players){const chosen=(p.position==='G'?chosenGoalies:chosenSkaters)[team.short]===p.id;const label=p.position==='G'?'START IN GOAL':'START THIS SKATER';rows.push(`<article class="roster-player"><div class="roster-photo">${p.headshot?`<img src="${esc(p.headshot)}" loading="lazy" alt="${esc(p.name)}" onerror="this.style.display='none'">`:'<span>NHL</span>'}</div><div class="roster-player-copy"><small>${esc(p.position)} · #${esc(p.number??'–')} · ${esc(p.country)}</small><h4>${esc(p.name)}</h4><p>${p.height?`${p.height} cm`:''}${p.weight?` · ${p.weight} kg`:''}${p.hand?` · ${p.position==='G'?'Catches':'Shoots'} ${p.hand}`:''}</p><button data-player="${p.id}" data-team="${team.short}" class="${chosen?'chosen':''}">${chosen?'SELECTED':label}</button></div></article>`);}rows.push('</div>');
  }
  $('roster-summary').textContent=`${count} players shown · ${rosterStore.status().players} unique players across ${rosterStore.status().teams}/32 teams`;$('roster-grid').innerHTML=rows.join('')||'<p>No matching players.</p>';
  $('roster-grid').querySelectorAll('[data-player]').forEach(button=>button.onclick=()=>{const code=button.dataset.team,id=Number(button.dataset.player),p=rosterStore.get(code).players.find(p=>p.id===id);if(p.position==='G')chosenGoalies[code]=id;else chosenSkaters[code]=id;if(game.mode==='menu'){home=TEAMS.findIndex(t=>t.short===code);$('home-team').value=home;setMode(p.position==='G'?'goalie':'skater');updateTeams('home');}refreshPlayerPicker();applyRosterPreview();drawRoster();toast(`${p.name} selected for ${TEAMS.find(t=>t.short===code).city}`);});
}
function statTable(){return `<table class="stats"><thead><tr><th>${teamPresentation(game.settings,0,TEAMS).short}</th><th>MATCH STATS</th><th>${TEAMS[away].short}</th></tr></thead><tbody><tr><td>${game.stats.shots[0]}</td><td>Shots</td><td>${game.stats.shots[1]}</td></tr><tr><td>${game.stats.saves[0]}</td><td>Saves</td><td>${game.stats.saves[1]}</td></tr><tr><td>${game.stats.hits[0]}</td><td>Hits</td><td>${game.stats.hits[1]}</td></tr></tbody></table>`;}
function showIntermission(){const overtime=game.period>=3;showModal(`<div class="eyebrow">${overtime?'TIED AT THE HORN':`END OF PERIOD ${game.period}`}</div><h2 id="modal-title">${overtime?'NEXT GOAL WINS.':'BACK IN A MOMENT.'}</h2><div class="final-score">${game.score[0]}–${game.score[1]}</div>${statTable()}<button class="primary" id="next-period">${overtime?'START OVERTIME':`START PERIOD ${game.period+1}`}</button><button id="intermission-ice" class="secondary">DRIVE THE ZAMBONI</button>`);$('intermission-ice').onclick=()=>expansion.zamboni(true);$('next-period').onclick=()=>{hideModal();game.nextPeriod();};}
function showFinal(){if(expansion.final())return;const win=game.score[0]>game.score[1];showModal(`<div class="eyebrow">FINAL${game.period>3?' / OVERTIME':''}</div><h2 id="modal-title">${win?'THAT’S YOUR ICE.':'RUN IT BACK.'}</h2><p>${TEAMS[win?home:away].city} takes the win.</p><div class="final-score">${game.score[0]}–${game.score[1]}</div>${statTable()}<button class="primary" id="rematch">PLAY AGAIN</button><button class="secondary" id="change-teams">Change teams</button>`);$('rematch').onclick=start;$('change-teams').onclick=returnToMenu;}
function cameraToggle(){view.cameraMode=view.cameraMode==='broadcast'?'follow':'broadcast';$('camera').querySelector('span').textContent=game.settings.playerMode==='goalie'?(view.cameraMode==='broadcast'?'Goalie':'High goalie'):(view.cameraMode==='broadcast'?'Broadcast':'Follow');}
$('mode-skater').onclick=()=>setMode('skater');$('mode-goalie').onclick=()=>setMode('goalie');$('home-player').onchange=()=>{(playerMode==='goalie'?chosenGoalies:chosenSkaters)[TEAMS[home].short]=Number($('home-player').value);applyRosterPreview();};$('home-roster').onclick=()=>showRoster(TEAMS[home].short);$('away-roster').onclick=()=>showRoster(TEAMS[away].short);$('all-rosters').onclick=()=>showRoster();$('sync-now').onclick=()=>rosterStore.sync();$('replay-intro').onclick=()=>beginIntro('opening');$('skip-intro').onclick=finishIntro;$('intro-sound').onclick=async()=>{await audio.unlock();if(audio.muted)audio.toggle();audio.cinematic();$('intro-sound').textContent='SOUND ENABLED';};
$('start').onclick=start;$('pause').onclick=showPause;$('how-to').onclick=showControls;$('help-game').onclick=showControls;$('camera').onclick=cameraToggle;
$('sound').onclick=()=>{const first=!audio.ctx;audio.unlock().catch(()=>{});const muted=first?audio.muted:audio.toggle();$('sound').classList.toggle('muted',muted);$('sound').setAttribute('aria-label',muted?'Unmute audio':'Mute audio');$('sound').title=muted?'Sound off':'Sound on';};
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else toast('Fullscreen is unavailable in this browser');}catch{toast('Fullscreen is unavailable in this browser');}};
function input(){if(game.zamboni)return{x:(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0),z:(keys.has('KeyS')?1:0)-(keys.has('KeyW')?1:0),shoot:keys.has('Space')||keys.has('Mouse0'),stop:keys.has('KeyB')};const mode=game.settings.playerMode;const held=a=>controls.held(mode,a,keys);let x=(held('right')?1:0)-(held('left')?1:0)+touch.x,z=(held('down')?1:0)-(held('up')?1:0)+touch.z;const n=Math.hypot(x,z);if(n>1){x/=n;z/=n;}return{x,z,stop:held('stop')||touch.stop,oneTimer:held('oneTimer')||touch.oneTimer,aimDirection:(held('aimRight')?1:0)-(held('aimLeft')?1:0),aimVertical:(held('aimHigh')?1:0)-(held('aimLow')?1:0),shoot:held('shoot')||touch.shoot,sprint:held('sprint')||touch.sprint,butterfly:held('butterfly')||touch.butterfly,recenter:held('recenter')||touch.recenter};}
function performAction(action){
  if(action==='pause'){if(game.mode==='paused'&&modalClose===resume)resume();else showPause();return;}
  if(game.mode==='paused')return;if(game.settings.pro&&game.benchRemaining>0)return;if(action==='camera'){cameraToggle();return;}
  if(game.settings.playerMode==='goalie'){game.goalieAction(action);return;}
  if(action==='shotType'){game.shotType=['wrist','slap','snap'][(['wrist','slap','snap'].indexOf(game.shotType)+1)%3];toast(game.shotType.toUpperCase()+' SHOT');}
  if(action==='pass')game.pass(undefined,input());if(action==='check')game.check();if(action==='switch')game.switchPlayer();if(action==='line')game.changeLine();
}
document.addEventListener('keydown',e=>{
  if(game.zamboni&&['KeyW','KeyA','KeyS','KeyD','Space','KeyB'].includes(e.code)&&$('modal-layer').classList.contains('hidden')){e.preventDefault();keys.add(e.code);return;}
  if(binding){e.preventDefault();e.stopPropagation();if(e.code==='Escape'){binding=null;drawBindings();$('binding-note').textContent='Binding cancelled.';return;}try{const other=controls.bind(binding.mode,binding.action,e.code);binding=null;drawBindings();refreshHints();$('binding-note').textContent=other?`Saved. Swapped the previous ${LABELS[other].toLowerCase()} key.`:'Saved in this browser.';}catch(error){$('binding-note').textContent=error.message;}return;}
  if(game.mode==='replay'&&['Escape','Space','Enter'].includes(e.code)){e.preventDefault();game.skipReplay();return;}
  if(intro){if(['Escape','Enter','Space'].includes(e.code)){e.preventDefault();finishIntro();}return;}
  if(e.code==='Tab'&&!$('modal-layer').classList.contains('hidden')){
    const focusable=[...$('modal').querySelectorAll('button,select,a,input,[tabindex="0"]')];const first=focusable[0],last=focusable.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}return;
  }
  if(e.code==='Escape'){if(modalClose){e.preventDefault();modalClose();}else if(['play','faceoff','goal','frozen'].includes(game.mode)){e.preventDefault();showPause();}return;}
  if(!['play','faceoff','goal','frozen','paused'].includes(game.mode))return;
  if(!$('modal-layer').classList.contains('hidden')){if(controls.action(game.settings.playerMode,e.code)==='pause'&&modalClose===resume){e.preventDefault();resume();}return;}
  const action=controls.action(game.settings.playerMode,e.code);if(!action)return;e.preventDefault();if(e.repeat)return;keys.add(e.code);performAction(action);
});
document.addEventListener('keyup',e=>keys.delete(e.code));
document.addEventListener('mousedown',e=>{
 const code='Mouse'+e.button;
 if(binding){e.preventDefault();e.stopPropagation();try{controls.bind(binding.mode,binding.action,code);binding=null;drawBindings();refreshHints();$('binding-note').textContent='Mouse binding saved.';}catch(error){$('binding-note').textContent=error.message;}return;}
 if(e.target.closest('button,input,select,textarea,a')||!$('modal-layer').classList.contains('hidden')||intro)return;
 if(game.zamboni){e.preventDefault();keys.add(code);return;}
 if(!['play','faceoff','goal','frozen'].includes(game.mode))return;
 e.preventDefault();const mode=game.settings.playerMode,action=controls.action(mode,code);keys.add(code);
 if(action)performAction(action);else if(e.button===0){if(mode==='goalie')touch.butterfly=true;else touch.shoot=true;}else if(e.button===2)performAction(mode==='goalie'?'glove':'pass');else if(e.button===1)performAction(mode==='goalie'?'poke':'check');
});
document.addEventListener('auxclick',e=>{if(binding||document.body.classList.contains('playing'))e.preventDefault();});
document.addEventListener('mouseup',e=>{if(e.button>0&&document.body.classList.contains('playing'))e.preventDefault();keys.delete('Mouse'+e.button);if(e.button===0){touch.shoot=false;touch.butterfly=false;}});
document.addEventListener('contextmenu',e=>{if(binding||$('binding-list')||document.body.classList.contains('playing'))e.preventDefault();});

window.addEventListener('blur',()=>{resetInput();if(['play','faceoff','goal','frozen'].includes(game.mode))showPause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){resetInput();if(['play','faceoff','goal','frozen'].includes(game.mode))showPause();}});
let joyPointer=null;
function moveStick(e){const r=$('joystick').getBoundingClientRect(),max=r.width*.34,dx=e.clientX-r.left-r.width/2,dz=e.clientY-r.top-r.height/2,n=Math.hypot(dx,dz);const scale=n>max?max/n:1;touch.x=dx*scale/max;touch.z=dz*scale/max;$('joystick-knob').style.transform=`translate(${dx*scale}px,${dz*scale}px)`;}
$('joystick').addEventListener('pointerdown',e=>{e.preventDefault();if(joyPointer!==null)return;joyPointer=e.pointerId;$('joystick').setPointerCapture(e.pointerId);moveStick(e);});
$('joystick').addEventListener('pointermove',e=>{if(e.pointerId===joyPointer)moveStick(e);});
function endStick(e){if(e.pointerId!==joyPointer)return;joyPointer=null;touch.x=touch.z=0;$('joystick-knob').style.transform='';}
$('joystick').addEventListener('pointerup',endStick);$('joystick').addEventListener('pointercancel',endStick);$('joystick').addEventListener('lostpointercapture',endStick);
function configureTouch(){
  const goalie=playerMode==='goalie';const buttons=goalie?[['slideLeft','SLIDE L'],['butterfly','BUTTERFLY'],['slideRight','SLIDE R'],['glove','GLOVE'],['poke','POKE'],['freeze','FREEZE'],['clear','CLEAR'],['recenter','CENTER'],['dive','DIVE']]:[['switch','SWITCH'],['sprint','SPRINT'],['stop','STOP'],['shotType','SHOT TYPE'],['oneTimer','ONE-TIMER'],['check','CHECK'],['pass','PASS'],['shoot','SHOOT']];
  const box=document.querySelector('.touch-buttons');box.classList.toggle('goalie-touch',goalie);box.innerHTML=buttons.map(([a,label])=>`<button data-touch="${a}" class="${a==='shoot'?'touch-shot':['switch','sprint'].includes(a)?'touch-small':''}">${label}</button>`).join('');
  box.querySelectorAll('[data-touch]').forEach(button=>{const action=button.dataset.touch;const hold=['shoot','sprint','butterfly','recenter','stop','oneTimer'].includes(action);button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);button.classList.add('active');audio.unlock().catch(()=>{});if(hold)touch[action]=true;else performAction(action);});const end=()=>{button.classList.remove('active');if(hold)touch[action]=false;};button.addEventListener('pointerup',end);button.addEventListener('pointercancel',end);button.addEventListener('lostpointercapture',end);});
}
configureTouch();
// A compact live map keeps off-screen teammates visible when following the puck.
const map=document.createElement('canvas');map.id='minimap';map.width=256;map.height=132;map.setAttribute('aria-label','Live rink map with both teams and the puck');$('hud').appendChild(map);const mc=map.getContext('2d');
function drawMap(){
  const visible=game.settings.playerMode==='goalie'||view.cameraMode==='follow'||view.camera.aspect<1;map.classList.toggle('hidden',!visible);if(!visible)return;
  mc.clearRect(0,0,256,132);mc.fillStyle='#091928d9';mc.beginPath();mc.roundRect(2,2,252,128,20);mc.fill();mc.strokeStyle='#adc5d644';mc.lineWidth=2;mc.stroke();
  mc.strokeStyle='#92bfd33f';for(const x of [89,128,167]){mc.beginPath();mc.moveTo(x,3);mc.lineTo(x,129);mc.stroke();}
  mc.beginPath();mc.arc(128,66,17,0,Math.PI*2);mc.stroke();
  for(const p of game.players){if(p.active===false)continue;mc.fillStyle=p.id===game.selected?'#cefa54':p.team===0?TEAMS[home].color:'#ffffff';mc.beginPath();mc.arc(128+p.x*2.05,66+p.z*2.1,p.id===game.selected?5:3.4,0,Math.PI*2);mc.fill();}
  mc.fillStyle='#57d6ff';mc.beginPath();mc.arc(128+game.puck.x*2.05,66+game.puck.z*2.1,3,0,Math.PI*2);mc.fill();
}
function syncUI(){
  if(game.zamboni){$('callout').classList.add('hidden');$('shot-hud').classList.add('hidden');return;}
  $('home-score').textContent=game.score[0];$('away-score').textContent=game.score[1];
  const secs=Math.ceil(game.clock);$('clock').textContent=game.period>3&&secs<=0?'SD':`${Math.floor(secs/60)}:${String(secs%60).padStart(2,'0')}`;
  $('period-label').textContent=['','1ST','2ND','3RD'][game.period]||'OT';$('shot-count').textContent=`SHOTS ${game.stats.shots[0]} – ${game.stats.shots[1]}`;
  const p=game.players[game.selected];$('player-role').textContent=p.role;$('player-name').textContent=p.lastName||p.name;$('player-number').textContent=`#${p.number}`;$('possession').textContent=game.settings.playerMode==='goalie'?(game.puck.owner===5?'PUCK HELD':p.butterfly?'BUTTERFLY':'PROTECT THE NET'):game.puck.owner===game.selected?'ON THE PUCK':game.puck.owner===null?'LOOSE PUCK':game.players[game.puck.owner].team===0?'IN POSSESSION':'GET THE PUCK';
  $('stamina-bar').style.width=`${game.stamina*100}%`;$('stamina-bar').style.background=game.stamina<.2?'#ff6a5a':'var(--lime)';
  $('shot-hud').classList.toggle('hidden',game.charge<=0);$('power-bar').style.width=`${game.charge*100}%`;
  if(game.mode==='faceoff'){
    const n=Math.max(1,Math.ceil(game.phaseTimer));$('callout').classList.remove('hidden');$('callout-kicker').textContent=game.period>3?'SUDDEN DEATH':`PERIOD ${game.period}`;$('callout-title').textContent=n===3?'FACE OFF':String(n);$('callout-detail').textContent=game.settings.playerMode==='goalie'?'Get set. Protect your net.':'Get ready. You attack right.';
    if(n!==lastCountdown){audio.tone(n===1?740:520,.11,'sine',.08);lastCountdown=n;}
  }else if(game.mode==='goal'){
    const team=teamPresentation(game.settings,game.lastGoal.team,TEAMS);$('callout').classList.remove('hidden');$('callout-kicker').textContent=`${team.city.toUpperCase()} SCORES`;$('callout-title').textContent='GOOOAL!';$('callout-detail').textContent=`${game.lastGoal.scorerName} · ${teamPresentation(game.settings,0,TEAMS).short} ${game.score[0]}  –  ${game.score[1]} ${TEAMS[away].short}`;
  }else if(game.mode==='frozen'){$('callout').classList.remove('hidden');$('callout-kicker').textContent='PLAY STOPPED';$('callout-title').textContent='PUCK FROZEN';$('callout-detail').textContent='Faceoff in the defensive zone.';}else{$('callout').classList.add('hidden');lastCountdown=0;}
  if(game.mode!==previousMode){const mode=game.mode;previousMode=mode;if(mode==='intermission')showIntermission();if(mode==='final')showFinal();}
  drawMap();expansion?.tick();
}
function frame(t){const dt=Math.min((t-(rafLast||t))/1000,.05);rafLast=t;accumulator+=dt;
  advanceIntro(dt);while(accumulator>=1/120){if(!expansion.updateMini(1/120,input()))game.update(1/120,input());accumulator-=1/120;}
  view.render(dt);uiClock+=dt;if(uiClock>.06){syncUI();uiClock=0;}requestAnimationFrame(frame);
}
const expansionAPI={game,audio,rosterStore,refreshClub,controlLabel:(mode,action)=>keyLabel(controls.maps[mode][action]||action),showModal,hideModal,toast,start,setMode,returnToMenu,showIntermission,has3D:()=>!!view,refreshView:()=>view?.rebuildPlayers(),impact:(x,z)=>view?.decor?.impact(x,z),passKey:()=>keyLabel(controls.maps.skater.pass),setTeams:(h,a)=>{$('home-team').value=h;$('away-team').value=a;updateTeams();}};
expansion=installClubhouse(expansionAPI,installElite(expansionAPI,installExpansion(expansionAPI)));refreshClub();
function refreshClub(){
 if(!expansion)return;const club=expansion.club();let option=$('home-team').querySelector('option[value="club"]');if(!option){option=document.createElement('option');option.value='club';$('home-team').appendChild(option);}option.textContent='★ '+club.city+' '+club.name+' (Custom)';
 $('home-team').value=club.enabled?'club':String(home);game.settings.club={...club};rosterSignature='';updateTeams('home');
}
function runGame(){ $('loading').classList.add('hidden');refreshPlayerPicker();refreshHints();beginIntro('opening');void rosterStore.init();requestAnimationFrame(frame);}
try{view=new RinkRenderer($('rink'),game);runGame();}catch(error){
  console.error(error);$('loading').innerHTML='<div class="wordmark">RINK<span>26</span></div><h2>3D GRAPHICS NEED YOUR GPU</h2><p style="max-width:480px;padding:0 25px;text-align:center;color:#a8bacb">The original 3D characters are restored. In Chrome or Edge on Windows, open Settings → System, enable graphics acceleration, restart the browser, then return here.</p><button class="primary" style="width:200px" id="reload">RETRY 3D</button><button class="secondary" id="menus-only">TEAM & CAREER MENUS</button>';$('reload').onclick=()=>location.reload();$('menus-only').onclick=()=>{$('loading').classList.add('hidden');game.mode='menu';rosterStore.init();};
}
// WebMCP shares the same state and actions as the visible game controls.
if(document.modelContext?.registerTool){
  const lifetime=new AbortController();
  const register=tool=>{try{Promise.resolve(document.modelContext.registerTool(tool,{signal:lifetime.signal})).catch(()=>{});}catch{}};
  register({name:'read_hockey_match',title:'Read hockey match',description:'Read the current score, period, clock, teams, match phase, and match statistics.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute(input){if(input&&Object.keys(input).length)throw new Error('No inputs expected');return game.snapshot();}});
  register({name:'start_hockey_match',title:'Start hockey match',description:'Start a new match from the team selection screen with a team, opponent, and difficulty. Does not replace an active match.',inputSchema:{type:'object',properties:{home:{type:'string',enum:TEAMS.map(t=>t.fullName)},away:{type:'string',enum:TEAMS.map(t=>t.fullName)},difficulty:{type:'string',enum:['rookie','pro','allstar']}},required:['home','away','difficulty'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input){if(!input||Object.keys(input).some(k=>!['home','away','difficulty'].includes(k)))throw new Error('Invalid match settings');const h=TEAMS.findIndex(t=>t.fullName===input.home),a=TEAMS.findIndex(t=>t.fullName===input.away);if(h<0||a<0||h===a||!['rookie','pro','allstar'].includes(input.difficulty))throw new Error('Choose two different listed teams and a valid difficulty');if(game.mode!=='menu')throw new Error('Return to team selection before starting another match');if(!view)throw new Error('3D graphics unavailable');$('home-team').value=h;$('away-team').value=a;$('difficulty').value=input.difficulty;updateTeams();start();return game.snapshot();}});
  window.addEventListener('pagehide',()=>lifetime.abort(),{once:true});
}

setInterval(()=>{if(!document.hidden)void rosterStore.sync();},15*60*1000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&Date.now()-Date.parse(rosterStore.lastAttempt??0)>15*60*1000)void rosterStore.sync();});
