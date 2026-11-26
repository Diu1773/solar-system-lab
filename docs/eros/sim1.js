(function(){
'use strict';
const {Store,toast,Stepper,Plot,renderBody,shapeFlux,hm}=Eros;
const one=window.EROS_DATA.singleNight,base=Math.floor(one.jd[0]-0.5)+0.5;
const T=one.jd.map(j=>(j-base)*24),M=one.mag;
const st=Store.get().l1||{};
const save=p=>Store.merge('l1',p);

/* step 1: one night with two cursors */
const yr=[Math.max(...M)+.08,Math.min(...M)-.08];
const night=new Plot(document.getElementById('night'),{xlabel:'1975년 1월 23일 세계시 (시)',ylabel:'밝기 (등급) · 위가 밝음',yfmt:y=>(+y.toFixed(1)).toString(),xstep:.5});
night.setRange(5,11.25,yr[0],yr[1]);
const cur={A:st.A??6.0,B:st.B??8.0};let hover=-1;
function drawNight(){
  night.layers=[(g,p)=>{
    p.points(T,M,'#1f4fa8',3);
    if(hover>=0){g.strokeStyle='#141414';g.lineWidth=1.5;g.beginPath();g.arc(p.X(T[hover]),p.Y(M[hover]),6,0,6.3);g.stroke()}
    g.fillStyle='rgba(20,20,20,.05)';g.fillRect(p.X(Math.min(cur.A,cur.B)),p.o.pad.t,Math.abs(p.X(cur.B)-p.X(cur.A)),p.h-p.o.pad.t-p.o.pad.b);
    p.vline(cur.A,'#b8322a','A',1.5);p.vline(cur.B,'#b8322a','B',1.5);
  }];night.draw();
  document.getElementById('dt').textContent=hm(cur.B-cur.A);
}
const cv=night.c;let drag=null;
const px=e=>{const r=cv.getBoundingClientRect();return [e.clientX-r.left,e.clientY-r.top]};
cv.addEventListener('pointerdown',e=>{const [x]=px(e);const dA=Math.abs(x-night.X(cur.A)),dB=Math.abs(x-night.X(cur.B));drag=dA<dB?'A':'B';if(Math.min(dA,dB)>30)cur[drag]=+night.invX(x).toFixed(3);cv.setPointerCapture(e.pointerId);drawNight()});
cv.addEventListener('pointermove',e=>{const [x,y]=px(e);
  if(drag){cur[drag]=Math.max(5,Math.min(11.25,+night.invX(x).toFixed(3)));drawNight();return}
  let best=-1,bd=144;for(let i=0;i<T.length;i++){const d=(night.X(T[i])-x)**2+(night.Y(M[i])-y)**2;if(d<bd){bd=d;best=i}}
  if(best!==hover){hover=best;drawNight();document.getElementById('readout').textContent=best>=0?`세계시 ${hm(T[best]).replace('시간','시')} · 밝기 ${M[best].toFixed(3)} 등급`:'빨간 A·B 선을 끌어 극대에 맞추기.'}});
cv.addEventListener('pointerup',()=>{drag=null;save({A:cur.A,B:cur.B})});
document.querySelectorAll('[data-nudge]').forEach(b=>b.onclick=()=>{const [k,s]=b.dataset.nudge.split(',');cur[k]=+(cur[k]+(+s)/60).toFixed(4);drawNight();save({A:cur.A,B:cur.B})});
const bind=(id,key,num)=>{const el=document.getElementById(id);if(st[key]!=null)el.value=st[key];el.oninput=()=>{save({[key]:num?+el.value:el.value});updateGuess()}};
bind('peaks','peaks',1);bind('amp','amp',1);bind('hypWhy','why');bind('exit0','exit0');bind('exit1','exit1');bind('answer','answer');
const radio=(el,key)=>{if(st[key])(el.querySelector(`input[value="${st[key]}"]`)||{}).checked=true;el.addEventListener('change',()=>{save({[key]:el.querySelector('input:checked').value});updateGuess()})};
radio(document.getElementById('shape'),'shape');radio(document.getElementById('hyp'),'hyp');
function showSaved(){const s=Store.get().l1||{};document.getElementById('savedRead').textContent=s.dt?`기록됨: 극대 사이 ${hm(s.dt)}`:''}
document.getElementById('saveRead').onclick=()=>{const dt=Math.abs(cur.B-cur.A);if(dt<.3){toast('두 선 사이가 너무 가깝습니다');return}save({dt});showSaved();updateGuess();toast('기록했습니다')};
showSaved();

/* step 2: predict the light-curve profile for each shape, then check with the model */
const css=document.createElement('style');
css.textContent=`.hyp3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:28px;margin-top:18px}
.hyp3 .card3 canvas.body{width:100%;border-radius:4px}.hyp3 h3{margin:12px 0 6px;font-size:17px}
.opts{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:6px}
.opts label{border:1px solid var(--rule2);border-radius:6px;padding:6px;cursor:pointer;background:#fff;display:flex;flex-direction:column;align-items:center;gap:2px;font-size:12px;color:var(--ink2)}
.opts label:has(input:checked){border-color:var(--ink);background:var(--paper2);font-weight:650}
.opts input{position:absolute;opacity:0}.opts canvas{width:100%;height:46px}
.reveal3{margin-top:10px}.reveal3 .res{font-size:14px;margin-top:6px;font-weight:600}
@media(max-width:900px){.hyp3{grid-template-columns:1fr}}`;
document.head.appendChild(css);
const SHAPES=[{k:'spot',name:'무늬가 있는 둥근 소행성',opt:{mode:'sphere',dark:.35}},{k:'long',name:'길쭉한 소행성',opt:{mode:'ellipsoid',ab:2.4,bc:1.05}},{k:'peanut',name:'땅콩 모양 소행성',opt:{mode:'peanut'}}];
const PROFILES=[{k:'one',label:'극대 1번',f:p=>-Math.cos(2*Math.PI*p)},{k:'two',label:'극대 2번 · 고른 모양',f:p=>-Math.cos(4*Math.PI*p)},{k:'twodiff',label:'극대 2번 · 고르지 않은 모양',f:p=>-Math.cos(4*Math.PI*p)+.3*Math.sin(2*Math.PI*p)+.25*Math.cos(6*Math.PI*p+1)}];
const ANSWER={spot:'one',long:'two',peanut:'twodiff'};
const box=document.getElementById('hyp3');
box.innerHTML=SHAPES.map(s=>`<div class="card3" data-k="${s.k}"><canvas class="body" height="200"></canvas><h3>${s.name}</h3>
  <div class="note">예측: 한 바퀴 동안의 밝기 곡선</div>
  <div class="opts">${PROFILES.map(p=>`<label><input type="radio" name="pred-${s.k}" value="${p.k}"><canvas height="46" data-prof="${p.k}"></canvas>${p.label}</label>`).join('')}</div>
  <button class="btn sm" type="button" data-check="${s.k}" style="margin-top:10px">모형으로 확인</button>
  <div class="reveal3" hidden><canvas class="plot" height="140"></canvas><div class="res"></div></div></div>`).join('');
function drawThumb(c,prof){const dpr=devicePixelRatio||1,W=c.offsetWidth||90,H=46;c.width=W*dpr;c.height=H*dpr;const g=c.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,W,H);g.strokeStyle='#141414';g.lineWidth=1.6;g.beginPath();
  const pr=PROFILES.find(p=>p.k===prof);let lo=9,hi=-9;const ys=[];for(let i=0;i<=60;i++){const v=pr.f(i/60);ys.push(v);lo=Math.min(lo,v);hi=Math.max(hi,v)}
  ys.forEach((v,i)=>{const x=4+i/60*(W-8),y=H-6-(v-lo)/(hi-lo)*(H-12);i?g.lineTo(x,y):g.moveTo(x,y)});g.stroke()}
const curves={};const N=72,ph=[...Array(N+1)].map((_,i)=>i/N);
function curveOf(s){if(curves[s.k])return curves[s.k];const f=ph.map(p=>shapeFlux(Object.assign({phase:p,theta:88},s.opt)));const mx=Math.max(...f);return curves[s.k]=f.map(v=>-2.5*Math.log10(Math.max(v,1)/mx))}
const spin=document.getElementById('spin');
function drawBodies(){const p=+spin.value/360;document.getElementById('spinv').textContent=spin.value+'°';
  SHAPES.forEach(s=>{const card=box.querySelector(`[data-k="${s.k}"]`);renderBody(card.querySelector('canvas.body'),Object.assign({phase:p,theta:88,label:'지구 쪽에서 본 모습'},s.opt));
    const rv=card.querySelector('.reveal3');if(!rv.hidden&&rv._plot)drawCurve(s,rv)})}
function drawCurve(s,rv){const c=curveOf(s),p=+spin.value/360;const P=rv._plot;const lo=Math.max(...c);P.setRange(0,1,lo+.1,-.1);
  P.layers=[(g,pl)=>{pl.line(ph,c,'#141414',2);pl.vline(p,'#b8322a',null,1)}];P.draw()}
function reveal(k){const s=SHAPES.find(x=>x.k===k),card=box.querySelector(`[data-k="${k}"]`);const sel=card.querySelector('input:checked');
  if(!sel){toast('먼저 예측한 곡선을 고르세요');return}
  const rv=card.querySelector('.reveal3');rv.hidden=false;if(!rv._plot)rv._plot=new Plot(rv.querySelector('canvas'),{xlabel:'회전 (바퀴)',ylabel:'밝기',pad:{l:40,r:10,t:8,b:32},xstep:.25,yfmt:y=>(+y.toFixed(1)).toString()});
  rv._plot.resize();drawCurve(s,rv);const ok=sel.value===ANSWER[k];
  rv.querySelector('.res').textContent=(ok?'예측과 같음 · ':'예측과 다름 · ')+PROFILES.find(p=>p.k===ANSWER[k]).label;
  save({['pred_'+k]:sel.value,['ok_'+k]:ok,['seen_'+k]:true})}
box.querySelectorAll('[data-check]').forEach(b=>b.onclick=()=>reveal(b.dataset.check));
box.querySelectorAll('.opts input').forEach(inp=>{const k=inp.name.slice(5);if(st['pred_'+k]===inp.value)inp.checked=true;inp.onchange=()=>save({['pred_'+k]:inp.value})});
spin.oninput=drawBodies;
let timer=null;document.getElementById('play').onclick=e=>{if(timer){clearInterval(timer);timer=null;e.target.textContent='천천히 돌리기';return}e.target.textContent='멈춤';timer=setInterval(()=>{spin.value=(+spin.value+2)%361;drawBodies()},70)};

/* step 3 */
function updateGuess(){const s=Store.get().l1||{};const g=document.getElementById('guess');const n={spot:1,long:2,peanut:2}[s.hyp];
  if(s.dt&&n){const P=s.dt*n;save({guess:P});g.textContent=hm(P)}else g.textContent=s.dt?'모양을 고르세요':'1단계에서 시간을 기록하세요'}
function drawSum(){updateGuess();const s=Store.get().l1||{};
  const pr=k=>s['seen_'+k]?(s['ok_'+k]?'맞음':'다름'):'—';
  const rows=[['극대 횟수',s.peaks??'—'],['극대 사이 시간',s.dt?hm(s.dt):'—'],['밝기 차',s.amp!=null?s.amp+' 등급':'—'],['극대·극소 모양',{same:'서로 비슷함',diff:'서로 뚜렷이 다름'}[s.shape]||'—'],['예측 확인 (둥근·길쭉·땅콩)',`${pr('spot')} · ${pr('long')} · ${pr('peanut')}`]];
  document.getElementById('sum1').innerHTML=rows.map(r=>`<tr><th>${r[0]}</th><td>${r[1]}</td></tr>`).join('')}
document.getElementById('print1').onclick=()=>{const secs=[...document.querySelectorAll('section.step')];const was=secs.map(s=>s.hidden);secs.forEach(s=>s.hidden=false);window.print();secs.forEach((s,k)=>s.hidden=was[k])};

Stepper(document.getElementById('lesson'),i=>{
  if(i===0){night.resize();drawNight()}
  if(i===1)requestAnimationFrame(()=>{box.querySelectorAll('[data-prof]').forEach(c=>drawThumb(c,c.dataset.prof));drawBodies()});
  if(i===2)drawSum();
});
})();
