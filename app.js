(()=>{
'use strict';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const coaches=[
 {id:'gracie',name:'Gracie',style:'Speed Fighter',speed:1.18,power:.92,guard:.94,color:'#ff4b8d'},
 {id:'jack',name:'Jack',style:'Technical Striker',speed:1.10,power:1.00,guard:1.00,color:'#29a7ff'},
 {id:'john',name:'John',style:'Power Brawler',speed:.92,power:1.14,guard:1.05,color:'#31d57b'},
 {id:'justin',name:'Justin',style:'Counter Specialist',speed:1.00,power:1.05,guard:1.16,color:'#ffc343'},
 {id:'joe',name:'Joe',style:'Aggressive All-Rounder',speed:1.08,power:1.12,guard:1.05,color:'#ff4056'},
 {id:'paul',name:'Paul',style:'Final Boss · Tactical Veteran',speed:1.08,power:1.22,guard:1.18,color:'#72c8ff'}
];
const coachMap=Object.fromEntries(coaches.map(c=>[c.id,c]));
const appShell=$('#appShell'), gameShell=$('#gameShell');
let selectedFighter=null;

// ---------- navigation / geometry ----------
function showView(name){
  $$('.view').forEach(v=>v.classList.toggle('active',v.id===`view-${name}`));
  $$('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.view===name));
  scrollTo({top:0,behavior:'smooth'});
}
$$('[data-view]').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.view)));

// ---------- persistence ----------
const load=(k,fallback)=>{try{return JSON.parse(localStorage.getItem(k))??fallback}catch{return fallback}};
const save=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
let scores=load('fkbcScores',[
 {name:'KICKER',score:243420},{name:'GRACIEFAN',score:201100},{name:'FKCRICK',score:198750},{name:'KOMBATKID',score:176300}
]);
function renderScores(){
 scores=[...scores].sort((a,b)=>b.score-a.score).slice(0,5);save('fkbcScores',scores);
 $('#homeScores').innerHTML=scores.map((s,i)=>`<li><span>${i+1}</span><span>${escapeHtml(s.name)}</span><b>${s.score.toLocaleString()}</b></li>`).join('')||'<li><span>—</span><span>No scores yet</span><b>0</b></li>';
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}

// ---------- coaches ----------
function renderCoaches(){
 $('#coachGrid').innerHTML=coaches.map(c=>`<article class="coach-card"><img src="coach-${c.id}.png" alt="${c.name} FKBC fighter artwork"><div class="coach-copy"><h3>${c.name}</h3><p>${c.style}</p></div></article>`).join('');
 $('#sessionCoach').innerHTML=coaches.map(c=>`<option>${c.name}</option>`).join('');
 $('#fighterGrid').innerHTML=coaches.map(c=>`<button class="fighter-option" data-fighter="${c.id}"><img src="coach-${c.id}.png" alt="${c.name}"><span class="fighter-name">${c.name}<br><small>${c.style}</small></span></button>`).join('');
 $$('.fighter-option').forEach(btn=>btn.addEventListener('click',()=>{
   selectedFighter=btn.dataset.fighter; $$('.fighter-option').forEach(x=>x.classList.toggle('selected',x===btn)); $('#beginRun').disabled=false;
 }));
}

// ---------- sessions ----------
let sessions=load('fkbcSessions',[
 {time:'18:00',name:'Kids Class',coach:'Gracie',focus:'Fundamentals',mins:45},
 {time:'19:00',name:'Adult Techniques',coach:'Joe',focus:'Partner / Pad',mins:60},
 {time:'20:00',name:'Competition Prep',coach:'Paul',focus:'Sparring',mins:60}
]);
function renderSessions(){
 $('#sessionCount').textContent=`${sessions.length} scheduled`;
 $('#sessionList').innerHTML=sessions.map((s,i)=>`<div class="session-row"><div class="session-time">${s.time}</div><div><b>${escapeHtml(s.name)}</b><small>${escapeHtml(s.coach)} · ${escapeHtml(s.focus)} · ${s.mins} min</small></div><button data-del-session="${i}" aria-label="Remove session">×</button></div>`).join('');
 $$('[data-del-session]').forEach(b=>b.onclick=()=>{sessions.splice(+b.dataset.delSession,1);save('fkbcSessions',sessions);renderSessions()});
}
function addSession(){
 const n=$('#sessionName').value.trim()||'Class'; const mins=+$('#sessionMinutes').value; const coach=$('#sessionCoach').value; const focus=$('#sessionFocus').value;
 const base=18*60+sessions.length*60,hh=String(Math.floor(base/60)%24).padStart(2,'0'),mm=String(base%60).padStart(2,'0');
 sessions.push({time:`${hh}:${mm}`,name:n,coach,focus,mins});save('fkbcSessions',sessions);renderSessions();toast('Session added');
}
$('#saveSession').onclick=addSession; $('#addSession').onclick=()=>$('.form-panel').scrollIntoView({behavior:'smooth',block:'center'});

// ---------- lesson planner ----------
let plan=load('fkbcPlan',[{name:'Warm-up',mins:8},{name:'Line Work',mins:10},{name:'Partner / Pads',mins:12},{name:'Sparring',mins:10},{name:'Fitness',mins:5}]);
function renderPlan(){
 $('#planItems').innerHTML=plan.map((p,i)=>`<div class="plan-item"><b>${escapeHtml(p.name)}</b><input type="number" min="1" max="60" value="${p.mins}" data-plan-min="${i}" aria-label="${p.name} minutes"><button data-plan-del="${i}">×</button></div>`).join('');
 $$('[data-plan-min]').forEach(x=>x.onchange=()=>{plan[+x.dataset.planMin].mins=Math.max(1,Math.min(60,+x.value||1));renderPlan()});
 $$('[data-plan-del]').forEach(x=>x.onclick=()=>{plan.splice(+x.dataset.planDel,1);renderPlan()});
 $('#planTotal').textContent=`${plan.reduce((a,b)=>a+b.mins,0)} min`;
}
$$('[data-plan]').forEach(b=>b.onclick=()=>{plan.push({name:b.dataset.plan,mins:5});renderPlan()});
$('#savePlan').onclick=()=>{save('fkbcPlan',plan);toast('Lesson plan saved')};

// ---------- timer ----------
let timer={running:false,rest:false,round:1,left:180,id:null};
function resetTimer(){clearInterval(timer.id);timer={running:false,rest:false,round:1,left:+$('#roundSeconds').value||180,id:null};drawTimer()}
function drawTimer(){const m=Math.floor(timer.left/60),s=Math.max(0,timer.left%60);$('#timerDisplay').textContent=`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;$('#timerRound').textContent=`ROUND ${timer.round} / ${+$('#roundsInput').value||5}`;$('#timerState').textContent=timer.rest?'REST':timer.running?'WORK':'READY';$('#timerStart').textContent=timer.running?'Pause':'Start'}
function timerTick(){if(timer.left>0){timer.left--;drawTimer();return} const rounds=+$('#roundsInput').value||5;if(timer.rest){timer.rest=false;timer.round++;if(timer.round>rounds){clearInterval(timer.id);timer.running=false;timer.round=rounds;timer.left=0;$('#timerState').textContent='COMPLETE';tone('bell');return}timer.left=+$('#roundSeconds').value||180}else{if(timer.round>=rounds){clearInterval(timer.id);timer.running=false;$('#timerState').textContent='COMPLETE';tone('bell');return}timer.rest=true;timer.left=+$('#restSeconds').value||60}tone('bell');drawTimer()}
$('#timerStart').onclick=()=>{timer.running=!timer.running;if(timer.running){timer.id=setInterval(timerTick,1000)}else clearInterval(timer.id);drawTimer()};$('#timerReset').onclick=resetTimer;$('#timerSkip').onclick=()=>{timer.left=0;timerTick()};['roundsInput','roundSeconds','restSeconds'].forEach(id=>$('#'+id).onchange=resetTimer);

// ---------- arcade shell ----------
function openArcade(){
 gameShell.classList.add('active');gameShell.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';
 $('#fighterSelect').classList.remove('hidden');$('#fightView').classList.add('hidden');selectedFighter=null;$('#beginRun').disabled=true;$$('.fighter-option').forEach(x=>x.classList.remove('selected'));
 if(document.documentElement.requestFullscreen){document.documentElement.requestFullscreen({navigationUI:'hide'}).catch(()=>{})}
 if(screen.orientation?.lock)screen.orientation.lock('landscape').catch(()=>{});
}
function closeArcade(){
 game.stop();gameShell.classList.remove('active');gameShell.setAttribute('aria-hidden','true');document.body.style.overflow='';
 if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});
}
['playHero','scorePlay','toolArcade','arcadeNav'].forEach(id=>$('#'+id).addEventListener('click',openArcade));
$('#selectBack').onclick=closeArcade;$('#exitRotate').onclick=closeArcade;$('#gameExit').onclick=closeArcade;
$('#beginRun').onclick=()=>{if(!selectedFighter)return;$('#fighterSelect').classList.add('hidden');$('#fightView').classList.remove('hidden');game.start(selectedFighter)};

// ---------- fight engine ----------
const canvas=$('#fightCanvas'), ctx=canvas.getContext('2d',{alpha:false});
const imgs={};coaches.forEach(c=>{const im=new Image();im.src=`coach-${c.id}.png`;imgs[c.id]=im});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const ATTACKS={
 punch:{duration:.30,startup:.07,active:.10,range:145,damage:7,knock:22,meter:8},
 kick:{duration:.46,startup:.11,active:.13,range:190,damage:11,knock:36,meter:11},
 special:{duration:.68,startup:.16,active:.22,range:275,damage:19,knock:70,meter:0,cost:50}
};
function makeFighter(id,x,facing,isBoss=false){const c=coachMap[id];return{id,c,x,y:0,vx:0,vy:0,facing,hp:100,maxHp:100,meter:isBoss?35:20,state:'idle',attack:null,attackT:0,attackHit:false,block:false,crouch:false,hitT:0,ko:false,roundWins:0,combo:0,comboClock:0,speed:c.speed,power:c.power*(isBoss?1.03:1),guard:c.guard,ai:isBoss,aiClock:0,aiMove:0,afterimages:[]}}
const particles=[];
const game={
 running:false,paused:false,last:0,w:1280,h:720,ground:620,player:null,boss:null,bossIndex:0,score:0,time:99,roundNo:1,freeze:0,shake:0,messageCb:null,keys:new Set(),raf:0,
 resize(){const r=canvas.getBoundingClientRect(),d=Math.min(2,devicePixelRatio||1);canvas.width=Math.max(1,Math.round(r.width*d));canvas.height=Math.max(1,Math.round(r.height*d));this.dpr=d;this.w=r.width;this.h=r.height;this.ground=this.h*.84},
 start(playerId){this.stop();this.resize();this.running=true;this.paused=false;this.bossIndex=0;this.score=0;this.playerId=playerId;this.roundNo=1;this.player=makeFighter(playerId,this.w*.30,1,false);this.boss=makeFighter(coaches[0].id,this.w*.70,-1,true);this.player.roundWins=0;this.boss.roundWins=0;this.time=99;this.last=performance.now();this.intro(`ROUND 1`,`VS ${coaches[0].name.toUpperCase()}`,()=>this.loop(performance.now()))},
 stop(){this.running=false;cancelAnimationFrame(this.raf);this.keys.clear();particles.length=0},
 intro(title,text,cb){this.paused=true;showFightMessage('FKBC FIGHT ARCADE',title,text,'FIGHT!',()=>{hideFightMessage();this.paused=false;this.time=99;this.last=performance.now();cb?.()})},
 loop(t){if(!this.running)return;this.resize();let dt=Math.min(.033,(t-this.last)/1000||0);this.last=t;if(!this.paused){if(this.freeze>0)this.freeze-=dt;else this.update(dt)}this.draw(t/1000);this.raf=requestAnimationFrame(x=>this.loop(x))},
 update(dt){
   this.time=Math.max(0,this.time-dt);if(this.time<=0){this.endRound(this.player.hp>=this.boss.hp);return}
   const p=this.player,b=this.boss;
   p.block=this.keys.has('block');p.crouch=this.keys.has('down')&&!p.vy;
   if(!p.attack&&!p.hitT&&!p.ko){let dir=0;if(this.keys.has('left'))dir--;if(this.keys.has('right'))dir++;p.vx=dir*300*p.speed;if(dir)p.facing=p.x<b.x?1:-1;if(this.keys.has('up')&&Math.abs(p.vy)<1&&p.y===0){p.vy=-630;p.state='jump';tone('jump')}}else p.vx*=.65;
   this.updateAI(dt);
   [p,b].forEach(f=>this.updateFighter(f,dt));
   const minGap=Math.min(110,this.w*.07);if(Math.abs(p.x-b.x)<minGap&&p.y===0&&b.y===0){const mid=(p.x+b.x)/2;p.x=mid-minGap/2;b.x=mid+minGap/2}
   p.x=clamp(p.x,this.w*.12,this.w*.88);b.x=clamp(b.x,this.w*.12,this.w*.88);p.facing=p.x<b.x?1:-1;b.facing=b.x<p.x?1:-1;
   if(p.comboClock>0)p.comboClock-=dt;else p.combo=0;if(b.comboClock>0)b.comboClock-=dt;else b.combo=0;
   for(let i=particles.length-1;i>=0;i--){const q=particles[i];q.life-=dt;q.x+=q.vx*dt;q.y+=q.vy*dt;q.vy+=420*dt;if(q.life<=0)particles.splice(i,1)}
  },
  updateFighter(f,dt){
    if(f.hitT>0){f.hitT-=dt;f.state='hit'}
    if(f.attack){f.attackT+=dt;const a=ATTACKS[f.attack];if(f.attack==='special'&&f.attackT<a.duration*.7){f.afterimages.unshift({x:f.x,y:f.y,life:.22});f.afterimages=f.afterimages.slice(0,4)}
      if(!f.attackHit&&f.attackT>=a.startup&&f.attackT<=a.startup+a.active){this.resolveHit(f,f===this.player?this.boss:this.player,a)}
      if(f.attackT>=a.duration){f.attack=null;f.attackT=0;f.attackHit=false;f.state='idle'}
    }
    f.afterimages.forEach(x=>x.life-=dt);f.afterimages=f.afterimages.filter(x=>x.life>0);
    if(!f.attack&&f.hitT<=0&&!f.ko){f.x+=f.vx*dt;f.vx*=Math.pow(.02,dt);if(f.y!==0||f.vy!==0){f.vy+=1400*dt;f.y+=f.vy*dt;if(f.y>=0){f.y=0;f.vy=0;f.state='idle'}}else f.state=f.block?'block':f.crouch?'crouch':Math.abs(f.vx)>30?'walk':'idle'}
  },
  attack(f,type){if(!this.running||this.paused||f.attack||f.hitT>0||f.ko)return;if(type==='special'){if(f.meter<ATTACKS.special.cost)return;f.meter-=ATTACKS.special.cost;tone('special')}f.attack=type;f.attackT=0;f.attackHit=false;f.state=type},
  resolveHit(a,d,cfg){
   if(d.ko)return;const dist=Math.abs(a.x-d.x),vert=Math.abs(a.y-d.y);if(dist>cfg.range||vert>120)return;a.attackHit=true;
   const facingOk=(a.facing>0&&d.x>a.x)||(a.facing<0&&d.x<a.x);if(!facingOk)return;
   let dmg=cfg.damage*a.power;const blocked=d.block&&d.hitT<=0;if(blocked)dmg*=.26/d.guard;dmg=Math.max(1,dmg);d.hp=clamp(d.hp-dmg,0,100);d.hitT=blocked?.09:.22;d.vx=a.facing*cfg.knock*(blocked?.45:1);a.meter=clamp(a.meter+cfg.meter,0,100);d.meter=clamp(d.meter+dmg*.55,0,100);
   a.combo=a.comboClock>0?a.combo+1:1;a.comboClock=.72;if(a===this.player)this.score+=Math.round(dmg*120*(1+Math.min(6,a.combo)*.1));
   this.hitFx(d.x,d.y-this.ground*.34,blocked?coaches[this.bossIndex].color:'#fff2a8',blocked?8:15);this.shake=blocked?4:9;this.freeze=blocked?.025:.055;tone(blocked?'block':'hit');
   if(d.hp<=0){d.ko=true;d.state='ko';setTimeout(()=>this.endRound(a===this.player),420)}
  },
  hitFx(x,y,color,count){for(let i=0;i<count;i++){const ang=Math.random()*Math.PI*2,s=90+Math.random()*300;particles.push({x,y,vx:Math.cos(ang)*s,vy:Math.sin(ang)*s,life:.25+Math.random()*.35,color,size:2+Math.random()*5})}},
  updateAI(dt){const b=this.boss,p=this.player;if(!b||b.ko||this.paused)return;b.aiClock-=dt;const dist=Math.abs(b.x-p.x);if(b.aiClock<=0){const level=this.bossIndex; b.aiClock=Math.max(.08,.28-level*.025)+Math.random()*.18;const r=Math.random();b.block=false;b.crouch=false;
     if(p.attack&&dist<230&&r<.52+level*.05){b.block=true;b.aiMove=0;return}
     if(dist>210){b.aiMove=Math.sign(p.x-b.x)}else if(dist<100){b.aiMove=-Math.sign(p.x-b.x)*.6}else b.aiMove=0;
     if(dist<220&&r>.38){const useSpecial=b.meter>=50&&r>.86-level*.01;this.attack(b,useSpecial?'special':r>.64?'kick':'punch')}
     else if(r>.92&&b.y===0)b.vy=-560;
   }
   if(!b.attack&&!b.hitT&&!b.block){b.vx=b.aiMove*250*b.speed*(1+this.bossIndex*.025)}else b.vx*=.5;
  },
  endRound(playerWon){if(this.paused||!this.running)return;this.paused=true;const winner=playerWon?this.player:this.boss;winner.roundWins++;if(playerWon)this.score+=5000+Math.round(this.time*120)+Math.round(this.player.hp*50);
    const title=playerWon?'K.O.':'ROUND LOST';const text=playerWon?`${coaches[this.bossIndex].name} goes down.`:`${coaches[this.bossIndex].name} takes the round.`;
    if(winner.roundWins>=2){setTimeout(()=>this.endMatch(playerWon),160)}else{this.roundNo++;showFightMessage('ROUND RESULT',title,`${text} Score ${this.score.toLocaleString()}`,'Next round',()=>{hideFightMessage();this.resetRound();this.paused=false})}
  },
  endMatch(playerWon){const bossName=coaches[this.bossIndex].name;if(playerWon){if(this.bossIndex<coaches.length-1){this.bossIndex++;const next=coaches[this.bossIndex];showFightMessage('BOSS DEFEATED',`${bossName.toUpperCase()} DOWN`, `Next opponent: ${next.name} · ${next.style}`,'Next fight',()=>{hideFightMessage();this.player.roundWins=0;this.boss=makeFighter(next.id,this.w*.70,-1,true);this.boss.roundWins=0;this.roundNo=1;this.resetRound();this.paused=false;this.time=99})}else{this.score+=25000;showFightMessage('LADDER CLEARED','FKBC CHAMPION',`You defeated Paul. Final score ${this.score.toLocaleString()}.`,'Finish run',()=>this.finishRun(true))}}else{showFightMessage('GAME OVER',`${bossName.toUpperCase()} WINS`,`Final score ${this.score.toLocaleString()}.`,'Finish run',()=>this.finishRun(false))}},
  resetRound(){const pWins=this.player.roundWins,bWins=this.boss.roundWins;this.player=makeFighter(this.playerId,this.w*.30,1,false);this.player.roundWins=pWins;const bid=coaches[this.bossIndex].id;const oldBossWins=bWins;this.boss=makeFighter(bid,this.w*.70,-1,true);this.boss.roundWins=oldBossWins;this.time=99;particles.length=0},
  finishRun(champion){this.paused=true;hideFightMessage();const qualifies=scores.length<5||this.score>(scores[4]?.score||0);if(qualifies){$('#scoreDialogValue').textContent=this.score.toLocaleString();$('#playerName').value='';$('#highScoreDialog').showModal();$('#playerName').focus()}else{toast(`Run complete · ${this.score.toLocaleString()}`);closeArcade()}},
  draw(t){const d=this.dpr||1,w=this.w,h=this.h;ctx.setTransform(d,0,0,d,0,0);ctx.save();if(this.shake>0){ctx.translate((Math.random()-.5)*this.shake,(Math.random()-.5)*this.shake);this.shake*=.88;if(this.shake<.4)this.shake=0}this.drawStage(t);this.drawFighter(this.player,t,false);this.drawFighter(this.boss,t,true);this.drawParticles();this.drawHud();ctx.restore()},
  drawStage(t){const w=this.w,h=this.h,g=this.ground,c=coaches[this.bossIndex];const grad=ctx.createLinearGradient(0,0,0,h);grad.addColorStop(0,'#071425');grad.addColorStop(.52,'#18213a');grad.addColorStop(1,'#07090e');ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);
    // sunset windows
    const sun=ctx.createLinearGradient(0,h*.12,w,h*.55);sun.addColorStop(0,'#ec3c48');sun.addColorStop(.45,'#f69545');sun.addColorStop(1,'#2854a3');ctx.globalAlpha=.65;ctx.fillStyle=sun;ctx.fillRect(w*.18,h*.12,w*.64,h*.50);ctx.globalAlpha=1;
    ctx.fillStyle='#0a0f19';for(let i=0;i<10;i++)ctx.fillRect(w*(.18+i*.065),h*.12,Math.max(3,w*.006),h*.5);for(let j=0;j<4;j++)ctx.fillRect(w*.18,h*(.18+j*.105),w*.64,Math.max(3,h*.008));
    // gym silhouettes
    ctx.fillStyle='#070b11';for(let i=0;i<7;i++){const x=w*(.06+i*.15);ctx.fillRect(x,h*.20,w*.025,h*.46);ctx.beginPath();ctx.arc(x+w*.0125,h*.68,w*.025,0,Math.PI*2);ctx.fill()}
    // banners
    ctx.save();ctx.globalAlpha=.72;ctx.fillStyle='#0c1520';ctx.fillRect(w*.035,h*.18,w*.10,h*.40);ctx.fillRect(w*.865,h*.18,w*.10,h*.40);ctx.fillStyle=c.color;ctx.font=`900 ${Math.max(18,w*.025)}px system-ui`;ctx.textAlign='center';ctx.translate(w*.085,h*.38);ctx.rotate(-Math.PI/2);ctx.fillText('FKBC',0,0);ctx.restore();ctx.save();ctx.globalAlpha=.8;ctx.fillStyle=c.color;ctx.font=`900 italic ${Math.max(18,w*.022)}px system-ui`;ctx.textAlign='center';ctx.translate(w*.915,h*.38);ctx.rotate(Math.PI/2);ctx.fillText(c.name.toUpperCase(),0,0);ctx.restore();
    // floor
    const fg=ctx.createLinearGradient(0,g,0,h);fg.addColorStop(0,'#15111a');fg.addColorStop(1,'#05070a');ctx.fillStyle=fg;ctx.fillRect(0,g,w,h-g);ctx.strokeStyle='#3e2838';ctx.lineWidth=1;for(let y=g;y<h;y+=Math.max(20,h*.04)){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke()}for(let x=0;x<w;x+=Math.max(55,w*.06)){ctx.beginPath();ctx.moveTo(w/2+(x-w/2)*.35,g);ctx.lineTo(x,h);ctx.stroke()}
    // stage lights and glow
    ctx.globalCompositeOperation='lighter';for(let i=0;i<5;i++){const x=w*(.15+i*.175),beam=ctx.createLinearGradient(x,0,x,g);beam.addColorStop(0,c.color+'40');beam.addColorStop(1,'transparent');ctx.fillStyle=beam;ctx.beginPath();ctx.moveTo(x-w*.02,0);ctx.lineTo(x+w*.02,0);ctx.lineTo(x+w*.12,g);ctx.lineTo(x-w*.12,g);ctx.fill()}ctx.globalCompositeOperation='source-over';
    // logo floor
    ctx.save();ctx.translate(w/2,g+h*.05);ctx.rotate(-.05);ctx.textAlign='center';ctx.font=`1000 italic ${Math.max(36,w*.065)}px system-ui`;ctx.fillStyle='#ffffff12';ctx.fillText('FKBC',0,0);ctx.restore();
  },
  drawFighter(f,t,isBoss){if(!f)return;const img=imgs[f.id];const baseH=Math.min(this.h*.58,this.w*.30);const ratio=img.naturalWidth&&img.naturalHeight?img.naturalWidth/img.naturalHeight:.48;let dh=baseH,dw=dh*ratio;let x=f.x,y=this.ground+f.y;const bob=f.state==='idle'?Math.sin(t*5+(isBoss?1:0))*3:0;y+=bob;
    let lean=0,scaleY=1,scaleX=f.facing;let lunge=0;if(f.state==='crouch'){scaleY=.76;y+=baseH*.12}if(f.state==='punch'){const a=ATTACKS.punch,u=Math.sin(Math.min(1,f.attackT/a.duration)*Math.PI);lunge=u*38*f.facing;lean=f.facing*.05}if(f.state==='kick'){const a=ATTACKS.kick,u=Math.sin(Math.min(1,f.attackT/a.duration)*Math.PI);lunge=u*58*f.facing;lean=f.facing*.11}if(f.state==='special'){const a=ATTACKS.special,u=Math.sin(Math.min(1,f.attackT/a.duration)*Math.PI);lunge=u*96*f.facing;lean=f.facing*.13}if(f.state==='block'){lean=-f.facing*.08;scaleY=.96}if(f.state==='hit')lean=-f.facing*.12;if(f.ko){lean=-f.facing*1.15;scaleY=.85;y+=baseH*.20}
    for(const a of f.afterimages){ctx.save();ctx.globalAlpha=(a.life/.22)*.14;ctx.translate(a.x,y);ctx.scale(scaleX,scaleY);ctx.drawImage(img,-dw/2,-dh,dw,dh);ctx.restore()}
    ctx.save();ctx.translate(x+lunge,y);ctx.rotate(lean);ctx.scale(scaleX,scaleY);if(isBoss&&f.id===this.player?.id)ctx.filter='hue-rotate(85deg) saturate(1.25)';if(f.hitT>0&&Math.floor(f.hitT*45)%2===0)ctx.filter='brightness(2) saturate(.2)';if(f.state==='special'){ctx.shadowColor=isBoss?coaches[this.bossIndex].color:'#28c9ff';ctx.shadowBlur=30}ctx.drawImage(img,-dw/2,-dh,dw,dh);ctx.restore();
  },
  drawParticles(){for(const p of particles){ctx.globalAlpha=clamp(p.life/.5,0,1);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,p.size,p.size)}ctx.globalAlpha=1},
  drawHud(){const w=this.w,h=this.h,p=this.player,b=this.boss;if(!p||!b)return;const margin=Math.max(18,w*.025),gap=Math.max(100,w*.14),barY=Math.max(44,h*.07),barW=(w-gap-margin*2)/2,barH=Math.max(14,h*.026);ctx.save();ctx.font=`900 ${Math.max(12,w*.015)}px system-ui`;ctx.fillStyle='#fff';ctx.textAlign='left';ctx.fillText(coachMap[p.id].name.toUpperCase(),margin,barY-10);ctx.textAlign='right';ctx.fillText(coaches[this.bossIndex].name.toUpperCase()+` · BOSS ${this.bossIndex+1}`,w-margin,barY-10);this.bar(margin,barY,barW,barH,p.hp/100,'#41e49c',false);this.bar(w-margin-barW,barY,barW,barH,b.hp/100,'#ff3157',true);
    // round pips
    const pipR=7,py=barY+barH+15;for(let i=0;i<2;i++){ctx.beginPath();ctx.arc(margin+i*20,py,pipR,0,Math.PI*2);ctx.fillStyle=i<p.roundWins?'#ffd04d':'#111c27';ctx.fill();ctx.strokeStyle='#6b7c8a';ctx.stroke();ctx.beginPath();ctx.arc(w-margin-i*20,py,pipR,0,Math.PI*2);ctx.fillStyle=i<b.roundWins?'#ffd04d':'#111c27';ctx.fill();ctx.stroke()}
    ctx.textAlign='center';ctx.font=`1000 ${Math.max(28,w*.042)}px system-ui`;ctx.fillStyle='#ffd04d';ctx.strokeStyle='#7f241d';ctx.lineWidth=4;const time=String(Math.ceil(this.time)).padStart(2,'0');ctx.strokeText(time,w/2,barY+barH*.7);ctx.fillText(time,w/2,barY+barH*.7);ctx.font=`900 ${Math.max(10,w*.012)}px system-ui`;ctx.fillStyle='#cbd8e3';ctx.fillText(`ROUND ${this.roundNo} · FIRST TO 2`,w/2,barY+barH+21);
    const meterY=h-Math.max(24,h*.035),meterW=Math.min(w*.25,300),meterH=10;this.bar(margin,meterY,meterW,meterH,p.meter/100,'#21caff',false);this.bar(w-margin-meterW,meterY,meterW,meterH,b.meter/100,coaches[this.bossIndex].color,true);ctx.textAlign='left';ctx.fillStyle='#7fe1ff';ctx.font=`900 ${Math.max(9,w*.01)}px system-ui`;ctx.fillText('SUPER',margin,meterY-5);ctx.textAlign='right';ctx.fillText('SUPER',w-margin,meterY-5);
    if(p.combo>1&&p.comboClock>0){ctx.textAlign='left';ctx.font=`1000 italic ${Math.max(20,w*.028)}px system-ui`;ctx.fillStyle='#ffd04d';ctx.fillText(`${p.combo} HIT COMBO`,margin,h*.34)}ctx.restore()},
  bar(x,y,w,h,pct,color,reverse){ctx.fillStyle='#050b10';ctx.fillRect(x,y,w,h);ctx.strokeStyle='#d7e4ef55';ctx.lineWidth=2;ctx.strokeRect(x,y,w,h);const fill=(w-4)*clamp(pct,0,1);ctx.fillStyle=color;if(reverse)ctx.fillRect(x+w-2-fill,y+2,fill,h-4);else ctx.fillRect(x+2,y+2,fill,h-4)}
};

function showFightMessage(kicker,title,text,action,cb){$('#messageKicker').textContent=kicker;$('#messageTitle').textContent=title;$('#messageText').textContent=text;$('#messageAction').textContent=action;$('#fightMessage').classList.remove('hidden');game.messageCb=cb}
function hideFightMessage(){$('#fightMessage').classList.add('hidden');game.messageCb=null}
$('#messageAction').onclick=()=>game.messageCb?.();
$('#gamePause').onclick=()=>{if(!game.running)return;game.paused=!game.paused;if(game.paused)showFightMessage('PAUSED','FIGHT PAUSED','Resume when ready.','Resume',()=>{hideFightMessage();game.paused=false;game.last=performance.now()});else hideFightMessage()};

// touch controls
function ctl(name,down){if(!game.running)return; if(down)game.keys.add(name);else game.keys.delete(name);if(down&&['punch','kick','special'].includes(name))game.attack(game.player,name)}
$$('[data-control]').forEach(btn=>{const n=btn.dataset.control;const on=e=>{e.preventDefault();btn.classList.add('pressed');ctl(n,true)},off=e=>{e.preventDefault();btn.classList.remove('pressed');ctl(n,false)};btn.addEventListener('pointerdown',on);['pointerup','pointercancel','pointerleave'].forEach(ev=>btn.addEventListener(ev,off))});
const keyMap={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down',a:'left',d:'right',w:'up',s:'down',j:'punch',k:'kick',l:'block',i:'special'};
addEventListener('keydown',e=>{if(!gameShell.classList.contains('active')||e.target.matches('input,textarea,select'))return;const k=keyMap[e.key]||keyMap[e.key.toLowerCase?.()];if(k&&!e.repeat){e.preventDefault();ctl(k,true)}});addEventListener('keyup',e=>{const k=keyMap[e.key]||keyMap[e.key.toLowerCase?.()];if(k){e.preventDefault();ctl(k,false)}});
addEventListener('resize',()=>game.resize());

// high scores
$('#scoreForm').addEventListener('submit',e=>{if(e.submitter?.value==='cancel'){closeArcade();return}e.preventDefault();const name=$('#playerName').value.trim().toUpperCase().slice(0,12);if(!name)return;scores.push({name,score:game.score});renderScores();$('#highScoreDialog').close();toast('High score saved');closeArcade()});

// install
let deferred=null;addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e;$('#installBtn').classList.remove('hidden')});$('#installBtn').onclick=async()=>{if(!deferred)return;deferred.prompt();await deferred.userChoice;deferred=null;$('#installBtn').classList.add('hidden')};if('serviceWorker' in navigator)addEventListener('load',()=>navigator.serviceWorker.register('./sw.js'));

// simple impact audio (no samples required, offline-safe)
let ac;function tone(kind){try{ac??=new (window.AudioContext||window.webkitAudioContext)();const now=ac.currentTime;if(kind==='hit'||kind==='block'){const osc=ac.createOscillator(),g=ac.createGain();osc.type='sine';osc.frequency.setValueAtTime(kind==='hit'?110:150,now);osc.frequency.exponentialRampToValueAtTime(55,now+.08);g.gain.setValueAtTime(.045,now);g.gain.exponentialRampToValueAtTime(.001,now+.09);osc.connect(g).connect(ac.destination);osc.start(now);osc.stop(now+.1)}else if(kind==='bell'){const o=ac.createOscillator(),g=ac.createGain();o.type='triangle';o.frequency.value=660;g.gain.setValueAtTime(.035,now);g.gain.exponentialRampToValueAtTime(.001,now+.45);o.connect(g).connect(ac.destination);o.start();o.stop(now+.46)}else if(kind==='special'){const o=ac.createOscillator(),g=ac.createGain();o.type='sawtooth';o.frequency.setValueAtTime(100,now);o.frequency.exponentialRampToValueAtTime(220,now+.16);g.gain.setValueAtTime(.018,now);g.gain.exponentialRampToValueAtTime(.001,now+.2);o.connect(g).connect(ac.destination);o.start();o.stop(now+.21)}}catch{}}
let toastTimer;function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),1500)}

renderScores();renderCoaches();renderSessions();renderPlan();resetTimer();
})();
