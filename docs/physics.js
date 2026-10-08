(function(global){
  'use strict';
  const RAD=Math.PI/180, EARTH_RATE=360/365.256, MICRO_TO_DEG=86400*180/Math.PI/1e6;
  function project(lat,lon,b0=0){const p=lat*RAD,l=lon*RAD,b=b0*RAD;return {x:Math.cos(p)*Math.sin(l),y:Math.sin(p)*Math.cos(b)-Math.cos(p)*Math.cos(l)*Math.sin(b),z:Math.sin(p)*Math.sin(b)+Math.cos(p)*Math.cos(l)*Math.cos(b)};}
  function inverse(x,y,b0=0){const rho=Math.hypot(x,y);if(rho>=1)return null;const z=Math.sqrt(1-rho*rho),b=b0*RAD;return {lat:Math.asin(Math.max(-1,Math.min(1,y*Math.cos(b)+z*Math.sin(b))))/RAD,lon:Math.atan2(x,z*Math.cos(b)-y*Math.sin(b))/RAD,mu:z,rho};}
  function b0(date){const jd=new Date(date).getTime()/86400000+2440587.5,T=(jd-2451545)/36525;const M=(357.52911+35999.05029*T)*RAD,L=280.46646+36000.76983*T;const C=(1.914602-.004817*T)*Math.sin(M)+.019993*Math.sin(2*M)+.000289*Math.sin(3*M);const node=73.6667+1.3958333*(jd-2396758)/36525;return Math.asin(Math.sin((L+C-node)*RAD)*Math.sin(7.25*RAD))/RAD;}
  function rate(lat,law='differential'){if(law==='rigid')return 14.1844;const s=Math.sin(lat*RAD)**2;return (2.894-.428*s-.370*s*s)*MICRO_TO_DEG;}
  function fit(points){if(points.length<2)return null;const n=points.length,mx=points.reduce((a,p)=>a+p.t,0)/n,my=points.reduce((a,p)=>a+p.lon,0)/n;let xx=0,xy=0,yy=0;points.forEach(p=>{xx+=(p.t-mx)**2;xy+=(p.t-mx)*(p.lon-my);yy+=(p.lon-my)**2;});if(xx<1e-9)return null;const slope=xy/xx,intercept=my-slope*mx,sse=points.reduce((a,p)=>a+(p.lon-intercept-slope*p.t)**2,0),r2=yy>1e-9?Math.max(0,1-sse/yy):null;const se=n>2?Math.sqrt(sse/(n-2)/xx):null;return {slope,intercept,r2,se,n,synodic:slope>0?360/slope:null,sidereal:slope>0?360/(slope+EARTH_RATE):null};}
  function calibrate(gray,w,h){const pixel=(x,y)=>gray[Math.max(0,Math.min(h-1,Math.round(y)))*w+Math.max(0,Math.min(w-1,Math.round(x)))];let cx=(w-1)/2,cy=(h-1)/2;const xs=[],ys=[];for(let i=0;i<w;i++)if(pixel(i,cy)>25)xs.push(i);for(let i=0;i<h;i++)if(pixel(cx,i)>25)ys.push(i);if(xs.length&&ys.length){cx=(xs[0]+xs.at(-1))/2;cy=(ys[0]+ys.at(-1))/2;}const rs=[];for(let a=0;a<Math.PI*2;a+=Math.PI/36){for(let r=Math.min(w,h)*.35;r<Math.min(w,h)*.495;r+=.5){if(pixel(cx+r*Math.cos(a),cy+r*Math.sin(a))<25){rs.push(r);break;}}}rs.sort((a,b)=>a-b);return {cx,cy,r:rs.length?rs[Math.floor(rs.length/2)]:Math.min(w,h)*.455};}
  function detect(gray,w,h,cal,threshold=.72,minArea=6){const size=w*h,mask=new Uint8Array(size),visited=new Uint8Array(size),hist=Array.from({length:64},()=>new Uint32Array(64));
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){const rho=Math.hypot(x-cal.cx,y-cal.cy)/cal.r;if(rho<.96){const band=Math.min(63,Math.floor(rho*64));hist[band][Math.min(63,Math.floor(gray[y*w+x]/4))]++;}}
    const med=hist.map(row=>{let total=row.reduce((a,b)=>a+b,0),sum=0;for(let j=0;j<64;j++){sum+=row[j];if(sum>=total/2)return j*4+2;}return 128;});
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){const rho=Math.hypot(x-cal.cx,y-cal.cy)/cal.r;if(rho<.96){const norm=gray[y*w+x]/Math.max(1,med[Math.min(63,Math.floor(rho*64))]);if(norm<threshold)mask[y*w+x]=1;}}
    const candidates=[],stack=[];for(let start=0;start<size;start++){if(!mask[start]||visited[start])continue;stack.push(start);visited[start]=1;let area=0,sx=0,sy=0,weight=0,minX=w,maxX=0,minY=h,maxY=0;
      while(stack.length){const i=stack.pop(),x=i%w,y=Math.floor(i/w),wt=Math.max(1,255-gray[i]);area++;sx+=x*wt;sy+=y*wt;weight+=wt;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=w||ny>=h)continue;const n=ny*w+nx;if(mask[n]&&!visited[n]){visited[n]=1;stack.push(n);}}}
      if(area>=minArea&&area<size*.01)candidates.push({x:sx/weight,y:sy/weight,area,radius:Math.max(7,Math.hypot(maxX-minX,maxY-minY)/2+4)});
    }return candidates.sort((a,b)=>b.area-a.area);
  }
  global.SolarMath={RAD,EARTH_RATE,project,inverse,b0,rate,fit,calibrate,detect};
})(globalThis);
