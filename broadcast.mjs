export class BroadcastQueue {
 constructor(audio,caption=()=>{}){this.audio=audio;this.caption=caption;this.queue=[];this.current=null;this.enabled=true;this.last=new Map();}
 say(text,{key=text,important=false,chant=false,intro=false}={}){if(!this.enabled)return;const now=Date.now();if(!important&&now-(this.last.get(key)||0)<12000)return;this.last.set(key,now);this.queue.push({text,important,chant,intro});this.pump();}
 get introBusy(){return this.current?.intro||this.queue.some(q=>q.intro);}
 pump(){if(this.current||!this.queue.length)return;const item=this.queue.shift();this.current=item;this.caption(item.text);let finished=false;const done=()=>{if(finished)return;finished=true;clearTimeout(this.timer);this.current=null;if(this.audio.crowd)this.audio.crowd.gain.setTargetAtTime(.085,this.audio.ctx.currentTime,.2);this.pump();};
 if(this.audio.crowd)this.audio.crowd.gain.setTargetAtTime(.025,this.audio.ctx.currentTime,.15);
 if(!this.audio.muted&&globalThis.speechSynthesis&&globalThis.SpeechSynthesisUtterance){const u=new SpeechSynthesisUtterance(item.text);u.rate=item.chant?.8:1.06;u.pitch=item.chant?.72:1;u.volume=.9;u.onend=done;u.onerror=done;this.utterance=u;speechSynthesis.speak(u);this.timer=setTimeout(()=>{if(!speechSynthesis.speaking)done();else this.timer=setTimeout(done,30000);},Math.max(15000,item.text.length*110));}
 else this.timer=setTimeout(done,Math.max(1600,item.text.length*35));
 }
 setEnabled(value){this.enabled=value;if(!value)this.queue=[];}
}
