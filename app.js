(() => {
'use strict';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const menuView = $('#menuView');
const gameView = $('#gameView');
const canvas = $('#gameCanvas');
const ctx = canvas.getContext('2d');
const dialog = $('#panelDialog');
const dialogContent = $('#dialogContent');
const nameDialog = $('#nameDialog');
const scoreForm = $('#scoreForm');
const finalScore = $('#finalScore');
const playerName = $('#playerName');

const W = canvas.width, H = canvas.height, FLOOR = 604;
const ladder = ['gracie','jack','john','justin','joe','paul'];
const fighterMeta = {
  gracie:{name:'Gracie',img:'coach-gracie.png',accent:'#ff4b8c',speed:1.12,power:.92,defense:.95,ai:.50,style:'Speed Fighter',specials:['Flash Palm','Sky Knee','Cyclone Kick','Blitz Finale']},
  jack:{name:'Jack',img:'coach-jack.png',accent:'#3ab5ff',speed:1.06,power:.98,defense:1.0,ai:.57,style:'Technical Striker',specials:['Straight Shot','Rising Hook','Switch Kick','Precision Rush']},
  john:{name:'John',img:'coach-john.png',accent:'#46d47b',speed:.93,power:1.14,defense:1.03,ai:.64,style:'Power Brawler',specials:['Power Drive','Shoulder Rise','Hammer Wheel','Iron Storm']},
  justin:{name:'Justin',img:'coach-justin.png',accent:'#ffb33c',speed:.95,power:.98,defense:1.13,ai:.72,style:'Defensive Master',specials:['Counter Burst','Rising Guard','Sweep Wheel','Fortress Break']},
  joe:{name:'Joe',img:'coach-joe.png',accent:'#ff3d56',speed:1.02,power:1.08,defense:1.04,ai:.80,style:'All-Rounder',specials:['Impact Wave','Dragon Knee','Spinning Back Kick','FKBC Rush']},
  paul:{name:'Paul',img:'coach-paul.png',accent:'#7dd1ff',speed:1.00,power:1.18,defense:1.15,ai:.92,style:'Final Master',specials:['Master Blast','Master Rise','Axe Cyclone','Final Lesson']}
};

const images = {};
let selected='joe';
let mode='arcade';
let state='menu';
let player=null, cpu=null;
let currentOpponentIndex=0;
let roundNumber=1, playerRounds=0, cpuRounds=0, timer=99, lastTimerTick=0;
let score=0, runStarted=false, paused=false, roundBanner='', bannerUntil=0;
let projectiles=[], sparks=[], particles=[];
let lastFrame=performance.now(), raf=0;
let audioCtx=null, musicTimer=null;
let input={left:false,right:false,up:false,down:false};
let inputBuffer=[];
let lastDirection='neutral';
let heldSince={left:0,right:0,up:0,down:0};
let releasedCharge={left:{ms:0,t:0},right:{ms:0,t:0}};
let attackPressedTimes={LP:0,MP:0,HP:0,LK:0,MK:0,HK:0};
let aiNextThink=0;
let fightStartAt=0;
let matchOverHandled=false;
let reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;

const frame = n => n * (1000/60);

const normalMoves = {
  stand: {
    LP:{name:'Jab',startup:4,active:3,recovery:8,damage:5,reach:72,y:220,h:76,knock:7,meter:5,type:'mid'},
    MP:{name:'Cross',startup:6,active:4,recovery:11,damage:7,reach:92,y:218,h:82,knock:12,meter:7,type:'mid'},
    HP:{name:'Hook',startup:9,active:4,recovery:16,damage:10,reach:104,y:212,h:94,knock:23,meter:10,type:'mid'},
    LK:{name:'Snap Kick',startup:5,active:4,recovery:10,damage:6,reach:86,y:120,h:72,knock:9,meter:6,type:'low'},
    MK:{name:'Round Kick',startup:7,active:5,recovery:13,damage:8,reach:118,y:182,h:90,knock:15,meter:8,type:'mid'},
    HK:{name:'Heavy Roundhouse',startup:11,active:5,recovery:19,damage:12,reach:140,y:190,h:104,knock:30,meter:12,type:'mid',knockdown:true}
  },
  crouch: {
    LP:{name:'Low Jab',startup:4,active:3,recovery:7,damage:4,reach:66,y:125,h:65,knock:5,meter:4,type:'low'},
    MP:{name:'Body Cross',startup:6,active:4,recovery:10,damage:6,reach:84,y:138,h:72,knock:9,meter:6,type:'mid'},
    HP:{name:'Rising Palm',startup:8,active:5,recovery:15,damage:9,reach:88,y:205,h:122,knock:18,meter:9,type:'mid'},
    LK:{name:'Toe Kick',startup:4,active:4,recovery:8,damage:5,reach:82,y:62,h:58,knock:6,meter:5,type:'low'},
    MK:{name:'Low Round',startup:7,active:5,recovery:12,damage:7,reach:110,y:70,h:64,knock:10,meter:7,type:'low'},
    HK:{name:'Sweep',startup:10,active:6,recovery:18,damage:10,reach:136,y:68,h:62,knock:24,meter:10,type:'low',knockdown:true}
  },
  jump: {
    LP:{name:'Jump Jab',startup:3,active:9,recovery:5,damage:5,reach:72,y:210,h:86,knock:7,meter:5,type:'overhead'},
    MP:{name:'Jump Cross',startup:5,active:8,recovery:6,damage:7,reach:90,y:205,h:92,knock:12,meter:7,type:'overhead'},
    HP:{name:'Jump Hammer',startup:7,active:9,recovery:8,damage:10,reach:104,y:210,h:105,knock:22,meter:10,type:'overhead'},
    LK:{name:'Jump Knee',startup:4,active:10,recovery:5,damage:6,reach:80,y:145,h:92,knock:10,meter:6,type:'overhead'},
    MK:{name:'Jump Side Kick',startup:6,active:9,recovery:7,damage:8,reach:108,y:160,h:96,knock:15,meter:8,type:'overhead'},
    HK:{name:'Flying Roundhouse',startup:8,active:9,recovery:10,damage:12,reach:132,y:172,h:110,knock:28,meter:12,type:'overhead',knockdown:true}
  }
};

const specials = {
  projectile:{name:'Projectile',startup:12,active:1,recovery:22,damage:10,reach:0,meter:12,type:'mid',special:true},
  rising:{name:'Rising Strike',startup:5,active:12,recovery:28,damage:13,reach:96,y:220,h:155,knock:40,meter:14,type:'mid',special:true,knockdown:true},
  spin:{name:'Spinning Kick',startup:8,active:15,recovery:18,damage:12,reach:150,y:185,h:112,knock:28,meter:14,type:'mid',special:true,knockdown:true,multi:2},
  dash:{name:'Rush Kick',startup:10,active:8,recovery:20,damage:11,reach:118,y:155,h:90,knock:32,meter:13,type:'mid',special:true,knockdown:true},
  super:{name:'Super Combo',startup:8,active:40,recovery:28,damage:30,reach:190,y:190,h:140,knock:65,meter:0,type:'mid',special:true,super:true,multi:5,knockdown:true}
};

class Fighter {
  constructor(id,isCpu=false){
    this.id=id; this.meta=fighterMeta[id]; this.isCpu=isCpu;
    this.maxHealth=100; this.health=100; this.meter=0;
    this.x=isCpu?930:350; this.y=FLOOR; this.vx=0; this.vy=0; this.facing=isCpu?-1:1;
    this.state='idle'; this.stateStart=0; this.move=null; this.moveHit=false; this.moveHits=0;
    this.hitStunUntil=0; this.blockStunUntil=0; this.knockdownUntil=0; this.invulnUntil=0;
    this.crouch=false; this.air=false; this.blocking=false; this.combo=0; this.comboUntil=0;
    this.lastHitAt=0; this.lastAttackAt=0; this.chargeBackStart=0; this.paletteShift=0;
  }
  reset(x){this.health=100;this.meter=Math.min(this.meter,50);this.x=x;this.y=FLOOR;this.vx=0;this.vy=0;this.state='idle';this.move=null;this.moveHit=false;this.moveHits=0;this.hitStunUntil=0;this.blockStunUntil=0;this.knockdownUntil=0;this.invulnUntil=0;this.crouch=false;this.air=false;this.blocking=false;this.combo=0;}
  canAct(now){return !paused && now>=this.hitStunUntil && now>=this.blockStunUntil && now>=this.knockdownUntil && !this.move && state==='fight';}
}

function preload(){
  const jobs=Object.entries(fighterMeta).map(([id,m])=>new Promise(res=>{const im=new Image(); im.src=m.img; im.onload=()=>{images[id]=im;res();}; im.onerror=res;}));
  return Promise.all(jobs);
}

function buildFighterGrid(){
  const grid=$('#fighterGrid'); grid.innerHTML='';
  ladder.forEach(id=>{
    const b=document.createElement('button'); b.type='button'; b.className='fighterCard'+(id===selected?' selected':''); b.dataset.id=id;
    b.innerHTML=`<img src="${fighterMeta[id].img}" alt="${fighterMeta[id].name}"><span>${fighterMeta[id].name}<small style="display:block;font-size:.58em;color:#b9c4d6;font-style:normal">${fighterMeta[id].style}</small></span>`;
    b.addEventListener('click',()=>{selected=id;$$('.fighterCard').forEach(x=>x.classList.toggle('selected',x.dataset.id===id)); beep(440,.04,.04);});
    grid.appendChild(b);
  });
}

function showMenu(){
  state='menu'; cancelAnimationFrame(raf); stopMusic(); paused=false;
  if(dialog.open)dialog.close(); if(nameDialog.open)nameDialog.close();
  gameView.classList.remove('active'); menuView.classList.add('active');
  try{if(document.fullscreenElement)document.exitFullscreen();}catch(e){}
}

async function enterGame(gameMode){
  mode=gameMode; menuView.classList.remove('active'); gameView.classList.add('active');
  try{if(document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen({navigationUI:'hide'});}catch(e){}
  try{if(screen.orientation?.lock) await screen.orientation.lock('landscape');}catch(e){}
  initAudio(); startMusic();
  if(mode==='training'){startTraining();} else {startArcade();}
}

function startArcade(){
  state='intro'; runStarted=true; score=0; currentOpponentIndex=0; playerRounds=0; cpuRounds=0; roundNumber=1; matchOverHandled=false;
  player=new Fighter(selected,false); cpu=new Fighter(ladder[currentOpponentIndex],true); if(cpu.id===player.id)cpu.paletteShift=120;
  player.x=340; cpu.x=940; player.meter=0; cpu.meter=0;
  beginRound(true);
}
function startTraining(){
  state='intro'; score=0; currentOpponentIndex=0; playerRounds=0; cpuRounds=0; roundNumber=1;
  player=new Fighter(selected,false); const idx=(ladder.indexOf(selected)+1)%ladder.length; cpu=new Fighter(ladder[idx],true); cpu.meta={...cpu.meta,ai:0};
  beginRound(true); mode='training';
}

function beginRound(first=false){
  player.reset(340); cpu.reset(940); player.facing=1; cpu.facing=-1; projectiles=[]; sparks=[]; particles=[];
  timer=99; lastTimerTick=performance.now(); state='intro'; roundBanner=`ROUND ${roundNumber}`; bannerUntil=performance.now()+900;
  fightStartAt=performance.now()+1550; matchOverHandled=false;
  if(!first) beep(330,.07,.05);
  lastFrame=performance.now(); cancelAnimationFrame(raf); raf=requestAnimationFrame(loop);
}

function advanceOpponent(){
  currentOpponentIndex++;
  if(currentOpponentIndex>=ladder.length){
    state='champion'; roundBanner='FKBC CHAMPION!'; bannerUntil=performance.now()+3500; score+=50000; maybeHighScore(true); return;
  }
  playerRounds=0; cpuRounds=0; roundNumber=1;
  cpu=new Fighter(ladder[currentOpponentIndex],true); if(cpu.id===player.id)cpu.paletteShift=(currentOpponentIndex*55)%360;
  score+=5000+Math.max(0,timer)*40;
  beginRound(false);
}

function endRun(){
  state='gameover'; roundBanner='GAME OVER'; bannerUntil=performance.now()+2500; maybeHighScore(false);
}

function maybeHighScore(champion){
  setTimeout(()=>{
    const scores=getScores();
    const qualifies=scores.length<10 || score>(scores.at(-1)?.score||0);
    if(qualifies){finalScore.textContent=score.toLocaleString(); playerName.value=''; if(!nameDialog.open)nameDialog.showModal();}
    else setTimeout(showMenu,1000);
  },champion?1800:1400);
}

function getScores(){try{return JSON.parse(localStorage.getItem('fkbcScores')||'[]').filter(x=>x&&Number.isFinite(x.score)).slice(0,10);}catch{return[]}}
function saveScore(name){const scores=getScores();scores.push({name:(name||'PLAYER').trim().slice(0,12).toUpperCase(),score,when:Date.now()});scores.sort((a,b)=>b.score-a.score);localStorage.setItem('fkbcScores',JSON.stringify(scores.slice(0,10)));}

scoreForm.addEventListener('submit',e=>{e.preventDefault();saveScore(playerName.value);nameDialog.close();showMenu();setTimeout(showScores,60);});

function showScores(){
  const scores=getScores();
  dialogContent.innerHTML=`<h2>HIGH SCORES</h2>${scores.length?`<table class="scoreList">${scores.map((s,i)=>`<tr><td>${i+1}. ${escapeHtml(s.name)}</td><td>${s.score.toLocaleString()}</td></tr>`).join('')}</table>`:'<p>No scores yet. Finish a run to set the board.</p>'}`;
  if(!dialog.open)dialog.showModal();
}
function showMoves(){
  dialogContent.innerHTML=`<h2>MOVE LIST</h2><p>Classic six-button kickboxing controls. Blocking is automatic when you hold <b>away</b> from your opponent.</p><div class="moveGrid">
  <div class="move"><strong>Normals</strong>LP / MP / HP = punches<br>LK / MK / HK = kicks<br>Down + attack = crouching version<br>Jump + attack = aerial version</div>
  <div class="move"><strong>Defence & throws</strong>Hold away = high block<br>Down + away = low block<br>Forward + HP when close = throw<br>Forward + MP = overhead</div>
  <div class="move"><strong>Special 1</strong><span class="kbd">↓</span> <span class="kbd">↘</span> <span class="kbd">→</span> + Punch<br>${fighterMeta[selected].specials[0]}</div>
  <div class="move"><strong>Special 2</strong><span class="kbd">→</span> <span class="kbd">↓</span> <span class="kbd">↘</span> + Punch<br>${fighterMeta[selected].specials[1]}</div>
  <div class="move"><strong>Special 3</strong><span class="kbd">↓</span> <span class="kbd">↙</span> <span class="kbd">←</span> + Kick<br>${fighterMeta[selected].specials[2]}</div>
  <div class="move"><strong>Charge attack</strong>Hold back ~0.7 sec, then forward + Kick<br>Armoured rush kick</div>
  <div class="move"><strong>Super</strong>When SUPER is full: ↓ ↘ →, ↓ ↘ → + HP/HK<br>${fighterMeta[selected].specials[3]}</div>
  <div class="move"><strong>Keyboard / controller</strong>Arrows = movement. A/S/D = LP/MP/HP. Z/X/C = LK/MK/HK. Standard gamepads are supported.</div>
  </div>`;
  if(!dialog.open)dialog.showModal();
}
function escapeHtml(s){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}

$('#startArcade').addEventListener('click',()=>enterGame('arcade'));
$('#startTraining').addEventListener('click',()=>enterGame('training'));
$('#showMoves').addEventListener('click',showMoves);
$('#showScores').addEventListener('click',showScores);
$('#pauseBtn').addEventListener('click',()=>togglePause());

dialog.addEventListener('close',()=>{if(state==='menu') return;});

function togglePause(){
  if(!gameView.classList.contains('active'))return;
  paused=!paused;
  if(paused){state=state==='fight'?'paused':state; dialogContent.innerHTML=`<h2>PAUSED</h2><div class="menuActions"><button id="resumeGame" class="primary" type="button">RESUME</button><button id="pauseMoves" type="button">MOVE LIST</button><button id="quitGame" type="button">QUIT TO MENU</button></div>`; if(!dialog.open)dialog.showModal(); setTimeout(()=>{$('#resumeGame')?.addEventListener('click',()=>{paused=false;state='fight';dialog.close();lastFrame=performance.now();});$('#pauseMoves')?.addEventListener('click',showMoves);$('#quitGame')?.addEventListener('click',()=>{paused=false;dialog.close();showMenu();});},0);} else {if(dialog.open)dialog.close(); state='fight'; lastFrame=performance.now();}
}

function initAudio(){if(!audioCtx){try{audioCtx=new (window.AudioContext||window.webkitAudioContext)();}catch{}} if(audioCtx?.state==='suspended')audioCtx.resume();}
function beep(freq=220,dur=.05,vol=.05,type='square'){if(!audioCtx)return;const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(vol,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.0001,audioCtx.currentTime+dur);o.connect(g).connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+dur);}
function noise(dur=.05,vol=.07){if(!audioCtx)return;const n=Math.floor(audioCtx.sampleRate*dur),buf=audioCtx.createBuffer(1,n,audioCtx.sampleRate),d=buf.getChannelData(0);for(let i=0;i<n;i++)d[i]=Math.random()*2-1;const src=audioCtx.createBufferSource(),g=audioCtx.createGain();src.buffer=buf;g.gain.setValueAtTime(vol,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.0001,audioCtx.currentTime+dur);src.connect(g).connect(audioCtx.destination);src.start();}
function hitSound(power=1,blocked=false){noise(.035+.03*power,blocked?.025:.05+.02*power);beep(blocked?180:90+power*45,.04,.035,'sawtooth');}
function startMusic(){stopMusic(); if(!audioCtx)return; let beat=0;musicTimer=setInterval(()=>{if(paused||!gameView.classList.contains('active'))return; const f=beat%4===0?82:beat%2===0?98:110;beep(f,.055,.018,'triangle'); if(beat%8===4)noise(.025,.008);beat++;},240);}
function stopMusic(){if(musicTimer){clearInterval(musicTimer);musicTimer=null;}}

function setDirection(dir,on,sourceEl){
  if(input[dir]===on)return;
  const now=performance.now();
  input[dir]=on; if(sourceEl)sourceEl.classList.toggle('on',on);
  if(on && !heldSince[dir])heldSince[dir]=now;
  if(!on){if((dir==='left'||dir==='right')&&heldSince[dir])releasedCharge[dir]={ms:now-heldSince[dir],t:now};heldSince[dir]=0;}
  recordDirection(now);
}
function recordDirection(now){
  const d=directionToken(); if(d!==lastDirection){lastDirection=d;if(d!=='neutral'){inputBuffer.push({t:now,d});inputBuffer=inputBuffer.filter(x=>now-x.t<900).slice(-14);}}
}
function directionToken(){const h=input.right?1:input.left?-1:0,v=input.down?1:input.up?-1:0;if(!h&&!v)return'neutral';if(v===1&&h===1)return'df';if(v===1&&h===-1)return'db';if(v===-1&&h===1)return'uf';if(v===-1&&h===-1)return'ub';return h===1?'f':h===-1?'b':v===1?'d':'u';}
function relativeToken(tok,f){if(f.facing===1)return tok;return ({f:'b',b:'f',df:'db',db:'df',uf:'ub',ub:'uf'}[tok]||tok);}
function recentRelative(f,ms=650){const now=performance.now();return inputBuffer.filter(x=>now-x.t<ms).map(x=>relativeToken(x.d,f));}
function endsWithSeq(arr,seq){let j=seq.length-1;for(let i=arr.length-1;i>=0&&j>=0;i--){if(arr[i]===seq[j])j--;}return j<0;}

function attackPress(btn){
  attackPressedTimes[btn]=performance.now(); $(`[data-atk="${btn}"]`)?.classList.add('on');
  if(!player || !player.canAct(performance.now()))return;
  tryStartAttack(player,btn,false);
}
function attackRelease(btn){$(`[data-atk="${btn}"]`)?.classList.remove('on');}

function tryStartAttack(f,btn,ai=false){
  const now=performance.now(); if(!f.canAct(now))return false;
  const seq=ai?[]:recentRelative(f,850);
  const isPunch=btn.endsWith('P'), isKick=btn.endsWith('K');
  const strength=btn[0];
  if(!ai && f.meter>=100 && (btn==='HP'||btn==='HK') && (endsWithSeq(seq,['d','df','f','d','df','f'])||endsWithSeq(seq,['d','f','d','f']))){f.meter=0;startMove(f,{...specials.super,name:f.meta.specials[3]},btn);beep(480,.18,.08,'sawtooth');return true;}
  if(!ai && isPunch && (endsWithSeq(seq,['f','d','df'])||endsWithSeq(seq,['f','d','f']))){startMove(f,{...specials.rising,name:f.meta.specials[1]},btn);return true;}
  if(!ai && isPunch && (endsWithSeq(seq,['d','df','f'])||endsWithSeq(seq,['d','f']))){startMove(f,{...specials.projectile,name:f.meta.specials[0]},btn);return true;}
  if(!ai && isKick && (endsWithSeq(seq,['d','db','b'])||endsWithSeq(seq,['d','b']))){startMove(f,{...specials.spin,name:f.meta.specials[2]},btn);return true;}
  if(!ai && isKick){
    const backKey=f.facing===1?'left':'right', fwdKey=f.facing===1?'right':'left';
    const rel=releasedCharge[backKey]; const forwardHeld=input[fwdKey];
    if(forwardHeld && rel.ms>650 && now-rel.t<420){releasedCharge[backKey]={ms:0,t:0};startMove(f,{...specials.dash,name:'Rush Kick'},btn);return true;}
  }
  const forwardHeld=ai?false:(f.facing===1?input.right:input.left);
  if(forwardHeld && btn==='HP' && Math.abs(f.x-(f===player?cpu:player).x)<95){startThrow(f);return true;}
  if(forwardHeld && btn==='MP'){startMove(f,{...normalMoves.stand.MP,name:'Overhead Chop',damage:9,type:'overhead',startup:13,recovery:17,reach:108,knock:16},btn);return true;}
  const stance=f.air?'jump':f.crouch?'crouch':'stand';
  startMove(f,{...normalMoves[stance][btn]},btn); return true;
}
function startMove(f,m,btn){f.move={...m,btn,start:performance.now(),hitIds:new Set()};f.moveHit=false;f.moveHits=0;f.state=m.super?'super':m.special?'special':'attack';f.lastAttackAt=performance.now();if(m.super){for(let i=0;i<18;i++)particles.push(makeParticle(f.x,f.y-190,f.meta.accent,3));}}
function startThrow(f){f.move={name:'Clinch Throw',btn:'THROW',start:performance.now(),startup:3,active:8,recovery:28,damage:15,reach:92,y:170,h:180,knock:75,meter:14,type:'throw',knockdown:true,throw:true,hitIds:new Set()};f.state='attack';}

function playerUpdate(now,dt){
  if(!player)return;
  const opp=cpu; player.facing=player.x<=opp.x?1:-1;
  if(now<player.knockdownUntil){player.state='knockdown';return;}
  if(now<player.hitStunUntil){player.state='hit';return;}
  if(now<player.blockStunUntil){player.state='block';return;}
  if(player.move){updateMove(player,opp,now);return;}
  player.crouch=input.down && !player.air;
  const away=player.facing===1?input.left:input.right; player.blocking=away&&!player.air;
  if(player.blocking){if(!player.chargeBackStart)player.chargeBackStart=now;}else if(!away)player.chargeBackStart=0;
  if(input.up && !player.air && state==='fight'){player.air=true;player.vy=-690;player.state='jump';beep(190,.035,.018,'triangle');}
  const sp=260*player.meta.speed;
  if(!player.air && !player.crouch && state==='fight'){if(input.left)player.vx=-sp;else if(input.right)player.vx=sp;else player.vx*=.72;} else player.vx*=.90;
  if(player.crouch)player.state=player.blocking?'block':'crouch';else if(player.air)player.state='jump';else if(Math.abs(player.vx)>20)player.state='walk';else if(player.blocking)player.state='block';else player.state='idle';
  physics(player,dt);
}

function cpuUpdate(now,dt){
  if(!cpu)return; const opp=player; cpu.facing=cpu.x<=opp.x?1:-1;
  if(now<cpu.knockdownUntil){cpu.state='knockdown';physics(cpu,dt);return;}
  if(now<cpu.hitStunUntil){cpu.state='hit';physics(cpu,dt);return;}
  if(now<cpu.blockStunUntil){cpu.state='block';physics(cpu,dt);return;}
  if(cpu.move){updateMove(cpu,opp,now);physics(cpu,dt);return;}
  const diff=Math.max(.15,cpu.meta.ai||0), dist=Math.abs(cpu.x-opp.x);
  cpu.blocking=false;cpu.crouch=false;
  if(mode==='training'){cpu.vx=0;cpu.state='idle';if(cpu.health<35)cpu.health=100;physics(cpu,dt);return;}
  if(now>aiNextThink){
    aiNextThink=now+130+Math.random()*260*(1-diff*.55);
    const playerThreat=opp.move&&dist<(opp.move.reach||100)+75;
    if(playerThreat && Math.random()<.35+diff*.5){cpu.blocking=true;cpu.crouch=opp.move.type==='low' || Math.random()<.28;cpu.vx=0;cpu.state='block';cpu.blockStunUntil=Math.max(cpu.blockStunUntil,now+120);}
    else if(dist>310){
      if(Math.random()<.13+diff*.20 && cpu.meter<95){startMove(cpu,{...specials.projectile,name:cpu.meta.specials[0]},'MP');}
      else {cpu.vx=(opp.x>cpu.x?1:-1)*(170+diff*85)*cpu.meta.speed;cpu.state='walk';}
    } else if(dist>150){
      const r=Math.random();
      if(r<.12*diff && !cpu.air){cpu.air=true;cpu.vy=-650;cpu.vx=(opp.x>cpu.x?1:-1)*150;cpu.state='jump';}
      else if(r<.28+diff*.18){const choices=['MK','HK','MP'];tryStartAttack(cpu,choices[(Math.random()*choices.length)|0],true);}
      else {cpu.vx=(opp.x>cpu.x?1:-1)*(120+diff*80);cpu.state='walk';}
    } else {
      const r=Math.random();
      if(r<.08+diff*.08){startThrow(cpu);}
      else if(r<.20+diff*.18){startMove(cpu,{...specials.spin,name:cpu.meta.specials[2]},'MK');}
      else if(r<.26+diff*.16){startMove(cpu,{...specials.rising,name:cpu.meta.specials[1]},'MP');}
      else {const choices=['LP','MP','HP','LK','MK','HK'];tryStartAttack(cpu,choices[(Math.random()*choices.length)|0],true);}
    }
    if(cpu.meter>=100 && dist<190 && Math.random()<.16*diff){cpu.meter=0;startMove(cpu,{...specials.super,name:cpu.meta.specials[3]},'HP');}
  }
  physics(cpu,dt);
}

function physics(f,dt){
  const sec=dt/1000;
  f.x+=f.vx*sec;
  if(f.air){f.vy+=1650*sec;f.y+=f.vy*sec;if(f.y>=FLOOR){f.y=FLOOR;f.vy=0;f.air=false;if(!f.move)f.state='idle';}}
  f.x=Math.max(105,Math.min(W-105,f.x));
  if(player&&cpu){const dx=cpu.x-player.x;if(Math.abs(dx)<115 && !player.air && !cpu.air){const push=(115-Math.abs(dx))/2;player.x-=Math.sign(dx)*push;cpu.x+=Math.sign(dx)*push;player.x=Math.max(90,player.x);cpu.x=Math.min(W-90,cpu.x);}}
}

function updateMove(f,opp,now){
  const m=f.move; if(!m)return; const e=(now-m.start)/(1000/60); const total=m.startup+m.active+m.recovery;
  if(m.super && e<m.startup+8)opp.invulnUntil=Math.min(opp.invulnUntil,now);
  if(m.name==='Rising Strike'||m.name===f.meta.specials[1]){if(e>m.startup-1&&e<m.startup+m.active){f.air=true;f.vy=Math.min(f.vy,-340);f.y-=3.5;}}
  if(m.name==='Rush Kick'){if(e>m.startup-2&&e<m.startup+m.active)f.x+=f.facing*7.5;}
  if(m.super){if(e>m.startup&&e<m.startup+m.active)f.x+=f.facing*4.2;}
  if(m.name==='Projectile'||m.name===f.meta.specials[0]){if(e>=m.startup&&!m.spawned){m.spawned=true;spawnProjectile(f,m);}}
  if(e>=m.startup && e<m.startup+m.active && !(m.name==='Projectile'||m.name===f.meta.specials[0])) checkHit(f,opp,m,now,e);
  if(e>=total){f.move=null;f.state=f.air?'jump':'idle';f.moveHit=false;}
}

function spawnProjectile(f,m){
  projectiles.push({owner:f,x:f.x+f.facing*80,y:f.y-180,vx:f.facing*(460+50*f.meta.speed),r:24,damage:m.damage+((m.btn==='HP')?3:0),type:'mid',color:f.meta.accent,born:performance.now(),life:1800,hit:false});beep(260,.08,.045,'sawtooth');
}

function attackHitbox(f,m){
  const h=m.h||100, yOffset=m.y||170, reach=m.reach||90, x=f.x+f.facing*(52+reach*.48);
  return {x:x-(reach/2),y:f.y-yOffset-h/2,w:reach,h};
}
function hurtbox(f){const h=f.crouch?210:330,w=f.crouch?105:115;return{x:f.x-w/2,y:f.y-h,w,h};}
function overlap(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;}

function checkHit(att,vic,m,now,e){
  if(now<vic.invulnUntil || m.hitIds?.has(vic))return;
  const hb=attackHitbox(att,m), vb=hurtbox(vic); if(!overlap(hb,vb))return;
  const maxHits=m.multi||1; if(m.moveHits>=maxHits)return;
  const interval=m.multi?Math.max(4,m.active/m.multi):999; if(m.lastConnectFrame!=null && e-m.lastConnectFrame<interval)return;
  m.lastConnectFrame=e;m.moveHits++;
  if(!m.multi || m.moveHits>=maxHits)m.hitIds?.add(vic);
  applyHit(att,vic,m,now);
}

function canBlock(vic,att,type){
  const away=vic===player ? (vic.facing===1?input.left:input.right) : vic.blocking;
  if(!away || vic.air || type==='throw')return false;
  if(type==='low')return vic.crouch;
  if(type==='overhead')return !vic.crouch;
  return true;
}

function applyHit(att,vic,m,now){
  const blocked=canBlock(vic,att,m.type); const power=att.meta.power||1; const defense=vic.meta.defense||1;
  if(blocked){const dmg=Math.max(1,Math.round(m.damage*.12*power/defense));vic.health-=dmg;vic.blockStunUntil=now+frame(5+m.damage*.7);vic.state='block';vic.vx+=att.facing*(m.knock||8)*2;att.meter=Math.min(100,att.meter+(m.meter||5)*.45);vic.meter=Math.min(100,vic.meter+4);spawnSpark(vic.x-att.facing*35,vic.y-185,'#79d7ff',9);hitSound(.5,true);return;}
  const dmg=Math.max(1,Math.round(m.damage*power/defense)); vic.health-=dmg; att.meter=Math.min(100,att.meter+(m.meter||5)); vic.meter=Math.min(100,vic.meter+Math.max(3,dmg*.45));
  const stun=frame(6+dmg*.55);vic.hitStunUntil=now+stun;vic.state='hit';vic.vx+=att.facing*(m.knock||12)*4.4;
  if(m.knockdown){vic.knockdownUntil=now+650+Math.min(450,dmg*18);vic.hitStunUntil=vic.knockdownUntil;}
  if(vic.comboUntil>now)att.combo=(att.combo||1)+1;else att.combo=1;vic.comboUntil=now+900;att.comboUntil=now+900;
  if(att===player){score+=Math.round(dmg*120*(1+(att.combo-1)*.18));}
  const sx=vic.x-att.facing*38,sy=vic.y-(m.type==='low'?85:190);spawnSpark(sx,sy,m.super?'#ffe450':att.meta.accent,18+m.damage);for(let i=0;i<Math.min(14,4+dmg);i++)particles.push(makeParticle(sx,sy,att.meta.accent,1.5+Math.random()*2.5));
  hitSound(Math.min(2,dmg/8)); if(m.super)beep(640,.12,.06,'square');
  if(vic.health<=0){vic.health=0;state='roundEnd';roundBanner='K.O.!';bannerUntil=now+2100;beep(80,.35,.09,'sawtooth');setTimeout(()=>resolveRound(att===player),1500);}
}

function spawnSpark(x,y,color,size){sparks.push({x,y,color,size,born:performance.now(),life:230});}
function makeParticle(x,y,color,mul=1){return{x,y,color,vx:(Math.random()-.5)*340*mul,vy:(Math.random()-.7)*280*mul,born:performance.now(),life:300+Math.random()*380,r:2+Math.random()*4};}

function resolveRound(playerWon){
  if(mode==='training'){player.health=100;cpu.health=100;state='fight';timer=99;return;}
  if(matchOverHandled)return;matchOverHandled=true;
  if(playerWon)playerRounds++;else cpuRounds++;
  if(playerWon)score+=2500+timer*25;
  if(playerRounds>=2){state='matchEnd';roundBanner=`${player.meta.name.toUpperCase()} WINS`;bannerUntil=performance.now()+1800;setTimeout(advanceOpponent,1600);}
  else if(cpuRounds>=2){state='matchEnd';roundBanner=`${cpu.meta.name.toUpperCase()} WINS`;bannerUntil=performance.now()+1800;setTimeout(endRun,1500);}
  else {roundNumber++;setTimeout(()=>beginRound(false),900);}
}

function updateProjectiles(now,dt){
  for(const p of projectiles){p.x+=p.vx*dt/1000;if(p.hit)continue;const vic=p.owner===player?cpu:player;const hb={x:p.x-p.r,y:p.y-p.r,w:p.r*2,h:p.r*2};if(vic&&overlap(hb,hurtbox(vic))){p.hit=true;applyHit(p.owner,vic,{damage:p.damage,knock:16,meter:10,type:p.type,knockdown:false},now);}}
  projectiles=projectiles.filter(p=>!p.hit&&now-p.born<p.life&&p.x>-60&&p.x<W+60);
}

function updateEffects(now,dt){for(const p of particles){p.x+=p.vx*dt/1000;p.y+=p.vy*dt/1000;p.vy+=720*dt/1000;}particles=particles.filter(p=>now-p.born<p.life);sparks=sparks.filter(s=>now-s.born<s.life);}

function processRoundTimer(now){
  if(state==='intro'&&now>=fightStartAt){state='fight';roundBanner='FIGHT!';bannerUntil=now+700;beep(300,.08,.06);setTimeout(()=>beep(440,.12,.07),85);}
  if(state!=='fight'||mode==='training'||paused)return;
  if(now-lastTimerTick>=1000){const ticks=Math.floor((now-lastTimerTick)/1000);timer=Math.max(0,timer-ticks);lastTimerTick+=ticks*1000;if(timer===0){state='roundEnd';const win=player.health>=cpu.health;roundBanner=win?'TIME — YOU WIN':'TIME — CPU WINS';bannerUntil=now+1800;setTimeout(()=>resolveRound(win),1200);}}
}

function loop(now){
  const dt=Math.min(32,Math.max(0,now-lastFrame));lastFrame=now;
  if(gameView.classList.contains('active')){
    pollGamepad();
    if(!paused){processRoundTimer(now); if(['fight','intro','roundEnd','matchEnd'].includes(state)){playerUpdate(now,dt);cpuUpdate(now,dt);updateProjectiles(now,dt);updateEffects(now,dt);}}
    draw(now);
    raf=requestAnimationFrame(loop);
  }
}

function draw(now){
  ctx.clearRect(0,0,W,H);drawStage(now);drawProjectiles(now);drawFighter(player,now);drawFighter(cpu,now);drawEffects(now);drawHUD(now);if(now<bannerUntil)drawBanner(roundBanner,now);
  if(mode==='training')drawTrainingHint();
}

function drawStage(now){
  const idx=Math.min(5,currentOpponentIndex); const themes=[['#16213b','#43182d','#f44b3d'],['#11223f','#162d52','#42a5ff'],['#12261e','#2f4c2c','#5fdb83'],['#251926','#4d2b12','#ffc24c'],['#24111d','#5a1624','#ff334f'],['#101d2d','#1f4158','#71d4ff']];const [top,mid,accent]=themes[idx];
  const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,top);g.addColorStop(.52,mid);g.addColorStop(1,'#07090f');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  // ceiling lights
  for(let i=0;i<8;i++){const x=90+i*160;const rg=ctx.createRadialGradient(x,60,2,x,60,180);rg.addColorStop(0,accent+'99');rg.addColorStop(1,'transparent');ctx.fillStyle=rg;ctx.fillRect(x-180,0,360,340);ctx.fillStyle='#e9f4ff';ctx.fillRect(x-8,42,16,7);}
  // gym structure and bags
  ctx.strokeStyle='rgba(210,226,255,.16)';ctx.lineWidth=5;for(let x=70;x<W;x+=170){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,FLOOR-40);ctx.stroke();}
  ctx.fillStyle='rgba(5,7,12,.76)';for(let x=125;x<W;x+=235){ctx.fillRect(x,165,40,220);ctx.beginPath();ctx.arc(x+20,385,20,0,Math.PI*2);ctx.fill();ctx.strokeStyle=accent+'80';ctx.lineWidth=3;ctx.strokeRect(x,165,40,220);}
  // banners
  ctx.fillStyle='rgba(7,10,18,.82)';ctx.fillRect(430,118,420,115);ctx.strokeStyle=accent;ctx.lineWidth=3;ctx.strokeRect(430,118,420,115);ctx.textAlign='center';ctx.fillStyle='#fff';ctx.font='900 58px system-ui';ctx.fillText('FKBC',640,177);ctx.font='700 17px system-ui';ctx.fillStyle='#cbd8e8';ctx.fillText('FEATHERSTONE KICKBOXING CLUB',640,207);
  // crowd silhouettes
  ctx.fillStyle='rgba(0,0,0,.42)';for(let i=0;i<44;i++){const x=(i*31+(i%3)*9)%W,y=470+(i%4)*7;ctx.beginPath();ctx.arc(x,y-35,11+(i%4),0,Math.PI*2);ctx.fill();ctx.fillRect(x-13,y-26,26,55);}
  // ring/floor
  const fg=ctx.createLinearGradient(0,450,0,H);fg.addColorStop(0,'rgba(13,19,28,.15)');fg.addColorStop(1,'#080a0f');ctx.fillStyle=fg;ctx.fillRect(0,455,W,H-455);
  ctx.strokeStyle=accent+'55';ctx.lineWidth=3;for(let y=490;y<=FLOOR;y+=46){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
  ctx.strokeStyle='rgba(255,255,255,.07)';for(let x=0;x<W;x+=120){ctx.beginPath();ctx.moveTo(x,455);ctx.lineTo(640+(x-640)*1.45,H);ctx.stroke();}
  ctx.font='1000 86px system-ui';ctx.fillStyle='rgba(255,255,255,.07)';ctx.textAlign='center';ctx.fillText('FKBC',640,675);
  const vignette=ctx.createRadialGradient(640,350,200,640,350,770);vignette.addColorStop(.55,'transparent');vignette.addColorStop(1,'rgba(0,0,0,.62)');ctx.fillStyle=vignette;ctx.fillRect(0,0,W,H);
}

function drawFighter(f,now){
  if(!f)return; const im=images[f.id]; const m=f.move; let x=f.x,y=f.y,w=220,h=440,rot=0,sx=1,sy=1,lean=0;
  if(f.crouch&&!f.air){sy=.73;h=390;y+=20;}
  if(f.state==='walk')lean=f.vx*f.facing>0?-.035:.035;
  if(f.state==='block'){x-=f.facing*10;lean=-f.facing*.08;sx=.95;}
  if(f.state==='hit'){rot=-f.facing*.12;x+=Math.sin(now*.09)*4;}
  if(f.state==='knockdown'){rot=-f.facing*1.25;sy=.82;y-=22;}
  if(m){const e=(now-m.start)/(1000/60),p=Math.min(1,e/(m.startup+m.active+m.recovery));
    if(m.throw){lean=f.facing*.12;x+=f.facing*18;}
    else if(m.super){x+=f.facing*Math.sin(Math.min(1,p)*Math.PI)*56;lean=f.facing*.12;}
    else if(m.name===f.meta.specials[1]||m.name==='Rising Strike'){lean=-f.facing*.12;rot=f.facing*.05;}
    else if(m.btn?.endsWith('K')){lean=-f.facing*.10;x+=f.facing*Math.sin(Math.min(1,p)*Math.PI)*30;rot=-f.facing*.035;}
    else {lean=f.facing*.06;x+=f.facing*Math.sin(Math.min(1,p)*Math.PI)*22;}
  }
  ctx.save();ctx.translate(x,y);ctx.scale(f.facing,1);ctx.rotate(rot+lean); if(f.paletteShift)ctx.filter=`hue-rotate(${f.paletteShift}deg)`;
  const alpha=(now<f.invulnUntil&&Math.floor(now/50)%2)?0.5:1;ctx.globalAlpha=alpha;
  if(im){ctx.drawImage(im,-w/2,-h,w,h);}else{ctx.fillStyle=f.meta.accent;ctx.fillRect(-55,-300,110,300);}
  // Extra animated striking limbs are rendered procedurally so each normal has visible motion, not a static card-slide.
  if(m){const e=(now-m.start)/(1000/60),active=e>=m.startup&&e<m.startup+m.active;if(active){const reach=m.reach||110;ctx.save();ctx.globalAlpha=.96;ctx.lineCap='round';if(m.btn?.endsWith('P')||m.throw){ctx.strokeStyle='#d99a73';ctx.lineWidth=m.super?34:27;ctx.beginPath();ctx.moveTo(18,-250);ctx.lineTo(Math.min(185,62+reach),-232);ctx.stroke();ctx.strokeStyle='#f5f5f5';ctx.lineWidth=m.super?27:21;ctx.beginPath();ctx.moveTo(Math.min(168,55+reach),-232);ctx.lineTo(Math.min(195,72+reach),-232);ctx.stroke();}else if(m.btn?.endsWith('K')){const yy=m.type==='low'?-98:-155;ctx.strokeStyle='#0b0d12';ctx.lineWidth=m.super?46:38;ctx.beginPath();ctx.moveTo(8,-142);ctx.lineTo(Math.min(205,58+reach),yy);ctx.stroke();ctx.strokeStyle=f.meta.accent;ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(30,-140);ctx.lineTo(Math.min(188,52+reach),yy+2);ctx.stroke();ctx.fillStyle='#111722';ctx.beginPath();ctx.ellipse(Math.min(215,70+reach),yy,27,14,0,0,Math.PI*2);ctx.fill();}ctx.restore();}}
  ctx.filter='none';ctx.globalAlpha=1;
  // procedural limb/action effects make attacks read clearly instead of just sliding the render
  if(m){const e=(now-m.start)/(1000/60),active=e>=m.startup&&e<m.startup+m.active;if(active){ctx.globalCompositeOperation='screen';ctx.strokeStyle=f.meta.accent;ctx.lineWidth=m.super?18:10;ctx.globalAlpha=m.super?.65:.34;ctx.beginPath();if(m.btn?.endsWith('K')){ctx.arc(0,-155,150,-.8,.8);}else{ctx.moveTo(20,-245);ctx.lineTo(155,-228);}ctx.stroke();ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';}}
  ctx.restore();
  // shadow
  ctx.save();ctx.globalAlpha=.3;ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(f.x,FLOOR+4,f.air?48:78,f.air?8:16,0,0,Math.PI*2);ctx.fill();ctx.restore();
}

function drawProjectiles(now){for(const p of projectiles){const pulse=1+Math.sin(now*.02)*.14;const rg=ctx.createRadialGradient(p.x,p.y,2,p.x,p.y,p.r*2.1);rg.addColorStop(0,'#fff');rg.addColorStop(.2,p.color);rg.addColorStop(1,'transparent');ctx.fillStyle=rg;ctx.beginPath();ctx.arc(p.x,p.y,p.r*2.1*pulse,0,Math.PI*2);ctx.fill();ctx.strokeStyle=p.color;ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(p.x-p.vx*.08,p.y);ctx.lineTo(p.x,p.y);ctx.stroke();}}
function drawEffects(now){for(const s of sparks){const p=(now-s.born)/s.life;ctx.save();ctx.translate(s.x,s.y);ctx.strokeStyle=s.color;ctx.lineWidth=Math.max(1,6*(1-p));ctx.globalAlpha=1-p;for(let i=0;i<8;i++){const a=i*Math.PI/4+0.2;ctx.beginPath();ctx.moveTo(Math.cos(a)*8,Math.sin(a)*8);ctx.lineTo(Math.cos(a)*s.size*(1+p*1.5),Math.sin(a)*s.size*(1+p*1.5));ctx.stroke();}ctx.restore();}for(const p of particles){const a=1-(now-p.born)/p.life;ctx.globalAlpha=Math.max(0,a);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;}

function drawHUD(now){
  if(!player||!cpu)return;
  ctx.save();ctx.fillStyle='rgba(5,8,15,.72)';ctx.fillRect(0,0,W,114);ctx.strokeStyle='rgba(255,255,255,.12)';ctx.beginPath();ctx.moveTo(0,114);ctx.lineTo(W,114);ctx.stroke();
  drawPortrait(player,20,12,80,80,false);drawPortrait(cpu,W-100,12,80,80,true);
  ctx.font='900 25px system-ui';ctx.fillStyle='#fff';ctx.textAlign='left';ctx.fillText(player.meta.name.toUpperCase(),112,32);ctx.textAlign='right';ctx.fillText(cpu.meta.name.toUpperCase(),W-112,32);
  drawBar(112,46,430,30,player.health/100,'#f4d23c',false);drawBar(W-542,46,430,30,cpu.health/100,'#f4d23c',true);
  drawBar(112,82,330,14,player.meter/100,'#28b9ff',false);drawBar(W-442,82,330,14,cpu.meter/100,'#28b9ff',true);
  ctx.textAlign='center';ctx.fillStyle='#ffd43d';ctx.font='1000 54px system-ui';ctx.fillText(String(timer).padStart(2,'0'),W/2,58);ctx.fillStyle='#fff';ctx.font='900 16px system-ui';ctx.fillText(`ROUND ${roundNumber}`,W/2,85);
  drawRoundPips(525,94,playerRounds,'left');drawRoundPips(755,94,cpuRounds,'right');
  ctx.textAlign='left';ctx.fillStyle='#56c8ff';ctx.font='900 13px system-ui';ctx.fillText('SUPER',450,94);ctx.textAlign='right';ctx.fillText('SUPER',830,94);
  if(player.combo>1&&player.comboUntil>now){ctx.textAlign='left';ctx.font='1000 37px system-ui';ctx.fillStyle='#ffd84a';ctx.fillText(`${player.combo} HIT COMBO`,28,166);}
  ctx.textAlign='center';ctx.font='900 16px system-ui';ctx.fillStyle='rgba(255,255,255,.9)';ctx.fillText(`SCORE ${score.toLocaleString()}  •  ${mode==='training'?'TRAINING':`OPPONENT ${currentOpponentIndex+1}/6`}`,W/2,706);
  ctx.restore();
}
function drawPortrait(f,x,y,w,h,mirror){const im=images[f.id];ctx.save();ctx.beginPath();ctx.roundRect(x,y,w,h,8);ctx.clip();ctx.fillStyle='#111b2d';ctx.fillRect(x,y,w,h);if(im){ctx.translate(mirror?x+w:x,y);ctx.scale(mirror?-1:1,1);ctx.drawImage(im,-w*.18,0,w*1.36,h*2.4);}ctx.restore();ctx.strokeStyle=f.meta.accent;ctx.lineWidth=3;ctx.strokeRect(x,y,w,h);}
function drawBar(x,y,w,h,val,color,reverse){val=Math.max(0,Math.min(1,val));ctx.fillStyle='#060911';ctx.fillRect(x,y,w,h);ctx.strokeStyle='#8798b2';ctx.lineWidth=2;ctx.strokeRect(x,y,w,h);ctx.fillStyle=color;const fw=(w-6)*val;ctx.fillRect(reverse?x+w-3-fw:x+3,y+3,fw,h-6);}
function drawRoundPips(x,y,n,align){for(let i=0;i<2;i++){ctx.beginPath();ctx.arc(x+(align==='left'?i*22:-i*22),y,7,0,Math.PI*2);ctx.fillStyle=i<n?'#ff3158':'#1d2739';ctx.fill();ctx.strokeStyle='#dbe7f7';ctx.lineWidth=1.5;ctx.stroke();}}
function drawBanner(text,now){if(!text)return;const left=Math.max(0,bannerUntil-now),alpha=Math.min(1,left/220);ctx.save();ctx.globalAlpha=Math.max(.2,alpha);ctx.textAlign='center';ctx.font='1000 italic 74px system-ui';ctx.lineWidth=12;ctx.strokeStyle='rgba(0,0,0,.82)';ctx.strokeText(text,W/2,330);const g=ctx.createLinearGradient(400,250,850,360);g.addColorStop(0,'#ffe04b');g.addColorStop(.5,'#ff6b2d');g.addColorStop(1,'#ff3158');ctx.fillStyle=g;ctx.fillText(text,W/2,330);ctx.restore();}
function drawTrainingHint(){ctx.save();ctx.fillStyle='rgba(5,8,15,.7)';ctx.fillRect(450,122,380,35);ctx.fillStyle='#fff';ctx.font='700 14px system-ui';ctx.textAlign='center';ctx.fillText('TRAINING: practise normals, motion specials, throws and super combos',640,145);ctx.restore();}

function pressDirElement(el){const d=el.dataset.dir;const down=e=>{e.preventDefault();setDirection(d,true,el);};const up=e=>{e.preventDefault();setDirection(d,false,el);};el.addEventListener('pointerdown',down);el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);el.addEventListener('pointerleave',e=>{if(e.buttons===0)up(e)});}
$$('.dir').forEach(pressDirElement);
const dpadEl=$('.dpad');
let dpadPointer=null;
function updateDpadPointer(e){const r=dpadEl.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,dx=(e.clientX-cx)/(r.width/2),dy=(e.clientY-cy)/(r.height/2),dead=.18;setDirection('left',dx<-dead,$('[data-dir="left"]'));setDirection('right',dx>dead,$('[data-dir="right"]'));setDirection('up',dy<-dead,$('[data-dir="up"]'));setDirection('down',dy>dead,$('[data-dir="down"]'));}
dpadEl.addEventListener('pointerdown',e=>{e.preventDefault();dpadPointer=e.pointerId;try{dpadEl.setPointerCapture(e.pointerId)}catch{}updateDpadPointer(e);});
dpadEl.addEventListener('pointermove',e=>{if(e.pointerId===dpadPointer)updateDpadPointer(e);});
function releaseDpad(e){if(dpadPointer!==null&&(!e||e.pointerId===dpadPointer)){dpadPointer=null;['left','right','up','down'].forEach(d=>setDirection(d,false,$(`[data-dir="${d}"]`)));}}
dpadEl.addEventListener('pointerup',releaseDpad);dpadEl.addEventListener('pointercancel',releaseDpad);
$$('.atk').forEach(el=>{const b=el.dataset.atk;el.addEventListener('pointerdown',e=>{e.preventDefault();attackPress(b)});['pointerup','pointercancel','pointerleave'].forEach(ev=>el.addEventListener(ev,e=>{if(ev!=='pointerleave'||e.buttons===0)attackRelease(b)}));});

const keyMap={ArrowLeft:['dir','left'],ArrowRight:['dir','right'],ArrowUp:['dir','up'],ArrowDown:['dir','down'],a:['atk','LP'],s:['atk','MP'],d:['atk','HP'],z:['atk','LK'],x:['atk','MK'],c:['atk','HK']};
window.addEventListener('keydown',e=>{if(e.repeat)return;const k=keyMap[e.key];if(k&&gameView.classList.contains('active')){e.preventDefault();if(k[0]==='dir')setDirection(k[1],true,$(`[data-dir="${k[1]}"]`));else attackPress(k[1]);}if(e.key==='Escape'&&gameView.classList.contains('active'))togglePause();});
window.addEventListener('keyup',e=>{const k=keyMap[e.key];if(k&&gameView.classList.contains('active')){e.preventDefault();if(k[0]==='dir')setDirection(k[1],false,$(`[data-dir="${k[1]}"]`));else attackRelease(k[1]);}});

let gpPrev={};
function pollGamepad(){const gps=navigator.getGamepads?.()||[];const gp=[...gps].find(Boolean);if(!gp)return;const dirStates={left:(gp.axes[0]||0)<-.45||gp.buttons[14]?.pressed,right:(gp.axes[0]||0)>.45||gp.buttons[15]?.pressed,up:(gp.axes[1]||0)<-.45||gp.buttons[12]?.pressed,down:(gp.axes[1]||0)>.45||gp.buttons[13]?.pressed};for(const [d,v] of Object.entries(dirStates)){if(gpPrev['d'+d]!==v)setDirection(d,v,$(`[data-dir="${d}"]`));gpPrev['d'+d]=v;}const map=[['LP',0],['MP',2],['HP',5],['LK',1],['MK',3],['HK',4]];for(const [b,i] of map){const v=!!gp.buttons[i]?.pressed;if(v&&!gpPrev[b])attackPress(b);if(!v&&gpPrev[b])attackRelease(b);gpPrev[b]=v;}if(gp.buttons[9]?.pressed&&!gpPrev.pause)togglePause();gpPrev.pause=!!gp.buttons[9]?.pressed;}

window.addEventListener('blur',()=>{if(gameView.classList.contains('active')&&!paused)togglePause();});
window.addEventListener('contextmenu',e=>{if(gameView.classList.contains('active'))e.preventDefault();});

preload().then(()=>{buildFighterGrid(); if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});});
})();
