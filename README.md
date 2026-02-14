# 点数計算アプリ エグチマン

## 概要
麻雀の対局スコア管理アプリ。  
4人打ちの対局作成〜半荘ごとの点数登録・集計を扱う。  
小規模グループ運用を想定した軽量SPA + Supabase構成。

## 技術的特徴
- ドメインロジックの純関数化（計算・検証を `domain.ts` に集約して再利用性を確保）
- スコア計算の決定性担保（同点時は座席インデックスで安定ソート）
- 部分書き込み回避の設計（複数テーブル挿入失敗時に後続削除で整合性維持）
- 参加者/席順の履歴対応（`game_seats` を別テーブルに切り出し、対局ごとの席順を保存）
- 集計ロジックの二重化（`participant_id` 優先、欠損時は席順でフォールバック集計）

## 技術スタック
- Frontend: HTML / CSS / Vanilla TypeScript（ビルド後に JavaScript を配信）
- Backend: Supabase Edge Functions (Deno / TypeScript)
- DB: Supabase Postgres
- Infra: Supabase / Static Hosting

## アーキテクチャ
- SPA（`frontend/`）→ Edge Functions → Postgres
- APIは `supabase/functions/matches` に集約（対局作成・一覧・詳細・半荘登録）
- ドメイン計算とバリデーションを `supabase/functions/matches/domain.ts` に分離
- 5テーブル構成（`matches / participants / games / game_scores / game_seats`）
  - スコアは `game_scores`、席順履歴は `game_seats` に分離し更新影響を局所化

## 技術的課題と解決

### 課題1：同点時の順位と計算の一貫性
- 原因: 同点時の順位付けが曖昧だとPT算出が非決定になる
- 対策: `raw_score` 同点時は `seat_index` で安定ソートして順位を確定

### 課題2：部分書き込みによるデータ不整合
- 原因: `game_scores` 成功後に `game_seats` が失敗すると不整合が残る
- 対策: 失敗時に `games` / `game_scores` を削除し整合性を保持

### 課題3：対局途中の席順変更に伴う集計崩れ
- 原因: 座席と参加者が固定前提だと、席順ローテーションで累計が崩れる
- 対策: `game_seats` を分離して半荘ごとの席順を保持し、集計は `participant_id` 基準に統一

## セットアップ

```bash
# フロントTSをJSへ変換
make build-frontend-ts

# Supabase 起動
supabase start

# フロント起動
cd frontend
python3 -m http.server 3000
```

ブラウザで `http://localhost:3000` を開く。

## Demo
https://eguchiman-v3.pages.dev/
