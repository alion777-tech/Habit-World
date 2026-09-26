const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript'),sharp=require('sharp');
const file=path.resolve('app/(root)/avatar/model.ts'),mod=new Module(file,module);
mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,file);
const {DEFAULT,OPTIONS,equip,layers,isAvatar,migrate,NONE_VISIBLE}=mod.exports;
const keys=Object.keys(OPTIONS),base=layers(DEFAULT).find(x=>x.id==='mannequin');
let states=[DEFAULT];for(const k of keys)states=states.flatMap(a=>OPTIONS[k].map(o=>equip(a,k,o.id)));
let changes=0;
for(const a of states){assert.ok(isAvatar(a));assert.equal('mannequin' in a,false);assert.deepEqual(layers(a,NONE_VISIBLE),[base]);for(const k of keys)for(const option of OPTIONS[k]){const b=equip(a,k,option.id);for(const layer of layers(a))if(layer.id!==k)assert.deepEqual(layers(b).find(x=>x.id===layer.id),layer);assert.equal(b[k],option.id);changes++;}}
assert.equal(states.length,1296);
assert.deepEqual(migrate({version:2,mannequin:'fairy-boy',name:'引継ぎ',hair:'long',outfit:'star',wings:'leaf'}),{...DEFAULT,name:'引継ぎ',hair:'long',outfit:'star',wings:'leaf'});
assert.equal(migrate({version:2,name:'x',hair:'bad'}),null);
assert.equal(isAvatar({...DEFAULT,eyes:'bad'}),false);
(async()=>{for(const src of [...new Set(layers(DEFAULT).map(x=>x.src).filter(Boolean))]){const p=path.join('public',src.slice(1)),meta=await sharp(p).metadata(),stats=await sharp(p).stats();assert.ok(meta.hasAlpha);assert.equal(stats.channels[3].min,0);assert.equal(stats.channels[3].max,255);}console.log(`PASS ${states.length} combinations, ${changes} independent changes; faceless base, visibility, migration and alpha assets.`);})().catch(e=>{console.error(e);process.exitCode=1;});
