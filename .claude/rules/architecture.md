# CLI アーキテクチャガイド

## レイヤー構成

CLI アプリケーションは以下の 4 レイヤーで構成する。

```
cli → usecases → services → infra
```

| レイヤー | 責務                                                        |
| -------- | ----------------------------------------------------------- |
| cli      | DI の組み立てとコマンドルーティング                         |
| usecases | 軽量。services を組み合わせて結果を返す                     |
| services | ドメインロジック。操作単位で分割、相互依存なし              |
| infra    | ドメイン非依存の汎用機能（FileSystem, ConsoleFormatter 等） |

## ディレクトリ構成

```
src/
├── cli/                 # CLI コマンドディレクトリ
│   ├── index.ts         # エントリポイント、DI 組み立て
│   ├── types.ts         # CLI 共通型定義
│   └── {name}-command.ts # 各コマンド実装
├── index.ts             # ライブラリエクスポート
├── models/              # スキーマ定義（ドメインごとに分割）
│   ├── index.ts
│   ├── common.ts
│   └── {domain}.ts
├── infra/               # ドメイン非依存の汎用機能
│   └── {name}.ts
├── services/            # ドメインロジック
│   ├── index.ts         # createServices, Services, ServiceContext 型
│   └── {name}-service.ts
├── usecases/            # services のオーケストレーション
│   └── {name}-usecase.ts
└── utils/               # ヘルパー関数（index.ts なし、個別ファイルから直接 import）
    ├── ArrayUtils.ts
    ├── DateUtils.ts
    └── StringUtils.ts
```

## ファイル命名規則

| 種別           | パターン            | 例                                              |
| -------------- | ------------------- | ----------------------------------------------- |
| コマンド       | `{name}-command.ts` | `check-command.ts`, `sync-command.ts`           |
| サービス       | `{name}-service.ts` | `fetch-data-service.ts`, `normalize-service.ts` |
| ユースケース   | `{name}-usecase.ts` | `check-usecase.ts`, `sync-usecase.ts`           |
| ユーティリティ | `{Name}Utils.ts`    | `DateUtils.ts`, `StringUtils.ts`                |
| モデル         | `{domain}.ts`       | `user.ts`, `config.ts`                          |
| テスト         | `*.test.ts`         | `fetch-data-service.test.ts`                    |

## コマンド実装パターン

各コマンドは独立したファイルに分離し、usecases を受け取るファクトリ関数で定義する。

```typescript
// check-command.ts
type CheckCommandDeps = {
  usecases: Pick<Usecases, "check">;
};

export const createCheckCommand = ({ usecases }: CheckCommandDeps) => {
  return async (args: string[]): Promise<void> => {
    const result = await usecases.check.execute();
    // 結果の出力
  };
};
```

## エントリポイント（DI パターン）

cli/index.ts で依存を組み立て、コマンドをルーティングする。

```typescript
// cli/index.ts
const main = async (): Promise<void> => {
  const infra = createInfra();
  const services = createServices({ infra });
  const usecases = createUsecases({ services, infra });

  const [command, ...args] = process.argv.slice(2);

  const commands: Record<string, (args: string[]) => Promise<void>> = {
    check: createCheckCommand({ usecases }),
    sync: createSyncCommand({ usecases }),
  };

  const handler = commands[command ?? ""];
  if (!handler) {
    console.error(`Unknown command: ${command}`);
    process.exit(1);
  }

  await handler(args);
};

main();
```

## package.json のスクリプト

```jsonc
{
  "scripts": {
    "start": "node --experimental-strip-types src/cli/index.ts --",
    "test": "vitest run",
    "typecheck": "tsc --noEmit",
  },
}
```

## services の設計

操作単位で分割する。service 間は依存しない。

型定義規則:

- `ServiceContext`: 共通の context 型（`index.ts` で定義・エクスポート）
- `*Input`: サービスの入力型
- `*Output`: サービスの出力型
- `*Service`: サービスのインターフェース

```typescript
// index.ts
import type { Infra } from "../infra/index.ts";

export type ServiceContext = {
  infra: Infra;
};

// fetch-data-service.ts
import type { ServiceContext } from "./index.ts";

export type FetchDataInput = { id: string };
export type FetchDataOutput = DataItem[];
export type FetchDataService = {
  fetch: (input: FetchDataInput) => Promise<FetchDataOutput>;
};

export const createFetchDataService = (context: ServiceContext): FetchDataService => {
  const { dataClient } = context.infra;
  // ...
};
```

## usecases の設計

軽量に保つ。services を呼び出して結果を組み合わせるだけ。

```typescript
export const createMyUsecase = (context: UsecaseContext): MyUsecase => {
  const { readData, formatData } = context.services;

  return {
    execute: async (input) => {
      const data = await readData.execute(input);
      return {
        data,
        formattedOutput: formatData.execute(data, input.outputFormat),
        hasErrors: data.some((d) => d.meta.status === "error"),
      };
    },
  };
};
```

## テスト

- usecases と services を中心にテスト
- infra はモックで代替可能に設計
- CLI のエントリポイントは統合テストで検証

## 設計原則

- infra はドメイン知識を持たない
- services は操作単位で分割し、相互依存させない
- usecases は軽量に保ち、services のオーケストレーションに徹する
- utils には index.ts を置かず、個別ファイルから直接 import する
