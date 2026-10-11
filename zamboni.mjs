export class Zamboni {
 constructor(){this.x=-48;this.z=20;this.heading=0;this.speed=0;this.time=0;this.done=false;this.clean=new Set();this.total=28*12;this.water=0;this.parkTime=0;}
 get coverage(){return this.clean.size/this.total;}
 update(dt,input={}){if(this.done)return;this.time+=dt;const throttle=-(input.z||0),steer=input.x||0;this.speed+=(throttle*12-this.speed)*Math.min(1,dt*(input.stop?8:1.4));this.heading+=steer*dt*(this.speed/12)*1.3;const nx=this.x+Math.cos(this.heading)*this.speed*dt,nz=this.z+Math.sin(this.heading)*this.speed*dt;const gate=Math.abs(nz-16)<5&&nx>53;if(gate){this.x=Math.min(72,nx);this.z=nz;}else{this.x=Math.max(-54,Math.min(54,nx));this.z=Math.max(-23,Math.min(23,nz));}if(Math.abs(this.x-nx)>.01||Math.abs(this.z-nz)>.01)this.speed*=.4;
 this.water=Math.max(0,this.water-dt);if(input.shoot&&Math.abs(this.speed)>.4&&this.x<56){this.water=.3;for(let col=0;col<28;col++)for(let row=0;row<12;row++){const x=-54+col*4,z=-22+row*4;if(Math.hypot(x-this.x,z-this.z)<4)this.clean.add(row*28+col);}}
 if(this.coverage>=.95&&this.x>62&&Math.abs(this.z-16)<4&&Math.abs(this.speed)<.8){this.parkTime+=dt;if(this.parkTime>1)this.done=true;}else this.parkTime=0;
 }
}
