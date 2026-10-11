import fs from 'node:fs/promises';
import { TEAMS, normalizeRoster } from '../public/game/teams.mjs';
const old=await fs.readFile(new URL('../public/game/rosters.json',import.meta.url),'utf8').then(JSON.parse).catch(()=>({}));const rosters=old.rosters??{},failures=[];
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function request(url){for(let attempt=0;attempt<3;attempt++){const response=await fetch(url,{signal:AbortSignal.timeout(25000)});if(response.status!==429)return response;const retry=Number(response.headers.get('retry-after'));await pause(Math.min(55000,Math.max(10000,Number.isFinite(retry)?retry*1000:30000)));}throw new Error('NHL rate limited this feed; try later');}await fs.mkdir(new URL('../public/game/logos/',import.meta.url),{recursive:true});
let index=0;async function worker(){while(index<TEAMS.length){const t=TEAMS[index++];try{
  if(!rosters[t.short]){const response=await request(`https://api-web.nhle.com/v1/roster/${t.short}/current`);if(!response.ok)throw new Error(`HTTP ${response.status}`);rosters[t.short]=normalizeRoster(await response.json(),t.short);await fs.writeFile(new URL('../public/game/rosters.json',import.meta.url),JSON.stringify({rosters}));}
  const logoPath=new URL(`../public/game/logos/${t.short}.svg`,import.meta.url);if(!await fs.stat(logoPath).catch(()=>null)){const logo=await request(`https://assets.nhle.com/logos/nhl/svg/${t.short}_light.svg`);if(!logo.ok)throw new Error(`logo HTTP ${logo.status}`);const svg=await logo.text();if(!svg.includes('<svg'))throw new Error('invalid logo');await fs.writeFile(logoPath,svg);}await pause(800);
  console.log(`${t.short}: ${rosters[t.short].count} players`);
}catch(error){failures.push({team:t.short,error:error.message});}}}
await Promise.all(Array.from({length:2},worker));
if(failures.length){console.error(failures);process.exitCode=1;}else{
 const ids=new Set(Object.values(rosters).flatMap(r=>r.players.map(p=>p.id)));const data={fetchedAt:new Date().toISOString(),source:'Official NHL current roster feeds',teamCount:Object.keys(rosters).length,uniquePlayers:ids.size,rosters};
 await fs.writeFile(new URL('../public/game/rosters.json',import.meta.url),JSON.stringify(data));console.log(JSON.stringify({teams:data.teamCount,uniquePlayers:data.uniquePlayers,fetchedAt:data.fetchedAt}));
}
