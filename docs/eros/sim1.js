(function(){
'use strict';
const {Store,toast,Stepper,Plot,shapeFlux,hm}=Eros;
const one=window.EROS_DATA.singleNight,base=Math.floor(one.jd[0]-0.5)+0.5;
const T=one.jd.map(j=>(j-base)*24),M=one.mag;
const st=Store.get().l1||{};
const save=p=>Store.merge('l1',p);
const bind=(id,key,num)=>{const el=document.getElementById(id);if(!el)return;if(st[key]!=null)el.value=st[key];el.oninput=()=>{save({[key]:num?+el.value:el.value});updateGuess()}};

/* step 0 */
bind('first','first');

/* step 1: predict light-curve profile for each shape from real images, then check with the model */
const css=document.createElement('style');
css.textContent=`.hyp3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:28px;margin-top:20px}
.hyp3 .ph{background:#000;height:230px;display:flex;align-items:center;justify-content:center;overflow:hidden}
.hyp3 .ph img{max-width:100%;max-height:100%;object-fit:contain}
.hyp3 h3{margin:12px 0 2px;font-size:17px}.hyp3 .src{font-size:12px;color:var(--muted);margin-bottom:8px}
.opts{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:6px}
.opts label{border:1px solid var(--rule2);border-radius:6px;padding:6px;cursor:pointer;background:#fff;display:flex;flex-direction:column;align-items:center;gap:2px;font-size:12px;color:var(--ink2);text-align:center}
.opts label:has(input:checked){border-color:var(--ink);background:var(--paper2);font-weight:650}
.opts input{position:absolute;opacity:0}.opts canvas{width:100%;height:46px}
.reveal3{margin-top:10px}.reveal3 .res{font-size:14px;margin-top:6px;font-weight:650}
.cmp4{display:grid;grid-template-columns:1.3fr 1fr 1fr 1fr;gap:16px}.cmp4 .t{font-size:13.5px;font-weight:650;margin-bottom:4px}
.then{background:var(--paper2);border-radius:6px;padding:10px 12px}.then b{font-size:12.5px;color:var(--muted)}.then p{margin:4px 0 0;white-space:pre-wrap}
@media(max-width:900px){.hyp3,.cmp4{grid-template-columns:1fr}}`;
document.head.appendChild(css);
const SHAPES=[
  {k:'spot',name:'무늬가 있는 둥근 소행성',img:'media/ceres-rotation.gif',src:'세레스 자전 영상 · Dawn 탐사선, 2015 · NASA/JPL-Caltech/UCLA/MPS/DLR/IDA',opt:{mode:'sphere',dark:.6}},
  {k:'long',name:'길쭉한 소행성',img:'media/ida-rotation.jpg',src:'이다가 도는 모습(연속 사진) · Galileo 탐사선, 1993 · NASA/JPL',opt:{mode:'ellipsoid',ab:2.4,bc:1.05}},
  {k:'peanut',name:'땅콩 모양 소행성',img:'media/kleopatra.jpg',src:'클레오파트라를 여러 방향에서 본 모습 · VLT 망원경 · ESO/Vernazza, Marchis et al., CC BY 4.0',opt:{mode:'peanut'}}];
const PROFILES=[{k:'one',label:'극대 1번',f:p=>-Math.cos(2*Math.PI*p)},{k:'two',label:'극대 2번 · 고른 모양',f:p=>-Math.cos(4*Math.PI*p)},{k:'twodiff',label:'극대 2번 · 고르지 않은 모양',f:p=>-Math.cos(4*Math.PI*p)+.3*Math.sin(2*Math.PI*p)+.25*Math.cos(6*Math.PI*p+1)}];
const ANSWER={spot:'one',long:'two',peanut:'twodiff'};
const box=document.getElementById('hyp3');
box.innerHTML=SHAPES.map(s=>`<div class="card3" data-k="${s.k}"><div class="ph"><img src="${s.img}" alt="${s.name}의 실제 사진"></div><h3>${s.name}</h3><div class="src">${s.src}</div>
  <div class="note">예측: 이 모양이 한 바퀴 돌 때의 밝기 곡선</div>
  <div class="opts">${PROFILES.map(p=>`<label><input type="radio" name="pred-${s.k}" value="${p.k}"><canvas height="46" data-prof="${p.k}"></canvas>${p.label}</label>`).join('')}</div>
  <button class="btn sm" type="button" data-check="${s.k}" style="margin-top:10px">모형으로 확인</button>
  <div class="reveal3" hidden><canvas class="plot" height="140"></canvas><div class="res"></div></div></div>`).join('');
function drawThumb(c,prof){const dpr=devicePixelRatio||1,W=c.offsetWidth||90,H=46;c.width=W*dpr;c.height=H*dpr;const g=c.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,W,H);g.strokeStyle='#141414';g.lineWidth=1.6;g.beginPath();
  const pr=PROFILES.find(p=>p.k===prof);let lo=9,hi=-9;const ys=[];for(let i=0;i<=60;i++){const v=pr.f(i/60);ys.push(v);lo=Math.min(lo,v);hi=Math.max(hi,v)}
  ys.forEach((v,i)=>{const x=4+i/60*(W-8),y=H-6-(v-lo)/(hi-lo)*(H-12);i?g.lineTo(x,y):g.moveTo(x,y)});g.stroke()}
const curves={};const N=72,ph=[...Array(N+1)].map((_,i)=>i/N);
function curveOf(s){if(curves[s.k])return curves[s.k];const f=ph.map(p=>shapeFlux(Object.assign({phase:p,theta:88},s.opt)));const mx=Math.max(...f);return curves[s.k]=f.map(v=>-2.5*Math.log10(Math.max(v,1)/mx))}
const mkPlot=c=>new Plot(c,{xlabel:'회전 (바퀴)',ylabel:'밝기',pad:{l:40,r:10,t:8,b:32},xstep:.25,yfmt:y=>(+y.toFixed(1)).toString()});
function drawModel(P,s){const c=curveOf(s);P.setRange(0,1,Math.max(...c)+.1,-.1);P.layers=[(g,pl)=>pl.line(ph,c,'#141414',2)];P.draw()}
function reveal(k,quiet){const s=SHAPES.find(x=>x.k===k),card=box.querySelector(`[data-k="${k}"]`);const sel=card.querySelector('input:checked');
  if(!sel){if(!quiet)toast('먼저 예측한 곡선을 고르세요');return}
  const rv=card.querySelector('.reveal3');rv.hidden=false;if(!rv._plot)rv._plot=mkPlot(rv.querySelector('canvas'));
  rv._plot.resize();drawModel(rv._plot,s);const ok=sel.value===ANSWER[k];
  rv.querySelector('.res').textContent=(ok?'예측과 같음 · ':'예측과 다름 · ')+PROFILES.find(p=>p.k===ANSWER[k]).label;
  save({['pred_'+k]:sel.value,['ok_'+k]:ok,['seen_'+k]:true})}
box.querySelectorAll('[data-check]').forEach(b=>b.onclick=()=>reveal(b.dataset.check));
box.querySelectorAll('.opts input').forEach(inp=>{const k=inp.name.slice(5);if(st['pred_'+k]===inp.value)inp.checked=true;inp.onchange=()=>save({['pred_'+k]:inp.value})});

/* step 2: one night with two cursors */
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
bind('peaks','peaks',1);bind('amp','amp',1);bind('hypWhy','why');bind('answer','answer');bind('changed','changed');
const radio=(el,key)=>{if(st[key])(el.querySelector(`input[value="${st[key]}"]`)||{}).checked=true;el.addEventListener('change',()=>{save({[key]:el.querySelector('input:checked').value});updateGuess()})};
radio(document.getElementById('shape'),'shape');radio(document.getElementById('hyp'),'hyp');
function showSaved(){const s=Store.get().l1||{};document.getElementById('savedRead').textContent=s.dt?`기록됨: 극대 사이 ${hm(s.dt)}`:''}
document.getElementById('saveRead').onclick=()=>{const dt=Math.abs(cur.B-cur.A);if(dt<.3){toast('두 선 사이가 너무 가깝습니다');return}save({dt});showSaved();updateGuess();toast('기록했습니다')};
showSaved();

/* step 3: observation next to the three model curves; final answer next to the first thought */
const cmp=document.getElementById('cmp4');
cmp.innerHTML=`<div><div class="t">1975년 관측 (에로스)</div><canvas class="plot" height="150"></canvas></div>`+SHAPES.map(s=>`<div><div class="t">${s.name}</div><canvas class="plot" height="150"></canvas></div>`).join('');
let cmpPlots=null;
function drawCmp(){const cs=[...cmp.querySelectorAll('canvas')];
  if(!cmpPlots){cmpPlots=cs.map((c,i)=>i===0?new Plot(c,{xlabel:'세계시 (시)',ylabel:'밝기',pad:{l:40,r:10,t:8,b:32},xstep:1,yfmt:y=>(+y.toFixed(1)).toString()}):mkPlot(c))}
  cmpPlots.forEach(p=>p.resize());const p0=cmpPlots[0];p0.setRange(5,11.25,yr[0],yr[1]);p0.layers=[(g,pl)=>pl.points(T,M,'#1f4fa8',2)];p0.draw();
  SHAPES.forEach((s,i)=>drawModel(cmpPlots[i+1],s))}
function updateGuess(){const s=Store.get().l1||{};const g=document.getElementById('guess');const n={spot:1,long:2,peanut:2}[s.hyp];
  if(s.dt&&n){const P=s.dt*n;save({guess:P});g.textContent=hm(P)}else g.textContent=s.dt?'모양을 고르세요':'2단계에서 시간을 기록하세요'}
document.getElementById('print1').onclick=()=>{const secs=[...document.querySelectorAll('section.step')];const was=secs.map(s=>s.hidden);secs.forEach(s=>s.hidden=false);window.print();secs.forEach((s,k)=>s.hidden=was[k])};

Stepper(document.getElementById('lesson'),i=>{
  if(i===1)requestAnimationFrame(()=>{box.querySelectorAll('[data-prof]').forEach(c=>drawThumb(c,c.dataset.prof));SHAPES.forEach(s=>{if(st['seen_'+s.k])reveal(s.k,true)})});
  if(i===2){night.resize();drawNight()}
  if(i===3){drawCmp();updateGuess();const f=(Store.get().l1||{}).first;document.getElementById('firstShow').textContent=f||'(0단계에서 쓴 생각이 없음)'}
});
})();
