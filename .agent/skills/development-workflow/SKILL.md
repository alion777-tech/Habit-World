---
id: skill-workflow-orchestration
name: Workflow & Lesson Management
version: 1.2.0
priority: emergency
---
# Skill: Workflow & Lesson Management

## 0. 実装前の「矛盾・不明点」チェック（最優先）
- コードを生成する前に、仕様の矛盾や不明点を必ず**3つ以上リストアップ**し、ユーザーの回答を待つこと。
- 質問がない場合は「仕様は完璧です」と断言してから始めること。

## 1. 計画と進捗管理 (tasks/todo.md)
- **Plan First**: 3ステップ以上の作業前に 	asks/todo.md を作成・更新し、計画を提示する。
- **Verify Plan**: 実装開始前にユーザーの承認を得る。
- **Track Progress**: ステップ完了ごとにチェックを入れ、進捗を明確にする。

## 2. 同じミスを繰り返さない (tasks/lessons.md)
- **Capture Lessons**: 指摘を受けた際、直ちに 	asks/lessons.md に「問題・原因・再発防止ルール」を記録する。
- **Review Lessons**: セッション開始時に必ず確認し、過去のミスを回避する。

## 3. 検証と品質
- **Never Done Without Proof**: 動作の証拠（ログ等）を提示するまで完了としない。
- **Simplicity First**: 常に最もシンプルで確実な方法を選ぶ。
