# 🚀 GraphAI 画像処理パイプライン デモ

GraphAIを使用した並列画像処理のデモンストレーションです。
3つの画像を同時に「モザイク → 回転 → リサイズ」の処理を行います。

## 📋 セットアップ手順

### 新しい処理ステップ追加

`imageAgent.js` に新しい処理を追加：

```javascript
case 'blur':
  result = await this.blurImage(namedInputs[0], params);
  break;

async blurImage(inputPath, params) {
  const { sigma = 3, outputPath } = params;
  
  await this.ensureDir(path.dirname(outputPath));
  
  await sharp(inputPath)
    .blur(sigma)
    .jpeg({ quality: 90 })
    .toFile(outputPath);
  
  return { outputPath, sigma };
}
```

## 🎯 デモのポイント

### GraphAIの利点
- **宣言的記述**: YAMLで処理フローを定義
- **自動並列化**: 依存関係のない処理を自動並列実行
- **エラーハンドリング**: 個別処理の失敗が全体に影響しない
- **スケーラビリティ**: 画像数やステップ数の追加が容易

### 従来手法との比較
```javascript
// 従来のコード
for (let i = 0; i < images.length; i++) {
  const mosaic = await applyMosaic(images[i]);
  const rotated = await rotateImage(mosaic);
  const resized = await resizeImage(rotated);
}

// GraphAI
// YAML設定のみで並列処理が実現
```

## 🐛 トラブルシューティング

### よくある問題

#### 1. sharp インストールエラー
```bash
# 解決方法
npm install --platform=darwin --arch=x64 sharp
# または
npm rebuild sharp
```

#### 2. 画像ファイルが見つからない
```bash
# images/ ディレクトリに画像ファイルがあることを確認
ls images/
# image1.jpg, image2.jpg, image3.jpg があることを確認
```

#### 3. ポート3000が使用中
```bash
# 他のポートを使用する場合
PORT=3001 npm run demo
```

#### 4. GraphAI バージョン問題
```bash
# 最新版インストール
npm install @receptron/graphai@latest
```

## 📁 プロジェクト構造

```
graphai-image-demo/
├── package.json          # プロジェクト設定
├── graph.yaml            # GraphAI設定
├── imageAgent.js         # 画像処理エージェント
├── run-demo.js          # デモ実行スクリプト
├── README.md            # このファイル
├── images/              # 入力画像
│   ├── image1.jpg
│   ├── image2.jpg
│   └── image3.jpg
└── output/              # 処理結果（自動生成）
    ├── image1_mosaic.jpg
    ├── image1_rotated.jpg
    ├── image1_final.jpg
    ├── image2_mosaic.jpg
    ├── image2_rotated.jpg
    ├── image2_final.jpg
    ├── image3_mosaic.jpg
    ├── image3_rotated.jpg
    ├── image3_final.jpg
    └── processing_summary.json
```

## 🎥 プレゼンテーション用スクリプト

### 1. 導入 (2分)
「今日はGraphAIという、データフロー指向のAI処理フレームワークをご紹介します。特徴は、YAMLで処理パイプラインを宣言的に定義するだけで、自動的に並列処理が実現されることです。」

### 2. 問題設定 (1分)
「例えば、3枚の画像に同じ処理（モザイク→回転→リサイズ）を適用したいとします。従来なら、forループで1枚ずつ順番に処理していました。GraphAIなら、並列処理で効率化できます。」

### 3. 実演 (5分)
```bash
# 実際にコマンド実行
npm run demo
```

「見てください、3つのパイプラインが同時に動き始めました。各処理の完了タイミングがバラバラなのは、実際に並列処理されている証拠です。」

### 4. 結果確認 (1分)
「ブラウザで結果を確認してみましょう。元画像から最終画像まで、全ステップの結果が表示されています。」

### 5. YAML設定説明 (1分)
「これらの並列処理は、たった50行のYAML設定で定義されています。依存関係は自動解析され、並列化も自動的に行われます。」

## 🌟 拡張アイデア

### より高度なデモ
- **リアルタイム進捗バー**: Web UIでの処理状況表示
- **動画処理**: フレーム単位での並列処理
- **ML推論**: 複数モデルでの並列予測
- **API統合**: 複数のWebAPIからの並列データ取得

### 実用的な応用例
- **ECサイト**: 商品画像の一括リサイズ・フォーマット変換
- **メディア**: 動画のサムネイル生成と各種サイズ出力
- **医療**: 医療画像の複数解析手法での並列診断支援
- **製造業**: 品質検査画像の複数アルゴリズムでの並列解析

---

**🎯 このデモで伝えたいこと**
GraphAIは「難しい並列処理を簡単に」実現するフレームワークです。宣言的な設定だけで、高性能な並列処理パイプラインを構築できます。1. プロジェクト作成とセットアップ

```bash
# プロジェクトディレクトリ作成
mkdir graphai-image-demo
cd graphai-image-demo

# package.jsonを作成（上記のコンテンツをコピー）

# 依存関係インストール
npm install

# 必要なディレクトリ作成
mkdir images output
```

### 2. ファイル配置

以下のファイルを作成してください：

- `graph.yaml` - GraphAI設定ファイル
- `imageAgent.js` - 画像処理エージェント
- `run-demo.js` - デモ実行スクリプト
- `package.json` - プロジェクト設定

### 3. 画像ファイル準備

`images/` ディレクトリに以下の画像を配置：
- `image1.jpg` - ポートレート画像
- `image2.jpg` - フォトグラファー画像  
- `image3.jpg` - ペッパー画像

**画像サイズ**: 推奨 500x500px以上（任意のJPEG形式）

## 🎬 実行方法

### デモ実行

```bash
npm run demo
```

または

```bash
node run-demo.js
```

### 実行の流れ

1. **並列処理開始**: 3つのパイプラインが同時に実行
2. **リアルタイム進捗**: コンソールに処理状況表示
3. **結果出力**: `output/` ディレクトリに処理済み画像保存
4. **Web表示**: `http://localhost:3000` で結果を視覚的に確認

## 📊 プレゼンテーション用の流れ

### 事前準備 (1分)
```bash
# ターミナルを開いて準備
cd graphai-image-demo
npm run demo
```

### デモ実行 (5分)
1. **コマンド実行**: `npm run demo` を実行
2. **コンソール表示**: 並列処理の進捗をリアルタイム表示
3. **結果確認**: ブラウザで処理結果を表示
4. **ファイル確認**: `output/` ディレクトリの生成ファイル表示

### 説明ポイント (4分)
- **YAML設定**: シンプルな宣言的記述
- **並列処理**: 3つのパイプラインが同時実行
- **依存関係**: グラフ構造での自動最適化
- **拡張性**: 新しい処理ノードの追加が容易

## 🔧 カスタマイズ

### 処理パラメータ変更

`graph.yaml` で各処理のパラメータを調整：

```yaml
mosaic1:
  params:
    blockSize: 15  # モザイクブロックサイズ
    
rotate1:
  params:
    angle: 45      # 回転角度
    
resize1:
  params:
    width: 400     # リサイズ幅
    height: 400    # リサイズ高さ
```

###