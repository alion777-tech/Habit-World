// Offline AI handoff: print a prompt, validate a proposal, or merge into a NEW review file.
const fs = require("node:fs");
const bank = require("../data/fairy/ja.json");
const [mode, path, output] = process.argv.slice(2);
const normalize = text => text.normalize("NFKC").replace(/[\s、。！？!?「」]/g, "");
function validate(data, proposal = false) {
  if (!data || typeof data !== "object" || Array.isArray(data)) throw Error("カテゴリーをキーにしたJSONオブジェクトが必要です");
  const seen = new Set();
  for (const [key, lines] of Object.entries(data)) {
    if (!Object.hasOwn(bank, key) || !Array.isArray(lines) || !lines.length) throw Error("不正なカテゴリー: " + key);
    for (const text of lines) {
      if (typeof text !== "string" || !text.trim() || text.length > 80) throw Error(key + ": セリフは1〜80文字");
      if (/俺|僕|私|あたし|サボ|怠け|しなさい|べき/.test(text)) throw Error(key + ": 口調を見直してください: " + text);
      const normalized = normalize(text);
      if (seen.has(normalized)) throw Error("重複候補: " + text);
      if (proposal && bank[key].some(t => normalize(t) === normalized)) throw Error("既存セリフとの重複: " + text);
      seen.add(normalized);
    }
  }
}
try {
  if (mode === "prompt") {
    console.log("ハビットワールドの妖精のセリフを、以下の各カテゴリーに12件ずつ追加してください。JSONオブジェクトのみ出力。");
    console.log("男女共通、一人称なし。優しく自然で短い話し言葉。責めない、催促しない、成果や気分を捏造しない。単なる語尾・句読点の変更は禁止。観察、問いかけ、喜び、ねぎらい、静かな寄り添いを混ぜる。各カテゴリーの条件以外の事実を前提にしない。1件80文字以下。既存のセリフと重複しない。");
    console.log(JSON.stringify(bank, null, 2));
  } else if (mode === "check" || mode === "merge") {
    const data = JSON.parse(fs.readFileSync(path, "utf8"));
    validate(data, true);
    if (mode === "merge") {
      if (!output) throw Error("レビュー用の新規出力パスを指定してください");
      const merged = structuredClone(bank);
      for (const [key, lines] of Object.entries(data)) merged[key].push(...lines);
      fs.writeFileSync(output, JSON.stringify(merged, null, 2) + "\n", { flag: "wx" });
    }
    console.log("候補検証OK。意味の重複と状況への適合は人間がレビューしてください。");
  } else throw Error("使い方: node scripts/fairy-data.cjs prompt | check candidates.json | merge candidates.json review.json");
} catch (error) { console.error(error.message); process.exitCode = 1; }
