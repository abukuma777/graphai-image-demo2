# Dockerfile - GraphAI並列処理デモ用
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

# ポート3000を公開（Webサーバー用）
EXPOSE 3000

# デフォルトコマンド
CMD ["npm", "run", "demo"]