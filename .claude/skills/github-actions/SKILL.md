---
name: github-actions
description: |
  GitHub Actions ワークフローの設計パターンを提供します。
  CI/CD パイプラインを作成・修正する際に自動的にトリガーされます。
---

# GitHub Actions ガイド

`.github/workflows/` 配下のワークフロー作成ルール。

## ワークフロー種別

| 種別          | 命名規則               | トリガー                             |
| ------------- | ---------------------- | ------------------------------------ |
| CI            | `ci-<package>.yml`     | main ブランチへの push（paths 指定） |
| Deploy        | `deploy-<package>.yml` | タグ push                            |
| PR Validation | `pr-validation.yml`    | pull_request_target                  |
| Scheduled     | `sync-*.yml`           | schedule / workflow_dispatch         |

## 設計ルール

### アクションの SHA ピン留め

全アクションはタグではなくコミット SHA でピン留め。コメントでバージョンを併記して可読性を維持。

```yaml
# ✅ OK
- uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5 # v4.3.1

# ❌ NG
- uses: actions/checkout@v4
```

### permissions

最小権限の原則。ワークフロー単位で必要な権限のみ設定。

### セットアップ共通アクション

`.github/actions/setup/action.yml` にパッケージマネージャ + Node.js + 依存インストールを集約。各ワークフローから `uses: ./.github/actions/setup` で呼び出す。

## CI ワークフロー構成

各パッケージの CI は以下のジョブで構成する。

```yaml
jobs:
  lint: # リント
  format: # フォーマットチェック
  typecheck: # 型チェック
  test: # テスト
  release: # リリース（needs: [lint, format, typecheck, test]）
```

### paths 指定

対象パッケージのみトリガーする。

```yaml
on:
  push:
    branches:
      - main
    paths:
      - "packages/<name>/**"
```
