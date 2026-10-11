import fs from 'node:fs/promises';
import {TEAMS,normalizeRoster} from '../teams.mjs';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const rosters={};let index=0;
async function fetchTeam(team){for(let attempt=0;attempt<4;attempt++){
 const response=await fetch(`https://api-web.nhle.com/v1/roster/${team}/current`,{signal:AbortSignal.timeout(25000),headers:{Accept:'application/json'}});
 if(response.status===429||response.status>=500){if(attempt===3)throw new Error(`${team}: HTTP ${response.status}`);const retry=Number(response.headers.get('Retry-After'))||15*(attempt+1);await sleep(Math.min(60000,Math.max(1000,retry*1000)));continue;}
 if(!response.ok)throw new Error(`${team}: HTTP ${response.status}`);return normalizeRoster(await response.json(),team);
}throw new Error(`${team}: retries exhausted`);}
async function worker(){while(index<TEAMS.length){const team=TEAMS[index++].short;rosters[team]=await fetchTeam(team);console.log(`${team}: ${rosters[team].players.length} players`);await sleep(500);}}
await Promise.all([worker(),worker()]);
if(Object.keys(rosters).length!==32)throw new Error('Keeping the previous snapshot: not all 32 rosters completed.');
const data={fetchedAt:new Date().toISOString(),source:'Official NHL current roster feeds',teamCount:32,uniquePlayers:new Set(Object.values(rosters).flatMap(r=>r.players.map(p=>p.id))).size,rosters};
const destination=new URL('../rosters.json',import.meta.url),temp=new URL('../rosters.json.tmp',import.meta.url);
await fs.writeFile(temp,JSON.stringify(data));await fs.rename(temp,destination);console.log(`Saved ${data.uniquePlayers} unique players across 32 teams.`);
