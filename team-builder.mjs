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
export const defaultTeam=()=>({enabled:false,city:'North Bay',name:'Guardians',short:'NBG',arena:'Glasswater Arena',color:'#1263b5',dark:'#09203d',accent:'#74edff',pack:'glacier',jersey:'stripe',glass:1,sponsor:'FROST FUEL',chant:'Let’s go Guardians!',rosterNames:[],baseTeam:0,lineup:{},crest:'shield',socks:'#ffffff',pants:'#09203d',helmet:'#09203d',pads:'#e6edf0',numberColor:'#ffffff'});
export const teamPack=t=>PACKS.find(p=>p.id===t?.pack)||PACKS[0];
export function teamPresentation(settings,side,teams){const team=teams[side===0?settings.home:settings.away];return side===0&&settings.club?.enabled?{...team,...settings.club,fullName:settings.club.city+' '+settings.club.name,logo:clubLogo(settings.club)}:team;}
export function customizeRoster(roster,club){if(!club?.enabled)return roster;return roster.map((p,i)=>club.rosterNames?.[i]?{...p,name:club.rosterNames[i],lastName:club.rosterNames[i]}:p);}

export function clubLogo(club){const color=v=>/^#[0-9a-f]{6}$/i.test(v)?v:'#1263b5';const text=String(club.short||'CLB').replace(/[^a-z0-9]/gi,'').slice(0,3);const shape=club.crest==='circle'?'<circle cx="50" cy="50" r="43"/>':club.crest==='diamond'?'<path d="M50 5 95 50 50 95 5 50Z"/>':club.crest==='star'?'<path d="M50 4 63 34 96 36 70 58 80 92 50 74 20 92 30 58 4 36 37 34Z"/>':'<path d="M12 10H88V56Q80 82 50 96Q20 82 12 56Z"/>';return 'data:image/svg+xml,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g fill="${color(club.color)}" stroke="${color(club.accent)}" stroke-width="5">${shape}</g><text x="50" y="60" text-anchor="middle" font-family="Arial" font-size="26" font-weight="900" fill="${color(club.numberColor)}">${text}</text></svg>`);}
