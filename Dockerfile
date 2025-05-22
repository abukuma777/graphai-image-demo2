# Dockerfile - GraphAI比較デモ用
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

# アプリケーションコードをコピー
COPY . .

# 必要なディレクトリを作成
RUN mkdir -p images output logs

# ファイル確認（デバッグ用）
RUN echo "=== Dockerfile: ファイル確認 ===" && \
    ls -la && \
    echo "=== start-web-server.js 確認 ===" && \
    head -10 start-web-server.js

# ポート3000を公開（Webサーバー用）
EXPOSE 3000

# デフォルトコマンド（比較デモWebサーバー）
CMD ["node", "start-web-server.js"]