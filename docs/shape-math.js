(function(root){
'use strict';
const TAU=2*Math.PI,DEG=Math.PI/180;
function rawMag(phase,s){const theta=s.aspect*DEG,psi=TAU*phase+s.offset*DEG,nx=Math.sin(theta)*Math.cos(psi),ny=Math.sin(theta)*Math.sin(psi),nz=Math.cos(theta),area=Math.PI*s.a*s.c*Math.sqrt(nx*nx/(s.a*s.a)+ny*ny+nz*nz/(s.c*s.c));return -2.5*Math.log10(area);}
function fit(sessions,period,s,detail=true){
 const epoch=Math.min(...sessions.flatMap(t=>t.points.map(p=>p[0]))),curve=Array.from({length:241},(_,i)=>rawMag(i/240,s)),mean=curve.slice(0,-1).reduce((a,b)=>a+b,0)/240;let sum=0,n=0;const points=[];
 for(const session of sessions){const rows=session.points.map((p,i)=>{const phase=(((p[0]-epoch)*24/period)%1+1)%1;return {jd:p[0],m:-2.5*Math.log10(p[1]),flux:p[1],phase,predicted:rawMag(phase,s)-mean,session:session.id,index:i};});const zero=rows.reduce((v,p)=>v+p.m-p.predicted,0)/rows.length;for(const p of rows){p.adjusted=p.m-zero;p.residual=p.adjusted-p.predicted;sum+=p.residual**2;n++;if(detail)points.push(p);}}
 return {rms:Math.sqrt(sum/n),points,curve:curve.map(v=>v-mean),amplitude:Math.max(...curve)-Math.min(...curve),epoch,mean};
}
function optimize(sessions,period,state){
 let best={...state},rms=Infinity;
 for(let a=1;a<=1.80001;a+=.02)for(let offset=0;offset<180;offset+=4){const candidate={...state,a,offset},r=fit(sessions,period,candidate,false).rms;if(r<rms){rms=r;best=candidate;}}
 const a0=best.a,o0=best.offset;for(let a=Math.max(1,a0-.024);a<=Math.min(1.8,a0+.024);a+=.002)for(let offset=o0-4;offset<=o0+4;offset+=.5){const candidate={...state,a,offset:(offset+180)%180},r=fit(sessions,period,candidate,false).rms;if(r<rms){rms=r;best=candidate;}}
 return {...best,rms};
}
function ellipsoid(a,c,latSteps=18,lonSteps=36){const vertices=[],faces=[];for(let i=0;i<=latSteps;i++){const lat=Math.PI*i/latSteps;for(let j=0;j<lonSteps;j++){const lon=TAU*j/lonSteps;vertices.push([a*Math.sin(lat)*Math.cos(lon),Math.sin(lat)*Math.sin(lon),c*Math.cos(lat)]);}}for(let i=0;i<latSteps;i++)for(let j=0;j<lonSteps;j++){const p=i*lonSteps+j,q=i*lonSteps+(j+1)%lonSteps,r=p+lonSteps,t=q+lonSteps;if(i>0)faces.push([p,r,q]);if(i<latSteps-1)faces.push([q,r,t]);}return {vertices,faces};}
root.ShapeMath={rawMag,fit,optimize,ellipsoid};
})(globalThis);
