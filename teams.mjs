// Team identity follows NHL.com's official 32-team directory.
const rows = [
 ['EDM','Edmonton','Oilers','#ff681f','#041e42','#ffffff','Pacific'],
 ['CGY','Calgary','Flames','#d92331','#65121b','#ffcc00','Pacific'],
 ['TOR','Toronto','Maple Leafs','#2365b4','#00205b','#ffffff','Atlantic'],
 ['VAN','Vancouver','Canucks','#00843d','#00205b','#ffffff','Pacific'],
 ['MTL','Montréal','Canadiens','#af1e2d','#192168','#ffffff','Atlantic'],
 ['BOS','Boston','Bruins','#ffb81c','#171717','#ffffff','Atlantic'],
 ['NYR','New York','Rangers','#2361b6','#0038a8','#ce1126','Metropolitan'],
 ['WPG','Winnipeg','Jets','#6ba9d1','#041e42','#ffffff','Central'],
 ['ANA','Anaheim','Ducks','#f47a38','#171717','#b9975b','Pacific'],
 ['BUF','Buffalo','Sabres','#2468c8','#003087','#ffb81c','Atlantic'],
 ['CAR','Carolina','Hurricanes','#ce1126','#171717','#ffffff','Metropolitan'],
 ['CHI','Chicago','Blackhawks','#cf0a2c','#171717','#ffffff','Central'],
 ['COL','Colorado','Avalanche','#8d2942','#236192','#a2aaad','Central'],
 ['CBJ','Columbus','Blue Jackets','#2360a0','#002654','#ce1126','Metropolitan'],
 ['DAL','Dallas','Stars','#00843d','#111111','#a2aaad','Central'],
 ['DET','Detroit','Red Wings','#ce1126','#850b17','#ffffff','Atlantic'],
 ['FLA','Florida','Panthers','#c8102e','#041e42','#b9975b','Atlantic'],
 ['LAK','Los Angeles','Kings','#a2aaad','#111111','#ffffff','Pacific'],
 ['MIN','Minnesota','Wild','#168468','#154734','#a6192e','Central'],
 ['NSH','Nashville','Predators','#ffb81c','#041e42','#ffffff','Central'],
 ['NJD','New Jersey','Devils','#ce1126','#171717','#ffffff','Metropolitan'],
 ['NYI','New York','Islanders','#1764bd','#00539b','#f47d30','Metropolitan'],
 ['OTT','Ottawa','Senators','#da1a32','#171717','#c69214','Atlantic'],
 ['PHI','Philadelphia','Flyers','#f74902','#171717','#ffffff','Metropolitan'],
 ['PIT','Pittsburgh','Penguins','#fcb514','#171717','#ffffff','Metropolitan'],
 ['SJS','San Jose','Sharks','#009da7','#006d75','#ea7200','Pacific'],
 ['SEA','Seattle','Kraken','#68b8c9','#001628','#e9072b','Pacific'],
 ['STL','St. Louis','Blues','#2877c9','#002f87','#fcb514','Central'],
 ['TBL','Tampa Bay','Lightning','#2673cd','#002868','#ffffff','Atlantic'],
 ['UTA','Utah','Mammoth','#71afe5','#0e1721','#ffffff','Central'],
 ['VGK','Vegas','Golden Knights','#b4975a','#333f42','#c8102e','Pacific'],
 ['WSH','Washington','Capitals','#c8102e','#041e42','#ffffff','Metropolitan']
];
export const TEAMS=rows.map(([short,city,name,color,dark,accent,division])=>({short,city,name,fullName:`${city} ${name}`,color,dark,accent,division,logo:`./logos/${short}.svg`}));
export function normalizeRoster(raw,team,fetchedAt=new Date().toISOString()){
  if(!raw||!['forwards','defensemen','goalies'].every(k=>Array.isArray(raw[k])))throw new Error('Incomplete NHL roster response');
  const all=[...raw.forwards,...raw.defensemen,...raw.goalies];
  if(all.length<6||raw.goalies.length<1)throw new Error('NHL returned an incomplete roster');
  const ids=new Set();const players=[];
  for(const p of all){
    if(!Number.isInteger(p.id)||!p.firstName?.default||!p.lastName?.default)throw new Error('Invalid NHL player record');
    if(ids.has(p.id))continue;ids.add(p.id);
    players.push({id:p.id,firstName:p.firstName.default,lastName:p.lastName.default,name:`${p.firstName.default} ${p.lastName.default}`,number:p.sweaterNumber??null,position:p.positionCode??'F',hand:p.shootsCatches??null,height:p.heightInCentimeters??null,weight:p.weightInKilograms??null,birthDate:p.birthDate??null,country:p.birthCountry??null,headshot:typeof p.headshot==='string'&&p.headshot.startsWith('https://assets.nhle.com/')?p.headshot:null});
  }
  return {team,fetchedAt,source:`https://api-web.nhle.com/v1/roster/${team}/current`,players,count:players.length};
}
