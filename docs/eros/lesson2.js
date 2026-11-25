(function(){
'use strict';
const {Store,toast,Stepper,Plot,fourierFit,ellipsoidMag,renderBody,frac,download,hm}=Eros;
const D=window.EROS_DATA,C=window.NIGHT_COLORS;
const t=[],m=[],g=[];
D.nights.forEach((n,k)=>n.jd.forEach((j,i)=>{t.push((j-D.t0)*24);m.push(n.mag[i]-n.zero);g.push(k)}));
const mMin=Math.min(...m),mMax=Math.max(...m);
const Y0=mMax+.08,Y1=mMin-.08;
const NEAR={P:5.270,ab:34.4/11.2};
let S=Store.get().l2||{};
const save=p=>{S=Store.merge('l2',p)};
const label=n=>{const d=n.date.split('.')[0].split('-');return `${+d[1]}월 ${+d[2]}일`};

/* step 0 */
const l1=Store.get().l1||{};
document.getElementById('l1guess').textContent=l1.guess?hm(l1.guess)+' ('+l1.guess.toFixed(2)+' h)':'기록 없음';
document.getElementById('nightTable').innerHTML=D.nights.map((n,k)=>`<tr><td><i style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${C[k]};margin-right:6px"></i>${k+1}</td><td>${n.date}</td><td style="font-family:var(--sans)">${n.observers}</td><td>${n.jd.length}</td></tr>`).join('');
const legendHtml=D.nights.map((n,k)=>`<span><i style="background:${C[k]}"></i>${label(n)} · ${n.observers}</span>`).join('');

/* step 1: raw */
const raw=new Plot(document.getElementById('raw'),{xlabel:'1975년 1월 19일 0시(세계시)부터 지난 시간 (일)',ylabel:'밝기 (상대 등급) · 위가 밝음',yfmt:y=>(+y.toFixed(1)).toString()});
raw.setRange(0,11,Y0,Y1);document.getElementById('rawLegend').innerHTML=legendHtml;
const dayOff=(D.t0-2442431.5)*1; // t0 relative to 1975-01-19 0h UT
function drawRaw(){raw.layers=[(gx,p)=>{for(let k=0;k<D.nights.length;k++){const xs=[],ys=[];for(let i=0;i<t.length;i++)if(g[i]===k){xs.push(t[i]/24+dayOff);ys.push(m[i])}p.points(xs,ys,C[k],2.2)}}];raw.draw()}

/* step 2: folding */
const fold=new Plot(document.getElementById('fold'),{xlabel:'위상 (바퀴)',ylabel:'밝기 (상대 등급) · 위가 밝음',xstep:.25,yfmt:y=>(+y.toFixed(1)).toString()});
document.getElementById('foldLegend').innerHTML=legendHtml;
const pSlider=document.getElementById('pSlider'),pNum=document.getElementById('pNum'),pOut=document.getElementById('pOut'),two=document.getElementById('twoCycles'),showFit=document.getElementById('showFit');
let P=S.P||4;
function phases(Pv){return t.map(x=>frac(x/Pv))}
function drawFolded(plot,Pv,opt){
  const ph=phases(Pv),fit=fourierFit(ph,m,4),n=opt&&opt.two?2:1;
  plot.setRange(0,n,Y0,Y1);
  plot.layers=[(gx,p)=>{for(let c=0;c<n;c++)for(let i=0;i<t.length;i++){gx.fillStyle=C[g[i]];gx.beginPath();gx.arc(p.X(ph[i]+c),p.Y(m[i]),opt&&opt.r||2.4,0,6.3);gx.fill()}
    if(opt&&opt.fit){const xs=[],ys=[];for(let k=0;k<=200*n;k++){const x=k/200;xs.push(x);ys.push(fit.f(frac(x)))}p.line(xs,ys,'#141414',1.6)}}];
  plot.draw();return fit.rms;
}
function setP(v,quiet){P=Math.max(2,Math.min(8,+(+v).toFixed(4)));pSlider.value=P;pNum.value=P.toFixed(3);pOut.textContent=P.toFixed(3)+' h';
  const r=drawFolded(fold,P,{two:two.checked,fit:showFit.checked});
  document.getElementById('rms').textContent=r.toFixed(3);
  document.getElementById('rmsBar').style.width=Math.min(100,r/.35*100)+'%';
  if(!quiet)save({P});return r}
pSlider.oninput=()=>setP(pSlider.value);pNum.onchange=()=>setP(pNum.value);two.onchange=()=>setP(P);showFit.onchange=()=>setP(P);
document.querySelectorAll('[data-dp]').forEach(b=>b.onclick=()=>setP(P+(+b.dataset.dp)));
function drawLog(){const L=S.logP||[];document.getElementById('pLog').innerHTML=L.map((r,i)=>`<tr><td>${r.P.toFixed(3)}</td><td>${r.rms.toFixed(3)}</td><td><button class="btn sm" data-go="${i}">접기</button></td></tr>`).join('');
  document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>setP(L[+b.dataset.go].P));
  document.getElementById('scanBox').classList.toggle('locked',L.length<3)}
document.getElementById('recP').onclick=()=>{const r=setP(P);const L=(S.logP||[]).concat([{P,rms:r}]).slice(-12);save({logP:L});drawLog();toast(P.toFixed(3)+'시간을 기록했습니다')};
const scanBox=document.getElementById('scanBox'),scanP=new Plot(document.getElementById('scan'),{xlabel:'주기 (시간)',ylabel:'흩어짐',pad:{l:52,r:12,t:12,b:38},yfmt:y=>y.toFixed(2)});
let scanData=null;
scanBox.addEventListener('toggle',()=>{if(!scanBox.open)return;if((S.logP||[]).length<3){scanBox.open=false;toast('주기를 세 번 이상 기록하면 열립니다');return}
  scanP.resize();if(scanData)return drawScan();const xs=[],ys=[];let p=2;
  (function chunk(){const end=Math.min(8,p+.4);for(;p<=end;p+=.002){xs.push(p);ys.push(fourierFit(phases(p),m,4).rms)}scanData={xs,ys};drawScan();if(p<8)setTimeout(chunk,0)})()});
function drawScan(){scanP.setRange(2,8,.36,0);scanP.layers=[(gx,pl)=>{pl.line(scanData.xs,scanData.ys,'#141414',1.2);pl.vline(P,'#b8322a',null,1)}];scanP.draw()}
document.getElementById('scan').addEventListener('click',e=>{if(!scanData)return;const r=e.target.getBoundingClientRect();const x=scanP.invX(e.clientX-r.left);
  let best=0,bv=9;scanData.xs.forEach((p,i)=>{if(Math.abs(p-x)<.08&&scanData.ys[i]<bv){bv=scanData.ys[i];best=p}});if(best){setP(best);drawScan()}});

/* step 3: AI check */
const prompt=`첨부한 CSV는 소행성 433 에로스를 1975년 1월 다섯 밤 동안 측광한 자료입니다.
열: night(밤 번호), date_UT(관측 날짜), observers(관측자), JD_light_time_corrected(빛 도달 시간을 보정한 율리우스일), relative_mag(상대 등급, 작을수록 밝음).
밤마다 측광 기준점이 달라 등급의 0점이 다를 수 있습니다.
이 자료로 에로스의 자전주기(시간)를 구해 주세요. 사용한 방법, 검토한 후보 주기, 최종 값을 고른 근거를 함께 설명해 주세요.`;
document.getElementById('prompt').value=prompt;
document.getElementById('copyPrompt').onclick=()=>{navigator.clipboard&&navigator.clipboard.writeText(prompt).then(()=>toast('요청문을 복사했습니다'),()=>toast('복사하지 못했습니다. 직접 선택해 복사하세요'))};
const aiAns=document.getElementById('aiAnswer'),aiP=document.getElementById('aiP');
if(S.aiAnswer)aiAns.value=S.aiAnswer;if(S.aiP)aiP.value=S.aiP;
aiAns.oninput=()=>save({aiAnswer:aiAns.value});
const cmpA=new Plot(document.getElementById('cmpA'),{xlabel:'위상',ylabel:'밝기',pad:{l:46,r:12,t:10,b:34},xstep:.5,yfmt:y=>(+y.toFixed(1)).toString()});
const cmpB=new Plot(document.getElementById('cmpB'),{xlabel:'위상',ylabel:'밝기',pad:{l:46,r:12,t:10,b:34},xstep:.5,yfmt:y=>(+y.toFixed(1)).toString()});
function drawCmp(){const a=+S.aiP||0;
  if(a>=1){const r=drawFolded(cmpA,a,{two:true,r:1.8});document.getElementById('cmpALabel').textContent=`AI 주기 ${a.toFixed(3)} h · 흩어짐 ${r.toFixed(3)}`}
  else{cmpA.layers=[];cmpA.setRange(0,2,Y0,Y1);cmpA.draw();document.getElementById('cmpALabel').textContent='AI 주기를 넣으면 여기에 접힙니다.'}
  const r2=drawFolded(cmpB,P,{two:true,r:1.8});document.getElementById('cmpBLabel').textContent=`STEP 2에서 고른 주기 ${P.toFixed(3)} h · 흩어짐 ${r2.toFixed(3)}`}
function setAi(v){save({aiP:+v});aiP.value=(+v).toFixed(3);drawCmp()}
document.getElementById('foldAi').onclick=()=>{if(!(+aiP.value>=1)){toast('AI가 답한 주기를 시간 단위로 넣으세요');return}setAi(aiP.value)};
document.getElementById('useLs').onclick=()=>setAi(2.633);
const judge=document.getElementById('judge'),jw=document.getElementById('judgeWhy');
if(S.judge)judge.querySelector(`input[value="${S.judge}"]`).checked=true;if(S.judgeWhy)jw.value=S.judgeWhy;
judge.onchange=()=>save({judge:judge.querySelector('input:checked').value});jw.oninput=()=>save({judgeWhy:jw.value});

/* step 4: ellipsoid model */
const mfit=new Plot(document.getElementById('mfit'),{xlabel:'위상 (바퀴)',ylabel:'밝기 · 위가 밝음',pad:{l:50,r:12,t:12,b:38},xstep:.25,yfmt:y=>(+y.toFixed(1)).toString()});
const ctl={ab:document.getElementById('ab'),th:document.getElementById('th'),ph0:document.getElementById('ph0'),bc:document.getElementById('bc')};
const M0=S.model||{ab:1.5,th:90,ph0:0,bc:1};Object.keys(ctl).forEach(k=>ctl[k].value=M0[k]);
let spinPh=0,mph=null,Pm=5.266;
function modelPeriod(){const p=S.P||P;return p<4?p*2:p}
function modelEval(ab,th,ph0,bc,ph){let s=0;const mod=new Float64Array(ph.length);for(let i=0;i<ph.length;i++){mod[i]=ellipsoidMag(frac(ph[i]+ph0),ab,bc,th);s+=m[i]-mod[i]}const c=s/ph.length;let ss=0;for(let i=0;i<ph.length;i++){const d=m[i]-mod[i]-c;ss+=d*d}return {rms:Math.sqrt(ss/ph.length),c}}
function drawModel(){
  Pm=modelPeriod();mph=phases(Pm);
  const v={ab:+ctl.ab.value,th:+ctl.th.value,ph0:+ctl.ph0.value,bc:+ctl.bc.value};
  document.getElementById('abO').textContent=v.ab.toFixed(2);document.getElementById('thO').textContent=v.th+'°';document.getElementById('ph0O').textContent=v.ph0.toFixed(3);document.getElementById('bcO').textContent=v.bc.toFixed(2);
  const r=modelEval(v.ab,v.th,v.ph0,v.bc,mph);
  document.getElementById('mrms').textContent=r.rms.toFixed(3);document.getElementById('mrmsBar').style.width=Math.min(100,r.rms/.35*100)+'%';
  document.getElementById('mPeriod').innerHTML=`접는 주기 <b>${Pm.toFixed(3)} h</b>`+((S.P||P)<4?` · STEP 2 값 ${(S.P||P).toFixed(3)} h의 두 배를 씁니다.`:' · STEP 2에서 고른 값');
  mfit.setRange(0,1,Y0,Y1);
  mfit.layers=[(gx,p)=>{for(let i=0;i<t.length;i++){gx.fillStyle=C[g[i]];gx.globalAlpha=.75;gx.beginPath();gx.arc(p.X(mph[i]),p.Y(m[i]),2.2,0,6.3);gx.fill()}gx.globalAlpha=1;
    const xs=[],ys=[];for(let k=0;k<=240;k++){const x=k/240;xs.push(x);ys.push(ellipsoidMag(frac(x+v.ph0),v.ab,v.bc,v.th)+r.c)}p.line(xs,ys,'#b8322a',2.4);p.vline(spinPh,'rgba(20,20,20,.35)',null,1)}];
  mfit.draw();
  renderBody(document.getElementById('body'),{ab:v.ab,bc:v.bc,theta:v.th,phase:frac(spinPh+v.ph0),label:'위상 '+spinPh.toFixed(2)});
  save({model:Object.assign(v,{rms:r.rms,P:Pm})});return r.rms;
}
Object.values(ctl).forEach(c=>c.oninput=drawModel);
document.getElementById('mfit').addEventListener('pointerdown',e=>{const r=e.target.getBoundingClientRect();spinPh=Math.max(0,Math.min(1,mfit.invX(e.clientX-r.left)));drawModel()});
let mt=null;document.getElementById('mplay').onclick=e=>{if(mt){clearInterval(mt);mt=null;e.target.textContent='회전 재생';return}e.target.textContent='멈춤';mt=setInterval(()=>{spinPh=frac(spinPh+.01);drawModel()},60)};
function drawMLog(){document.getElementById('mLog').innerHTML=(S.logM||[]).map(r=>`<tr><td>${r.ab.toFixed(2)}</td><td>${r.th}°</td><td>${r.rms.toFixed(3)}</td></tr>`).join('')}
document.getElementById('recM').onclick=()=>{const r=drawModel();const v=S.model;save({logM:(S.logM||[]).concat([{ab:v.ab,th:v.th,bc:v.bc,ph0:v.ph0,rms:r}]).slice(-10)});drawMLog();toast('모형을 기록했습니다')};
document.getElementById('autoFit').onclick=()=>{Pm=modelPeriod();mph=phases(Pm);const th=+ctl.th.value,bc=+ctl.bc.value;let best={rms:9};
  for(let ab=1;ab<=4.0001;ab+=.02)for(let p0=0;p0<1;p0+=.005){const r=modelEval(ab,th,p0,bc,mph);if(r.rms<best.rms)best={rms:r.rms,ab,p0}}
  for(let ab=best.ab-.02;ab<=best.ab+.02;ab+=.002)for(let p0=best.p0-.005;p0<=best.p0+.005;p0+=.001){const r=modelEval(ab,th,frac(p0),bc,mph);if(r.rms<best.rms)best={rms:r.rms,ab,p0:frac(p0)}}
  ctl.ab.value=best.ab.toFixed(2);ctl.ph0.value=best.p0.toFixed(3);drawModel();toast(`θ ${th}°에서 a/b ${best.ab.toFixed(2)}, 차 ${best.rms.toFixed(3)}`)};

/* step 5: compare with spacecraft */
const cover=document.getElementById('cover');
function openCover(){cover.hidden=true;save({opened:true});drawCompare()}
document.getElementById('openCover').onclick=()=>{if(!(S.logM||[]).length&&!S.opened){if(!confirm('아직 기록한 모형이 없습니다. 그래도 열까요?'))return}openCover()};
if(S.opened)cover.hidden=true;
function bestModel(){const L=S.logM||[];if(!L.length)return S.model||null;return L.reduce((a,b)=>b.rms<a.rms?b:a)}
function drawCompare(){const bm=bestModel(),myP=modelPeriod();
  const rows=[['자전주기 (h)',myP,NEAR.P,'#141414'],['a/b (내 모형)',bm?bm.ab:0,NEAR.ab,'#141414']];
  document.getElementById('cmp').innerHTML=rows.map(([n,a,b,c])=>{const mx=Math.max(a,b)*1.1||1;return `<span>${n}</span><div><div class="track"><i style="width:${a/mx*100}%;background:${c}"></i></div><div class="track" style="margin-top:4px"><i style="width:${b/mx*100}%;background:#c9c6be"></i></div></div><div><b style="display:block">${a?a.toFixed(3):'—'}</b><b style="display:block;color:var(--muted)">${b.toFixed(3)}</b></div>`}).join('')+'<span></span><span class="note">위: 내 값 · 아래: NEAR 슈메이커 측정값</span><span></span>'}
const dw=document.getElementById('diffWhy');if(S.diffWhy)dw.value=S.diffWhy;dw.oninput=()=>save({diffWhy:dw.value});
const n51=D.night1951,b51=Math.floor(n51.jd[0]-.5)+.5,T51=n51.jd.map(j=>(j-b51)*24),M51=n51.mag;
const y51=new Plot(document.getElementById('y1951'),{xlabel:'1951년 10월 11일 세계시 (시)',ylabel:'밝기',pad:{l:50,r:12,t:12,b:38},yfmt:y=>(+y.toFixed(1)).toString()});
const th51=document.getElementById('th51'),w51=document.getElementById('why1951');if(S.why1951)w51.value=S.why1951;w51.oninput=()=>save({why1951:w51.value});
function drawY51(){const mid=(Math.max(...M51)+Math.min(...M51))/2;y51.setRange(Math.min(...T51)-.2,Math.max(...T51)+.2,mid+.6,mid-.6);y51.layers=[(gx,p)=>p.points(T51,M51,'#141414',3)];y51.draw()}
function drawB51(){const bm=bestModel()||{ab:2.4,bc:1};const th=+th51.value;document.getElementById('th51O').textContent=th+'°';
  let lo=9,hi=-9;for(let k=0;k<100;k++){const v=ellipsoidMag(k/100,bm.ab,bm.bc||1,th);lo=Math.min(lo,v);hi=Math.max(hi,v)}
  document.getElementById('amp51').textContent=(hi-lo).toFixed(2)+' 등급';
  renderBody(document.getElementById('body1951'),{ab:bm.ab,bc:bm.bc||1,theta:th,phase:.15,label:'θ = '+th+'°'})}
th51.oninput=drawB51;

/* step 6: record */
const fields=['claim','evid','limit','aiNote'];fields.forEach(f=>{const el=document.getElementById(f);if(S[f])el.value=S[f];el.oninput=()=>save({[f]:el.value})});
function drawSum(){const bm=bestModel();const j={ai:'AI의 값',double:'AI 값의 두 배',other:'다른 값'}[S.judge]||'—';
  const rows=[['1차시 예측',l1.guess?l1.guess.toFixed(2)+' h':'—'],['접기로 찾은 주기',(S.P||P).toFixed(3)+' h'],['AI가 낸 주기',S.aiP?(+S.aiP).toFixed(3)+' h':'—'],['AI 답 판정',j],['모형 a/b · θ',bm?bm.ab.toFixed(2)+' · '+bm.th+'°':'—'],['모형과 관측의 차',bm?bm.rms.toFixed(3)+' 등급':'—'],['NEAR 측정',`5.270 h · 34.4×11.2×11.2 km (a/b ${NEAR.ab.toFixed(2)})`]];
  document.getElementById('sum2').innerHTML=rows.map(r=>`<tr><th>${r[0]}</th><td>${r[1]}</td></tr>`).join('')}
document.getElementById('print2').onclick=()=>{const secs=[...document.querySelectorAll('section.step')];const was=secs.map(s=>s.hidden);secs.forEach((s,k)=>s.hidden=k!==6&&k!==4&&k!==3);window.print();secs.forEach((s,k)=>s.hidden=was[k])};
document.getElementById('saveJson').onclick=()=>download('eros-record.json',JSON.stringify(Store.get(),null,2),'application/json');

Stepper(document.getElementById('lesson'),i=>{
  if(i===1){raw.resize();drawRaw()}
  if(i===2){fold.resize();setP(P,true);drawLog()}
  if(i===3){cmpA.resize();cmpB.resize();drawCmp()}
  if(i===4){mfit.resize();drawModel();drawMLog()}
  if(i===5){y51.resize();drawY51();drawB51();drawCompare()}
  if(i===6)drawSum();
});
})();
