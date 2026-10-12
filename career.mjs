import {seedDynamics,simulateFixture,updateForm} from './season-dynamics.mjs?v=ice-5.2';
export const CAREER_KEY='rink26.career.v1';
export function schedule(n=32){let order=Array.from({length:n},(_,i)=>i),rounds=[];for(let r=0;r<n-1;r++){rounds.push(Array.from({length:n/2},(_,i)=>r%2?[order[n-1-i],order[i]]:[order[i],order[n-1-i]]));order=[order[0],order.at(-1),...order.slice(1,-1)];}return rounds;}
export function newCareer(team){return{version:1,team,week:0,phase:'season',schedule:schedule(),table:Array.from({length:32},(_,team)=>({team,gp:0,w:0,l:0,otl:0,pts:0,gf:0,ga:0})),results:[],round:0,bracket:[],champion:null};}
export function rankings(c){return [...c.table].sort((a,b)=>b.pts-a.pts||(b.gf-b.ga)-(a.gf-a.ga)||b.gf-a.gf||a.team-b.team);}
function playoffRound(teams){return Array.from({length:teams.length/2},(_,i)=>({teams:[teams[i],teams[teams.length-1-i]],wins:[0,0],winner:null}));}
export function nextFixture(c){if(c.phase==='season'){const pair=c.schedule[c.week]?.find(p=>p.includes(c.team));return pair?{id:`week-${c.week}`,teams:pair,opponent:pair.find(t=>t!==c.team)}:null;}if(c.phase==='playoffs'){const series=c.bracket.at(-1).find(s=>s.teams.includes(c.team)&&s.winner===null);return series?{id:`cup-${c.round}-${series.wins.join('-')}`,teams:series.teams,opponent:series.teams.find(t=>t!==c.team)}:null;}return null;}
export function recordResult(c,id,score,overtime=false,random=Math.random){const fixture=nextFixture(c);if(!fixture||fixture.id!==id||score[0]===score[1])return false;seedDynamics(c,random);
 if(c.phase==='season'){
  for(const pair of c.schedule[c.week]){const user=pair.includes(c.team);const sim=user?null:simulateFixture(c,pair,random);const s=user?(pair[0]===c.team?score:[score[1],score[0]]):sim.score;const winner=s[0]>s[1]?0:1;
   pair.forEach((t,i)=>{const row=c.table[t];row.gp++;row.gf+=s[i];row.ga+=s[1-i];if(i===winner){row.w++;row.pts+=2;}else if(user?overtime:sim.overtime){row.otl++;row.pts++;}else row.l++;});
   updateForm(c,pair,s,random);c.results.push({week:c.week,teams:pair,score:s,overtime:user?overtime:sim.overtime});
  }
  c.week++;if(c.week===31){c.phase='playoffs';c.round=1;c.bracket.push(playoffRound(rankings(c).slice(0,16).map(r=>r.team)));}
 }else{
  const series=c.bracket.at(-1).find(s=>s.teams.includes(c.team)&&!Number.isInteger(s.winner));const idx=series.teams.indexOf(c.team);series.wins[score[0]>score[1]?idx:1-idx]++;if(Math.max(...series.wins)>=2)series.winner=series.teams[series.wins[0]>series.wins[1]?0:1];advanceOtherSeries(c,random);
 }
 return true;
}
export function advanceOtherSeries(c,random=Math.random){if(c.phase!=='playoffs')return;
 for(const s of c.bracket.at(-1)){if(!Number.isInteger(s.winner)&&!s.teams.includes(c.team)){while(Math.max(...s.wins)<2){const r=simulateFixture(c,s.teams,random);s.wins[r.score[0]>r.score[1]?0:1]++;updateForm(c,s.teams,r.score,random);}s.winner=s.teams[s.wins[0]>s.wins[1]?0:1];}}
 const current=c.bracket.at(-1);if(current.every(s=>Number.isInteger(s.winner))){const winners=current.map(s=>s.winner);if(winners.length===1){c.champion=winners[0];c.phase='complete';}else{c.round++;c.bracket.push(playoffRound(winners));}}
}
export function finishEliminated(c,random=Math.random){for(let i=0;i<6&&c.phase==='playoffs'&&!nextFixture(c);i++)advanceOtherSeries(c,random);}
export function loadCareer(storage){try{const c=JSON.parse(storage.getItem(CAREER_KEY));if(c?.version===1&&c.table?.length===32&&c.schedule?.length===31&&['season','playoffs','complete'].includes(c.phase))return c;}catch{}return null;}
