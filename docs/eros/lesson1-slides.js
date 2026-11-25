(function(){
'use strict';
const {Plot,renderBody,renderBinary}=Eros;
const one=window.EROS_DATA.singleNight,base=Math.floor(one.jd[0]-.5)+.5;
const T=one.jd.map(j=>(j-base)*24),M=one.mag;
const css=document.createElement('style');
css.textContent=`.pl{display:flex;flex-direction:column;align-items:center;gap:10px;font-size:28px}
.pl i{display:flex;align-items:center;justify-content:center;border-radius:50%;background:#a9a9a9;font-style:normal;font-weight:800;color:#fff;font-size:40px}
.pl b{font-size:30px}.pl span{color:#6c7280;font-weight:600}
.pl.gap i{background:#fff;border:4px dashed #e0592a;color:#e0592a}.pl.gap b{color:#e0592a}`;
document.head.appendChild(css);
function draw(el){
  const c=el.querySelector('#night');
  if(c){const p=new Plot(c,{xlabel:'세계시 (시)',ylabel:'밝기 (등급) · 위가 밝음',xstep:1,yfmt:y=>(+y.toFixed(1)).toString(),pad:{l:90,r:20,t:20,b:80},fs:2});
    p.setRange(5,11.25,Math.max(...M)+.08,Math.min(...M)-.08);p.layers=[(g,pl)=>pl.points(T,M,'#18213a',4)];p.draw()}
}
document.addEventListener('slide',e=>requestAnimationFrame(()=>draw(e.detail.el)));
if(document.body.classList.contains('all'))document.querySelectorAll('.sl').forEach(draw);else{const on=document.querySelector('.sl.on');if(on)draw(on)}
})();
