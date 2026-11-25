/* Slide deck: fixed 1920×1080 slides scaled to the window, phase footer, click-to-reveal blanks. */
(function(){
'use strict';
const deck=document.querySelector('.deck'),slides=[...deck.querySelectorAll('.sl')];
const phases=['참여','탐색','설명','정교화','평가'],unit=deck.dataset.unit||'';
const all=new URLSearchParams(location.search).has('all');
if(all)document.body.classList.add('all');
slides.forEach((s,i)=>{if(s.classList.contains('cover'))return;const f=document.createElement('div');f.className='foot';
  f.innerHTML=`<span class="u">${unit}</span>`+phases.map(p=>`<span class="p${p===s.dataset.phase?' on':''}">${p}</span>`).join('')+`<span class="n">${i+1}</span>`;s.appendChild(f)});
document.querySelectorAll('.bk').forEach(b=>{b.dataset.c=b.textContent;b.addEventListener('click',e=>{e.stopPropagation();toggle(b)})});
function toggle(b,open){const o=open===undefined?!b.classList.contains('open'):open;b.classList.toggle('open',o);b.textContent=o?b.dataset.a:b.dataset.c}
let cur=0;
function fit(){const k=Math.min(innerWidth/1920,innerHeight/1080);slides.forEach(s=>s.style.transform=`translate(-50%,-50%) scale(${k})`)}
function show(i){cur=Math.max(0,Math.min(slides.length-1,i));slides.forEach((s,k)=>s.classList.toggle('on',k===cur));
  const c=document.querySelector('.ctl .cnt');if(c)c.textContent=(cur+1)+' / '+slides.length;
  history.replaceState(null,'','#'+(cur+1));document.dispatchEvent(new CustomEvent('slide',{detail:{i:cur,el:slides[cur]}}))}
function next(){const hid=[...slides[cur].querySelectorAll('.bk:not(.open)')];if(hid.length){toggle(hid[0],true);return}show(cur+1)}
function prev(){show(cur-1)}
document.addEventListener('keydown',e=>{if(e.target.matches('input,textarea'))return;
  if(['ArrowRight','PageDown',' ','Enter'].includes(e.key)){e.preventDefault();next()}
  if(['ArrowLeft','PageUp','Backspace'].includes(e.key)){e.preventDefault();prev()}
  if(e.key==='f')fs()});
function fs(){document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen&&document.documentElement.requestFullscreen()}
const ctl=document.createElement('div');ctl.className='ctl';
ctl.innerHTML=`<a href="index.html">처음</a>${deck.dataset.sim?`<a href="${deck.dataset.sim}">시뮬레이터</a>`:''}<button type="button" data-a="p">←</button><span class="cnt"></span><button type="button" data-a="n">→</button><button type="button" data-a="f">전체 화면</button>`;
document.body.appendChild(ctl);
ctl.addEventListener('click',e=>{const a=e.target.dataset.a;if(a==='p')prev();if(a==='n')next();if(a==='f')fs()});
addEventListener('resize',fit);fit();
if(all){slides.forEach((s,k)=>document.dispatchEvent(new CustomEvent('slide',{detail:{i:k,el:s}})))}
else{const m=location.hash.match(/^#(\d+)/);show(m?+m[1]-1:0)}
window.Deck={show,next,prev};
})();
