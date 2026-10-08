(function(root){
'use strict';
const TAU=2*Math.PI;
const basis=(phase,order)=>Array.from({length:order*2},(_,j)=>j%2?Math.sin(TAU*(1+(j>>1))*phase):Math.cos(TAU*(1+(j>>1))*phase));
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
function solve(A,b){
 const n=b.length,M=A.map((r,i)=>[...r,b[i]]);
 for(let k=0;k<n;k++){
  let pivot=k;for(let i=k+1;i<n;i++)if(Math.abs(M[i][k])>Math.abs(M[pivot][k]))pivot=i;
  if(Math.abs(M[pivot][k])<1e-10)return null;
  [M[k],M[pivot]]=[M[pivot],M[k]];const d=M[k][k];for(let j=k;j<=n;j++)M[k][j]/=d;
  for(let i=0;i<n;i++)if(i!==k){const v=M[i][k];for(let j=k;j<=n;j++)M[i][j]-=v*M[k][j];}
 }return M.map(r=>r[n]);
}
function fit(sessions,period,order=2){
 if(!(period>0)||!sessions.length)return null;
 const epoch=Math.min(...sessions.flatMap(s=>s.points.map(p=>p[0]))),n=order*2;
 const A=Array.from({length:n},()=>Array(n).fill(0)),b=Array(n).fill(0),groups=[];
 for(const s of sessions){
  const rows=s.points.map((p,index)=>({jd:p[0],flux:p[1],index,t:(p[0]-epoch)*24,m:-2.5*Math.log10(p[1]),x:basis((p[0]-epoch)*24/period,order)}));
  const meanM=rows.reduce((v,r)=>v+r.m,0)/rows.length,meanX=Array.from({length:n},(_,j)=>rows.reduce((v,r)=>v+r.x[j],0)/rows.length);
  for(const r of rows){const x=r.x.map((v,j)=>v-meanX[j]);for(let i=0;i<n;i++){b[i]+=x[i]*(r.m-meanM);for(let j=0;j<n;j++)A[i][j]+=x[i]*x[j];}}
  groups.push({session:s,rows,meanM,meanX});
 }
 const coef=solve(A,b);if(!coef)return null;let sum=0,count=0;const points=[];
 for(const g of groups){g.offset=g.meanM-dot(g.meanX,coef);for(const r of g.rows){r.adjusted=r.m-g.offset;r.phase=((r.t/period)%1+1)%1;r.predicted=dot(r.x,coef);r.residual=r.adjusted-r.predicted;r.session=g.session.id;points.push(r);sum+=r.residual**2;count++;}}
 const curve=Array.from({length:401},(_,i)=>dot(basis(i/400,order),coef));
 return {period,order,epoch,coef,points,groups,rms:Math.sqrt(sum/count),amplitude:Math.max(...curve)-Math.min(...curve),curve};
}
function evaluate(fitResult,phase){return dot(basis(phase,fitResult.order),fitResult.coef);}
function search(sessions,order=2,min=2,max=16,steps=2400){
 const f0=1/max,df=(1/min-f0)/steps,grid=[];
 for(let i=0;i<=steps;i++){const p=1/(f0+i*df),r=fit(sessions,p,order);grid.push({p,rms:r?r.rms:Infinity});}
 const lows=[];for(let i=1;i<steps;i++)if(grid[i].rms<=grid[i-1].rms&&grid[i].rms<grid[i+1].rms)lows.push(i);
 const refine=i=>{let lo=f0+(i-1)*df,hi=f0+(i+1)*df;for(let k=0;k<20;k++){const a=lo+(hi-lo)/3,b=hi-(hi-lo)/3;if(fit(sessions,1/a,order).rms<fit(sessions,1/b,order).rms)hi=b;else lo=a;}return fit(sessions,1/((lo+hi)/2),order);};
 const candidates=lows.sort((a,b)=>grid[a].rms-grid[b].rms).slice(0,12).map(refine).sort((a,b)=>a.rms-b.rms).filter((r,i,a)=>a.findIndex(t=>Math.abs(t.period-r.period)<.03)===i).slice(0,4);
 return {grid:grid.reverse(),candidates,min,max};
}
function spectralMeasure(points,left,right,continuum=1){
 if(left>right)[left,right]=[right,left];const selected=points.filter(p=>p[0]/10>=left&&p[0]/10<=right);
 if(selected.length<2)return null;let ew=0;for(let i=1;i<selected.length;i++){const a=selected[i-1],b=selected[i];ew+=(b[0]-a[0])/10*(1-(a[1]+b[1])/20000/continuum);}
 const core=selected.reduce((a,b)=>b[1]<a[1]?b:a);
 return {n:selected.length,left:selected[0][0]/10,right:selected.at(-1)[0]/10,core:core[0]/10,intensity:core[1]/10000,depth:1-core[1]/10000/continuum,ew};
}
root.ObservationMath={fit,evaluate,search,spectralMeasure};
})(globalThis);
