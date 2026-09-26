// Extract the six transparent cells from the reference-based starter atlas.
const sharp=require('sharp'),fs=require('fs');
const source=process.argv[2]||'public/avatar/v2/starter-atlas.png';
const entries=[
 ['hair-starter-bob',[512,0,512,512],335,265,55],
 ['accessory-starter-antenna',[1024,0,512,512],230,100,-5],
 ['outfit-starter-green',[0,512,512,512],210,185,280],
 ['outfit-starter-pink',[512,512,470,512],180,180,280],
 ['wings-starter-rainbow',[982,512,554,512],380,250,185],
];
(async()=>{
 const registryPath='app/(root)/avatar/sprites.json';const registry=JSON.parse(fs.readFileSync(registryPath,'utf8'));
 for(const [id,[left,top,width,height],dw,dh,y] of entries){
  const {data,info}=await sharp(source).extract({left,top,width,height}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let x0=width,y0=height,x1=0,y1=0;
  for(let py=0;py<height;py++)for(let px=0;px<width;px++)if(data[(py*width+px)*4+3]>32){x0=Math.min(x0,px);x1=Math.max(x1,px);y0=Math.min(y0,py);y1=Math.max(y1,py);}
  if(x1<=x0||y1<=y0)throw Error(`Empty sprite ${id}`);
  const target=`public/avatar/v2/parts/${id}.png`;
  await sharp(data,{raw:info}).extract({left:x0,top:y0,width:x1-x0+1,height:y1-y0+1}).png().toFile(target);
  registry[id]={src:`/avatar/v2/parts/${id}.png`,x:(500-dw)/2,y,width:dw,height:dh};
 }
 registry['hair-starter-short']={...registry['hair-short']};
 fs.writeFileSync(registryPath,JSON.stringify(registry,null,2)+'\n');
 console.log('Prepared six starter parts.');
})().catch(e=>{console.error(e);process.exitCode=1;});
