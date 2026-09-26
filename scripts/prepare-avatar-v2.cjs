// Slice the transparent sheets edited from the supplied artwork; coordinates use a 500 x 600 stage.
const sharp=require('sharp');const fs=require('fs');const path=require('path');
const root='C:/Users/k-003/.codex/generated_images/01a0a3a1-df7c-7461-931f-12ba1a2e9603';
const sheets=[
 ['hair','4056742b-6cc6-4768-a379-a10c20ae781e',['long','bob','short','twintail','spiky','straight'],3,2],
 ['outfit','1ceabdf2-abd3-4557-9334-99991c36f80d',['royal-dress','leaf-dress','gothic','petal','leaf','star'],3,2],
 ['outfit','4c8145b3-e2fa-4460-b0e7-1035408379c5',['prince','ranger','coat','bard','armor','wizard'],3,2],
 ['wings','e7fa0748-7b30-46c9-ab2a-ab005e144286',['butterfly','leaf','light','crystal','dragonfly','night'],3,2],
 ['accessory','a0069a97-b827-4c8e-b459-4ed783894ca8',['cat','dog','rabbit','crown','flowers','hairpin','antenna','butterfly','tiara'],3,3],
];
sheets.push(['base',process.argv[2]||'13261ec0-956b-4bf7-9998-5944104c5ad8',['gentle','boy','anime','happy'],4,1]);
(async()=>{
 const target='public/avatar/v2/parts';fs.mkdirSync(target,{recursive:true});const registry={};
 for(const [category,file,ids,cols,rows] of sheets){
  const source=path.join(root,`exec-${file}.png`);const meta=await sharp(source).metadata();
  for(let index=0;index<ids.length;index++){
   const id=ids[index];let left=Math.floor(index%cols*meta.width/cols),top=Math.floor(Math.floor(index/cols)*meta.height/rows);
   let width=Math.floor(meta.width/cols),height=Math.floor(meta.height/rows);
   const bounds={long:[0,0,540,538],bob:[542,0,474,500],short:[1030,0,506,450],twintail:[0,540,565,484],spiky:[568,504,450,440],straight:[1020,500,516,524],'royal-dress':[0,0,540,503],'leaf-dress':[542,0,460,500],gothic:[1010,0,526,500]};
   if(bounds[id]&&(category==='hair'||category==='outfit'))[left,top,width,height]=bounds[id];
   const {data,info}=await sharp(source).extract({left,top,width,height}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
   let x0=width,y0=height,x1=0,y1=0;for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(data[(y*width+x)*4+3]>32){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
   const w=x1-x0+1,h=y1-y0+1;const key=`${category}-${id}`;
   await sharp(data,{raw:info}).extract({left:x0,top:y0,width:w,height:h}).png().toFile(`${target}/${key}.png`);
   let dw=300,dh=300,y=240;
   if(category==='base'){dw=280;dh=460;y=80;}
   if(category==='wings'){dw=440;dh=360;y=195;}
   if(category==='hair'){
    const sizes={long:[345,350,65],bob:[335,265,65],short:[245,195,60],twintail:[385,335,60],spiky:[295,280,40],straight:[320,350,35]};[dw,dh,y]=sizes[id];
   }
   if(category==='outfit'){dw=id==='leaf'?240:id==='star'?260:290;dh=265;y=282;}
   if(category==='accessory'){dw=['cat','dog','rabbit','antenna'].includes(id)?240:180;dh=dw*h/w;y=id==='rabbit'?-125:45;if(id==='hairpin'||id==='butterfly'){dw=95;dh=dw*h/w;y=110;}}
   registry[key]={src:`/avatar/v2/parts/${key}.png`,x:category==='accessory'&&['hairpin','butterfly'].includes(id)?305:(500-dw)/2,y,width:dw,height:dh};
  }
 }
 fs.writeFileSync('app/(root)/avatar/sprites.json',JSON.stringify(registry,null,2)+'\n');console.log(`${Object.keys(registry).length} transparent parts prepared`);
})().catch(e=>{console.error(e);process.exitCode=1});

