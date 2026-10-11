import {TEAMS} from './teams.mjs';
export class RosterStore{
 constructor(onChange=()=>{}){this.rosters={};this.onChange=onChange;this.syncing=false;this.done=0;this.failures=[];this.lastAttempt=null;}
 get(code){return this.rosters[code]??null;}
 async init(){
  try{const response=await fetch('./rosters.json');if(response.ok){const data=await response.json();this.rosters=data.rosters??{};for(const roster of Object.values(this.rosters))roster.localSource='bundled';}}catch{}
  try{const saved=JSON.parse(localStorage.getItem('rink26.rosters.v1')??'{}');for(const [team,data] of Object.entries(saved)){if(TEAMS.some(t=>t.short===team)&&Array.isArray(data.players)&&data.players.length>5&&(!this.rosters[team]||Date.parse(data.fetchedAt)>Date.parse(this.rosters[team].fetchedAt)))this.rosters[team]={...data,localSource:'saved'};}}catch{}
  this.onChange(this.status());void this.sync();
 }
 status(){const rs=Object.values(this.rosters);return{teams:rs.length,players:new Set(rs.flatMap(r=>r.players.map(p=>p.id))).size,syncing:this.syncing,done:this.done,failures:[...this.failures],lastAttempt:this.lastAttempt,oldest:rs.length?rs.map(r=>r.fetchedAt).sort()[0]:null};}
 async sync(){
  if(this.syncing)return;this.syncing=true;this.done=0;this.failures=[];this.lastAttempt=new Date().toISOString();this.onChange(this.status());let i=0;
  const work=async()=>{while(i<TEAMS.length){const team=TEAMS[i++].short;try{
   const request=()=>fetch(`/api/nhl/roster/${team}`,{cache:'no-store',signal:AbortSignal.timeout(20000)});let response=await request();
   if(response.status===429){const retry=Number(response.headers.get('Retry-After'))||30;await new Promise(resolve=>setTimeout(resolve,Math.min(60000,Math.max(1000,retry*1000))));response=await request();}
   if(!response.ok)throw new Error();const data=await response.json();if(data.team!==team||!Array.isArray(data.players)||data.players.length<6)throw new Error();this.rosters[team]={...data,localSource:data.cache==='stale'?'saved':'live'};if(data.cache==='stale')this.failures.push(team);
  }catch{this.failures.push(team);}this.done++;this.onChange(this.status());}};
  await Promise.all(Array.from({length:4},work));this.syncing=false;
  try{localStorage.setItem('rink26.rosters.v1',JSON.stringify(this.rosters));}catch{}
  this.onChange(this.status());
 }
}
