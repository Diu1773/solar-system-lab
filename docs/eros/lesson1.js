(function(){
'use strict';
const {Store,toast,Stepper,Plot,bodyFlux,renderBody,hm}=Eros;
const D=window.EROS_DATA, one=D.singleNight;
const base=Math.floor(one.jd[0]-0.5)+0.5;
const T=one.jd.map(j=>(j-base)*24), M=one.mag;
const st=Store.get().l1||{};

/* documentary scenes */
const film=document.getElementById('film'),scenes=[...film.querySelectorAll('.scene')],dots=document.getElementById('dots');
let sc=0;
scenes.forEach((_,i)=>{const b=document.createElement('button');b.type='button';b.setAttribute('aria-label',(i+1)+'번째 장면');b.onclick=()=>showScene(i);dots.appendChild(b)});
function showScene(i){sc=Math.max(0,Math.min(scenes.length-1,i));scenes.forEach((s,k)=>s.hidden=k!==sc);[...dots.children].forEach((d,k)=>d.setAttribute('aria-current',k===sc));
  document.getElementById('fprev').disabled=sc===0;document.getElementById('fnext').textContent=sc===scenes.length-1?'소행성 사진 보러 가기 →':'다음 장면 →';if(scenes[sc].querySelector('#teaser'))teaser.resize(),drawTeaser()}
document.getElementById('fprev').onclick=()=>showScene(sc-1);
document.getElementById('fnext').onclick=()=>{if(sc===scenes.length-1)stepper.show(1);else showScene(sc+1)};
document.getElementById('fs').onclick=()=>{if(document.fullscreenElement)document.exitFullscreen();else film.requestFullscreen&&film.requestFullscreen()};
document.addEventListener('keydown',e=>{if(stepper.current!==0||e.target.matches('input,textarea'))return;if(e.key==='ArrowRight'||e.key==='PageDown'){showScene(sc+1);e.preventDefault()}if(e.key==='ArrowLeft'||e.key==='PageUp'){showScene(sc-1);e.preventDefault()}});

const yr=[Math.max(...M)+.08,Math.min(...M)-.08];
const teaser=new Plot(document.getElementById('teaser'),{invertY:false,xlabel:'세계시 (시)',ylabel:'밝기 (등급)',yfmt:y=>(+y.toFixed(1)).toString()});
teaser.setRange(5,11.25,yr[0],yr[1]);
function drawTeaser(){teaser.layers=[(g,p)=>p.points(T,M,'#141414',2.6)];teaser.draw()}

/* step 1: one night with two cursors */
const night=new Plot(document.getElementById('night'),{xlabel:'1975년 1월 23일 세계시 (시)',ylabel:'밝기 (등급) · 위로 갈수록 밝음',yfmt:y=>(+y.toFixed(1)).toString(),xstep:.5});
night.setRange(5,11.25,yr[0],yr[1]);
const cur={A:st.A??6.0,B:st.B??8.0};let hover=-1;
function drawNight(){
  night.layers=[(g,p)=>{
    p.points(T,M,'#1f4fa8',3);
    if(hover>=0){g.strokeStyle='#141414';g.lineWidth=1.5;g.beginPath();g.arc(p.X(T[hover]),p.Y(M[hover]),6,0,6.3);g.stroke()}
    g.fillStyle='rgba(20,20,20,.05)';g.fillRect(p.X(Math.min(cur.A,cur.B)),p.o.pad.t,Math.abs(p.X(cur.B)-p.X(cur.A)),p.h-p.o.pad.t-p.o.pad.b);
    p.vline(cur.A,'#b8322a','A',1.5);p.vline(cur.B,'#b8322a','B',1.5);
  }];night.draw();
  document.getElementById('dt').textContent=hm(cur.B-cur.A)+'  ('+(cur.B-cur.A).toFixed(2)+' h)';
}
let drag=null;const cv=night.c;
function px(e){const r=cv.getBoundingClientRect();return [e.clientX-r.left,e.clientY-r.top]}
cv.addEventListener('pointerdown',e=>{const [x]=px(e);const dA=Math.abs(x-night.X(cur.A)),dB=Math.abs(x-night.X(cur.B));drag=dA<dB?'A':'B';if(Math.min(dA,dB)>30){cur[drag]=+night.invX(x).toFixed(3)}cv.setPointerCapture(e.pointerId);drawNight()});
cv.addEventListener('pointermove',e=>{const [x,y]=px(e);
  if(drag){cur[drag]=Math.max(5,Math.min(11.25,+night.invX(x).toFixed(3)));drawNight();return}
  let best=-1,bd=144;for(let i=0;i<T.length;i++){const d=(night.X(T[i])-x)**2+(night.Y(M[i])-y)**2;if(d<bd){bd=d;best=i}}
  if(best!==hover){hover=best;drawNight();document.getElementById('readout').textContent=best>=0?`세계시 ${hm(T[best]).replace('시간','시')} · 밝기 ${M[best].toFixed(3)} 등급`:'그래프 위 점에 마우스를 올리면 시각과 밝기가 보입니다.'}});
cv.addEventListener('pointerup',()=>{drag=null;Store.merge('l1',{A:cur.A,B:cur.B})});
document.querySelectorAll('[data-nudge]').forEach(b=>b.onclick=()=>{const [k,s]=b.dataset.nudge.split(',');cur[k]=+(cur[k]+(+s)/60).toFixed(4);drawNight();Store.merge('l1',{A:cur.A,B:cur.B})});
const peaks=document.getElementById('peaks'),amp=document.getElementById('amp');
if(st.peaks!=null)peaks.value=st.peaks;if(st.amp!=null)amp.value=st.amp;
peaks.oninput=()=>Store.merge('l1',{peaks:+peaks.value});amp.oninput=()=>Store.merge('l1',{amp:+amp.value});
function showSaved(){const s=Store.get().l1||{};document.getElementById('savedRead').textContent=s.dt?`기록됨: ${hm(s.dt)} (${s.dt.toFixed(2)} h)`:''}
document.getElementById('saveRead').onclick=()=>{const dt=Math.abs(cur.B-cur.A);if(dt<.3){toast('두 선 사이가 너무 가깝습니다');return}Store.merge('l1',{dt});showSaved();updateGuess();toast('꼭대기 사이 시간을 기록했습니다')};
showSaved();

/* step 2: two hypotheses */
const N=73,ph=[...Array(N)].map((_,i)=>i/(N-1));
const modA={mode:'sphere',dark:.35},modB={mode:'ellipsoid',ab:2.4,bc:1.05,theta:88};
function curveOf(m){const f=ph.map(p=>bodyFlux(Object.assign({},m,{phase:p})));const mx=Math.max(...f);return f.map(v=>-2.5*Math.log10(v/mx))}
let cA=null,cB=null;
const pA=new Plot(document.getElementById('curveA'),{xlabel:'회전 (바퀴)',ylabel:'밝기',pad:{l:46,r:12,t:12,b:36},yfmt:y=>(+y.toFixed(1)).toString(),xstep:.25});
const pB=new Plot(document.getElementById('curveB'),{xlabel:'회전 (바퀴)',ylabel:'밝기',pad:{l:46,r:12,t:12,b:36},yfmt:y=>(+y.toFixed(1)).toString(),xstep:.25});
pA.setRange(0,1,1.25,-.1);pB.setRange(0,1,1.25,-.1);
const spin=document.getElementById('spin');
function drawHyp(){
  if(!cA){cA=curveOf(modA);cB=curveOf(modB)}
  const p=+spin.value/360;document.getElementById('spinv').textContent=spin.value+'°';
  renderBody(document.getElementById('bodyA'),Object.assign({phase:p,label:'관측자 쪽에서 본 모습'},modA));
  renderBody(document.getElementById('bodyB'),Object.assign({phase:p,label:'관측자 쪽에서 본 모습'},modB));
  for(const [P,c] of [[pA,cA],[pB,cB]]){P.layers=[(g,pl)=>{pl.line(ph,c,'#141414',2);pl.vline(p,'#b8322a',null,1);const i=Math.round(p*(N-1));g.fillStyle='#b8322a';g.beginPath();g.arc(pl.X(ph[i]),pl.Y(c[i]),4.5,0,6.3);g.fill()}];P.draw()}
}
spin.oninput=drawHyp;
let timer=null;document.getElementById('play').onclick=e=>{if(timer){clearInterval(timer);timer=null;e.target.textContent='회전 재생';return}e.target.textContent='멈춤';timer=setInterval(()=>{spin.value=(+spin.value+3)%361;drawHyp()},50)};
const hyp=document.getElementById('hyp'),why=document.getElementById('hypWhy');
if(st.hyp)hyp.querySelector(`input[value="${st.hyp}"]`).checked=true;if(st.why)why.value=st.why;
hyp.onchange=()=>{Store.merge('l1',{hyp:+hyp.querySelector('input:checked').value});updateGuess()};
why.oninput=()=>Store.merge('l1',{why:why.value});
function updateGuess(){const s=Store.get().l1||{};const g=document.getElementById('guess');
  if(s.dt&&s.hyp){const P=s.dt*s.hyp;Store.merge('l1',{guess:P});g.textContent=hm(P)+' ('+P.toFixed(2)+' h)'}else g.textContent=s.dt?'가설을 고르세요':'STEP 1에서 시간을 기록하세요'}
updateGuess();

/* step 3: summary */
const e1=document.getElementById('exit1'),e2=document.getElementById('exit2');
['exit0','q1','q2'].forEach(id=>{const el=document.getElementById(id);if(!el)return;if(st[id])el.value=st[id];el.oninput=()=>Store.merge('l1',{[id]:el.value})});
if(st.exit1)e1.value=st.exit1;if(st.exit2)e2.value=st.exit2;
e1.oninput=()=>Store.merge('l1',{exit1:e1.value});e2.oninput=()=>Store.merge('l1',{exit2:e2.value});
function drawSum(){const s=Store.get().l1||{};const rows=[['밝은 꼭대기 수',s.peaks??'—'],['밝기 차',s.amp!=null?s.amp+' 등급':'—'],['꼭대기 사이 시간',s.dt?hm(s.dt):'—'],['고른 가설',s.hyp?('가설 '+(s.hyp===1?'① 어두운 면이 있는 공':'② 길쭉한 돌')):'—'],['예측 자전주기',s.guess?hm(s.guess)+' ('+s.guess.toFixed(2)+' h)':'—']];
  document.getElementById('sum1').innerHTML=rows.map(r=>`<tr><th>${r[0]}</th><td>${r[1]}</td></tr>`).join('')}
document.getElementById('print1').onclick=()=>{document.querySelectorAll('section.step').forEach(s=>s.dataset.wasHidden=s.hidden);document.querySelectorAll('section.step').forEach((s,k)=>s.hidden=!(k>=1));window.print();document.querySelectorAll('section.step').forEach(s=>s.hidden=s.dataset.wasHidden==='true')};

const stepper=Stepper(document.getElementById('lesson'),i=>{
  if(i===0)showScene(sc);
  if(i===2){night.resize();drawNight()}
  if(i===3){[pA,pB].forEach(p=>p.resize());drawHyp();updateGuess()}
  if(i===4)drawSum();
});
showScene(0);
})();
