# TypeScript / JavaScript コーディングルール

## 一般パターン

- async/await を使用: Promise チェーンより async/await を優先
- 関数型プログラミング: 可能な限り関数型アプローチを優先
- 早期リターン: ネストを減らすため早期リターンを使用
- アロー関数のみ: function キーワードではなくアロー関数を使用
- 戻り値の型注釈: 関数の戻り値には型注釈を必須
- 使用前に宣言: 変数・関数は使用前に宣言
- const をデフォルト: 再代入がない限り const を使用
- 関数内関数を避ける: ネストした関数定義を避ける
- 副作用を避ける: 純粋関数を優先

```typescript
// ❌ NG: Promise チェーン
const fetchData = (): Promise<Data> =>
  fetch("/api")
    .then((r) => r.json())
    .then((d) => d.data);

// ✅ OK: async/await
const fetchData = async (): Promise<Data> => {
  const response = await fetch("/api");
  const json = await response.json();
  return json.data;
};
```

```typescript
// ❌ NG: ネストが深い
const process = (user: User | null): string => {
  if (user) {
    if (user.isActive) {
      if (user.name) {
        return user.name;
      }
    }
  }
  return "unknown";
};

// ✅ OK: 早期リターン
const process = (user: User | null): string => {
  if (!user) return "unknown";
  if (!user.isActive) return "unknown";
  if (!user.name) return "unknown";
  return user.name;
};
```

## 配列操作

破壊的メソッド禁止: push/pop/shift/unshift/splice/sort/reverse を避け、スプレッド構文や map/filter/concat/toSorted/toReversed を使用。

```typescript
// ❌ NG: 破壊的メソッド
const items: string[] = [];
items.push("a");
items.sort();

// ✅ OK: 非破壊的メソッド
const items = [...prevItems, "a"];
const sorted = items.toSorted((a, b) => a.localeCompare(b));
```

```typescript
// ❌ NG: forEach
items.forEach((item) => {
  console.log(item);
});

// ✅ OK: for...of
for (const item of items) {
  console.log(item);
}
```

## 関数設計

- 引数 3 つ以上はオブジェクトで受け取る
- Promise.all で並列処理

```typescript
// ❌ NG: 引数が多い
const createUser = (name: string, email: string, age: number, role: string): User => {
  // ...
};

// ✅ OK: オブジェクトで受け取る
type CreateUserInput = {
  name: string;
  email: string;
  age: number;
  role: string;
};

const createUser = (input: CreateUserInput): User => {
  // ...
};
```

```typescript
// ❌ NG: 逐次実行
const user = await fetchUser(id);
const posts = await fetchPosts(id);

// ✅ OK: 並列実行
const [user, posts] = await Promise.all([fetchUser(id), fetchPosts(id)]);
```

## インポート / エクスポート

- `import * as` は使わない: 名前付きインポートで必要なものだけ取得する
- バレルファイル（`index.ts`）はスターエクスポートを使用する

```typescript
// ❌ NG: ワイルドカードインポート
import * as utils from "./utils";

// ✅ OK: 名前付きインポート
import { formatDate, parseDate } from "./utils";

// ✅ OK: バレルファイル（index.ts）はスターエクスポート
export * from "./Button.tsx";
```

## 型定義

- interface ではなく type を使用
- ファイル名: kebab-case
- 型名: PascalCase
- ファクトリ関数: `create` プレフィックス
- any 型禁止
- 非 null アサーション（`!`）禁止
- enum ではなく const object を使用

```typescript
// ❌ NG: interface
interface User {
  name: string;
  age: number;
}

// ✅ OK: type
type User = {
  name: string;
  age: number;
};
```

```typescript
// ❌ NG: enum
enum Status {
  Active = "active",
  Inactive = "inactive",
}

// ✅ OK: const object
const STATUS = {
  active: "active",
  inactive: "inactive",
} as const;

type Status = (typeof STATUS)[keyof typeof STATUS];
```

```typescript
// ❌ NG: any
const parse = (input: any): any => {
  /* ... */
};

// ✅ OK: 具体的な型
const parse = (input: unknown): Result => {
  /* ... */
};
```

```typescript
// ❌ NG: 非 null アサーション
const name = user!.name;

// ✅ OK: 明示的なチェック
if (!user) throw new Error("user is required");
const name = user.name;
```

## テストルール

- テストの `describe` と `it` の説明文は日本語で書く
- テストファイル名は `*.test.ts` とする
- テストでのモック最小化: モックの使用を最小限に

```typescript
// ✅ OK
describe("createFormatAsJsonUsecase", () => {
  it("有効な JSON 文字列を返す", () => {
    // ...
  });

  it("すべてのサマリーフィールドを含む", () => {
    // ...
  });
});

// ❌ NG
describe("createFormatAsJsonUsecase", () => {
  it("should return valid JSON string", () => {
    // ...
  });
});
```
