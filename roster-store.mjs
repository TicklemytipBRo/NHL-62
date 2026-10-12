import {TEAMS} from './teams.mjs?v=clubhouse-4';
export class RosterStore {
 constructor(onChange=()=>{}){this.rosters={};this.onChange=onChange;this.syncing=false;this.done=0;this.failures=[];this.lastAttempt=null;}
 get(code){return this.rosters[code]??null;}
 async init(){
  try{const response=await fetch('./rosters.json',{signal:AbortSignal.timeout(12000)});if(response.ok)this.accept(await response.json());}catch{}
  try{const saved=JSON.parse(localStorage.getItem('rink26.rosters.v1')??'{}');for(const [team,r] of Object.entries(saved))if(TEAMS.some(t=>t.short===team)&&Array.isArray(r.players)&&r.players.length>=6&&(!this.rosters[team]||Date.parse(r.fetchedAt)>Date.parse(this.rosters[team].fetchedAt)))this.rosters[team]={...r,localSource:'saved'};}catch{}
  this.onChange(this.status());if(!Object.keys(this.rosters).length)void this.sync();
 }
 accept(data){if(!data.rosters||!TEAMS.every(t=>data.rosters[t.short]?.players?.length>=6))throw new Error('Incomplete published snapshot');for(const t of TEAMS)this.rosters[t.short]={...data.rosters[t.short],localSource:'published'};}
 status(){const rs=Object.values(this.rosters);return{teams:rs.length,players:new Set(rs.flatMap(r=>r.players.map(p=>p.id))).size,syncing:this.syncing,done:this.done,failures:[...this.failures],lastAttempt:this.lastAttempt,oldest:rs.length?rs.map(r=>r.fetchedAt).sort()[0]:null};}
 async sync(){if(this.syncing)return;this.syncing=true;this.done=0;this.failures=[];this.lastAttempt=new Date().toISOString();this.onChange(this.status());
  try{const response=await fetch(`./rosters.json?refresh=${Date.now()}`,{cache:'no-store',signal:AbortSignal.timeout(15000)});if(!response.ok)throw new Error('Roster snapshot unavailable');this.accept(await response.json());this.done=32;try{localStorage.setItem('rink26.rosters.v1',JSON.stringify(this.rosters));}catch{}}
  catch{this.failures=TEAMS.map(t=>t.short);}finally{this.syncing=false;this.onChange(this.status());}
 }
}
