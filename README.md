# 🚀 GraphAI 逐次処理 vs 並列処理 比較デモ

GraphAIを使用した並列画像処理の効果を**インタラクティブなWebデモ**で実感できます！
同じ画像処理タスクを「逐次処理」と「GraphAI並列処理」で実行して、パフォーマンスの違いを比較します。

## 📋 Docker環境での実行手順

### 1. プロジェクトディレクトリに移動

```bash
cd D:\Development\graphai-image-demo2
```

### 2. 画像ファイル確認

`images/` ディレクトリに以下の画像があることを確認：
- `image1.jpg` - ポートレート画像
- `image2.jpg` - フォトグラファー画像  
- `image3.jpg` - ペッパー画像

### 3. 🚀 比較デモ実行（推奨）

```bash
# 比較デモサーバーを起動
docker-compose up graphai-comparison-demo
```

**アクセス**: `http://localhost:3000`

### 4. 📊 従来デモ実行（オプション）

```bash
# 従来のデモも同時実行可能
docker-compose up graphai-demo
```

**アクセス**: `http://localhost:3001`

### 5. 🎪 両方同時実行

```bash
# すべてのサービスを同時起動
docker-compose up
```

- **比較デモ**: `http://localhost:3000`
- **従来デモ**: `http://localhost:3001`

## 🎬 インタラクティブデモの使い方

### Step 1: Webブラウザでアクセス
```
http://localhost:3000
```

### Step 2: デモ実行
1. **「🔄 逐次処理実行」**ボタンをクリック
   - 従来の1つずつ順番に処理する方法
   - 処理時間が計測されます

2. **「⚡ GraphAI並列処理実行」**ボタンをクリック  
   - GraphAIによる並列処理
   - 自動的に依存関係を解析して最適化

3. **結果比較**
   - 速度向上率、効率改善、時間短縮が表示
   - 処理済み画像も確認できます

### Step 3: リセット
- **「🗑️ リセット」**ボタンで初期状態に戻す

## 📊 Docker環境での実行コマンド一覧

```bash
# 🎯 比較デモのみ起動（推奨）
docker-compose up graphai-comparison-demo

# 🔧 バックグラウンド実行
docker-compose up -d graphai-comparison-demo

# 🧹 コンテナ停止・削除
docker-compose down

# 🔄 イメージ再ビルド
docker-compose build

# 📝 ログ確認
docker-compose logs graphai-comparison-demo

# 🏗️ 強制再ビルド
docker-compose build --no-cache
```

## 🎯 期待される結果

### 一般的なパフォーマンス向上
- **速度向上**: 2-3倍
- **効率改善**: 50-70%
- **時間短縮**: 1000-2000ms

### GraphAIの利点
✅ **宣言的記述**: YAMLで処理フローを簡単に定義  
✅ **自動並列化**: 依存関係を解析して自動で並列実行  
✅ **エラーハンドリング**: 個別処理の失敗が全体に影響しない  
✅ **スケーラビリティ**: 画像数やステップ数の追加が容易

## 🎥 プレゼンテーション用の流れ

### 1. Docker起動 (30秒)
```bash
docker-compose up graphai-comparison-demo
```

### 2. デモ実行 (3分)
1. **逐次処理実行** → 基準時間の測定
2. **GraphAI実行** → 並列処理の効果確認
3. **結果比較** → 具体的な数値で効果を実感

### 3. 技術説明 (2分)
- **YAML設定**: わずか50行で並列処理パイプライン
- **依存関係解析**: 自動的にグラフ構造を最適化
- **拡張性**: 新しい処理の追加が容易

## 🐛 トラブルシューティング

### よくある問題

#### 1. ポート3000が使用中
```bash
# docker-compose.ymlのポート変更
ports:
  - "3001:3000"  # 3001ポートを使用
```

#### 2. イメージビルドエラー
```bash
# キャッシュをクリアして再ビルド
docker-compose build --no-cache
```

#### 3. コンテナが起動しない
```bash
# ログ確認
docker-compose logs graphai-comparison-demo

# コンテナ状態確認
docker-compose ps
```

#### 4. 画像ファイルが見つからない
```bash
# ホスト側で確認
ls images/
# image1.jpg, image2.jpg, image3.jpg があることを確認

# コンテナ内で確認
docker-compose exec graphai-comparison-demo ls images/
```

## 📁 Docker構成

```
docker-compose.yml:
  graphai-comparison-demo:  # メインの比較デモ (port 3000)
  graphai-demo:            # 従来デモ (port 3001)

Dockerfile:
  - Node.js 18
  - Sharp (画像処理)
  - 必要なシステム依存関係
  - start-web-server.js をデフォルト実行
```

---

**🎯 Docker環境での実行**

```bash
cd D:\Development\graphai-image-demo2
docker-compose up graphai-comparison-demo
```

ブラウザで `http://localhost:3000` にアクセス → インタラクティブ比較デモ開始！