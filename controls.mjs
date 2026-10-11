export const DEFAULTS={
 skater:{up:'KeyW',down:'KeyS',left:'KeyA',right:'KeyD',shoot:'Space',pass:'KeyX',check:'KeyE',switch:'KeyQ',sprint:'ShiftLeft',line:'KeyF',camera:'KeyC',pause:'KeyP'},
 goalie:{up:'KeyW',down:'KeyS',left:'KeyA',right:'KeyD',butterfly:'Space',slideLeft:'KeyQ',slideRight:'KeyE',glove:'ShiftLeft',poke:'KeyF',freeze:'KeyR',clear:'KeyX',recenter:'KeyZ',camera:'KeyC',pause:'KeyP'}
};
export const LABELS={up:'Move forward / up',down:'Move backward / down',left:'Move left',right:'Move right',shoot:'Charge and release shot',pass:'Pass puck',check:'Body / poke check',switch:'Switch skater',sprint:'Sprint (hold)',line:'Change line',camera:'Camera',pause:'Pause',butterfly:'Butterfly (hold)',slideLeft:'Slide left',slideRight:'Slide right',glove:'Glove save',poke:'Poke check',freeze:'Freeze puck',clear:'Pass / clear puck',recenter:'Return to crease (hold)'};
export function keyLabel(code){return {Space:'SPACE',ShiftLeft:'L SHIFT',ShiftRight:'R SHIFT',ControlLeft:'L CTRL',ControlRight:'R CTRL',AltLeft:'L ALT',AltRight:'R ALT',ArrowUp:'↑',ArrowDown:'↓',ArrowLeft:'←',ArrowRight:'→',Backquote:'`',BracketLeft:'[',BracketRight:']',Semicolon:';',Quote:"'",Comma:',',Period:'.',Slash:'/',Minus:'−',Equal:'=',Enter:'ENTER',Tab:'TAB',Backspace:'BACKSPACE'}[code]??code.replace(/^Key/,'').replace(/^Digit/,'').toUpperCase();}
export function validKey(code){return typeof code==='string'&&/^(Key[A-Z]|Digit[0-9]|Space|Shift(Left|Right)|Control(Left|Right)|Arrow(Up|Down|Left|Right)|Enter|Tab|Backquote|Bracket(Left|Right)|Semicolon|Quote|Comma|Period|Slash|Minus|Equal|Backspace)$/.test(code);}
export class Controls{
 constructor(storage=globalThis.localStorage){this.storage=storage;this.maps=structuredClone(DEFAULTS);try{const saved=JSON.parse(storage?.getItem('rink26.controls.v2')??'{}');for(const mode of ['skater','goalie'])if(saved[mode]&&Object.keys(DEFAULTS[mode]).every(a=>validKey(saved[mode][a]))&&new Set(Object.values(saved[mode])).size===Object.keys(DEFAULTS[mode]).length)this.maps[mode]={...saved[mode]};}catch{}}
 bind(mode,action,key){if(!DEFAULTS[mode]||!Object.hasOwn(DEFAULTS[mode],action)||!validKey(key))throw new Error('Choose a letter, number, arrow, or supported control key. Esc always cancels.');const map=this.maps[mode],other=Object.keys(map).find(a=>a!==action&&map[a]===key);if(other)map[other]=map[action];map[action]=key;this.save();return other;}
 reset(mode){if(!DEFAULTS[mode])throw new Error('Unknown control layout');this.maps[mode]=structuredClone(DEFAULTS[mode]);this.save();}
 save(){try{this.storage?.setItem('rink26.controls.v2',JSON.stringify(this.maps));return true;}catch{return false;}}
 action(mode,code){return Object.keys(this.maps[mode]).find(k=>this.maps[mode][k]===code);}
 held(mode,action,keys){return keys.has(this.maps[mode][action]);}
}
