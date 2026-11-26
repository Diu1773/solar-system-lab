(function(){
'use strict';
const {Store,toast,Stepper,Plot,fourierFit,ellipsoidMag,renderBody,frac,download,hm}=Eros;
const D=window.EROS_DATA,C=window.NIGHT_COLORS;
const t=[],m=[],g=[];
D.nights.forEach((n,k)=>n.jd.forEach((j,i)=>{t.push((j-D.t0)*24);m.push(n.mag[i]-n.zero);g.push(k)}));
const Y0=Math.max(...m)+.08,Y1=Math.min(...m)-.08;
const NEAR={P:5.270,ab:34.4/11.2};
let S=Store.get().l2||{};
const save=p=>{S=Store.merge('l2',p)};
const yf=y=>(+y.toFixed(1)).toString();
const phases=Pv=>t.map(x=>frac(x/Pv));
function dots(gx,p,xs){for(let i=0;i<t.length;i++){gx.fillStyle=C[g[i]];gx.beginPath();gx.arc(p.X(xs[i]),p.Y(m[i]),2.3,0,6.3);gx.fill()}}
function drawFolded(plot,Pv,fit){const ph=phases(Pv),f=fourierFit(ph,m,4);plot.setRange(0,1,Y0,Y1);
  plot.layers=[(gx,p)=>{dots(gx,p,ph);if(fit){const xs=[],ys=[];for(let k=0;k<=200;k++){xs.push(k/200);ys.push(f.f(k/200))}p.line(xs,ys,'#141414',1.6)}}];plot.draw();return f.rms}
document.getElementById('legend').innerHTML=D.nights.map((n,k)=>{const d=n.date.split('.')[0].split('-');return `<span><i style="background:${C[k]}"></i>${+d[1]}월 ${+d[2]}일</span>`}).join('');

/* 1: period */
const fold=new Plot(document.getElementById('fold'),{xlabel:'위상',ylabel:'밝기 · 위가 밝음',xstep:.25,yfmt:yf});
const pS=document.getElementById('pSlider'),pN=document.getElementById('pNum'),pO=document.getElementById('pOut'),fitC=document.getElementById('showFit'),view=document.getElementById('view');
let P=S.P||4;
function drawP(){const isFold=view.querySelector('input:checked').value==='fold';const r=fourierFit(phases(P),m,4).rms;
  if(isFold){fold.o.xlabel='위상';fold.o.xstep=.25;drawFolded(fold,P,fitC.checked)}
  else{fold.o.xlabel='1월 19일 0시부터 지난 날';fold.o.xstep=1;fold.setRange(0,11,Y0,Y1);fold.layers=[(gx,p)=>dots(gx,p,t.map(x=>x/24))];fold.draw()}
  document.getElementById('rms').textContent=r.toFixed(3);return r}
function setP(v){P=Math.max(2,Math.min(8,+(+v).toFixed(4)));pS.value=P;pN.value=P.toFixed(3);pO.textContent=P.toFixed(3)+' h';save({P});return drawP()}
pS.oninput=()=>setP(pS.value);pN.onchange=()=>setP(pN.value);fitC.onchange=drawP;view.onchange=drawP;
document.querySelectorAll('[data-dp]').forEach(b=>b.onclick=()=>setP(P+(+b.dataset.dp)));
function drawLog(){document.getElementById('pLog').innerHTML=(S.logP||[]).map(r=>`<tr><td>${r.P.toFixed(3)}</td><td>${r.rms.toFixed(3)}</td></tr>`).join('')}
document.getElementById('recP').onclick=()=>{const r=setP(P);save({logP:(S.logP||[]).concat([{P,rms:r}]).slice(-8)});drawLog();toast(P.toFixed(3)+'시간 기록')};

/* 2: AI */
const prompt=`첨부한 CSV는 소행성 433 에로스를 1975년 1월 다섯 밤 동안 측광한 자료입니다.
열: night(밤 번호), date_UT, observers, JD_light_time_corrected(빛 도달 시간 보정 율리우스일), relative_mag(상대 등급, 작을수록 밝음). 밤마다 등급의 0점이 다를 수 있습니다.
에로스의 자전주기(시간)를 구하고, 방법과 후보 주기, 최종 값을 고른 근거를 설명해 주세요.`;
document.getElementById('prompt').value=prompt;
document.getElementById('copyPrompt').onclick=()=>navigator.clipboard&&navigator.clipboard.writeText(prompt).then(()=>toast('복사했습니다'),()=>toast('직접 선택해 복사하세요'));
const aiP=document.getElementById('aiP');if(S.aiP)aiP.value=S.aiP;
const opt={xlabel:'위상',ylabel:'밝기',pad:{l:46,r:12,t:10,b:34},xstep:.25,yfmt:yf};
const cmpA=new Plot(document.getElementById('cmpA'),opt),cmpB=new Plot(document.getElementById('cmpB'),Object.assign({},opt));
function drawCmp(){const a=+S.aiP||0;
  if(a>=1){const r=drawFolded(cmpA,a);document.getElementById('cmpALabel').textContent=`AI 주기 ${a.toFixed(3)} h · 흩어짐 ${r.toFixed(3)}`}
  else{cmpA.layers=[];cmpA.setRange(0,1,Y0,Y1);cmpA.draw();document.getElementById('cmpALabel').textContent='AI 주기를 넣으면 접힙니다'}
  const r2=drawFolded(cmpB,P);document.getElementById('cmpBLabel').textContent=`내가 찾은 주기 ${P.toFixed(3)} h · 흩어짐 ${r2.toFixed(3)}`}
const setAi=v=>{save({aiP:+v});aiP.value=(+v).toFixed(3);drawCmp()};
document.getElementById('foldAi').onclick=()=>{if(!(+aiP.value>=1)){toast('AI가 답한 주기를 넣으세요');return}setAi(aiP.value)};
document.getElementById('useLs').onclick=()=>setAi(2.632);
const judge=document.getElementById('judge');if(S.judge)(judge.querySelector(`input[value="${S.judge}"]`)||{}).checked=true;
judge.onchange=()=>save({judge:judge.querySelector('input:checked').value});
const jw=document.getElementById('judgeWhy');if(S.judgeWhy)jw.value=S.judgeWhy;jw.oninput=()=>save({judgeWhy:jw.value});

/* 3: model */
const mfit=new Plot(document.getElementById('mfit'),{xlabel:'위상',ylabel:'밝기 · 위가 밝음',pad:{l:50,r:12,t:12,b:38},xstep:.25,yfmt:yf});
const ctl={ab:document.getElementById('ab'),ph0:document.getElementById('ph0'),th:document.getElementById('th')};
const M0=S.model||{ab:1.5,ph0:0,th:85};Object.keys(ctl).forEach(k=>{if(M0[k]!=null)ctl[k].value=M0[k]});
let spinPh=0;
const modelPeriod=()=>{const p=S.P||P;return p<4?p*2:p};
function evalM(ab,th,ph0,ph){let s=0;const mod=new Float64Array(ph.length);for(let i=0;i<ph.length;i++){mod[i]=ellipsoidMag(frac(ph[i]+ph0),ab,1,th);s+=m[i]-mod[i]}const c=s/ph.length;let ss=0;for(let i=0;i<ph.length;i++){const d=m[i]-mod[i]-c;ss+=d*d}return {rms:Math.sqrt(ss/ph.length),c}}
function drawModel(){const Pm=modelPeriod(),ph=phases(Pm),v={ab:+ctl.ab.value,ph0:+ctl.ph0.value,th:+ctl.th.value};
  document.getElementById('abO').textContent=v.ab.toFixed(2);document.getElementById('ph0O').textContent=v.ph0.toFixed(3);document.getElementById('thO').textContent=v.th+'°';
  const r=evalM(v.ab,v.th,v.ph0,ph);document.getElementById('mrms').textContent=r.rms.toFixed(3);
  document.getElementById('mPeriod').textContent=`접는 주기 ${Pm.toFixed(3)} h`+((S.P||P)<4?' (1단계 값의 두 배)':'');
  mfit.setRange(0,1,Y0,Y1);
  mfit.layers=[(gx,p)=>{gx.globalAlpha=.7;dots(gx,p,ph);gx.globalAlpha=1;const xs=[],ys=[];for(let k=0;k<=240;k++){xs.push(k/240);ys.push(ellipsoidMag(frac(k/240+v.ph0),v.ab,1,v.th)+r.c)}p.line(xs,ys,'#b8322a',2.4);p.vline(spinPh,'rgba(20,20,20,.35)',null,1)}];
  mfit.draw();renderBody(document.getElementById('body'),{ab:v.ab,bc:1,theta:v.th,phase:frac(spinPh+v.ph0)});
  save({model:Object.assign(v,{rms:r.rms,P:Pm})});return r.rms}
Object.values(ctl).forEach(c=>c.oninput=drawModel);
document.getElementById('mfit').addEventListener('pointerdown',e=>{const r=e.target.getBoundingClientRect();spinPh=Math.max(0,Math.min(1,mfit.invX(e.clientX-r.left)));drawModel()});
let mt=null;document.getElementById('mplay').onclick=e=>{if(mt){clearInterval(mt);mt=null;e.target.textContent='회전 재생';return}e.target.textContent='멈춤';mt=setInterval(()=>{spinPh=frac(spinPh+.01);drawModel()},60)};
document.getElementById('recM').onclick=()=>{const r=drawModel();const v=S.model;save({logM:(S.logM||[]).concat([{ab:v.ab,th:v.th,ph0:v.ph0,rms:r}]).slice(-8)});toast(`a/b ${v.ab.toFixed(2)} 기록`)};
document.getElementById('autoFit').onclick=()=>{const ph=phases(modelPeriod()),th=+ctl.th.value;let b={rms:9};
  for(let ab=1;ab<=4.0001;ab+=.02)for(let p0=0;p0<1;p0+=.005){const r=evalM(ab,th,p0,ph);if(r.rms<b.rms)b={rms:r.rms,ab,p0}}
  ctl.ab.value=b.ab.toFixed(2);ctl.ph0.value=b.p0.toFixed(3);drawModel();toast(`θ ${th}°: a/b ${b.ab.toFixed(2)}`)};

/* 4: record */
['claim','diffWhy','aiNote'].forEach(f=>{const el=document.getElementById(f);if(S[f])el.value=S[f];el.oninput=()=>save({[f]:el.value})});
const best=()=>{const L=S.logM||[];return L.length?L.reduce((a,b)=>b.rms<a.rms?b:a):S.model};
function drawSum(){const bm=best(),l1=Store.get().l1||{},mp=modelPeriod();
  const rows=[['1차시 예측',l1.guess?hm(l1.guess):'—'],['주기 맞추기로 찾은 주기',(S.P||P).toFixed(3)+' h'],['AI 주기와 판정',S.aiP?(+S.aiP).toFixed(3)+' h · '+({ai:'AI 값',double:'두 배',other:'다른 값'}[S.judge]||'—'):'—'],['모형 a/b',bm?bm.ab.toFixed(2)+' (θ '+bm.th+'°, 차 '+bm.rms.toFixed(3)+')':'—']];
  document.getElementById('sum2').innerHTML=rows.map(r=>`<tr><th>${r[0]}</th><td>${r[1]}</td></tr>`).join('');
  const cmp=[['자전주기 (h)',mp,NEAR.P],['길쭉한 정도 a/b',bm?bm.ab:0,NEAR.ab]];
  document.getElementById('cmp').innerHTML=cmp.map(([n,a,b])=>{const mx=Math.max(a,b)*1.1||1;return `<span>${n}</span><div><div class="track"><i style="width:${a/mx*100}%;background:#141414"></i></div><div class="track" style="margin-top:4px"><i style="width:${b/mx*100}%;background:#c9c6be"></i></div></div><div><b style="display:block">${a?a.toFixed(3):'—'}</b><b style="display:block;color:var(--muted)">${b.toFixed(3)}</b></div>`}).join('')+'<span></span><span class="note">위: 나 · 아래: NEAR 슈메이커(34.4 × 11.2 km, 5.270 h)</span><span></span>'}
document.getElementById('print2').onclick=()=>{const secs=[...document.querySelectorAll('section.step')];const was=secs.map(s=>s.hidden);secs.forEach((s,k)=>s.hidden=k!==3);window.print();secs.forEach((s,k)=>s.hidden=was[k])};
document.getElementById('saveJson').onclick=()=>download('eros-record.json',JSON.stringify(Store.get(),null,2),'application/json');

Stepper(document.getElementById('lesson'),i=>{
  if(i===0){fold.resize();setP(P);drawLog()}
  if(i===1){cmpA.resize();cmpB.resize();drawCmp()}
  if(i===2){mfit.resize();drawModel()}
  if(i===3)drawSum();
});
})();
