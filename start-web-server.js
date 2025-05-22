// start-web-server.js - 結果表示用Webサーバー
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use('/output', express.static('output'));
app.use('/images', express.static('images'));

// メインページ
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
        <meta charset="UTF-8">
        <title>GraphAI 並列処理結果</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                margin: 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                min-height: 100vh;
            }
            .container {
                max-width: 1200px;
                margin: 0 auto;
                background: rgba(255,255,255,0.1);
                padding: 30px;
                border-radius: 15px;
                backdrop-filter: blur(10px);
            }
            .header {
                text-align: center;
                margin-bottom: 40px;
            }
            .pipeline {
                background: rgba(255,255,255,0.1);
                border-radius: 10px;
                padding: 20px;
                margin: 20px 0;
            }
            .pipeline-1 { border-left: 5px solid #FF6B6B; }
            .pipeline-2 { border-left: 5px solid #4ECDC4; }
            .pipeline-3 { border-left: 5px solid #45B7D1; }
            .images {
                display: flex;
                gap: 15px;
                align-items: center;
                flex-wrap: wrap;
            }
            .image-stage {
                text-align: center;
                flex: 1;
                min-width: 150px;
            }
            .image-stage img {
                width: 150px;
                height: 150px;
                object-fit: cover;
                border: 2px solid rgba(255,255,255,0.3);
                border-radius: 8px;
                margin-bottom: 10px;
            }
            .arrow {
                font-size: 24px;
                color: #FFD700;
                margin: 0 10px;
            }
            .advantages {
                background: rgba(255,255,255,0.1);
                border-radius: 10px;
                padding: 20px;
                margin-top: 30px;
            }
            .advantage {
                display: flex;
                align-items: center;
                margin: 10px 0;
            }
            .check {
                color: #4CAF50;
                font-size: 20px;
                margin-right: 15px;
            }
            h1, h2, h3 { margin-top: 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🚀 GraphAI 並列処理デモ結果</h1>
                <p>3つの画像パイプラインが同時に処理されました</p>
            </div>
            
            <div class="pipeline pipeline-1">
                <h3>🔴 Pipeline 1 (赤画像)</h3>
                <div class="images">
                    <div class="image-stage">
                        <img src="/images/image1.jpg" alt="元画像1">
                        <div>元画像</div>
                    </div>
                    <div class="arrow">→</div>
                    <div class="image-stage">
                        <img src="/output/image1_mosaic.jpg" alt="モザイク1" onerror="this.style.display='none'">
                        <div>モザイク</div>
                    </div>
                    <div class="arrow">→</div>
                    <div class="image-stage">
                        <img src="/output/image1_rotated.jpg" alt="回転1" onerror="this.style.display='none'">
                        <div>回転</div>
                    </div>
                    <div class="arrow">→</div>
                    <div class="image-stage">
                        <img src="/output/image1_final.jpg" alt="最終1" onerror="this.style.display='none'">
                        <div>リサイズ</div>
                    </div>
                </div>
            </div>
            
            <div class="pipeline pipeline-2">
                <h3>🟢 Pipeline 2 (緑画像)</h3>
                <div class="images">
                    <div class="image-stage">
                        <img src="/images/image2.jpg" alt="元画像2">
                        <div>元画像</div>
                    </div>
                    <div class="arrow">→</div>
                    <div class="image-stage">
                        <img src="/output/image2_mosaic.jpg" alt="モザイク2" onerror="this.style.display='none'">
                        <div>モザイク</div>
                    </div>
                    <div class="arrow">→</div>
                    <div class="image-stage">
                        <img src="/output/image2_rotated.jpg" alt="回転2" onerror="this.style.display='none'">
                        <div>リサイズ</div>
                    </div>
                    <div class="arrow">→</div>
                    <div class="image-stage">
                        <img src="/output/image2_final.jpg" alt="最終2" onerror="this.style.display='none'">
                        <div>リサイズ</div>
                    </div>
                </div>
            </div>
            
            <div class="pipeline pipeline-3">
                <h3>🔵 Pipeline 3 (青画像)</h3>
                <div class="images">
                    <div class="image-stage">
                        <img src="/images/image3.jpg" alt="元画像3">
                        <div>元画像</div>
                    </div>
                    <div class="arrow">→</div>
                    <div class="image-stage">
                        <img src="/output/image3_mosaic.jpg" alt="モザイク3" onerror="this.style.display='none'">
                        <div>モザイク</div>
                    </div>
                    <div class="arrow">→</div>
                    <div class="image-stage">
                        <img src="/output/image3_rotated.jpg" alt="回転3" onerror="this.style.display='none'">
                        <div>回転</div>
                    </div>
                    <div class="arrow">→</div>
                    <div class="image-stage">
                        <img src="/output/image3_final.jpg" alt="最終3" onerror="this.style.display='none'">
                        <div>リサイズ</div>
                    </div>
                </div>
            </div>
            
            <div class="advantages">
                <h3>💡 GraphAIの利点</h3>
                <div class="advantage">
                    <span class="check">✅</span>
                    <div><strong>宣言的記述:</strong> YAMLで処理フローを簡単に定義</div>
                </div>
                <div class="advantage">
                    <span class="check">✅</span>
                    <div><strong>自動並列化:</strong> 依存関係を解析して自動で並列実行</div>
                </div>
                <div class="advantage">
                    <span class="check">✅</span>
                    <div><strong>エラーハンドリング:</strong> 個別処理の失敗が全体に影響しない</div>
                </div>
                <div class="advantage">
                    <span class="check">✅</span>
                    <div><strong>スケーラビリティ:</strong> 画像数やステップ数の追加が容易</div>
                </div>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
                <button onclick="location.reload()" style="padding: 15px 30px; background: #4CAF50; color: white; border: none; border-radius: 25px; cursor: pointer; font-size: 16px;">
                    🔄 更新
                </button>
            </div>
        </div>
    </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`🌐 結果表示サーバー起動: http://localhost:${PORT}`);
  console.log('ブラウザで並列処理の結果を確認できます！');
});