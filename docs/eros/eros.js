/* Shared helpers for the Eros light-curve lessons: storage, stepper, plotting, models. */
(function(){
'use strict';
const KEY='eros-lab-v1';
const Store={
  get(){try{return JSON.parse(localStorage.getItem(KEY))||{}}catch(e){return {}}},
  set(patch){const s=Store.get();Object.assign(s,patch);try{localStorage.setItem(KEY,JSON.stringify(s))}catch(e){}return s},
  merge(section,patch){const s=Store.get();s[section]=Object.assign({},s[section]||{},patch);try{localStorage.setItem(KEY,JSON.stringify(s))}catch(e){}return s[section]}
};

function toast(msg){let t=document.querySelector('.toast');if(!t){t=document.createElement('div');t.className='toast';document.body.appendChild(t)}t.textContent=msg;t.classList.add('on');clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove('on'),1800)}

/* Step navigation: buttons[data-step] in .stepper, sections.step[data-step]. */
function Stepper(root,onShow){
  const btns=[...root.querySelectorAll('.stepper button')];
  const steps=[...root.querySelectorAll('section.step')];
  const prev=root.querySelector('[data-prev]'),next=root.querySelector('[data-next]'),count=root.querySelector('.count');
  let cur=0;
  function show(i,push){
    cur=Math.max(0,Math.min(steps.length-1,i));
    steps.forEach((s,k)=>s.hidden=k!==cur);
    btns.forEach((b,k)=>{b.toggleAttribute('aria-current',k===cur);if(k===cur)b.setAttribute('aria-current','step');b.classList.toggle('done',k<cur)});
    if(prev)prev.disabled=cur===0;
    if(next){next.disabled=cur===steps.length-1;next.textContent='다음 →'}
    if(count)count.textContent=(cur+1)+' / '+steps.length;
    if(push!==false)history.replaceState(null,'','#s'+cur);
    onShow&&onShow(cur,steps[cur]);
    if(push!==false){const top=root.querySelector('.stepper').getBoundingClientRect().top+window.scrollY-70;if(window.scrollY>top)window.scrollTo({top,behavior:'smooth'})}
  }
  btns.forEach((b,k)=>b.addEventListener('click',()=>show(k)));
  prev&&prev.addEventListener('click',()=>show(cur-1));
  next&&next.addEventListener('click',()=>show(cur+1));
  const m=location.hash.match(/^#s(\d+)/);
  show(m?+m[1]:0,false);
  return {show,get current(){return cur}};
}

/* Canvas plot with fixed axes, HiDPI and pointer helpers. */
function niceStep(range,n){const raw=range/n;const p=Math.pow(10,Math.floor(Math.log10(raw)));const f=raw/p;return (f<1.5?1:f<3?2:f<7?5:10)*p}
class Plot{
  constructor(canvas,opt){
    this.c=canvas;this.ctx=canvas.getContext('2d');this.o=Object.assign({pad:{l:58,r:16,t:16,b:42},xlabel:'',ylabel:'',invertY:false},opt||{});
    this.layers=[];this.resize();
    new ResizeObserver(()=>{this.resize();this.draw()}).observe(canvas);
  }
  resize(){const dpr=window.devicePixelRatio||1;if(!this.c.dataset.h)this.c.dataset.h=this.c.getAttribute('height')||320;const w=Math.max(200,this.c.offsetWidth||this.c.getBoundingClientRect().width),h=+this.c.dataset.h;
    this.c.style.height=h+'px';this.c.width=w*dpr;this.c.height=h*dpr;this.w=w;this.h=h;this.ctx.setTransform(dpr,0,0,dpr,0,0)}
  setRange(x0,x1,y0,y1){this.x0=x0;this.x1=x1;this.y0=y0;this.y1=y1}
  X(x){const p=this.o.pad;return p.l+(x-this.x0)/(this.x1-this.x0)*(this.w-p.l-p.r)}
  Y(y){const p=this.o.pad;let t=(y-this.y0)/(this.y1-this.y0);if(this.o.invertY)t=1-t;return this.h-p.b-t*(this.h-p.t-p.b)}
  invX(px){const p=this.o.pad;return this.x0+(px-p.l)/(this.w-p.l-p.r)*(this.x1-this.x0)}
  draw(){
    const g=this.ctx,p=this.o.pad,fs=this.o.fs||1;g.clearRect(0,0,this.w,this.h);
    g.fillStyle='#ffffff';g.fillRect(0,0,this.w,this.h);
    g.font=(12*fs)+'px Pretendard,"Noto Sans KR",sans-serif';g.textBaseline='middle';
    const xs=this.o.xstep||niceStep(this.x1-this.x0,8),ys=this.o.ystep||niceStep(Math.abs(this.y1-this.y0),5);
    g.strokeStyle='#efede8';g.lineWidth=1;g.fillStyle='#6f6f6f';
    for(let x=Math.ceil(this.x0/xs)*xs;x<=this.x1+1e-9;x+=xs){const X=Math.round(this.X(x))+.5;g.beginPath();g.moveTo(X,p.t);g.lineTo(X,this.h-p.b);g.stroke();g.textAlign='center';g.fillText(this.o.xfmt?this.o.xfmt(x):+x.toFixed(6),X,this.h-p.b+14*fs)}
    const ylo=Math.min(this.y0,this.y1),yhi=Math.max(this.y0,this.y1);
    for(let y=Math.ceil(ylo/ys)*ys;y<=yhi+1e-9;y+=ys){const Y=Math.round(this.Y(y))+.5;g.beginPath();g.moveTo(p.l,Y);g.lineTo(this.w-p.r,Y);g.stroke();g.textAlign='right';g.fillText(this.o.yfmt?this.o.yfmt(y):(+y.toFixed(3)).toString(),p.l-8,Y)}
    g.strokeStyle='#9a978f';g.strokeRect(p.l+.5,p.t+.5,this.w-p.l-p.r,this.h-p.t-p.b);
    g.fillStyle='#3b3b3b';g.font='500 '+(12.5*fs)+'px Pretendard,"Noto Sans KR",sans-serif';g.textAlign='center';
    g.fillText(this.o.xlabel,p.l+(this.w-p.l-p.r)/2,this.h-10*fs);
    g.save();g.translate(14*fs,p.t+(this.h-p.t-p.b)/2);g.rotate(-Math.PI/2);g.fillText(this.o.ylabel,0,0);g.restore();
    g.save();g.beginPath();g.rect(p.l,p.t,this.w-p.l-p.r,this.h-p.t-p.b);g.clip();
    for(const L of this.layers)L(g,this);
    g.restore();
    if(this.o.after)this.o.after(g,this);
  }
  points(xs,ys,color,r){const g=this.ctx;g.fillStyle=color;const R=r||2.4;for(let i=0;i<xs.length;i++){g.beginPath();g.arc(this.X(xs[i]),this.Y(ys[i]),R,0,6.2832);g.fill()}}
  line(xs,ys,color,w,dash){const g=this.ctx;g.strokeStyle=color;g.lineWidth=w||2;g.setLineDash(dash||[]);g.beginPath();for(let i=0;i<xs.length;i++){const X=this.X(xs[i]),Y=this.Y(ys[i]);i?g.lineTo(X,Y):g.moveTo(X,Y)}g.stroke();g.setLineDash([])}
  vline(x,color,label,w){const g=this.ctx,p=this.o.pad;const X=this.X(x);g.strokeStyle=color;g.lineWidth=w||1.5;g.beginPath();g.moveTo(X,p.t);g.lineTo(X,this.h-p.b);g.stroke();if(label){g.fillStyle=color;g.font='600 12.5px Pretendard,sans-serif';g.textAlign='center';g.fillText(label,X,p.t+10)}}
}

/* Linear least squares (normal equations, small systems). */
function solve(A,b){const n=b.length;const M=A.map((r,i)=>[...r,b[i]]);
  for(let c=0;c<n;c++){let piv=c;for(let r=c+1;r<n;r++)if(Math.abs(M[r][c])>Math.abs(M[piv][c]))piv=r;[M[c],M[piv]]=[M[piv],M[c]];
    const d=M[c][c]||1e-12;for(let r=0;r<n;r++){if(r===c)continue;const f=M[r][c]/d;if(!f)continue;for(let k=c;k<=n;k++)M[r][k]-=f*M[c][k]}}
  return M.map((r,i)=>r[n]/(r[i]||1e-12))}
/* Fourier series fit of folded data; returns rms and an evaluator. */
function fourierFit(phase,mag,order){
  const K=2*order+1,A=Array.from({length:K},()=>new Float64Array(K)),b=new Float64Array(K),row=new Float64Array(K);
  for(let i=0;i<phase.length;i++){const w=2*Math.PI*phase[i];row[0]=1;for(let k=1;k<=order;k++){row[2*k-1]=Math.cos(k*w);row[2*k]=Math.sin(k*w)}
    for(let r=0;r<K;r++){b[r]+=row[r]*mag[i];for(let c=r;c<K;c++)A[r][c]+=row[r]*row[c]}}
  for(let r=0;r<K;r++)for(let c=0;c<r;c++)A[r][c]=A[c][r];
  const co=solve(A.map(r=>[...r]),[...b]);
  const f=ph=>{const w=2*Math.PI*ph;let s=co[0];for(let k=1;k<=order;k++)s+=co[2*k-1]*Math.cos(k*w)+co[2*k]*Math.sin(k*w);return s};
  let ss=0;for(let i=0;i<phase.length;i++){const d=mag[i]-f(phase[i]);ss+=d*d}
  return {rms:Math.sqrt(ss/phase.length),f};
}
const frac=x=>x-Math.floor(x);

/* Triaxial ellipsoid, rotation about the short axis c; brightness proportional to projected area. */
function ellipsoidMag(phase,ab,bc,thetaDeg){
  const th=thetaDeg*Math.PI/180,s2=Math.sin(th)**2,c2=Math.cos(th)**2,w=2*Math.PI*phase;
  const A=Math.sqrt(s2*(Math.cos(w)**2/(ab*ab)+Math.sin(w)**2)+c2*bc*bc);
  return -2.5*Math.log10(A);
}

/* Small software renderer for a rocky ellipsoid or a two-tone sphere. */
function makeMesh(nu,nv,rough){
  const V=[],F=[];
  for(let j=0;j<=nv;j++)for(let i=0;i<nu;i++){const u=i/nu*2*Math.PI,v=j/nv*Math.PI;
    const n=rough?1+rough*(Math.sin(3*u+1.3)*Math.sin(2*v)*.6+Math.sin(7*u+2*v)*.25+Math.cos(5*v+u)*.3):1;
    V.push([Math.sin(v)*Math.cos(u)*n,Math.sin(v)*Math.sin(u)*n,Math.cos(v)*n,u])}
  for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){const a=j*nu+i,b=j*nu+(i+1)%nu,c=(j+1)*nu+(i+1)%nu,d=(j+1)*nu+i;F.push([a,b,c],[a,c,d])}
  return {V,F};
}
const MESH_ROCK=makeMesh(48,24,.045),MESH_SMOOTH=makeMesh(48,24,0);
function renderBody(canvas,opt){
  const o=Object.assign({ab:2.4,bc:1,theta:90,phase:0,mode:'ellipsoid',dark:.35,scale:1},opt);
  const dpr=window.devicePixelRatio||1,W=Math.max(120,canvas.offsetWidth||canvas.getBoundingClientRect().width);if(!canvas.dataset.h)canvas.dataset.h=canvas.getAttribute('height')||260;const H=+canvas.dataset.h;
  canvas.style.height=H+'px';canvas.width=W*dpr;canvas.height=H*dpr;const g=canvas.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);
  g.fillStyle='#05070a';g.fillRect(0,0,W,H);
  const th=o.theta*Math.PI/180,ob=[Math.sin(th),0,Math.cos(th)],right=[0,1,0],up=[-Math.cos(th),0,Math.sin(th)];
  const psi=2*Math.PI*o.phase,cp=Math.cos(psi),sp=Math.sin(psi);
  const sph=o.mode==='sphere',pea=o.mode==='peanut',ax=(sph||pea)?[1,1,1]:[o.ab,1,1/o.bc];
  const parts=pea?[{r:1,c:-.62,M:MESH_ROCK},{r:.78,c:.98,M:MESH_ROCK}]:[{r:1,c:0,M:sph?MESH_SMOOTH:MESH_ROCK}];
  const ext=sph?1:pea?1.8:Math.max(o.ab,1/o.bc,1);const size=Math.min(W/2/(ext*1.12),H/2/(sph?1.25:Math.max(1.6,ext*.75)))*o.scale;
  const L=[ob[0]*.97+.15,ob[1]+.18,ob[2]*.97];const ln=Math.hypot(...L);L[0]/=ln;L[1]/=ln;L[2]/=ln;
  const tris=[];
  for(const part of parts){
    const C0=[part.c*cp,part.c*sp,0];
    const P=part.M.V.map(v=>{const x=v[0]*ax[0]*part.r+part.c,y=v[1]*ax[1]*part.r,z=v[2]*ax[2]*part.r;return [x*cp-y*sp,x*sp+y*cp,z,v[3]]});
    for(const f of part.M.F){const A=P[f[0]],B=P[f[1]],C=P[f[2]];
      const u=[B[0]-A[0],B[1]-A[1],B[2]-A[2]],v=[C[0]-A[0],C[1]-A[1],C[2]-A[2]];
      let n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];const nl=Math.hypot(...n)||1;n=n.map(q=>q/nl);
      const mx=(A[0]+B[0]+C[0])/3,my=(A[1]+B[1]+C[1])/3,mz=(A[2]+B[2]+C[2])/3;
      if(n[0]*(mx-C0[0])+n[1]*(my-C0[1])+n[2]*(mz-C0[2])<0)n=n.map(q=>-q);
      const facing=n[0]*ob[0]+n[1]*ob[1]+n[2]*ob[2];if(facing<=0)continue;
      const lam=Math.max(0,n[0]*L[0]+n[1]*L[1]+n[2]*L[2]);
      let alb=1;if(sph){const lon=frac((A[3]+B[3]+C[3])/3/(2*Math.PI));alb=(lon>.5)?o.dark:1}
      const depth=mx*ob[0]+my*ob[1]+mz*ob[2];
      tris.push([depth,[A,B,C],.12+.88*lam,alb]);
    }
  }
  tris.sort((a,b)=>a[0]-b[0]);
  const cx=W/2,cy=H/2;const pr=p=>[cx+(p[0]*right[0]+p[1]*right[1]+p[2]*right[2])*size,cy-(p[0]*up[0]+p[1]*up[1]+p[2]*up[2])*size];
  for(const t of tris){const s=t[2]*t[3];const base=sph?[205,200,190]:[178,170,158];
    g.fillStyle=`rgb(${base.map(c=>Math.round(c*s)).join(',')})`;g.beginPath();t[1].forEach((p,k)=>{const q=pr(p);k?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1])});g.closePath();g.fill();g.strokeStyle=g.fillStyle;g.lineWidth=.6;g.stroke()}
  if(!o.noAxis){const a0=pr([0,0,-1.5*ax[2]]),a1=pr([0,0,1.5*ax[2]]);
  g.strokeStyle='rgba(255,255,255,.5)';g.setLineDash([4,4]);g.lineWidth=1.2;g.beginPath();g.moveTo(a0[0],a0[1]);g.lineTo(a1[0],a1[1]);g.stroke();g.setLineDash([])}
  g.fillStyle='#b9b6ae';g.font='12px Pretendard,sans-serif';g.textAlign='left';g.fillText(o.label||'',10,16);
}
/* Disk-integrated brightness (geometric scattering) of the rendered bodies, for the hypothesis demo. */
function bodyFlux(opt){
  const o=Object.assign({ab:2.4,bc:1,theta:90,phase:0,mode:'ellipsoid',dark:.35},opt);
  const th=o.theta*Math.PI/180,ob=[Math.sin(th),0,Math.cos(th)],psi=2*Math.PI*o.phase,cp=Math.cos(psi),sp=Math.sin(psi);
  const sph=o.mode==='sphere',ax=sph?[1,1,1]:[o.ab,1,1/o.bc];let F=0;
  for(const f of MESH_SMOOTH.F){const P=f.map(k=>{const v=MESH_SMOOTH.V[k];const x=v[0]*ax[0],y=v[1]*ax[1],z=v[2]*ax[2];return [x*cp-y*sp,x*sp+y*cp,z,v[3]]});
    const u=[P[1][0]-P[0][0],P[1][1]-P[0][1],P[1][2]-P[0][2]],v=[P[2][0]-P[0][0],P[2][1]-P[0][1],P[2][2]-P[0][2]];
    const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
    const mx=P[0][0]+P[1][0]+P[2][0],my=P[0][1]+P[1][1]+P[2][1],mz=P[0][2]+P[1][2]+P[2][2];const sgn=(n[0]*mx+n[1]*my+n[2]*mz)<0?-1:1;
    const proj=sgn*(n[0]*ob[0]+n[1]*ob[1]+n[2]*ob[2])/2;if(proj<=0)continue;
    let alb=1;if(sph){const lon=frac((P[0][3]+P[1][3]+P[2][3])/3/(2*Math.PI));alb=lon>.5?o.dark:1}
    F+=proj*alb}
  return F;
}



/* Brightness of any rendered body: sum of pixel light in a small off-screen render. */
const _off=document.createElement('canvas');_off.setAttribute('height','100');
function shapeFlux(opt){renderBody(_off,Object.assign({noAxis:true,label:''},opt));const d=_off.getContext('2d').getImageData(0,0,_off.width,_off.height).data;let s=0;for(let i=0;i<d.length;i+=4)s+=d[i]-5;return s}

/* Two equal spheres orbiting each other, seen edge-on: drawing and visible area. */
function binaryFlux(phase){const r=1,s=Math.abs(5.4*Math.cos(2*Math.PI*phase));let over=0;if(s<2*r)over=2*r*r*Math.acos(s/(2*r))-(s/2)*Math.sqrt(4*r*r-s*s);return 2*Math.PI*r*r-over}
function renderBinary(canvas,phase,label){const dpr=window.devicePixelRatio||1,W=Math.max(120,canvas.offsetWidth||canvas.getBoundingClientRect().width);if(!canvas.dataset.h)canvas.dataset.h=canvas.getAttribute('height')||260;const H=+canvas.dataset.h;
  canvas.style.height=H+'px';canvas.width=W*dpr;canvas.height=H*dpr;const g=canvas.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);g.fillStyle='#05070a';g.fillRect(0,0,W,H);
  const R=Math.min(W,H)*.17,w=2*Math.PI*phase,x=1.35*2*Math.cos(w)*R,z=Math.sin(w);const bodies=[[x,z],[-x,-z]].sort((a,b)=>a[1]-b[1]);
  for(const [bx] of bodies){const cx=W/2+bx,cy=H/2;const gr=g.createRadialGradient(cx-R*.35,cy-R*.35,R*.1,cx,cy,R);gr.addColorStop(0,'rgb(215,208,196)');gr.addColorStop(1,'rgb(70,66,60)');g.fillStyle=gr;g.beginPath();g.arc(cx,cy,R,0,6.3);g.fill()}
  g.fillStyle='#b9b6ae';g.font='12px Pretendard,sans-serif';g.textAlign='left';g.fillText(label||'',10,16)}

function download(name,text,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:type||'text/plain'}));a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)}
function hm(h){const t=Math.round(Math.abs(h)*60);return (h<0?'-':'')+Math.floor(t/60)+'시간 '+String(t%60).padStart(2,'0')+'분'}

window.Eros={Store,toast,Stepper,Plot,fourierFit,ellipsoidMag,renderBody,bodyFlux,binaryFlux,renderBinary,shapeFlux,frac,download,hm,solve};
window.NIGHT_COLORS=['#1f4fa8','#c98a10','#2a8a5f','#b8322a','#5b5b5b'];
})();
