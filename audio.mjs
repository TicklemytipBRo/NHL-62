export class ArenaAudio {
  constructor(){this.muted=false;this.ctx=null;this.crowd=null;this.voiceCache=new Map();this.voiceLoads=new Map();this.crowdVolume=1.5;this.voiceEpoch=0;this.voiceNodes=new Set();this.chantEpoch=0;this.chantStops=new Set();}
  async unlock(){
    if(this.ctx?.state==='closed')this.ctx=null;
    if(!this.ctx){
      const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;this.ctx=new Audio();
      this.master=this.ctx.createGain();this.master.gain.value=this.muted?0:.7;const limiter=this.ctx.createDynamicsCompressor();limiter.threshold.value=-6;limiter.ratio.value=8;this.master.connect(limiter).connect(this.ctx.destination);this.chantBus=this.ctx.createGain();this.chantBus.connect(this.master);this.effects=this.ctx.createGain();this.effects.connect(this.master);
      const buffer=this.ctx.createBuffer(1,this.ctx.sampleRate*3,this.ctx.sampleRate),data=buffer.getChannelData(0);let smooth=0;
      for(let i=0;i<data.length;i++){smooth=(smooth+(Math.random()*2-1)*.1)/1.02;data[i]=smooth;}
      const source=this.ctx.createBufferSource();source.buffer=buffer;source.loop=true;const filter=this.ctx.createBiquadFilter();filter.type='bandpass';filter.frequency.value=450;filter.Q.value=.5;this.crowd=this.ctx.createGain();this.crowd.gain.value=.085;source.connect(filter).connect(this.crowd).connect(this.effects);source.start();
    }
    if(this.ctx.state==='suspended')await this.ctx.resume();
  }
  async loadVoice(id){
    if(this.voiceCache.has(id))return this.voiceCache.get(id);
    if(!this.voiceLoads.has(id))this.voiceLoads.set(id,(async()=>{const r=await fetch('./assets/voice/'+id+'.mp3',{signal:AbortSignal.timeout(12000)});if(!r.ok)throw new Error('Voice clip unavailable');const buffer=await this.ctx.decodeAudioData(await r.arrayBuffer());this.voiceCache.set(id,buffer);return buffer;})().finally(()=>this.voiceLoads.delete(id)));
    return this.voiceLoads.get(id);
  }
  warmVoices(desk='primary'){if(!this.ctx)return;const ids=['intro','goal','hit','shot','save','drop','draw','pass','pickup','completepass','penalty','final'];return Promise.allSettled(ids.flatMap(id=>desk==='duo'?[id,'alt/'+id]:[desk==='secondary'?'alt/'+id:id]).map(id=>this.loadVoice(id)));}
  async playVoice(id,volume=1,onStart=()=>{}){
    const epoch=this.voiceEpoch;await this.unlock();if(epoch!==this.voiceEpoch)return;if(!this.ctx)throw new Error('Web Audio unavailable');
    await this.loadVoice(id);
    if(epoch!==this.voiceEpoch)return;
    if(this.ctx.state!=='running')throw new Error('Click to enable audio');
    return new Promise((resolve,reject)=>{const node=this.ctx.createBufferSource(),gain=this.ctx.createGain();node.buffer=this.voiceCache.get(id);gain.gain.value=volume;node.connect(gain).connect(this.master);this.voiceNodes.add(node);node.onended=()=>{this.voiceNodes.delete(node);node.disconnect();gain.disconnect();resolve();};try{node.start();onStart();}catch(e){reject(e);}});
  }
  stopVoice(){this.voiceEpoch++;for(const n of this.voiceNodes){try{n.stop();}catch{}}this.voiceNodes.clear();}
  stopCrowdChant(){this.chantEpoch++;for(const stop of this.chantStops)stop();this.chantStops.clear();}
  async crowdChant(){
    const epoch=this.chantEpoch;if(this.muted)return;await this.unlock();if(!this.ctx||epoch!==this.chantEpoch)return;
    if(!this.voiceCache.has('chant')){const r=await fetch('./assets/voice/chant.mp3');if(!r.ok)return;this.voiceCache.set('chant',await this.ctx.decodeAudioData(await r.arrayBuffer()));}
    if(epoch!==this.chantEpoch)return;const c=this.ctx,buffer=this.voiceCache.get('chant'),t=c.currentTime;
    for(let wave=0;wave<2;wave++)for(let i=0;i<9;i++){
      const voice=c.createBufferSource(),gain=c.createGain(),pan=c.createStereoPanner(),echo=c.createDelay(2),tail=c.createGain();voice.buffer=buffer;voice.playbackRate.value=.79+i*.035;gain.gain.value=.11*this.crowdVolume;pan.pan.value=(i-4)/5;echo.delayTime.value=.34+i*.045;tail.gain.value=.27;
      voice.connect(gain).connect(pan).connect(this.chantBus);pan.connect(echo).connect(tail).connect(this.chantBus);tail.connect(echo);voice.start(t+wave*4.5+i*.045);const stop=()=>{gain.gain.value=0;tail.gain.value=0;try{voice.stop();}catch{}};this.chantStops.add(stop);voice.onended=()=>setTimeout(()=>{this.chantStops.delete(stop);voice.disconnect();gain.disconnect();pan.disconnect();echo.disconnect();tail.disconnect();},2400);
    }this.cheer();
  }
  toggle(){this.muted=!this.muted;if(this.master)this.master.gain.setTargetAtTime(this.muted?0:.7,this.ctx.currentTime,.03);return this.muted;}
  tone(freq,duration=.1,type='sine',vol=.15,delay=0,end=null){if(!this.ctx||this.muted)return;const t=this.ctx.currentTime+delay,o=this.ctx.createOscillator(),v=this.ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);if(end)o.frequency.exponentialRampToValueAtTime(end,t+duration);v.gain.setValueAtTime(0,t);v.gain.linearRampToValueAtTime(vol,t+.009);v.gain.exponentialRampToValueAtTime(.001,t+duration);o.connect(v).connect(this.effects);o.start(t);o.stop(t+duration+.05);return o;}
  noise(duration=.12,vol=.3,freq=1700){if(!this.ctx||this.muted)return;const t=this.ctx.currentTime,buf=this.ctx.createBuffer(1,this.ctx.sampleRate*duration,this.ctx.sampleRate),d=buf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(1-i/d.length);const s=this.ctx.createBufferSource();s.buffer=buf;const f=this.ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=freq;const v=this.ctx.createGain();v.gain.value=vol;s.connect(f).connect(v).connect(this.effects);s.start(t);}
  cheer(){if(this.crowd&&!this.muted){const t=this.ctx.currentTime;this.crowd.gain.cancelScheduledValues(t);this.crowd.gain.setValueAtTime(.5,t);this.crowd.gain.exponentialRampToValueAtTime(.085,t+3);}}
  stopCinematic(){for(const n of this.cinematicNodes??[]){try{n.stop();}catch{}}this.cinematicNodes=[];}
  cinematic(){
    if(!this.ctx||this.muted)return;this.stopCinematic();this.cinematicNodes=[];const cue=(...args)=>{const n=this.tone(...args);if(n)this.cinematicNodes.push(n);};
    for(let i=0;i<16;i++){const time=i*.95;cue(i%4===0?55:73.42,.8,'sine',.14,time);cue([146.83,174.61,220,196][Math.floor(i/4)],1.25,'triangle',.07,time);if(i>6)cue(293.66,.18,'square',.018,time+.47);}
    this.noise(.9,.24,650);
  }
  event(type){
    if(type==='shot'){this.noise(.09,.44,2200);this.tone(160,.065,'triangle',.3,0,70);}
    if(type==='pass')this.noise(.06,.25,2000);
    if(type==='board'||type==='block'){this.tone(190,.09,'triangle',.18,0,75);this.noise(.04,.15,1000);}
    if(type==='hit'){this.noise(.18,.58,550);this.tone(85,.2,'sine',.26,0,40);}
    if(type==='post')this.tone(920,.7,'sine',.2);
    if(type==='save'){this.noise(.14,.26,800);this.tone(90,.13,'triangle',.16);}
    if(type==='freeze')this.tone(1850,.35,'sine',.1);
    if(type==='slide')this.noise(.4,.1,3500);
    if(type==='puckdrop')this.tone(1900,.22,'sine',.1);
    if(type==='goal'){
      this.cheer();for(const f of [110,146.83,174.6])this.tone(f,1.65,'sawtooth',.045);for(const [i,f] of [293.66,369.99,440,587.33,440,587.33].entries())this.tone(f,.25,'square',.025,1.25+i*.18);
    }
    if(type==='intermission'||type==='final'){this.tone(120,1.1,'sawtooth',.13);if(type==='final')this.cheer();}
  }
}
