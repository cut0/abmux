# React コーディングルール (Ink TUI)

## インポート

- 名前付きインポートを使用: `React.` 名前空間は使わない
- `forwardRef` の使用禁止: React 19 では ref は通常の props として受け取る

```typescript
// ✅ OK
import { useState, useCallback, type FC } from "react";
import { Box, Text, useInput, useApp } from "ink";

// ❌ NG
import React from "react";
```

## コンポーネント定義

- 1 ファイル 1 コンポーネント
- `FC` を使用してコンポーネントを定義する
- children は明示的に `ReactNode` で型宣言する

```typescript
import type { FC, ReactNode } from "react";
import { Box, Text } from "ink";

type Props = {
  children: ReactNode;
  label: string;
};

export const Section: FC<Props> = ({ children, label }) => {
  return (
    <Box flexDirection="column">
      <Text bold>{label}</Text>
      {children}
    </Box>
  );
};
```

## useEffect の原則禁止

useEffect は外部システムとの同期専用のエスケープハッチ。

許可されるケース（外部システムとの連携のみ）:

- プロセスの spawn / 終了監視
- ファイルシステムの変更監視
- タイマーによる自動終了
- サードパーティライブラリ（非 React）の初期化・破棄

上記以外で useEffect が必要と判断した場合、必ずプランを作成してユーザーに許可を求めること。

### useEffect を使わない代替パターン

派生値はレンダー中に計算する:

```typescript
// ❌ NG
const [label, setLabel] = useState("");
useEffect(() => {
  setLabel(`${prefix}: ${name}`);
}, [prefix, name]);

// ✅ OK
const label = `${prefix}: ${name}`;
```

高コストな計算は useMemo を使う:

```typescript
const filtered = useMemo(() => items.filter((item) => item.name.includes(query)), [items, query]);
```

props 変更時のリセットは key を使う:

```typescript
// ❌ NG
useEffect(() => { setCursor(0); }, [items]);

// ✅ OK
<SelectList key={items.length} items={items} />
```

外部ストアの購読は useSyncExternalStore を使う:

```typescript
// ❌ NG
useEffect(() => {
  const unsub = store.subscribe(() => setState(store.getState()));
  return unsub;
}, []);

// ✅ OK
const state = useSyncExternalStore(store.subscribe, store.getSnapshot);
```

## State 管理

- 派生できる値を state に持たない
- state はコロケーション: 使用箇所に最も近いコンポーネントで管理
- リフトアップは必要最小限
- 複雑な state は useReducer

```typescript
// ❌ NG: 冗長な state
const [items, setItems] = useState<string[]>([]);
const [itemCount, setItemCount] = useState(0);

// ✅ OK: 派生値として計算
const [items, setItems] = useState<string[]>([]);
const itemCount = items.length;
```

## イベントハンドラ

- ハンドラ関数名: `handle` + イベント名（handleSelect, handleConfirm）
- コールバック props 名: `on` + イベント名（onSelect, onConfirm）
- `handle~` 系の関数は必ず useCallback でラップ

```typescript
const handleSelect = useCallback((item: string): void => {
  setSelected(item);
}, []);
```

## useInput パターン

Ink の `useInput` ではステップごとに早期リターンで分岐する。

```typescript
useInput((input, key) => {
  if (input === "q") {
    exit();
    return;
  }

  if (step === "select") {
    if (key.upArrow) setCursor((c) => Math.max(0, c - 1));
    else if (key.downArrow) setCursor((c) => Math.min(items.length - 1, c + 1));
    else if (key.return) handleConfirm();
    return;
  }

  if (step === "input") {
    if (key.return) handleSubmit();
    else if (key.backspace) setValue((prev) => prev.slice(0, -1));
    else if (input && !key.ctrl && !key.meta) setValue((prev) => prev + input);
  }
});
```

## key の使い方

- 安定した一意の識別子を使用する
- `Math.random()` や `Date.now()` を key に使わない
- 配列の index を key に使わない（静的で並び替えが発生しないリストを除く）
- コンポーネントの state リセットには key を活用する

## Hooks のルール

- 依存配列は必ず正確に指定する
- カスタム Hook に抽出: 複数の Hook を組み合わせたロジックは再利用可能なカスタム Hook にする

## パフォーマンス

- useCallback を基本使用する: ハンドラやコールバック関数は useCallback で安定した参照を保つ
- useMemo でリスト処理をメモ化: map, filter 等は useMemo でラップ
- コンポジションで再レンダリング範囲を制御する: memo よりもコンポーネント分割を優先
