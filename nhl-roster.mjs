import { TEAMS, normalizeRoster } from '../public/game/teams.mjs';
const allowed=new Set(TEAMS.map(t=>t.short));
const memory=new Map();
export async function getRosterResponse(code,{fetcher=fetch,now=()=>Date.now()}={}){
  if(!allowed.has(code))return Response.json({error:'Unknown NHL team'},{status:400});
  const cached=memory.get(code);if(cached&&now()-cached.savedAt<15*60*1000)return Response.json({...cached.data,cache:'fresh'},{headers:{'Cache-Control':'public, max-age=300'}});
  const url=`https://api-web.nhle.com/v1/roster/${code}/current`;
  try{
    const response=await fetcher(url,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(14000),cf:{cacheTtl:900,cacheEverything:true}});
    if(response.status===429)return Response.json({error:'The NHL feed is busy. Retry shortly.',team:code},{status:429,headers:{'Retry-After':response.headers.get('Retry-After')??'30','Cache-Control':'no-store'}});
    if(!response.ok)throw new Error(`NHL feed returned ${response.status}`);
    const data=normalizeRoster(await response.json(),code,new Date(now()).toISOString());memory.set(code,{data,savedAt:now()});
    return Response.json({...data,cache:'live'},{headers:{'Cache-Control':'public, max-age=300'}});
  }catch{
    if(cached)return Response.json({...cached.data,cache:'stale',warning:'NHL is unavailable. Showing the last successful roster.'},{headers:{'Cache-Control':'no-store'}});
    return Response.json({error:'NHL roster feed is temporarily unavailable. The game can use its dated backup.',team:code},{status:503,headers:{'Cache-Control':'no-store'}});
  }
}
