export const PACKS=[
 ['glacier','Glacier Glass','#7ee7ff',0,0.16,'A new era rises from the ice.'],
 ['inferno','Inferno','#ff6738',1,0.24,'Turn up the heat. This is our house.'],
 ['aurora','Northern Lights','#a58aff',2,0.12,'Under northern lights, legends take the ice.'],
 ['storm','Thunderstorm','#75adff',3,0.22,'Hear the thunder. Feel the crowd.'],
 ['ocean','Ocean Surge','#24ded1',4,0.3,'Wave after wave. Here comes the home team.'],
 ['gold','Gold Standard','#ffd579',5,0.13,'Built for the spotlight. Built to win.'],
 ['neon','Neon Nights','#f57bff',6,0.22,'The city is awake. The ice is electric.'],
 ['forest','Emerald Forest','#7fff9f',7,0.14,'Stand tall. Stand together.'],
 ['crimson','Crimson Charge','#ff4164',8,0.21,'Heart. Speed. Relentless hockey.'],
 ['arctic','Arctic White','#effcff',9,0.1,'Cold ice. Unbreakable focus.'],
 ['cosmic','Cosmic Ice','#9ca6ff',10,0.28,'One arena. A universe of possibilities.'],
 ['steel','Steel City','#b6cbdc',11,0.18,'Forged by the city. Driven by the fans.']
].map(([id,name,color,seed,ripple,line])=>({id,name,color,seed,ripple,line}));
export const defaultTeam=()=>({enabled:false,city:'North Bay',name:'Guardians',short:'NBG',arena:'Glasswater Arena',color:'#1263b5',dark:'#09203d',accent:'#74edff',pack:'glacier',jersey:'stripe',glass:1,sponsor:'FROST FUEL',chant:'Let’s go Guardians!',rosterNames:[]});
export const teamPack=t=>PACKS.find(p=>p.id===t?.pack)||PACKS[0];
export function teamPresentation(settings,side,teams){const team=teams[side===0?settings.home:settings.away];return side===0&&settings.club?.enabled?{...team,...settings.club,fullName:settings.club.city+' '+settings.club.name}:team;}
export function customizeRoster(roster,club){if(!club?.enabled)return roster;return roster.map((p,i)=>club.rosterNames?.[i]?{...p,name:club.rosterNames[i],lastName:club.rosterNames[i]}:p);}
