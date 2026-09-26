// Adapter for existing action tests. The economy's real persistence boundary is
// exercised separately by test-economy.cjs.
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const context = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/economyModel.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, context);
const model = context.exports;
exports.model = model;
exports.actions = (docs, makeRef = path => path, local) => ({
  async readEconomy(tx, uid) {
    const path = `users/${uid}`, ref = makeRef(path);
    const profile = (await tx.get(ref)).data() || {};
    const list = name => [...docs].filter(([k]) => k.startsWith(`${path}/${name}/`)).map(([k, data]) => ({ ...data, id: k.split('/').at(-1) }));
    const habits = list('habits'), goals = list('goals');
    return { ref, profile: profile.fairyRoom ? { ...profile, fairyRoom: model.withoutLegacyCoins(profile.fairyRoom) } : profile, habits, goals, economy: model.migrateLegacyCoins(model.reconcileEconomy(profile, habits, goals), profile.fairyRoom?.coins) };
  },
  async syncEconomy(uid) {
    const p = docs.get(`users/${uid}`) || {};
    const list = name => [...docs].filter(([k]) => k.startsWith(`users/${uid}/${name}/`)).map(([k, d]) => ({ ...d, id: k.split('/').at(-1) }));
    const economy = model.reconcileEconomy(p, list('habits'), list('goals'));
    docs.set(`users/${uid}`, { ...p, economy }); return economy;
  },
  syncLocalEconomy() {
    if (!local) return;
    const p = local.getProfile() || {};
    const economy = model.reconcileEconomy(p, [], []);
    local.setProfile({ ...p, economy }); return economy;
  },
});
