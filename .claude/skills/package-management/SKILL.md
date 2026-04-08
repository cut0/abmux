---
name: package-management
description: |
  パッケージのインストールと依存管理のルールを提供します。
  npm/pnpm でパッケージをインストールする際に自動的にトリガーされます。
---

# パッケージ管理ガイド

## バージョン指定

厳密なバージョンを使用する。`^` や `~` のレンジ指定は使わない。

```bash
# ❌ NG: レンジ指定（デフォルト）
pnpm add react

# ✅ OK: 厳密なバージョン
pnpm add react@18.3.1 --save-exact

# ✅ OK: --save-exact をデフォルトにする（.npmrc）
# save-exact=true
```

`.npmrc` に `save-exact=true` を設定しておけば、`--save-exact` の指定を省略できる。

```ini
# .npmrc
save-exact=true
```

## npx の使用禁止

`npx` は意図しないパッケージの実行やバージョン不一致を招く。ローカルにインストールした上で `pnpm exec` または package.json の scripts 経由で実行する。

```bash
# ❌ NG: npx
npx eslint .
npx tsc --noEmit

# ✅ OK: pnpm exec
pnpm exec eslint .
pnpm exec tsc --noEmit

# ✅ OK: package.json の scripts
pnpm lint
pnpm typecheck
```

## パッケージマネージャ

プロジェクトで指定されたパッケージマネージャを使用する。`package.json` の `packageManager` フィールドまたはロックファイルで判断する。

| ロックファイル      | パッケージマネージャ |
| ------------------- | -------------------- |
| `pnpm-lock.yaml`    | pnpm                 |
| `package-lock.json` | npm                  |
| `yarn.lock`         | yarn                 |
| `bun.lockb`         | bun                  |

異なるパッケージマネージャのコマンドを混在させない。

## インストールコマンド

```bash
# CI / クリーンインストール（ロックファイルに厳密に従う）
pnpm install --frozen-lockfile

# 開発時の依存追加
pnpm add <package>@<version> --save-exact

# 開発依存の追加
pnpm add -D <package>@<version> --save-exact
```

## ロックファイル

- ロックファイルは必ずコミットする
- ロックファイルを手動で編集しない
- CI では `--frozen-lockfile` を使用してロックファイルとの差分を許容しない
