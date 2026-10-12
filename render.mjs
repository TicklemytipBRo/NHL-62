import {ArenaDetail} from './arena-detail.mjs?v=ice-5.1';
import {teamPresentation,teamPack} from './team-builder.mjs?v=ice-5.1';
import * as THREE from './vendor/three.module.js';
import { TEAMS, clamp } from './engine.mjs?v=ice-5.1';
const UP=new THREE.Vector3(0,1,0);
export class RinkRenderer {
  constructor(container,game){
    this.game=game;this.cinematic=null;this.rosterVersion=-1;this.container=container;this.cameraMode='broadcast';this.width=0;this.height=0;this.flash=0;this.visualTime=0;this.sparks=[];
    this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.65));this.renderer.setClearColor(0x080f1a);
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.12;
    container.appendChild(this.renderer.domElement);this.renderer.domElement.setAttribute('aria-hidden','true');
    this.scene=new THREE.Scene();this.scene.fog=new THREE.Fog(0x080f1a,180,320);
    this.camera=new THREE.PerspectiveCamera(39,1,.2,500);this.camera.position.set(0,102,112);
    this.target=new THREE.Vector3(0,0,0);this.scene.add(new THREE.HemisphereLight(0xd5f1ff,0x233648,2.1));
    const key=new THREE.DirectionalLight(0xe5f6ff,3.3);key.position.set(-20,78,25);key.castShadow=true;
    key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-75,right:75,top:50,bottom:-50,near:1,far:160});key.shadow.bias=-.0005;key.shadow.normalBias=.06;this.scene.add(key);
    const fill=new THREE.DirectionalLight(0x85b8ff,1.3);fill.position.set(40,45,-45);this.scene.add(fill);
    this.goalLight=new THREE.PointLight(0xcefa54,0,70,1);this.goalLight.position.set(0,12,0);this.scene.add(this.goalLight);
    this.matCache=new Map();this.boxGeometry=new THREE.BoxGeometry(1,1,1);this.sphereGeometry=new THREE.SphereGeometry(1,20,14);this.cylinderGeometry=new THREE.CylinderGeometry(1,1,1,14);
    this.serviceGate=[];this.buildRink();this.buildStands();this.skaterGroup=new THREE.Group();this.scene.add(this.skaterGroup);this.players=[];this.rebuildPlayers();
    this.trainingMarker=new THREE.Mesh(new THREE.RingGeometry(2.8,3.3,40),new THREE.MeshBasicMaterial({color:0xcefa54,side:THREE.DoubleSide,depthTest:false,transparent:true,opacity:.8}));this.trainingMarker.rotation.x=-Math.PI/2;this.scene.add(this.trainingMarker);
    this.puckMesh=this.mesh(this.cylinderGeometry,0x050810,[.48,.25,.48],[0,.25,0]);this.puckMesh.castShadow=true;this.scene.add(this.puckMesh);
    this.puckDot=new THREE.Mesh(new THREE.RingGeometry(.68,.85,24),new THREE.MeshBasicMaterial({color:0x0b233b,transparent:true,opacity:.38,depthWrite:false}));this.puckDot.rotation.x=-Math.PI/2;this.scene.add(this.puckDot);
    this.selection=new THREE.Mesh(new THREE.RingGeometry(2.05,2.35,40),new THREE.MeshBasicMaterial({color:0xcefa54,side:THREE.DoubleSide,depthWrite:false}));this.selection.rotation.x=-Math.PI/2;this.scene.add(this.selection);
    const pointerGeo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-.7,0,0),new THREE.Vector3(.7,0,0),new THREE.Vector3(0,-1,0)]);pointerGeo.setIndex([0,1,2]);
    this.pointer=new THREE.Mesh(pointerGeo,new THREE.MeshBasicMaterial({color:0xcefa54,side:THREE.DoubleSide,depthTest:false}));this.pointer.renderOrder=20;this.scene.add(this.pointer);
    const aimPositions=new Float32Array(3*2);this.aimGeom=new THREE.BufferGeometry();this.aimGeom.setAttribute('position',new THREE.BufferAttribute(aimPositions,3));
    this.aim=new THREE.Line(this.aimGeom,new THREE.LineDashedMaterial({color:0x193b4d,dashSize:1.1,gapSize:.65,transparent:true,opacity:.6}));this.scene.add(this.aim);
    this.trailPositions=new Float32Array(24*3);this.trailGeom=new THREE.BufferGeometry();this.trailGeom.setAttribute('position',new THREE.BufferAttribute(this.trailPositions,3));
    this.trail=new THREE.Line(this.trailGeom,new THREE.LineBasicMaterial({color:0x467ba0,transparent:true,opacity:.36}));this.scene.add(this.trail);this.trailHistory=[];
    this.decor=new ArenaDetail(this);this.resize();new ResizeObserver(()=>this.resize()).observe(container);
  }
  material(color,extra={}){const key=String(color)+JSON.stringify(extra);if(!this.matCache.has(key))this.matCache.set(key,new THREE.MeshStandardMaterial({color,roughness:.7,...extra}));return this.matCache.get(key);}
  mesh(geometry,color,scale,pos,extra={}){const m=new THREE.Mesh(geometry,this.material(color,extra));if(scale)m.scale.set(...scale);if(pos)m.position.set(...pos);return m;}
  box(color,scale,pos,extra={}){return this.mesh(this.boxGeometry,color,scale,pos,extra);}
  rod(a,b,r,color,group=this.scene){const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),m=this.mesh(this.cylinderGeometry,color,[r,A.distanceTo(B),r]);m.position.copy(A).add(B).multiplyScalar(.5);m.quaternion.setFromUnitVectors(UP,B.sub(A).normalize());group.add(m);return m;}
  buildRink(){
    const shape=new THREE.Shape();shape.moveTo(-50,-28);shape.lineTo(50,-28);shape.quadraticCurveTo(59,-28,59,-19);shape.lineTo(59,19);shape.quadraticCurveTo(59,28,50,28);shape.lineTo(-50,28);shape.quadraticCurveTo(-59,28,-59,19);shape.lineTo(-59,-19);shape.quadraticCurveTo(-59,-28,-50,-28);
    const canvas=document.createElement('canvas');canvas.width=3072;canvas.height=1536;const c=canvas.getContext('2d');
    c.fillStyle='#e7f4f8';c.fillRect(0,0,3072,1536);
    const g=c.createLinearGradient(0,0,0,1536);g.addColorStop(0,'#dfedf2');g.addColorStop(.48,'#f8fdff');g.addColorStop(1,'#dcecf4');c.fillStyle=g;c.fillRect(0,0,3072,1536);
    const sx=3072/120,sz=1536/60,px=x=>(x+60)*sx,pz=z=>(z+30)*sz;
    const line=(x,z,X,Z,color,width)=>{c.beginPath();c.strokeStyle=color;c.lineWidth=width*sx;c.moveTo(px(x),pz(z));c.lineTo(px(X),pz(Z));c.stroke();};
    const circle=(x,z,r,color,width)=>{c.beginPath();c.strokeStyle=color;c.lineWidth=width*sx;c.ellipse(px(x),pz(z),r*sx,r*sz,0,0,Math.PI*2);c.stroke();};
    const dot=(x,z,r,color)=>{c.fillStyle=color;c.beginPath();c.ellipse(px(x),pz(z),r*sx,r*sz,0,0,Math.PI*2);c.fill();};
    line(0,-30,0,30,'#d3455f',.35);line(-19,-30,-19,30,'#2272b6',.8);line(19,-30,19,30,'#2272b6',.8);
    circle(0,0,9,'#2b709e',.2);dot(0,0,.5,'#26739e');
    for(const x of [-38,38])for(const z of [-14,14]){circle(x,z,8,'#d65c69',.17);dot(x,z,.65,'#d64c5b');for(const sign of [-1,1]){line(x-1,z+sign*2,x-1,z+sign*3.8,'#d65c69',.13);line(x+1,z+sign*2,x+1,z+sign*3.8,'#d65c69',.13);line(x-2.4,z+sign*2,x-1,z+sign*2,'#d65c69',.13);line(x+1,z+sign*2,x+2.4,z+sign*2,'#d65c69',.13);}}
    for(const x of [-14,14])for(const z of [-14,14])dot(x,z,.5,'#d75e6d');
    for(const sign of [-1,1]){
      const x=52*sign;line(x,-28,x,28,'#d84e66',.17);c.beginPath();c.fillStyle='#92cdec88';c.strokeStyle='#d84e66';c.lineWidth=.16*sx;
      c.ellipse(px(x),pz(0),6*sx,6*sz,0,sign===1?Math.PI/2:-Math.PI/2,sign===1?Math.PI*1.5:Math.PI/2);c.closePath();c.fill();c.stroke();
      line(x,9,59*sign,13,'#dd7784',.12);line(x,-9,59*sign,-13,'#dd7784',.12);
    }
    c.save();c.translate(px(0),pz(0));c.rotate(-Math.PI/2);c.globalAlpha=.45;c.textAlign='center';c.fillStyle='#22476b';c.font='italic 900 84px Arial';c.fillText('RINK',0,-10);c.font='900 95px Arial';c.fillText('26',0,78);c.restore();
    c.globalAlpha=.22;c.fillStyle='#6b90a4';c.textAlign='center';c.font='700 31px Arial';c.fillText('VERY BAD GAMES',px(0),pz(-23));c.fillText('TAKE THE ICE',px(0),pz(24));c.globalAlpha=1;
    // Fine skate cuts add ice texture without fetching image assets.
    let seed=937;const random=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};
    c.lineWidth=.6;for(let i=0;i<11000;i++){const x=random()*3072,z=random()*1536;c.strokeStyle=i%2?'#8fb4c00b':'#ffffff38';c.beginPath();c.moveTo(x,z);c.lineTo(x+random()*100-50,z+random()*35-17);c.stroke();}
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(this.renderer.capabilities.getMaxAnisotropy(),8);
    const geometry=new THREE.ShapeGeometry(shape,28);const uv=geometry.attributes.uv,pos=geometry.attributes.position;for(let i=0;i<uv.count;i++)uv.setXY(i,(pos.getX(i)+60)/120,(pos.getY(i)+30)/60);
    const ice=new THREE.Mesh(geometry,new THREE.MeshPhysicalMaterial({map:texture,roughness:.15,metalness:.18,clearcoat:1,clearcoatRoughness:.07,color:0xffffff}));this.iceMaterial=ice.material;ice.rotation.x=-Math.PI/2;ice.receiveShadow=true;this.scene.add(ice);
    const base=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:2.2,bevelEnabled:false,curveSegments:28}),this.material(0x1c3148));base.rotation.x=-Math.PI/2;base.position.y=-2.25;this.scene.add(base);
    const outline=shape.getPoints(10);const glass=new THREE.MeshPhysicalMaterial({color:0x97d6ed,transparent:true,opacity:.1,roughness:.12,metalness:0,depthWrite:false,side:THREE.DoubleSide});
    for(let i=0;i<outline.length-1;i++){
      const a=outline[i],b=outline[i+1],dx=b.x-a.x,dz=-(b.y-a.y),length=Math.hypot(dx,dz);if(length<.01)continue;
      const x=(a.x+b.x)/2,z=-(a.y+b.y)/2;const board=this.box(0xe9f3f7,[length+.09,2.1,.5],[x,1.03,z]);board.rotation.y=-Math.atan2(dz,dx);board.castShadow=true;this.scene.add(board);if(x>58&&length>20)this.serviceGate.push(board);
      const cap=this.box(0x1c3e62,[length+.1,.19,.7],[x,2.12,z]);cap.rotation.y=board.rotation.y;this.scene.add(cap);if(x>58&&length>20)this.serviceGate.push(cap);
      const trim=this.box(0xffb326,[length+.09,.3,.52],[x,.22,z]);trim.rotation.y=board.rotation.y;this.scene.add(trim);if(x>58&&length>20)this.serviceGate.push(trim);
      const panel=new THREE.Mesh(this.boxGeometry,glass);panel.scale.set(length,3,.12);panel.position.set(x,3.7,z);panel.rotation.y=board.rotation.y;this.scene.add(panel);if(x>58&&length>20)this.serviceGate.push(panel);
    }
    for(let x=-48;x<=48;x+=8)for(const z of [-28,28])this.rod([x,2.2,z],[x,5.2,z],.035,0x718ea3);
    this.buildGoal(-1);this.buildGoal(1);
    
    
  }
  addBoardText(text,z,flip){
    const c=document.createElement('canvas');c.width=2048;c.height=80;const x=c.getContext('2d');x.fillStyle='#e9f3f7';x.fillRect(0,0,2048,80);x.fillStyle='#214666';x.font='italic 800 46px Arial';x.textAlign='center';x.textBaseline='middle';x.fillText(text,1024,43);
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const m=new THREE.Mesh(new THREE.PlaneGeometry(86,1.35),new THREE.MeshBasicMaterial({map:t,side:THREE.DoubleSide}));m.position.set(0,1.15,z);if(flip)m.rotation.y=Math.PI;this.scene.add(m);
  }
  buildGoal(sign){
    const front=52*sign,back=55.8*sign;const frame=0xe02c49;
    for(const z of [-5,5]){this.rod([front,.16,z],[front,3.5,z],.15,frame);this.rod([front,3.5,z],[back,2.6,z*.85],.12,frame);this.rod([front,.15,z],[back,.15,z*.85],.13,frame);this.rod([back,.15,z*.85],[back,2.6,z*.85],.1,frame);}
    this.rod([front,3.5,-5],[front,3.5,5],.16,frame);this.rod([back,2.6,-4.25],[back,2.6,4.25],.11,frame);
    const vertices=[];const add=(a,b)=>vertices.push(...a,...b);
    for(let z=-4.25;z<=4.26;z+=.42)add([back,.15,z],[back,2.6,z]);
    for(let y=.2;y<=2.61;y+=.35)add([back,y,-4.25],[back,y,4.25]);
    for(const s of [-1,1]){
      for(let k=0;k<=1;k+=.1){const x=front+(back-front)*k,Z=s*(5-.75*k);add([x,.2,Z],[x,3.5-.9*k,Z]);}
      for(let y=.4;y<2.6;y+=.35)add([front,y,s*5],[back,y,s*4.25]);
    }
    for(let z=-4.25;z<=4.26;z+=.42)add([front,3.5,z/4.25*5],[back,2.6,z]);
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));this.scene.add(new THREE.LineSegments(geo,new THREE.LineBasicMaterial({color:0xc5d9e1,transparent:true,opacity:.7})));
    const lamp=this.mesh(this.sphereGeometry,0xe52b46,[.45,.45,.45],[back+sign,3.5,0],{emissive:0xb50c22,emissiveIntensity:.25});this.scene.add(lamp);
  }
  buildStands(){
    this.scene.add(this.box(0x0c1827,[210,2,155],[0,-4,0]));
    for(let row=0;row<5;row++){
      const h=1+row*2.5,z=33+row*4.8;
      for(const s of [-1,1]){if(row>0)this.scene.add(this.box(row%2?0x15283c:0x112237,[132+row*7,2.3,5],[0,h,s*z]));if(s===1&&row<3){const extent=(59+row*10)/2;this.scene.add(this.box(0x122339,[5,2.3,extent+9],[s*(64+row*4.8),h,(9-extent)/2]));this.scene.add(this.box(0x122339,[5,2.3,extent-24],[s*(64+row*4.8),h,(24+extent)/2]));}else this.scene.add(this.box(0x122339,[5,2.3,59+row*10],[s*(64+row*4.8),h,0]));}
    }
    const people=[];for(let row=0;row<5;row++){
      for(let x=-61-row*3;x<=61+row*3;x+=2.7)for(const s of [-1,1])if(row>0||Math.abs(x)>52)people.push([x+(row%2)*1.2,3+row*2.5,s*(33+row*4.8)]);
      for(let z=-28-row*4;z<=28+row*4;z+=2.8)for(const s of [-1,1])if(!(s===1&&row<3&&z>8&&z<25))people.push([s*(64+row*4.8),3+row*2.5,z]);
    }
    const bodies=new THREE.InstancedMesh(this.boxGeometry,this.material(0xffffff),people.length),heads=new THREE.InstancedMesh(this.sphereGeometry,this.material(0xcc9980),people.length);
    const dummy=new THREE.Object3D(),colors=[0x344b67,0x365f88,0xc07e36,0x27485c,0x774747,0x3d5265,0x9aabb4,0x283849];
    people.forEach(([x,y,z],i)=>{dummy.position.set(x,y,z);dummy.scale.set(1.1,1.65,1);dummy.updateMatrix();bodies.setMatrixAt(i,dummy.matrix);bodies.setColorAt(i,new THREE.Color(colors[(i*7+Math.floor(i/11))%colors.length]));dummy.position.y+=1.2;dummy.scale.set(.39,.42,.39);dummy.updateMatrix();heads.setMatrixAt(i,dummy.matrix);});this.scene.add(bodies,heads);
    // The light ribbons and truss frame the playable rink.
    for(const z of [-57,57]){
      this.scene.add(this.box(0x183d5a,[160,.65,1],[0,15,z],{emissive:0x3b82a1,emissiveIntensity:.5}));
      for(let x=-66;x<=66;x+=12)this.scene.add(this.box(0xc9eaff,[7,.13,1.8],[x,32,z*.65],{emissive:0xc9eaff,emissiveIntensity:2}));
      this.scene.add(this.box(0x162b40,[150,.6,.9],[0,32.5,z*.65]));
    }
  }
  rebuildPlayers(){
    for(const p of this.players){this.skaterGroup.remove(p.group);for(const resource of p.disposable??[])resource.dispose();}this.players=[];
    this.rosterVersion=this.game.rosterVersion;
    for(const p of this.game.players){const team=teamPresentation(this.game.settings,p.team,TEAMS);this.players.push(this.buildSkater(p,team));}
  }
  buildSkater(p,team){
    const group=new THREE.Group(),torso=new THREE.Group();group.add(torso);group.scale.setScalar(clamp((p.height||188)/188,.92,1.08));const jersey=p.team===0?team.color:'#ecf4f9',trim=p.team===0?team.dark:team.color,helmet=p.custom?p.helmet:p.team===0?(team.helmet||team.dark):team.color;
    const body=this.box(jersey,[1.65,1.7,1.13],[0,2.35,0]);body.castShadow=true;torso.add(body);
    torso.add(this.box(trim,[1.69,.27,1.17],[0,1.86,0]));if(team.jersey==='chevron'){const stripe=this.box(team.accent,[.15,1.5,1.16],[.2,2.35,0]);stripe.rotation.z=.6;torso.add(stripe);}else if(team.jersey==='hoops'){for(const y of [1.85,2.35,2.85])torso.add(this.box(team.accent,[1.7,.18,1.17],[0,y,0]));}else if(team.jersey==='pinstripe'){for(const z of [-.42,0,.42])torso.add(this.box(team.accent,[1.7,1.45,.065],[0,2.35,z]));}else if(team.jersey==='shoulder')torso.add(this.box(team.accent,[1.72,.48,1.18],[0,2.96,0]));else if(team.jersey==='classic')torso.add(this.box(team.accent,[1.7,.2,1.17],[0,2.25,0]));torso.add(this.box(p.team===0?(team.pants||0x16243c):0x16243c,[1.56,.65,.98],[0,1.25,0]));
    const head=this.mesh(this.sphereGeometry,0xc29172,[.6,.6,.58],[.13,3.65,0]);torso.add(head);
    const hat=this.mesh(this.sphereGeometry,helmet,[.73,.6,.7],[.08,3.9,0]);hat.castShadow=true;torso.add(hat);
    // Face, helmet vents, collar and stitched shoulder panels.
    for(const sign of [-1,1]){torso.add(this.mesh(this.sphereGeometry,0x18212b,[.065,.05,.04],[.65,3.64,sign*.22]));torso.add(this.box(trim,[.8,.05,.05],[-.08,4.3,sign*.26]));torso.add(this.box(team.accent,[.9,.08,.5],[0,3.13,sign*.55]));}
    torso.add(this.mesh(this.sphereGeometry,0xc29172,[.14,.16,.13],[.72,3.5,0]));torso.add(this.box(trim,[.06,.12,.4],[.68,3.31,0]));torso.add(this.box(trim,[.4,.16,.7],[0,3.2,0]));
    for(const y of [2.1,2.4,2.7])torso.add(this.box(team.accent,[.04,.04,.08],[.85,y,0]));
    torso.add(this.box(team.visorTint||0xa7d4ec,[.13,.37,1.12],[.64,3.57,0],{transparent:true,opacity:.48,roughness:.2}));
    torso.add(this.box(team.accent,[.85,.32,.035],[.1,2.63,.58]));
    const legs=[];
    for(const sign of [-1,1]){
      const leg=new THREE.Group();leg.position.set(0,1.1,sign*.5);torso.add(leg);legs.push(leg);
      leg.add(this.box(p.team===0?(team.socks||jersey):jersey,[.65,.88,.59],[0,-.28,0]));leg.add(this.box(trim,[.68,.22,.62],[0,-.45,0]));
      leg.add(this.box(0x18222d,[1,.35,.56],[.1,-.8,0]));leg.add(this.box(0xa5bac2,[1.17,.1,.16],[.1,-1.02,0]));
      const arm=new THREE.Group();arm.position.set(.13,2.8,sign*.83);arm.rotation.z=.15;torso.add(arm);
      arm.add(this.box(jersey,[.61,1.15,.62],[.1,-.38,0]));arm.add(this.box(trim,[.64,.22,.65],[.1,-.65,0]));arm.add(this.box(team.gloves||helmet,[.62,.45,.65],[.42,-.96,0]));
    }
    const stick=new THREE.Group();torso.add(stick);this.rod([.7,1.95,.8],[2.25,.18,1.3],.08,p.custom?p.stick:(team.stick||0x363529),stick);stick.add(this.box(p.custom?p.stick:(team.stick||0x303333),[1.2,.24,.21],[2.68,.17,1.3]));
    for(let i=0;i<5;i++)stick.add(this.box(team.tape||0xffffff,[.065,.26,.23],[2.25+i*.15,.17,1.3]));
    if(p.hand==='R')stick.scale.z=-1;
    if(p.goalie){
      for(const s of [-1,1])torso.add(this.box(p.custom?p.pads:p.team===0?(team.pads||0xe6edf0):0xe6edf0,[.65,1.48,.93],[.43,.9,s*.58]));
      torso.add(this.box(team.color,[.18,1.28,1.5],[.79,.9,0]));torso.add(this.box(0xe7f0f7,[.45,.75,.7],[1,1.8,-1.05]));
    }
    const nameCanvas=document.createElement('canvas');nameCanvas.width=256;nameCanvas.height=48;const nc=nameCanvas.getContext('2d');nc.fillStyle=team.numberColor||'#ffffff';nc.font='bold 28px Arial';nc.textAlign='center';nc.fillText((p.lastName||p.name||'').toUpperCase().slice(0,18),128,32);const nameTex=new THREE.CanvasTexture(nameCanvas),nameMat=new THREE.MeshBasicMaterial({map:nameTex,transparent:true,side:THREE.DoubleSide});const nameMesh=new THREE.Mesh(new THREE.PlaneGeometry(1.1,.26),nameMat);nameMesh.position.set(-.85,3.02,0);nameMesh.rotation.y=-Math.PI/2;torso.add(nameMesh);
    const numberCanvas=document.createElement('canvas');numberCanvas.width=64;numberCanvas.height=64;const c=numberCanvas.getContext('2d');c.fillStyle=p.team===0?(team.numberColor||'white'):team.dark;c.font='900 49px Arial';c.textAlign='center';c.fillText(String(p.number),32,50);const numberTex=new THREE.CanvasTexture(numberCanvas);numberTex.colorSpace=THREE.SRGBColorSpace;
    const numberMat=new THREE.MeshBasicMaterial({map:numberTex,transparent:true,side:THREE.DoubleSide,depthWrite:false});const number=new THREE.Mesh(new THREE.PlaneGeometry(1,1),numberMat);number.position.set(-.84,2.46,0);number.rotation.y=-Math.PI/2;torso.add(number);
    const shadow=new THREE.Mesh(new THREE.CircleGeometry(1.8,24),new THREE.MeshBasicMaterial({color:0x183147,transparent:true,opacity:.1,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.05;group.add(shadow);
    this.skaterGroup.add(group);return{group,torso,legs,stick,shadow,disposable:[nameTex,nameMat,nameMesh.geometry,numberTex,numberMat,number.geometry,shadow.material,shadow.geometry]};
  }
  resize(){this.width=this.container.clientWidth;this.height=this.container.clientHeight;this.renderer.setSize(this.width,this.height);this.camera.aspect=this.width/Math.max(1,this.height);this.camera.updateProjectionMatrix();}
  goal(team){this.flash=3;this.goalLight.color.set(TEAMS[team===0?this.game.settings.home:this.game.settings.away].color);this.goalLight.position.x=team===0?48:-48;
    for(const s of this.sparks){this.scene.remove(s.mesh);s.mesh.geometry.dispose();s.mesh.material.dispose();}this.sparks=[];
    const colors=[0xcefa54,0xffffff,team===0?0xff681f:0xef334b];for(let i=0;i<75;i++){const mesh=new THREE.Mesh(new THREE.PlaneGeometry(.35,.7),new THREE.MeshBasicMaterial({color:colors[i%3],side:THREE.DoubleSide}));mesh.position.set((Math.random()-.5)*70,12+Math.random()*20,(Math.random()-.5)*32);this.scene.add(mesh);this.sparks.push({mesh,fall:4+Math.random()*4,spin:Math.random()*7});}
  }
  render(dt){
    const g=this.game;if(this.rosterVersion!==g.rosterVersion)this.rebuildPlayers();this.visualTime+=dt;if(this.iceMaterial)this.iceMaterial.roughness=.4-(g.settings.club?.enabled?(g.settings.club.iceGloss??.82):.82)*.32;const inMenu=g.mode==='menu';
    let cx=0,cz=0;const aspect=this.camera.aspect;
    if(!inMenu&&aspect<1){cx=clamp(g.puck.x*.83,-33,33);cz=clamp(g.puck.z*.2,-4,4);}
    else if(!inMenu&&this.cameraMode==='follow'){cx=clamp(g.puck.x*.65,-26,26);cz=g.puck.z*.23;}
    let height=aspect<1?86:92,depth=aspect<1?93:96;
    if(aspect>1&&aspect<1.5){height=112;depth=117;}
    if(!inMenu&&this.cameraMode==='follow'&&aspect>1){height=69;depth=75;}
    if(inMenu){cx=5;cz=0;height=88;depth=98;}
    const desired=new THREE.Vector3(cx, height, depth+cz);
    if(g.settings.playerMode!=='goalie'||inMenu||g.mode==='intro'){this.camera.position.lerp(desired,1-Math.exp(-dt*2.7));this.target.lerp(new THREE.Vector3(cx,0,cz-1),1-Math.exp(-dt*3));}
    if(g.settings.playerMode==='goalie'&&!inMenu&&g.mode!=='intro'){
      const high=this.cameraMode==='follow';const p=g.players[5];this.camera.position.lerp(new THREE.Vector3(high?-93:-81,high?40:31,p.z*.22),1-Math.exp(-dt*5));this.target.lerp(new THREE.Vector3(-18,0,p.z*.12),1-Math.exp(-dt*5));
    }
    if(this.cinematic){
      const t=this.cinematic.time;const phase=Math.min(3,Math.floor(t/4.5)),u=clamp((t-phase*4.5)/4.5,0,1),e=u*u*(3-2*u);
      const shots=[{a:[-45,5,21],b:[-12,3,13],at:[0,2,0]},{a:[-57,3,12],b:[-44,7,14],at:[-49,2,0]},{a:[30,10,-22],b:[8,5,-12],at:[5,2,0]},{a:[-25,48,64],b:[0,100,105],at:[0,0,0]}];
      const pack=teamPack(g.settings.club);const shot=structuredClone(shots[phase]);shot.a[2]+=(pack.seed%4-1.5)*3;shot.b[1]+=Math.floor(pack.seed/4)*2;this.camera.position.fromArray(shot.a).lerp(new THREE.Vector3(...shot.b),e);this.target.set(...shot.at);
    }
    this.camera.lookAt(this.target);
    for(let i=0;i<g.players.length;i++){
      const p=g.players[i],v=this.players[i];if(!v)continue;v.group.visible=p.active!==false;if(!v.group.visible)continue;v.group.position.set(p.x,0,p.z);v.group.rotation.y=-Math.atan2(p.fz,p.fx);
      const speed=Math.hypot(p.vx,p.vz),stride=Math.sin(p.skate*1.6)*Math.min(speed*.022,.4);
      v.legs[0].rotation.z=stride;v.legs[1].rotation.z=-stride;v.legs[0].rotation.x=stride*.35;v.legs[1].rotation.x=stride*.35;
      const target=p.stun>0?1.2:0;v.torso.rotation.x+=(target-v.torso.rotation.x)*Math.min(1,dt*12);v.torso.position.y=p.stun>0?-.45:p.goalie&&p.butterfly?-.7:Math.sin(p.skate*3.2)*Math.min(speed*.0025,.08);
      v.torso.rotation.z=p.goalie?(p.butterfly?-.38:p.action>0?-.22:0):-Math.min(speed*.005,.12);v.stick.rotation.y=p.action>0?Math.sin(p.action*18)*.45:0;if(p.goalie){v.legs[0].rotation.x=p.butterfly?-.65:0;v.legs[1].rotation.x=p.butterfly?.65:0;v.torso.rotation.x=p.slide>0?Math.sign(p.vz)*.22:0;}
    }
    this.puckMesh.position.set(g.puck.x,g.puck.y,g.puck.z);this.puckDot.position.set(g.puck.x,.036,g.puck.z);
    const selected=g.players[g.selected];this.selection.visible=!inMenu&&g.mode!=='intro';this.pointer.visible=this.selection.visible;
    if(selected){this.selection.position.set(selected.x,.04,selected.z);this.selection.material.color.set(g.puck.owner===selected.id?0xcefa54:0x31cced);this.pointer.position.set(selected.x,6+Math.sin(this.visualTime*4)*.15,selected.z);this.pointer.quaternion.copy(this.camera.quaternion);}
    this.aim.visible=g.charge>0&&g.puck.owner===g.selected;
    if(this.aim.visible){const a=this.aimGeom.attributes.position;a.setXYZ(0,g.puck.x,.35,g.puck.z);a.setXYZ(1,51.5,.35,g.aimZ??0);a.needsUpdate=true;this.aim.computeLineDistances();}
    const trailActive=g.mode==='play'&&g.puck.owner===null&&Math.hypot(g.puck.vx,g.puck.vz)>18;
    this.trail.visible=trailActive;if(trailActive){this.trailHistory.unshift([g.puck.x,g.puck.y+.04,g.puck.z]);this.trailHistory.length=Math.min(12,this.trailHistory.length);for(let i=0;i<24;i++){const v=this.trailHistory[Math.min(i,this.trailHistory.length-1)];this.trailPositions.set(v,i*3);}this.trailGeom.attributes.position.needsUpdate=true;}else this.trailHistory=[];
    this.flash=Math.max(0,this.flash-dt);this.goalLight.intensity=this.flash>0?(Math.sin(this.visualTime*17)+1)*12:0;
    for(const s of this.sparks){s.mesh.position.y-=dt*s.fall;s.mesh.position.x+=Math.sin(this.visualTime+s.spin)*dt*2;s.mesh.rotation.x+=dt*s.spin;s.mesh.rotation.z+=dt*2;s.mesh.visible=s.mesh.position.y>.2&&this.flash>0;}
    this.trainingMarker.visible=false;
    const drill=g.drill;
    if(drill?.type==='skating'&&g.gates?.[drill.gate]){const [x,z]=g.gates[drill.gate];this.trainingMarker.position.set(x,.08,z);this.trainingMarker.visible=true;}
    else if(drill?.type==='shooting'){this.trainingMarker.position.set(51.5,.08,g.target?.z??0);this.trainingMarker.visible=true;}
    else if(g.settings.playerMode==='goalie'&&g.mode==='play'&&g.puck.owner===null&&g.puck.vx<-.1){const t=(-49-g.puck.x)/g.puck.vx;if(t>0&&t<2){this.trainingMarker.position.set(-49,.08,clamp(g.puck.z+g.puck.vz*t,-12,12));this.trainingMarker.visible=true;}}
    this.decor.render(dt);this.renderer.render(this.scene,this.camera);
  }
}
