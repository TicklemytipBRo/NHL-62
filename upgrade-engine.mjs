import {HockeyGame,clamp} from './engine.mjs';
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export const SHOTS=['wrist','slap','snap'];
export class HockeyGamePlus extends HockeyGame {
 start(settings={},rosters=null){
  this.customPlayer=null;this.penalties=[];this.ruleMessage='';this.icing=null;this.faceoffTap=null;this.shotType='wrist';this.aimZ=0;this.aimHeight=1.8;this.replayFrames=[];this.replay=null;this.drill=null;this.lastPass=null;this.diveTime=0;
  super.start(settings,rosters);this.matchType=settings.matchType??'exhibition';
  if(settings.customPlayer?.enabled){this.customPlayer={...settings.customPlayer};this.applyCustom();}else this.customPlayer=null;
  if(['shootout','goaliePractice','shooting','passing','skating'].includes(this.matchType)){
   this.drill={type:this.matchType,attempt:0,total:this.matchType==='goaliePractice'?12:10,success:0,time:0,stage:'ready',turn:0,attempts:[0,0],goals:[0,0],gate:0};this.beginAttempt();
  }
 }
 applyCustom(){const p=this.players[this.settings.playerMode==='goalie'?5:0];if(!p||!this.customPlayer)return;Object.assign(p,{...this.customPlayer,custom:true,nhlId:-1,lastName:this.customPlayer.name,role:p.goalie?'G':'C'});this.selected=p.id;this.rosterVersion++;}
 assignLine(team){super.assignLine(team);if(team===0&&this.customPlayer)this.applyCustom();}
 faceoff(announce=true,zone={x:0,z:0}){super.faceoff(announce,zone);this.faceoffTap=null;this.icing=null;this.applyPenalties();}
 applyPenalties(){for(const p of this.players)p.active=!(this.penalties??[]).some(n=>n.id===p.id&&n.time>0);if(this.players[this.selected]?.active===false)this.selected=this.players.find(p=>p.team===0&&!p.goalie&&p.active)?.id??5;}
 drawFaceoff(){if(this.mode!=='faceoff'||this.settings.playerMode==='goalie')return false; if(this.faceoffTap===null){this.faceoffTap=this.phaseTimer;this.emit('drawtiming',{good:this.phaseTimer<=.32&&this.phaseTimer>=0});}return true;}
 whistle(message,zone){this.ruleMessage=message;this.faceoff(true,zone);this.emit('whistle',{message});}
 check(p=this.players[this.selected]){const victim=this.players.find(q=>q.active!==false&&q.team!==p.team&&!q.goalie&&dist(p,q)<5);const illegal=this.settings.rules&&this.penalties.filter(n=>n.team===p.team).length<2&&victim&&this.puck.owner!==victim.id&&dist(victim,this.puck)>5;const hit=super.check(p);if(hit&&p.custom&&p.style==='power'&&victim){victim.stun+=.35;victim.vx*=1.15;victim.vz*=1.15;}if(hit&&illegal){this.penalties.push({id:p.id,team:p.team,time:30});this.whistle('INTERFERENCE · 30 SECOND MINOR',{x:p.team===0?-36:36,z:p.z>=0?12:-12});this.emit('penalty',{team:p.team});}return hit;}
 move(p,ax,az,dt,speed=16){
  if(p.active===false)return;const profile=p.custom?p.style:null;speed*=profile==='speedster'?1.1:profile==='power'?.96:1;
  const stopping=p.id===this.selected&&this.lastInput?.stop;
  if(stopping){p.vx*=Math.exp(-dt*15);p.vz*=Math.exp(-dt*15);ax=az=0;}
  // Counter-steering carves a turn; releasing input preserves a short glide.
  const length=Math.hypot(ax,az),nx=length?ax/length:0,nz=length?az/length:0;
  if(length>.05&&p.stun<=0){const grip=1-Math.exp(-dt*7);const dot=p.vx*nx+p.vz*nz; p.vx-=(p.vx-dot*nx)*grip;p.vz-=(p.vz-dot*nz)*grip;}
  const oldV={x:p.vx,z:p.vz};super.move(p,ax,az,dt,speed);
  if(length<=.05&&!stopping&&p.stun<=0){p.vx=oldV.x*Math.exp(-dt*1.25);p.vz=oldV.z*Math.exp(-dt*1.25);}
 }
 ai(p,dt){if(p.active===false)return;if(this.drill?.type==='passing'){this.move(p,0,0,dt,0);return;}if(this.drill?.type==='goaliePractice'&&!p.goalie){this.move(p,0,0,dt,0);return;}const owner=this.players[this.puck.owner];super.ai(p,dt);if(p.goalie||p.stun>0||owner===p)return;
  // Support the carrier in an open lane; weak-side defenders shade receivers.
  if(owner?.team===p.team){const foe=this.players.filter(q=>q.active!==false&&q.team!==p.team&&!q.goalie).sort((a,b)=>dist(a,p)-dist(b,p))[0];if(foe&&dist(p,foe)<7){p.vz+=Math.sign(p.z-foe.z||p.slot%2-.5)*dt*15;}}
  else if(owner){const mates=this.players.filter(q=>q.active!==false&&q.team===p.team&&!q.goalie).sort((a,b)=>dist(a,owner)-dist(b,owner));if(mates[0]!==p){const receiver=this.players.filter(q=>q.active!==false&&q.team===owner.team&&!q.goalie&&q.id!==owner.id).sort((a,b)=>dist(a,p)-dist(b,p))[0];if(receiver){const x=receiver.x*.65+owner.x*.35,z=receiver.z*.65+owner.z*.35;p.vx+=clamp(x-p.x,-6,6)*dt*2;p.vz+=clamp(z-p.z,-6,6)*dt*2;}}}
 }
 shoot(power=.45,p=this.players[this.selected],aim=null){
  const manual=p.team===0&&p.id===this.selected;const type=manual?this.shotType:(power>.7?'slap':'wrist');const startX=p.x;
  const ok=super.shoot(type==='slap'?Math.max(.65,power):type==='snap'?.4:Math.min(power,.7),p,aim??(manual?this.aimZ:null));
  if(ok){const k=this.puck;const factor=type==='slap'?1.16:type==='snap'?1.05:.95;k.vx*=factor;k.vz*=factor;const flight=Math.abs((52*(p.team===0?1:-1)-k.x)/k.vx);const height=manual?this.aimHeight:(.5+this.random()*2.6);k.vy=clamp((height-.26+6*flight*flight)/Math.max(.15,flight),0,11);if(p.custom&&p.style==='sniper'){k.vx*=1.06;k.vz*=1.06;}p.shotType=type;this.icing={team:p.team,startX};this.emit('shotstyle',{style:type});}return ok;
 }
 pass(p=this.players[this.selected],input={x:0,z:0}){if(this.mode==='faceoff')return this.drawFaceoff();const ok=super.pass(p,input);if(ok){this.icing={team:p.team,startX:p.x};this.lastPass={team:p.team,from:p.id,to:this.puck.passTarget,time:this.elapsed};}return ok;}
 gainPuck(p){const pass=this.lastPass;super.gainPuck(p);this.icing=null;
  if(pass&&pass.team===p.team&&pass.from!==p.id&&this.elapsed-pass.time<4){this.emit('completepass',{team:p.team});if(this.drill?.type==='passing'&&p.team===0){this.drill.success++;this.drill.attempt++;this.drill.stage='pause';this.phaseTimer=.6;}}
  this.lastPass=null;if(p.team===0&&this.lastInput?.oneTimer&&this.mode==='play') {p.cooldown=0;this.shoot(.8,p);this.emit('onetimer');}
 }
 freezePuck(p=this.players[5]){if(this.drill&&p.goalie){if(this.puck.owner===p.id||(this.puck.owner===null&&dist(p,this.puck)<3.1&&this.puck.y<1.5)){this.finishAttempt(false);return true;}return false;}return super.freezePuck(p);}
 goalieAction(action){if(action==='dive'&&this.mode==='play'&&this.settings.playerMode==='goalie'&&this.stamina>.4){const p=this.players[5];p.slide=.65;p.glove=.65;p.vz=Math.sign(this.puck.z-p.z||1)*30;this.stamina-=.4;this.diveTime=.65;this.emit('slide');return true;}return super.goalieAction(action);}
 manualGoalie(p,dt,input){super.manualGoalie(p,dt,input);if(this.diveTime>0){this.diveTime-=dt;p.butterfly=false;p.glove=Math.max(p.glove,.1);}}
 updatePuck(dt){const old={x:this.puck.x,z:this.puck.z,lastOwner:this.puck.lastOwner};super.updatePuck(dt);if(this.puck.lastOwner!==old.lastOwner)this.icing=null;if(this.mode!=='play')return;
  const k=this.puck;
  if(this.settings.rules&&!this.drill){const team=k.owner!==null?this.players[k.owner].team:k.lastTeam;if(team!==null&&team!==undefined){const dir=team===0?1:-1;
   if(old.x*dir<=22&&k.x*dir>22&&this.players.some(p=>p.active!==false&&p.team===team&&!p.goalie&&p.id!==k.owner&&p.x*dir>23)){this.whistle('OFFSIDE',{x:18*dir,z:Math.sign(k.z||1)*12});return;}
   if(this.icing&&this.icing.team===team&&this.icing.startX*dir<0&&old.x*dir<52&&k.x*dir>=52&&Math.abs(k.z)>5.2&&!this.penalties.some(p=>p.team===team)){this.whistle('ICING',{x:-36*dir,z:Math.sign(k.z||1)*12});return;}
  }}
 }
 goal(team){
  if(this.drill){this.drill.goals[team]++;this.score[team]++;if(this.drill.type==='shooting'&&team===0&&Math.abs(this.puck.z-this.target.z)<1.65)this.drill.success++;this.finishAttempt(team===0);this.emit('goal',{team,score:[...this.score]});return;}
  // A power-play goal releases the oldest opposing minor.
  const own=this.penalties.filter(n=>n.team===team).length,other=this.penalties.filter(n=>n.team!==team);if(other.length>own){this.penalties.splice(this.penalties.indexOf(other[0]),1);this.applyPenalties();}
  const frames=this.replayFrames?.slice(-180)??[];super.goal(team);if(this.settings.replays!==false&&frames.length>12){this.replay={frames,time:0,live:this.capture()};this.mode='replay';this.emit('replay');}
 }
 capture(){return{players:this.players.map(p=>({x:p.x,z:p.z,vx:p.vx,vz:p.vz,fx:p.fx,fz:p.fz,skate:p.skate,butterfly:p.butterfly,stun:p.stun,action:p.action})),puck:{...this.puck}};}
 pose(frame){this.players.forEach((p,i)=>Object.assign(p,frame.players[i]));Object.assign(this.puck,frame.puck);}
 skipReplay(){if(!this.replay)return;this.pose(this.replay.live);this.replay=null;this.replayFrames=[];this.mode='goal';this.phaseTimer=1.3;}
 beginAttempt(){
  const d=this.drill;if(!d)return;d.attempt++;d.time=0;d.stage='ready';this.mode='faceoff';this.phaseTimer=1.5;this.charge=0;this.stamina=1;this.setupPlayers();
  const keeper=d.type==='goaliePractice',away=d.type==='shootout'&&d.turn===1;
  const active=keeper||away?[5,6]:d.type==='passing'?[0,1,2,3,4]:d.type==='skating'?[0]:[0,11];
  for(const p of this.players){p.active=active.includes(p.id);p.x=p.goalie?(p.team===0?-49:49):p.team===0?-20:20;p.z=0;p.cooldown=0;}
  this.selected=keeper?5:0;const carrier=this.players[keeper||away?6:0];
  if(keeper){carrier.x=-8;carrier.z=(this.random()-.5)*34;}
  if(d.type==='passing')this.players.filter(p=>p.team===0&&!p.goalie).forEach((p,i)=>{p.x=-20+i*9;p.z=i%2?14:-12;});
  if(d.type==='skating'){this.gates=[[-20,-15],[0,15],[20,-15],[38,10],[25,20],[0,-20],[-25,12],[-40,0]];this.selected=0;}
  this.puck.owner=carrier.id;this.puck.x=carrier.x;this.puck.z=carrier.z;this.puck.y=.23;this.puck.vx=this.puck.vz=this.puck.vy=0;this.puck.lock=0;this.puck.shot=false;this.target={z:(d.attempt%2?1:-1)*2.8};this.rosterVersion++;
 }
 finishAttempt(scored=false){const d=this.drill;if(!d||d.stage==='pause'||d.stage==='done')return;
  if(d.type==='goaliePractice'&&!scored&&this.score[1]===d.conceded&&this.stats.saves[0]>(d.savedAtStart??0))d.success++;d.stage='pause';this.phaseTimer=1.4;this.mode='frozen';
  if(d.type==='shootout'){d.attempts[d.turn]++;d.turn=1-d.turn;}
 }
 updateDrill(dt,input){const d=this.drill;
  if(d.stage==='pause'){
   this.phaseTimer-=dt;if(this.phaseTimer>0)return;
   const finished=d.type==='shootout'?d.attempts[0]>=3&&d.attempts[0]===d.attempts[1]&&d.goals[0]!==d.goals[1]:d.type==='skating'?d.gate>=8||d.time>=60:d.type==='passing'?d.success>=10||d.time>=60:d.attempt>=d.total;
   if(finished){d.stage='done';this.mode='final';this.emit('final');return;}if(d.type==='passing'){d.stage='live';this.mode='play';return;}this.beginAttempt();return;
  }
  if(this.mode==='faceoff'){this.phaseTimer-=dt;if(this.phaseTimer<=0){this.mode='play';d.stage='live';d.conceded=this.score[1];d.savedAtStart=this.stats.saves[0];this.emit('puckdrop');}return;}
  if(this.mode!=='play')return;d.time+=dt;this.clock=Math.max(0,(d.type==='skating'||d.type==='passing'?60:12)-d.time);
  // Keep base regulation/intermission logic out of drills.
  const clock=this.clock;this.clock=999;super.update(dt,input);this.clock=clock;
  if(d.stage==='pause')return;
  if(d.type==='goaliePractice'){
   const shooter=this.players[6];if(this.puck.owner===6&&d.time>.8){this.shoot(.45+this.random()*.5,shooter,(this.random()-.5)*8);}
   if(this.puck.owner===5||d.time>5||(this.puck.owner===null&&this.puck.vx>0)){this.finishAttempt(false);}
  }else if(d.type==='skating'){
   const gate=this.gates[d.gate];if(gate&&Math.hypot(this.players[0].x-gate[0],this.players[0].z-gate[1])<4){d.gate++;d.success++;this.emit('gate');}
   if(d.gate>=8||d.time>=60)this.finishAttempt();
  }else if(d.type==='passing'){if(d.time>=60||d.success>=10)this.finishAttempt();}
  else if(d.time>=12||(this.puck.owner!==null&&this.players[this.puck.owner].goalie))this.finishAttempt();
 }
 update(dt,input={}){
  if(this.mode==='replay'){this.replay.time+=dt;const i=Math.floor(this.replay.time*30);if(i>=this.replay.frames.length)this.skipReplay();else this.pose(this.replay.frames[i]);return;}
  if(['menu','intro','paused','intermission','final'].includes(this.mode))return;
  if(this.drill){this.aimZ=clamp(this.aimZ+(input.aimDirection??0)*dt*6,-4,4);this.aimHeight=clamp(this.aimHeight+(input.aimVertical??0)*dt*3,.35,3.2);this.updateDrill(dt,{...input,aim:this.aimZ});return;}
  if(this.mode==='play'){
   for(const n of this.penalties??[])n.time-=dt;this.penalties=(this.penalties??[]).filter(n=>n.time>0);this.applyPenalties();
   this.aimZ=clamp(this.aimZ+(input.aimDirection??0)*dt*6,-4,4);this.aimHeight=clamp(this.aimHeight+(input.aimVertical??0)*dt*3,.35,3.2);
  }
  const prev=this.mode;super.update(dt,{...input,aim:this.aimZ});
  if(prev==='faceoff'&&this.mode==='play'){
   const won=this.settings.playerMode==='goalie'?this.random()>.5:this.faceoffTap!==null&&this.faceoffTap<=.32&&this.faceoffTap>=0;
   const p=this.players[won?0:6];if(p.active!==false)this.gainPuck(p);this.emit('faceoffwin',{team:won?0:1});this.ruleMessage='';
  }
  if(this.mode==='play'){this.recordTime=(this.recordTime??0)+dt;if(this.recordTime>=1/60){this.recordTime=0;this.replayFrames.push(this.capture());if(this.replayFrames.length>180)this.replayFrames.shift();}}
 }
}
