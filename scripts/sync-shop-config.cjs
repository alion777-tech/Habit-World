// These Markdown tables are the source of truth. Only table cells are executable data.
const fs=require('node:fs'),path=require('node:path');
const directory=path.resolve(__dirname,'../docs/habit-world/shops');
function rows(file,base=directory){return fs.readFileSync(path.join(base,file),'utf8').split(/\r?\n/).filter(l=>l.startsWith('|')).slice(2).map(l=>l.split('|').slice(1,-1).map(v=>v.trim()));}
function integer(value,label){const n=Number(value);if(!/^\d+$/.test(value)||!Number.isSafeInteger(n)||n>1000000)throw Error(`${label}: 0〜1000000の整数を指定してください`);return n;}
function sync(source=directory,out=path.resolve(__dirname,'../data/shop-catalog.json')){
 const products=[];
 for(const shop of ['elf','dwarf','fairy'])for(const row of rows(`${shop}.md`,source)){
  if(row.length!==9)throw Error(`${shop}: 商品表は9列です`);
  const [id,name,kind,price,effect,amount,target,enabled,description]=row;
  if(!/^[a-z][\w:-]*$/.test(id)||!name||!['consumable','equipment','avatar','closet'].includes(kind)||!['none','health','adventure-ap','material-bonus'].includes(effect)||!['yes','no'].includes(enabled))throw Error(`${shop}/${id}: ID・種別・効果・販売中を確認してください`);
  if(products.some(p=>p.id===id))throw Error(`商品ID重複: ${id}`);
  if(kind==='avatar'&&shop!=='fairy')throw Error('着替えパーツは試着室のある妖精店の商品表に置いてください');
  if(kind==='closet'&&(id!=='closet'||shop!=='fairy')||kind==='avatar'&&!/^(base|hair|accessory|outfit|wings):[\w-]+$/.test(target))throw Error(`対象が不正: ${id}`);
  if(kind==='consumable'&&effect!=='health'||kind==='equipment'&&!['adventure-ap','material-bonus'].includes(effect)||['avatar','closet'].includes(kind)&&effect!=='none')throw Error(`商品種別と効果が不一致: ${id}`);
  products.push({id,name,shop,kind,price:integer(price,id),effect,amount:integer(amount,id),target:target==='-'?'':target,enabled:enabled==='yes',description});
 }
 if(!products.some(p=>p.id==='closet'))throw Error('クローゼットの行を残してください');
 const materials=rows('materials.md',source).map(row=>{if(row.length!==7)throw Error('素材表は7列です');const [id,name,area,min,max,description,enabled]=row;const item={id,name,area,min:integer(min,id),max:integer(max,id),description,enabled:enabled==='yes'};if(!/^[a-z][\w-]*$/.test(id)||area!=='forest'||item.max<item.min||!['yes','no'].includes(enabled))throw Error(`素材設定が不正: ${id}`);return item;});
 if(new Set(materials.map(m=>m.id)).size!==materials.length)throw Error('素材IDが重複しています');
 const buyback=rows('buyback.md',source).map(row=>{if(row.length!==4)throw Error('買取表は4列です');const [shop,material,price,enabled]=row;if(!['elf','dwarf','fairy'].includes(shop)||!materials.some(m=>m.id===material)||!['yes','no'].includes(enabled))throw Error(`買取設定が不正: ${material}`);return {shop,material,price:integer(price,material),enabled:enabled==='yes'};});
 if(new Set(buyback.map(b=>`${b.shop}:${b.material}`)).size!==buyback.length)throw Error('買取行が重複しています');
 const content=JSON.stringify({products,materials,buyback},null,2)+'\n';
 if(!fs.existsSync(out)||fs.readFileSync(out,'utf8')!==content)fs.writeFileSync(out,content);
 return {products,materials,buyback};
}
function watch(onChange=()=>{}){let timer;const watcher=fs.watch(directory,()=>{clearTimeout(timer);timer=setTimeout(()=>{try{sync();onChange();}catch(e){console.error('設定表の反映を中止:',e.message);}},150);});return watcher;}
module.exports={sync,watch};
if(require.main===module){try{const c=sync();console.log(`設定表: 商品${c.products.length}件、素材${c.materials.length}件、買取${c.buyback.length}件`);if(process.argv.includes('--watch'))watch();}catch(e){console.error(e.message);process.exitCode=1;}}
