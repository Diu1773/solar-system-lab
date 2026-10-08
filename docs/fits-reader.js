(function(root){
'use strict';
const decoder=new TextDecoder('ascii');
function value(card){
 if(card[8]!=='=')return null;const s=card.slice(10).trim();if(s[0]==="'"){let out='';for(let i=1;i<s.length;i++){if(s[i]==="'"){if(s[i+1]==="'"){out+="'";i++;}else return out.trim();}else out+=s[i];}return out.trim();}
 const t=s.split('/')[0].trim();if(t==='T')return true;if(t==='F')return false;const n=Number(t.replace(/[Dd]/g,'E'));return t!==''&&Number.isFinite(n)?n:t;
}
function read(buffer){
 const bytes=new Uint8Array(buffer),dv=new DataView(buffer);if(bytes.length<2880||decoder.decode(bytes.subarray(0,8)).trim()!=='SIMPLE')throw new Error('FITS의 SIMPLE 헤더를 찾을 수 없습니다.');
 const hdus=[];let offset=0;
 while(offset+80<=bytes.length&&hdus.length<100){
  const start=offset,cards=[],header={};let end=false;
  while(offset+80<=bytes.length&&offset-start<2e6){const card=decoder.decode(bytes.subarray(offset,offset+80));offset+=80;cards.push(card);const key=card.slice(0,8).trim();if(key==='END'){end=true;break;}if(key&&card[8]==='=')header[key]=value(card);}
  if(!end)throw new Error('FITS END 카드가 없습니다.');const dataOffset=start+Math.ceil((offset-start)/2880)*2880;
  const naxis=Number(header.NAXIS||0),bitpix=Number(header.BITPIX||8),dims=Array.from({length:naxis},(_,i)=>Number(header['NAXIS'+(i+1)]||0)),elements=naxis?dims.reduce((a,b)=>a*b,1):0;
  const length=(elements+Number(header.PCOUNT||0))*Math.abs(bitpix)/8*Number(header.GCOUNT||1);if(!Number.isSafeInteger(length)||length<0||dataOffset+length>bytes.length)throw new Error('FITS 데이터 길이가 헤더와 맞지 않습니다.');
  hdus.push({header,cards,dataOffset,bitpix,dims,elements,index:hdus.length});offset=dataOffset+Math.ceil(length/2880)*2880;if(!length&&offset===start)break;
 }
 const images=hdus.filter(h=>h.dims.length>=1&&h.elements&&(!h.header.XTENSION||String(h.header.XTENSION).trim()==='IMAGE'));
 if(!images.length)throw new Error('이 뷰어는 비압축 FITS 영상 배열을 읽습니다. 타일 압축·광도 표는 전용 분석 도구로 열어주세요.');
 const image=images.find(h=>h.dims.length>=2)||images[0],w=image.dims[0],h=image.dims[1]||1,n=w*h;
 if(n>3e7)throw new Error('영상이 너무 큽니다. 3000만 픽셀 이하의 구간을 사용하세요.');const data=new Float64Array(n),step=Math.abs(image.bitpix)/8,scale=Number(image.header.BSCALE??1),zero=Number(image.header.BZERO??0),blank=image.header.BLANK;
 for(let i=0;i<n;i++){const p=image.dataOffset+i*step;let raw;switch(image.bitpix){case 8:raw=dv.getUint8(p);break;case 16:raw=dv.getInt16(p,false);break;case 32:raw=dv.getInt32(p,false);break;case 64:raw=Number(dv.getBigInt64(p,false));break;case -32:raw=dv.getFloat32(p,false);break;case -64:raw=dv.getFloat64(p,false);break;default:throw new Error('지원하지 않는 BITPIX입니다.');}data[i]=image.bitpix>0&&blank!==undefined&&raw===blank?NaN:raw*scale+zero;}
 const samples=[];let min=Infinity,max=-Infinity,valid=0;for(let i=0;i<n;i++){const v=data[i];if(!Number.isFinite(v))continue;min=Math.min(min,v);max=Math.max(max,v);valid++;if(i%Math.max(1,Math.floor(n/15000))===0)samples.push(v);}samples.sort((a,b)=>a-b);
 const quantile=p=>samples[Math.min(samples.length-1,Math.floor((samples.length-1)*p))];
 return {data,width:w,height:h,header:image.header,cards:image.cards,hdus,min,max,valid,q01:quantile(.01),q50:quantile(.5),q99:quantile(.99),q999:quantile(.999)};
}
function aperture(image,x,y,r){
 const inner=1.7*r,outer=2.5*r,sky=[],ap=[];let clipped=false;
 for(let yy=Math.floor(y-outer);yy<=Math.ceil(y+outer);yy++)for(let xx=Math.floor(x-outer);xx<=Math.ceil(x+outer);xx++){const d=Math.hypot(xx-x,yy-y);if(d>outer)continue;if(xx<0||xx>=image.width||yy<0||yy>=image.height){clipped=true;continue;}const v=image.data[yy*image.width+xx];if(!Number.isFinite(v))continue;if(d<=r)ap.push(v);else if(d>=inner)sky.push(v);}
 if(!ap.length||!sky.length)return null;sky.sort((a,b)=>a-b);const mid=sky.length>>1,background=sky.length%2?sky[mid]:(sky[mid-1]+sky[mid])/2,sum=ap.reduce((a,b)=>a+b,0),flux=sum-background*ap.length;
 return {x:x+1,y:y+1,r,n:ap.length,skyN:sky.length,background,sum,flux,clipped};
}
root.FitsReader={read,aperture};
})(globalThis);
