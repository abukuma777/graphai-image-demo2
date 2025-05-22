# GraphAI ローカル実行環境セットアップ

# 1. プロジェクトディレクトリ作成
mkdir graphai-image-demo
cd graphai-image-demo

# 2. Node.js プロジェクト初期化
npm init -y

# 3. 必要なパッケージインストール
npm install graphai           # GraphAI本体（正しいパッケージ名）
npm install @graphai/agents   # GraphAI基本エージェント
npm install sharp             # 画像処理ライブラリ
npm install express           # Webサーバー（表示用）
npm install cors              # CORS対応
npm install js-yaml           # YAML読み込み用

# 4. TypeScript（オプション）
npm install -D typescript @types/node

echo "✅ 環境セットアップ完了！"
echo "次は以下のファイルを作成してください："
echo "- graph.yaml (GraphAI設定)"
echo "- imageAgent.js (画像処理エージェント)"
echo "- server.js (Webサーバー)"
echo "- index.html (フロントエンド)"