(function(){
'use strict';
const {Plot,renderBody,frac}=Eros;
const D=window.EROS_DATA,C=['#1f4fa8','#c98a10','#2a8a5f','#b8322a','#5b5b5b'];
const one=D.singleNight,b1=Math.floor(one.jd[0]-.5)+.5,T1=one.jd.map(j=>(j-b1)*24),M1=one.mag;
const t=[],m=[],g=[];D.nights.forEach((n,k)=>n.jd.forEach((j,i)=>{t.push((j-D.t0)*24);m.push(n.mag[i]-n.zero);g.push(k)}));
const Y0=Math.max(...m)+.08,Y1=Math.min(...m)-.08;
const css=document.createElement('style');
css.textContent='.legend5{display:flex;gap:34px;margin-top:14px;font-size:24px;color:#333}.legend5 i{display:inline-block;width:16px;height:16px;border-radius:50%;margin-right:10px;vertical-align:1px}';
document.head.appendChild(css);
const leg=document.getElementById('leg');
if(leg)leg.innerHTML=D.nights.map((n,k)=>{const d=n.date.split('.')[0].split('-');return `<span><i style="background:${C[k]}"></i>${+d[1]}월 ${+d[2]}일 · ${n.observers}</span>`}).join('');
const opt={fs:2,pad:{l:90,r:20,t:20,b:80},yfmt:y=>(+y.toFixed(1)).toString()};
function draw(el){
  let c;
  if((c=el.querySelector('#night'))){const p=new Plot(c,Object.assign({xlabel:'세계시 (시)',ylabel:'밝기 · 위가 밝음',xstep:1},opt));p.setRange(5,11.25,Math.max(...M1)+.08,Math.min(...M1)-.08);p.layers=[(x,pl)=>pl.points(T1,M1,'#18213a',4)];p.draw()}
  if((c=el.querySelector('#raw'))){const p=new Plot(c,Object.assign({xlabel:'1975년 1월 19일 0시(세계시)부터 지난 날',ylabel:'밝기 · 위가 밝음',xstep:1},opt));p.setRange(0,11,Y0,Y1);
    p.layers=[(x,pl)=>{for(let i=0;i<t.length;i++){x.fillStyle=C[g[i]];x.beginPath();x.arc(pl.X(t[i]/24),pl.Y(m[i]),3.5,0,6.3);x.fill()}}];p.draw()}
  if((c=el.querySelector('#wrong'))){const p=new Plot(c,Object.assign({xlabel:'위상',ylabel:'밝기 · 위가 밝음',xstep:.25},opt));p.setRange(0,1,Y0,Y1);
    p.layers=[(x,pl)=>{for(let i=0;i<t.length;i++){x.fillStyle=C[g[i]];x.beginPath();x.arc(pl.X(frac(t[i]/4)),pl.Y(m[i]),3.5,0,6.3);x.fill()}}];p.draw()}
  if((c=el.querySelector('#phase1'))){const p=new Plot(c,Object.assign({xlabel:'세계시 (시)',ylabel:'밝기 · 위가 밝음',xstep:1,after:(x,pl)=>{x.font='600 26px Pretendard,sans-serif';x.fillStyle='#e0592a';x.textAlign='center';[[5.64,'0'],[8.27,'0.5'],[10.90,'1']].forEach(([h,l])=>x.fillText('위상 '+l,pl.X(h),pl.o.pad.t+36))}},opt));
    p.setRange(5,11.25,Math.max(...M1)+.08,Math.min(...M1)-.08);p.layers=[(x,pl)=>{pl.points(T1,M1,'#18213a',4);[5.64,8.27,10.90].forEach(h=>pl.vline(h,'#e0592a',null,2))}];p.draw()}
}
document.addEventListener('slide',e=>requestAnimationFrame(()=>draw(e.detail.el)));
if(document.body.classList.contains('all'))document.querySelectorAll('.sl').forEach(draw);else{const on=document.querySelector('.sl.on');if(on)draw(on)}
})();
