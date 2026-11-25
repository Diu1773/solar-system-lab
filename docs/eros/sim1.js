(function(){
'use strict';
const {Store,toast,Stepper,Plot,bodyFlux,binaryFlux,renderBody,renderBinary,hm}=Eros;
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
  if(best!==hover){hover=best;drawNight();document.getElementById('readout').textContent=best>=0?`세계시 ${hm(T[best]).replace('시간','시')} · 밝기 ${M[best].toFixed(3)} 등급`:'빨간 A·B 선을 끌어 극대에 맞추기'}});
cv.addEventListener('pointerup',()=>{drag=null;save({A:cur.A,B:cur.B})});
document.querySelectorAll('[data-nudge]').forEach(b=>b.onclick=()=>{const [k,s]=b.dataset.nudge.split(',');cur[k]=+(cur[k]+(+s)/60).toFixed(4);drawNight();save({A:cur.A,B:cur.B})});
const bind=(id,key,num)=>{const el=document.getElementById(id);if(st[key]!=null)el.value=st[key];el.oninput=()=>save({[key]:num?+el.value:el.value})};
bind('peaks','peaks',1);bind('amp','amp',1);bind('hypWhy','why');bind('exit0','exit0');bind('exit1','exit1');
const radio=(id,key)=>{const el=document.getElementById(id);if(st[key])(el.querySelector(`input[value="${st[key]}"]`)||{}).checked=true;el.onchange=()=>{save({[key]:el.querySelector('input:checked').value});updateGuess()}};
radio('shape','shape');radio('hyp','hyp');
function showSaved(){const s=Store.get().l1||{};document.getElementById('savedRead').textContent=s.dt?`기록됨: ${hm(s.dt)}`:''}
document.getElementById('saveRead').onclick=()=>{const dt=Math.abs(cur.B-cur.A);if(dt<.3){toast('두 선 사이가 너무 가깝습니다');return}save({dt});showSaved();updateGuess();toast('기록했습니다')};
showSaved();

/* step 2: three hypotheses, brightness number only */
const css=document.createElement('style');
css.textContent='.hyp3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:28px;margin-top:18px}.hyp3 canvas{width:100%;border-radius:4px}.hyp3 h3{margin:12px 0 4px;font-size:17px}.lum{display:flex;justify-content:space-between;align-items:baseline;border-bottom:1px solid var(--rule);padding:4px 0 8px}.lum span{color:var(--muted);font-size:14px}.lum strong{font-size:30px;font-weight:700;font-variant-numeric:tabular-nums}@media(max-width:900px){.hyp3{grid-template-columns:1fr}}';
document.head.appendChild(css);
const mA={mode:'sphere',dark:.35},mB={mode:'ellipsoid',ab:2.4,bc:1.05,theta:88};
const N=120,ph=[...Array(N)].map((_,i)=>i/N);
let mx=null;
function maxes(){if(mx)return mx;mx={A:Math.max(...ph.map(p=>bodyFlux(Object.assign({phase:p},mA)))),B:Math.max(...ph.map(p=>bodyFlux(Object.assign({phase:p},mB)))),C:Math.max(...ph.map(binaryFlux))};return mx}
const spin=document.getElementById('spin');
function drawHyp(){const p=+spin.value/360,m=maxes();document.getElementById('spinv').textContent=spin.value+'°';
  renderBody(document.getElementById('bA'),Object.assign({phase:p},mA));renderBody(document.getElementById('bB'),Object.assign({phase:p},mB));renderBinary(document.getElementById('bC'),p);
  document.getElementById('lA').textContent=Math.round(bodyFlux(Object.assign({phase:p},mA))/m.A*100);
  document.getElementById('lB').textContent=Math.round(bodyFlux(Object.assign({phase:p},mB))/m.B*100);
  document.getElementById('lC').textContent=Math.round(binaryFlux(p)/m.C*100)}
spin.oninput=drawHyp;
let timer=null;document.getElementById('play').onclick=e=>{if(timer){clearInterval(timer);timer=null;e.target.textContent='천천히 돌리기';return}e.target.textContent='멈춤';timer=setInterval(()=>{spin.value=(+spin.value+2)%361;drawHyp()},70)};
document.querySelectorAll('.hyp3 [data-k]').forEach(el=>{const k=el.dataset.k;
  if(el.tagName==='INPUT'){if(st[k]!=null)el.value=st[k];el.oninput=()=>save({[k]:+el.value})}
  else{if(st[k])(el.querySelector(`input[value="${st[k]}"]`)||{}).checked=true;el.onchange=()=>save({[k]:el.querySelector('input:checked').value})}});

/* step 3: summary */
function updateGuess(){const s=Store.get().l1||{};const g=document.getElementById('guess');const n={1:+s.nA||1,2:+s.nB||2,3:+s.nC||2}[s.hyp];
  if(s.dt&&s.hyp){const P=s.dt*n;save({guess:P});g.textContent=hm(P)}else g.textContent=s.dt?'2단계에서 가설을 고르세요':'1단계에서 시간을 기록하세요'}
function drawSum(){updateGuess();const s=Store.get().l1||{};const names={1:'① 무늬가 있는 공',2:'② 길쭉한 돌',3:'③ 쌍소행성'};
  const rows=[['극대 횟수',s.peaks??'—'],['밝기 차',s.amp!=null?s.amp+' 등급':'—'],['밝기 변화 양상',{smooth:'부드럽게',sharp:'갑자기'}[s.shape]||'—'],['극대 사이 시간',s.dt?hm(s.dt):'—'],['고른 가설',names[s.hyp]||'—']];
  document.getElementById('sum1').innerHTML=rows.map(r=>`<tr><th>${r[0]}</th><td>${r[1]}</td></tr>`).join('')}
document.getElementById('print1').onclick=()=>{const secs=[...document.querySelectorAll('section.step')];const was=secs.map(s=>s.hidden);secs.forEach(s=>s.hidden=false);window.print();secs.forEach((s,k)=>s.hidden=was[k])};

Stepper(document.getElementById('lesson'),i=>{
  if(i===0){night.resize();drawNight()}
  if(i===1)requestAnimationFrame(drawHyp);
  if(i===2)drawSum();
});
})();
