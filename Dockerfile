# Dockerfile - GraphAI並列処理デモ用（完全リフレッシュ版）
FROM node:18-bullseye

# 作業ディレクトリ設定
WORKDIR /app

# システム依存関係のインストール
RUN apt-get update && apt-get install -y \
    libvips-dev \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# package.jsonをコピーしてnpm install
COPY package.json package-lock.json* ./
RUN npm install

# アプリケーションコードをコピー（明示的に最新版を使用）
COPY . .

# 古いエージェントファイルを無効化（確実にrun-demo-showcase.jsの統合版を使用）
RUN rm -f imageAgent-context.js imageAgent-windows-safe.js || true

# 必要なディレクトリを作成
RUN mkdir -p images output logs

# ファイル確認（デバッグ用）
RUN echo "=== Dockerfile: ファイル確認 ===" && \
    ls -la && \
    echo "=== run-demo-showcase.js の最初の10行 ===" && \
    head -10 run-demo-showcase.js

# ポート3000を公開（Webサーバー用）
EXPOSE 3000

# デフォルトコマンド
CMD ["npm", "run", "demo"]