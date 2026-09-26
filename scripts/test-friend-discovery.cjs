const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const assert = require('node:assert/strict');
function load(path, requireFn) {
    const context = { exports: {}, require: requireFn, console };
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017 } }).outputText, context);
    return context.exports;
}
const m = load('lib/friendDiscovery.ts');
const profile = (uid, fields = {}) => m.discoveryProfile(uid, { name: uid, isPublic: true, ...fields });
assert.equal(m.normalizeSearchText('  ＡＬＩＣＥ　カタカナ  '), 'alice かたかな');
assert.equal(m.publicFlag(false, true), false);
assert.equal(m.publicFlag(undefined, true), true);
assert.equal(profile('hidden', { dream: 'secret', showDream: false, showDreams: true }).dream, '');
assert.equal(profile('hidden', { lastLoginAt: 123 }).lastLoginAt, null);
const users = [profile('exact', { name: 'Alice' }), profile('prefix', { name: 'Alice Smith' }), profile('part', { name: 'My Alice' }), profile('typo', { name: 'Alicf' }), profile('private', {name: 'Alice', isPublic: false}), profile('me', {name: 'Alice'})];
assert.equal(m.rankSearchUsers(users, 'alice', 'me').map(u => u.uid).join(','), 'exact,prefix,part,typo');
assert.equal(m.rankSearchUsers(users, '   ', 'me').length, 0);
assert.equal(m.rankSearchUsers([profile('x', {name:'ab'})], 'ac', 'me').length, 0);
assert.equal(m.rankSearchUsers([profile('x', {name:'ランニング'})], 'らんにんぐ', 'me').length, 1);
assert.equal(m.rankSearchUsers([profile('x', {dream:'learn guitar', showDream:true})], 'guiter', 'me').length, 1);
assert.equal(m.rankSearchUsers([profile('x', {dream:'secret', showDream:false})], 'secret', 'me').length, 0);
const me = profile('me', {dream:'英語を勉強したい', showDream:true, earnedTitles:['reader']});
const candidates = [me, profile('match', {dream:'英語を勉強する',showDream:true,earnedTitles:['reader']}), profile('followed'), profile('private',{isPublic:false}), profile('other')];
const recommendations = m.recommendUsers(candidates, me, 'me', ['followed']);
assert.equal(recommendations.map(r=>r.user.uid).join(','), 'match,other');
assert.equal(recommendations[0].reasons.join(','), 'similarDream,sharedTitles');
assert.equal(m.recommendUsers(candidates, {...me,isPublic:false}, 'me', [])[0].reasons.length, 0);
assert.equal(m.recommendUsers(Array.from({length:30},(_,i)=>profile(String(i))), null, 'me', []).length, 20);
// Verify the actual Firestore adapter traverses pages and propagates failures.
let calls = 0, fail = false;
const records = Array.from({length: 401}, (_,i) => ({id:String(i).padStart(3,'0'), data:()=>({name:i===400?'Needle':'Other', isPublic:true})}));
const firestore = {
 collection:()=> 'publicUsers', where:()=>({}), orderBy:()=>({}), documentId:()=> '__name__', limit: n=>({limit:n}), startAfter: doc=>({cursor:doc.id}),
 query: (...args)=>args,
 getDocs: async args=> { if(fail) throw new Error('offline'); calls++; const cursor=args.find(a=>a.cursor); const start=cursor?Number(cursor.cursor)+1:0;const docs=records.slice(start,start+200);return {docs,size:docs.length}; },
};
const actions=load('lib/socialActions.ts', name=>name==='firebase/firestore'?firestore:name==='@/lib/firebase'?{db:{}}:m);
(async()=>{
 const result=await actions.searchUsers('Needle','me');
 assert.equal(calls,3); assert.equal(result[0].uid,'400');
 fail=true; await assert.rejects(actions.searchUsers('Needle','me'),/offline/);
 for(const locale of ['ja','en']) { const messages=JSON.parse(fs.readFileSync('messages/'+locale+'.json','utf8'));for(const key of ['searchHint','loadingUsers','searchError','retry','recommendedUsers','similarDream','sharedTitles','noRecommendations','otherUsers']) assert.equal(typeof messages.Friend[key],'string'); }
 console.log('Friend discovery: normalization, ranking, visibility, recommendations, pagination, errors and translations passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
