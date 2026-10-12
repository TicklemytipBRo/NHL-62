import { TEAMS } from './teams.mjs?v=ice-5.1';
export { TEAMS };
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const norm=(x,z)=>{const m=Math.hypot(x,z);return m>.001?{x:x/m,z:z/m}:{x:0,z:0}};
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export class HockeyGame {
  constructor({random=Math.random,onEvent=()=>{}}={}) {
    this.random=random; this.onEvent=onEvent; this.mode='menu'; this.elapsed=0;
    this.players=[];this.puck={x:0,z:0,y:.23,vx:0,vz:0,vy:0,owner:null,lock:0,lastTeam:null};
    this.settings={home:0,away:1,difficulty:'pro',periodLength:60,playerMode:'skater'};
    this.rosters=[[],[]];this.lineIndex=[0,0];this.rosterVersion=0;this.shiftTime=0;this.lastInput={};this.freezeZone={x:-36,z:12};
    this.stats={shots:[0,0],hits:[0,0],saves:[0,0]};this.score=[0,0];this.period=1;this.clock=60;
    this.selected=0;this.phaseTimer=0;this.charge=0;this.stamina=1;this.message='';this.lastGoal=null;
    this.setupPlayers();this.faceoff(false);this.mode='menu';
  }
  emit(type,data={}) { this.onEvent({type,...data}); }
  start(settings={},rosters=null) {
    this.settings={...this.settings,...settings};if(rosters)this.rosters=rosters.map(r=>structuredClone(r));this.lineIndex=[0,0];this.shiftTime=0; this.clock=this.settings.periodLength;
    this.score=[0,0];this.period=1;this.stats={shots:[0,0],hits:[0,0],saves:[0,0]};
    this.elapsed=0;this.stamina=1;this.charge=0;this.setupPlayers();this.faceoff();this.emit('start');
  }
  setupPlayers() {
    this.players=[];
    for(let t=0;t<2;t++)for(let i=0;i<6;i++)this.players.push({id:t*6+i,team:t,role:i===5?'G':['C','LW','RW','LD','RD'][i],slot:i,goalie:i===5,x:0,z:0,vx:0,vz:0,fx:t===0?1:-1,fz:0,stun:0,cooldown:0,decision:.2+i*.1,skate:0,action:0,number:i+1,name:i===5?'Goalie':'Skater',lastName:'',nhlId:null,butterfly:false,slide:0,glove:0,holdTime:0});
    this.assignLine(0);this.assignLine(1);
  }
  assignLine(team) {
    const roster=this.rosters[team]??[];if(!roster.length)return;
    let forwards=roster.filter(p=>!['D','G'].includes(p.position)),defense=roster.filter(p=>p.position==='D'),goalies=roster.filter(p=>p.position==='G');
    const preferred=this.settings[team===0?'homeSkater':'awaySkater'],keeper=this.settings[team===0?'homeGoalie':'awayGoalie'];
    const promote=(arr,id)=>{const i=arr.findIndex(p=>p.id===id);return i>0?[arr[i],...arr.slice(0,i),...arr.slice(i+1)]:arr;};
    forwards=promote(forwards,preferred);defense=promote(defense,preferred);goalies=promote(goalies,keeper);
    const skaters=roster.filter(p=>p.position!=='G');if(!forwards.length)forwards=skaters;if(!defense.length)defense=skaters;
    for(let i=0;i<6;i++){
      const pool=i<3?forwards:i<5?defense:goalies;
      const offset=i<3?this.lineIndex[team]*3+i:i<5?this.lineIndex[team]*2+i-3:0;
      const data=pool[offset%pool.length];if(!data)continue;const p=this.players[team*6+i];
      Object.assign(p,{nhlId:data.id,name:data.name,lastName:data.lastName,number:data.number??'–',hand:data.hand,height:data.height,weight:data.weight,rosterPosition:data.position});
    }
    this.rosterVersion++;
  }
  changeLine(team=0){
    if(!['play','faceoff','paused'].includes(this.mode))return false;
    if(this.puck.owner!==null&&this.players[this.puck.owner].team===team){this.emit('lineblocked');return false;}
    this.lineIndex[team]++;this.assignLine(team);this.shiftTime=0;this.emit('linechange',{team,line:this.lineIndex[team]+1});return true;
  }
  initialSelected(){if(this.settings.playerMode==='goalie')return 5;return this.players.find(p=>p.team===0&&!p.goalie&&p.nhlId===this.settings.homeSkater)?.id??0;}
  faceoff(announce=true,zone={x:0,z:0}) {
    const slots=[[-4.2,0],[-10,-14],[-10,14],[-26,-8],[-26,8],[-49,0]];
    for(const p of this.players){const d=p.team===0?1:-1;p.x=p.goalie?slots[p.slot][0]*d:clamp(slots[p.slot][0]*d+zone.x,-44,44);p.z=p.goalie?0:clamp(slots[p.slot][1]+zone.z,-23,23);p.vx=p.vz=0;p.fx=d;p.fz=0;p.stun=0;p.cooldown=0;p.slide=0;p.glove=0;p.butterfly=false;p.holdTime=0;}
    Object.assign(this.puck,{x:zone.x,z:zone.z,y:.24,vx:0,vz:0,vy:0,owner:null,lock:0,lastTeam:null,shot:false});
    this.selected=this.initialSelected();this.charge=0;this.mode='faceoff';this.phaseTimer=2.5;
    if(announce)this.emit('faceoff');
  }
  pause(){ if(['play','faceoff','goal','frozen'].includes(this.mode)){this.resumeMode=this.mode;this.mode='paused';this.charge=0;this.emit('pause');} }
  resume(){ if(this.mode==='paused'){this.mode=this.resumeMode;this.emit('resume');} }
  nextPeriod(){ if(this.mode!=='intermission')return;this.period++;this.clock=this.period>3?180:this.settings.periodLength;this.stamina=1;this.faceoff(); }
  switchPlayer() {
    if(this.settings.playerMode==='goalie'){this.selected=5;return;}
    if(this.puck.owner!==null&&this.players[this.puck.owner].team===0){this.selected=this.puck.owner;return;}
    const skaters=this.players.filter(p=>p.active!==false&&p.team===0&&!p.goalie&&p.id!==this.selected);
    skaters.sort((a,b)=>distance(a,this.puck)-distance(b,this.puck)); if(skaters[0])this.selected=skaters[0].id;
    this.charge=0;this.emit('switch');
  }
  shoot(power=.45,player=this.players[this.selected],aimZ=null) {
    if(this.mode!=='play'||this.puck.owner!==player.id||player.stun>0)return false;
    const dir=player.team===0?1:-1;
    const spread=this.settings.difficulty==='rookie'?.4:.75;
    const targetZ=aimZ??clamp(-player.z*.17+(this.random()-.5)*spread*2,-3.9,3.9);
    const n=norm(51.5*dir-player.x,targetZ-player.z);
    this.release(player,n.x*(39+power*43),n.z*(39+power*43),.3+power*2.2);
    this.puck.shot=true;this.stats.shots[player.team]++;player.action=.28;
    this.emit('shot',{team:player.team,power});this.charge=0;return true;
  }
  pass(player=this.players[this.selected],input={x:0,z:0}) {
    if(this.mode!=='play'||this.puck.owner!==player.id||player.stun>0)return false;
    const direction=norm(input.x,input.z);const hasDirection=Math.hypot(input.x,input.z)>.2;
    const teammates=this.players.filter(p=>p.active!==false&&p.team===player.team&&!p.goalie&&p.id!==player.id);
    let best=null,bestScore=-Infinity;
    for(const mate of teammates){
      const d=distance(player,mate),n=norm(mate.x-player.x,mate.z-player.z);
      let score=hasDirection?(n.x*direction.x+n.z*direction.z)*30-d*.2:(mate.x-player.x)*(player.team===0?1:-1)*.28-d*.22;
      const openness=Math.min(...this.players.filter(p=>p.active!==false&&p.team!==player.team&&!p.goalie).map(p=>distance(p,mate)));
      score+=Math.min(openness,15)*.35;if(score>bestScore){best=mate;bestScore=score;}
    }
    if(!best)return false;
    const travel=distance(player,best)/40;const target={x:best.x+best.vx*travel*.7,z:best.z+best.vz*travel*.7};
    const n=norm(target.x-player.x,target.z-player.z);
    this.release(player,n.x*42,n.z*42,0);this.puck.passTarget=best.id;
    if(player.team===0&&this.settings.playerMode!=='goalie'){this.selected=best.id;this.charge=0;}player.action=.2;
    this.emit('pass',{team:player.team});return true;
  }
  release(player,vx,vz,vy=0){
    const n=norm(vx,vz);Object.assign(this.puck,{owner:null,x:player.x+n.x*2.25,z:player.z+n.z*2.25,y:.26,vx:vx+player.vx*.15,vz:vz+player.vz*.15,vy,lock:.19,lastOwner:player.id,lastTeam:player.team,shot:false,passTarget:null});
    player.cooldown=.35;
  }
  check(player=this.players[this.selected]) {
    if(this.mode!=='play'||player.cooldown>0||player.stun>0)return false;
    player.cooldown=.85;player.action=.35;
    player.vx+=player.fx*7;player.vz+=player.fz*7;
    const opponents=this.players.filter(p=>p.active!==false&&p.team!==player.team&&!p.goalie&&distance(player,p)<5);
    const nearest=opponents.sort((a,b)=>distance(player,a)-distance(player,b))[0];
    if(nearest){const n=norm(nearest.x-player.x,nearest.z-player.z);nearest.vx+=n.x*17;nearest.vz+=n.z*17;nearest.stun=.85;
      if(this.puck.owner===nearest.id){this.release(nearest,n.x*19,n.z*19);this.puck.lock=.12;}
      this.stats.hits[player.team]++;this.emit('hit',{team:player.team,x:nearest.x,z:nearest.z});return true;
    }
    this.emit('poke');return false;
  }
  gainPuck(p){this.puck.owner=p.id;this.puck.lastTeam=p.team;this.puck.shot=false;this.puck.passTarget=null;p.cooldown=.22;if(p.team===0&&this.settings.playerMode!=='goalie'&&!p.goalie){this.selected=p.id;this.charge=0;}this.emit('pickup',{team:p.team});}
  goal(team){
    this.score[team]++;this.lastGoal={team,scorer:this.puck.lastOwner,scorerName:this.players[this.puck.lastOwner]?.name??'',period:this.period};
    this.puck.owner=null;this.puck.vx=0;this.puck.vz=0;this.mode='goal';this.phaseTimer=3.2;this.charge=0;
    this.emit('goal',{team,score:[...this.score]});
  }
  move(p,ax,az,dt,speed=16){
    const n=norm(ax,az),active=Math.hypot(ax,az)>.05;
    const control=active?4.5:2.6;
    p.vx+=(n.x*speed-p.vx)*Math.min(1,dt*control);p.vz+=(n.z*speed-p.vz)*Math.min(1,dt*control);
    if(p.stun>0){p.vx*=1-dt*.8;p.vz*=1-dt*.8;}
    if(active&&p.stun<=0){const a=1-Math.exp(-dt*12);p.fx+=(n.x-p.fx)*a;p.fz+=(n.z-p.fz)*a;const f=norm(p.fx,p.fz);p.fx=f.x;p.fz=f.z;}
    p.x+=p.vx*dt;p.z+=p.vz*dt;p.skate+=Math.hypot(p.vx,p.vz)*dt*.9;
    this.bounds(p,1.4,.2);
    // Keep skaters outside the physical net; the crease stays playable.
    if(Math.abs(p.x)>50&&Math.abs(p.x)<57&&Math.abs(p.z)<5.8){
      const left=Math.abs(p.x)-50,right=57-Math.abs(p.x),side=5.8-Math.abs(p.z);
      if(left<Math.min(right,side)){p.x=Math.sign(p.x)*50;p.vx*=.15;}else if(right<side){p.x=Math.sign(p.x)*57;p.vx*=.15;}else{p.z=(Math.sign(p.z)||1)*5.8;p.vz*=.15;}
    }
  }
  bounds(o,r,bounce){
    const X=59-r,Z=28-r,corner=9;
    if(o.x>X){o.x=X;o.vx=-Math.abs(o.vx)*bounce;}if(o.x<-X){o.x=-X;o.vx=Math.abs(o.vx)*bounce;}
    if(o.z>Z){o.z=Z;o.vz=-Math.abs(o.vz)*bounce;}if(o.z<-Z){o.z=-Z;o.vz=Math.abs(o.vz)*bounce;}
    const cx=X-corner,cz=Z-corner;
    if(Math.abs(o.x)>cx&&Math.abs(o.z)>cz){const dx=Math.abs(o.x)-cx,dz=Math.abs(o.z)-cz,m=Math.hypot(dx,dz);
      if(m>corner){const nx=dx/m*Math.sign(o.x),nz=dz/m*Math.sign(o.z);o.x=Math.sign(o.x)*cx+nx*corner;o.z=Math.sign(o.z)*cz+nz*corner;const dot=o.vx*nx+o.vz*nz;if(dot>0){o.vx-=(1+bounce)*dot*nx;o.vz-=(1+bounce)*dot*nz;}}
    }
  }
  ai(p,dt){
    const dir=p.team===0?1:-1,owner=this.puck.owner===null?null:this.players[this.puck.owner];
    const difficulty=this.settings.difficulty, skill=p.team===0?1:({rookie:.77,pro:1,allstar:1.16}[difficulty]??1);
    if(p.goalie){this.goalie(p,dt,skill);return;}
    let tx,tz,speed=14.3*skill;
    if(owner===p){
      tx=45*dir;tz=clamp(p.z*.82,-10,10);speed=14*skill;
      p.decision-=dt;
      if(p.decision<=0){
        p.decision=(.4+this.random()*.5)/skill;
        const gd=Math.abs(51*dir-p.x);
        if(gd<33&&Math.abs(p.z)<20&&p.cooldown<=0){this.shoot(.35+this.random()*.6,p,clamp((this.random()-.5)*8,-3.8,3.8));return;}
        const defender=this.players.some(q=>q.team!==p.team&&!q.goalie&&distance(q,p)<7);
        if(defender&&this.random()<.65&&p.cooldown<=0){this.pass(p);return;}
      }
      const near=this.players.find(q=>q.team!==p.team&&!q.goalie&&distance(q,p)<7);
      if(near)tz+=((p.z-near.z)||1)*1.4;
    }else if(owner&&owner.team===p.team){
      const lanes=[0,-14,14,-9,9];const advance=p.slot<3?9:-15;
      tx=clamp(owner.x+dir*advance,-42,42);tz=lanes[p.slot]+owner.z*.16;
      if(distance(p,owner)<6)tz+=(p.slot%2?1:-1)*8;
    }else{
      const teammates=this.players.filter(q=>q.active!==false&&q.team===p.team&&!q.goalie);
      const target=owner??this.puck;teammates.sort((a,b)=>distance(a,target)-distance(b,target));
      const rank=teammates.indexOf(p);
      if(rank===0||(rank===1&&!owner)){tx=target.x+(owner?owner.vx*.13:0);tz=target.z+(owner?owner.vz*.13:0);speed*=1.07;
        if(owner&&owner.team!==p.team&&distance(p,owner)<3.8&&p.cooldown<=0&&this.random()<dt*1.8*skill)this.check(p);
      }else{
        const lanes=[0,-13,13,-8,8];tx=clamp(target.x-dir*(p.slot>=3?18:9),-44,44);tz=lanes[p.slot]*.6+target.z*.4;
      }
    }
    if(p.stun>0)this.move(p,0,0,dt,0);else if(Math.hypot(tx-p.x,tz-p.z)>1)this.move(p,tx-p.x,tz-p.z,dt,speed);else this.move(p,0,0,dt,0);
  }
  goalie(p,dt,skill){
    const dir=p.team===0?1:-1;let target=clamp(this.puck.z*.62,-3.6,3.6);
    if(this.puck.owner===null&&this.puck.vx*dir<0){
      const arrival=(p.x-this.puck.x)/this.puck.vx;
      if(arrival>0&&arrival<.8)target=clamp(this.puck.z+this.puck.vz*arrival,-4,4);
    }
    const maxMove=({rookie:7,pro:10,allstar:13}[this.settings.difficulty]??10)*(p.team===0?1:skill)*dt;
    const next=p.z+clamp(target-p.z,-maxMove,maxMove);p.vz=(next-p.z)/dt;p.z=next;p.x=-49.2*dir;p.fx=dir;p.fz=clamp(this.puck.z*.03,-.5,.5);
  }
  goalieAction(action){
    if(this.settings.playerMode!=='goalie'||this.mode!=='play')return false;const p=this.players[5],k=this.puck;
    if(action==='freeze')return this.freezePuck(p);
    if(action==='clear')return this.pass(p,{x:1,z:0});
    if(action==='glove'){if(p.cooldown>0)return false;p.glove=.6;p.cooldown=.65;p.action=.45;return true;}
    if(action==='poke'){
      if(p.cooldown>0)return false;p.cooldown=.65;p.action=.35;
      const owner=k.owner===null?null:this.players[k.owner];
      if(distance(p,k)<5.4&&k.y<1.3){if(owner)this.release(owner,22,(k.z-p.z)*5);else Object.assign(k,{vx:22,vz:(k.z-p.z)*5,lock:.2,lastOwner:p.id});this.emit('poke');return true;}return false;
    }
    if(action==='slideLeft'||action==='slideRight'){
      if(p.slide>0||this.stamina<.22)return false;p.slide=.4;p.vz=(action==='slideLeft'?-1:1)*26;this.stamina-=.22;p.butterfly=true;this.emit('slide');return true;
    }
    return false;
  }
  freezePuck(p=this.players[5]){
    const k=this.puck;if(this.mode!=='play'||!p.goalie)return false;
    if(k.owner===p.id||(distance(p,k)<3.1&&k.y<1.5&&k.owner===null)){
      this.freezeZone={x:p.team===0?-36:36,z:p.z>=0?12:-12};Object.assign(k,{owner:p.id,vx:0,vz:0,vy:0,y:.25});this.mode='frozen';this.phaseTimer=1.65;this.emit('freeze',{team:p.team});return true;
    }return false;
  }
  manualGoalie(p,dt,input){
    p.butterfly=!!input.butterfly||p.slide>0;p.glove=Math.max(0,p.glove-dt);p.slide=Math.max(0,p.slide-dt);
    let ax=-(input.z??0),az=input.x??0;
    if(input.recenter){ax=clamp((-49-p.x)*.65,-1,1);az=clamp(-p.z*.65,-1,1);}
    const speed=p.butterfly?5:10;
    p.vx+=(ax*speed-p.vx)*Math.min(1,dt*11);if(p.slide<=0)p.vz+=(az*speed-p.vz)*Math.min(1,dt*11);
    p.x=clamp(p.x+p.vx*dt,-51.1,-39);p.z=clamp(p.z+p.vz*dt,-12,12);p.fx=1;p.fz=clamp((this.puck.z-p.z)*.03,-.6,.6);p.skate+=Math.hypot(p.vx,p.vz)*dt;
    if(this.puck.owner===p.id){p.holdTime+=dt;if(p.holdTime>3.5)this.freezePuck(p);}else p.holdTime=0;
  }
  update(dt,input={}){
    dt=clamp(dt,0,1/30);this.elapsed+=dt;
    if(['menu','intro','paused','intermission','final'].includes(this.mode))return;
    this.lastInput=input;
    for(const p of this.players){p.cooldown=Math.max(0,p.cooldown-dt);p.stun=Math.max(0,p.stun-dt);p.action=Math.max(0,p.action-dt);}
    if(this.mode==='faceoff'){this.phaseTimer-=dt;if(this.phaseTimer<=0){this.mode='play';this.emit('puckdrop');}return;}
    if(this.mode==='frozen'){this.phaseTimer-=dt;if(this.phaseTimer<=0)this.faceoff(true,this.freezeZone);return;}
    if(this.mode==='goal'){
      this.phaseTimer-=dt;if(this.phaseTimer<=0){if(this.period>3){this.mode='final';this.emit('final');}else{this.lineIndex=this.lineIndex.map(i=>i+1);this.assignLine(0);this.assignLine(1);this.faceoff();}}return;
    }
    if(this.clock>0)this.clock=Math.max(0,this.clock-dt);
    if(this.clock<=0&&this.period<=3){
      this.charge=0;
      if(this.period<3||this.score[0]===this.score[1]){this.mode='intermission';this.emit('intermission');}else{this.mode='final';this.emit('final');}return;
    }
    this.puck.lock=Math.max(0,this.puck.lock-dt);
    if(this.settings.playerMode==='goalie')this.selected=5;
    const controlled=this.players[this.selected];this.shiftTime+=dt;
    if(this.shiftTime>32&&this.puck.owner===null){this.changeLine(0);this.changeLine(1);}
    const sprint=this.settings.playerMode!=='goalie'&&!!input.sprint&&this.stamina>.04&&Math.hypot(input.x??0,input.z??0)>.2;
    this.stamina=clamp(this.stamina+(sprint?-.27:.18)*dt,0,1);
    if(this.settings.playerMode!=='goalie'&&input.shoot&&this.puck.owner===this.selected)this.charge=clamp(this.charge+dt*.8,0,1);
    else if(this.charge>0){if(this.puck.owner===this.selected)this.shoot(Math.max(.22,this.charge),controlled,input.aim??null);this.charge=0;}
    for(const p of this.players){
      if(p.active===false)continue;
      if(p.id===this.selected&&p.goalie){this.manualGoalie(p,dt,input);}
      else if(p.id===this.selected){if(p.stun>0)this.move(p,0,0,dt,0);else this.move(p,input.x??0,input.z??0,dt,sprint?23:16.8);}
      else this.ai(p,dt);
    }
    // Soft, equal-mass body contact allows checks without trapping skaters.
    for(let i=0;i<this.players.length;i++)for(let j=i+1;j<this.players.length;j++){
      const a=this.players[i],b=this.players[j];if(a.active===false||b.active===false||a.goalie||b.goalie)continue;
      const d=distance(a,b);if(d<2.35&&d>.01){const n=norm(b.x-a.x,b.z-a.z),push=(2.35-d)*.5;a.x-=n.x*push;a.z-=n.z*push;b.x+=n.x*push;b.z+=n.z*push;
        if(a.team!==b.team&&this.puck.owner!==null){const holder=this.players[this.puck.owner],other=holder===a?b:holder===b?a:null;
          if(other&&holder.cooldown<=0&&other.cooldown<=0&&this.random()<dt*.6){this.release(holder,n.x*9,n.z*9);other.cooldown=.45;}
        }
      }
    }
    this.updatePuck(dt);
  }
  updatePuck(dt){
    const k=this.puck;
    if(k.owner!==null){
      const p=this.players[k.owner];const dir=p.team===0?1:-1;
      const n=norm(p.fx||dir,p.fz);k.x=p.x+n.x*1.9;k.z=p.z+n.z*1.9;k.y=.25;k.vx=p.vx;k.vz=p.vz;k.vy=0;return;
    }
    const oldX=k.x,oldZ=k.z;k.x+=k.vx*dt;k.z+=k.vz*dt;
    k.y+=k.vy*dt;k.vy-=dt*12;if(k.y<.23){k.y=.23;k.vy=Math.abs(k.vy)>.65?-k.vy*.28:0;}
    const friction=Math.exp(-dt*.22);k.vx*=friction;k.vz*=friction;
    for(const goalie of this.players.filter(p=>p.active!==false&&p.goalie)){
      if(k.lock>0&&k.lastOwner===goalie.id)continue;
      // Swept intersection prevents a fast slapshot tunnelling through the goalie.
      const dx=k.x-oldX,dz=k.z-oldZ,len2=dx*dx+dz*dz;
      const t=len2?clamp(((goalie.x-oldX)*dx+(goalie.z-oldZ)*dz)/len2,0,1):0;
      const cx=oldX+t*dx,cz=oldZ+t*dz;
      const manual=this.settings.playerMode==='goalie'&&goalie.team===0;
      const reach=(manual&&this.settings.pro?(this.settings.pro.attributes.goalie-65)*.012:0)+(goalie.butterfly?2.55:goalie.glove>0?2.35:1.65)+(goalie.slide>0?.35:0);
      const saveHeight=goalie.butterfly?1.4:goalie.glove>0?4.1:2.85;
      if(Math.hypot(cx-goalie.x,cz-goalie.z)<reach&&k.y<saveHeight&&k.lock<=0){
        const dir=goalie.team===0?1:-1;const shot=k.lastTeam!==goalie.team&&k.shot;
        if(shot)this.stats.saves[goalie.team]++;goalie.action=.4;this.emit('save',{team:goalie.team,manual});
        if((goalie.glove>0&&k.y>1.1)||(Math.hypot(k.vx,k.vz)<23&&k.y>1.1)){Object.assign(k,{owner:goalie.id,vx:0,vz:0,vy:0,lock:.25,shot:false,lastTeam:goalie.team});goalie.holdTime=0;return;}
        k.x=goalie.x+dir*2.8;k.z=goalie.z+Math.sign(k.z-goalie.z||1)*1.8;const energy=clamp(Math.hypot(k.vx,k.vz)*.35,7,26);k.vx=dir*energy*.6;k.vz=Math.sign(k.z-goalie.z||1)*energy*.85+goalie.vz*.25;k.vy=goalie.butterfly?.3:1.1;k.lock=.28;k.lastOwner=goalie.id;k.shot=false;
      }
    }
    for(const sign of [-1,1]){
      const line=52*sign;
      if((oldX-line)*sign<0&&(k.x-line)*sign>=0){
        const crossZ=oldZ+(k.z-oldZ)*(line-oldX)/(k.x-oldX);
        if(Math.abs(crossZ)<4.65&&k.y<3.4){this.goal(sign===1?0:1);return;}
        if(Math.abs(crossZ)<5.2&&k.y<3.9){k.x=line-sign*.4;k.vx*=-.72;k.vz+=Math.sign(crossZ)*8;this.emit('post');}
      }
      if(k.x*sign>52&&k.x*sign<56&&Math.abs(k.z)<5.3){
        if(oldX*sign>=56){k.x=56.1*sign;k.vx=Math.abs(k.vx)*sign*.7;}else if(Math.abs(oldZ)>=5.3){k.z=Math.sign(oldZ)*5.35;k.vz=Math.sign(oldZ)*Math.abs(k.vz)*.6;}
      }
    }
    const bx=k.vx,bz=k.vz;this.bounds(k,.22,.77);if((bx*k.vx<0||bz*k.vz<0)&&Math.hypot(bx,bz)>13)this.emit('board');
    if(k.y<1.8){
      const candidates=this.players.filter(p=>p.active!==false&&!p.goalie&&p.stun<=0&&!(k.lock>0&&p.id===k.lastOwner)&&distance(p,k)<2.3).sort((a,b)=>distance(a,k)-distance(b,k));
      const p=candidates[0];if(p){
        const movingFast=Math.hypot(k.vx,k.vz)>33;
        if(movingFast&&k.shot&&p.team!==k.lastTeam){k.vx*=-.38;k.vz+=p.z>k.z?-7:7;k.lock=.12;k.lastOwner=p.id;k.shot=false;this.emit('block');}
        else this.gainPuck(p);
      }
    }
  }
  snapshot(){return {mode:this.mode,period:this.period,secondsRemaining:Math.ceil(this.clock),score:[...this.score],teams:[TEAMS[this.settings.home].fullName,TEAMS[this.settings.away].fullName],playerMode:this.settings.playerMode,playerName:this.players[this.selected]?.name,selectedPlayer:this.selected,puckOwner:this.puck.owner,stats:structuredClone(this.stats)};}
}
