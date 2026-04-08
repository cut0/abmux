---
name: git-ops
description: |
  Git リポジトリの一般的なワークフローを実行します。
  Git 操作やコミット・PR 作成時に自動的にトリガーされます。
---

# Git ワークフロー

## ブランチ戦略

- ベースブランチ: 指定がない場合は `main` を使用
- 最新から分岐: 常に最新のベースブランチから分岐
- 命名規則: `feature/{task-description}`

## ブランチ作成手順

```bash
git checkout main
git pull --rebase origin main
git checkout -b feature/{branch-name}
```

## コミットルール

### フォーマット

```
<type>: <description>

Co-Authored-By: Claude <noreply@anthropic.com>
```

- コミットメッセージ・PR タイトル・PR 本文の記述言語はプロジェクトの `CLAUDE.md` の指定に従う

### 許可されるタイプ

| タイプ     | 説明                 |
| ---------- | -------------------- |
| `feat`     | 新機能               |
| `update`   | 既存機能の更新       |
| `fix`      | バグ修正             |
| `refactor` | リファクタリング     |
| `test`     | テスト関連           |
| `docs`     | ドキュメントのみ     |
| `chore`    | その他のメンテナンス |

### Co-Author

- コミットには必ず Co-Authored-By を追加

## コミット・プッシュ・PR 作成前の確認事項

1. リント実行: lint がパスすることを確認
2. フォーマット実行: コードが整形されていることを確認
3. 型チェック実行: 型エラーがないことを確認（該当プロジェクトの場合）
4. テスト実行: 変更ファイルに関連するテストを実行
5. すべてのチェックがパス: 上記すべてが成功していることを確認

## PR 作成前の差分検証（必須）

### 1. ベースブランチとの差分確認

```bash
git fetch origin main
git log --oneline origin/main..HEAD
git diff origin/main...HEAD --stat
```

- 意図しないコミットが含まれていないことを確認する
- 差分のファイル一覧が意図したものだけであることを確認する

### 2. マージ済み差分の混入チェック

```bash
git merge-base --is-ancestor origin/main HEAD && echo "OK: main is ancestor" || echo "WARNING: main is not ancestor - rebase needed"
```

### 3. ワーキングツリーの未コミット変更

```bash
git status
git diff --stat
```

- 未コミットの変更がある場合、PR に含めるべきか、除外すべきかをユーザーに確認する
