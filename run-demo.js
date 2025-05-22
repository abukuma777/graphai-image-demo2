// run-demo.js - GraphAIデモ実行スクリプト
const { GraphAI } = require('graphai');
const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');

// 画像処理エージェントをインポート
const imageProcessingAgent = require('./imageAgent.js');

async function runImageProcessingDemo() {
  console.log('🚀 GraphAI 画像処理デモ開始!');
  console.log('='.repeat(50));
  
  try {
    // 必要なディレクトリを作成
    await ensureDirectories();
    
    // GraphAI設定を読み込み
    const yamlContent = await fs.readFile('./graph.yaml', 'utf8');
    const graphData = yaml.load(yamlContent);
    
    // エージェント辞書を作成（カスタムエージェントのみ）
    const agents = {
      imageProcessingAgent: imageProcessingAgent.agent
    };
    
    console.log('📊 Graph構造:');
    console.log(`- ノード数: ${Object.keys(graphData.nodes).length}`);
    console.log(`- 並列パイプライン: 3つ`);
    console.log(`- 処理ステップ: Input → Mosaic → Rotate → Resize → Summary`);
    console.log('');
    
    // 実行開始時刻
    const startTime = Date.now();
    console.log(`⏰ 処理開始: ${new Date().toLocaleTimeString()}`);
    console.log('');
    
    // GraphAIインスタンス作成（エージェントを渡す）
    const graph = new GraphAI(graphData, agents);
    
    // GraphAI実行（並列処理）
    const results = await graph.run();
    
    // 実行終了時刻
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    console.log('');
    console.log('='.repeat(50));
    console.log('✅ 処理完了!');
    console.log(`⏰ 総処理時間: ${totalTime}ms`);
    console.log('');
    
    // 結果表示
    await displayResults(results);
    
    // Webサーバー起動して結果を表示
    console.log('🌐 結果をWebブラウザで表示します...');
    await startWebServer();
    
  } catch (error) {
    console.error('❌ エラー:', error);
    console.error('スタックトレース:', error.stack);
  }
}

// 必要なディレクトリを作成
async function ensureDirectories() {
  const dirs = ['./images', './output'];
  
  for (const dir of dirs) {
    try {
      await fs.mkdir(dir, { recursive: true });
      console.log(`📁 ディレクトリ作成: ${dir}`);
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
    }
  }
}

// 結果表示
async function displayResults(results) {
  console.log('📋 処理結果:');
  
  // サマリー情報を表示
  if (results.summary && results.summary.result) {
    const summary = results.summary.result;
    console.log(`📊 処理済み画像数: ${summary.totalProcessed}`);
    console.log(`🕒 完了時刻: ${summary.completedAt}`);
    console.log('');
    
    // 各パイプラインの結果
    summary.results.forEach((result, index) => {
      console.log(`📸 パイプライン ${index + 1}:`);
      console.log(`   処理時間: ${result.processingTime}ms`);
      console.log(`   最終出力: ${result.outputPath}`);
    });
  }
  
  console.log('');
  console.log('📁 出力ファイル:');
  try {
    const outputFiles = await fs.readdir('./output');
    outputFiles.forEach(file => {
      console.log(`   - ${file}`);
    });
  } catch (error) {
    console.log('   出力ディレクトリが見つかりません');
  }
}

// 簡易Webサーバー起動
async function startWebServer() {
  const express = require('express');
  const cors = require('cors');
  const app = express();
  const PORT = 3000;
  
  app.use(cors());
  app.use('/output', express.static('output'));
  app.use('/images', express.static('images'));
  app.use(express.static('.'));
  
  // 結果表示ページ
  app.get('/', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html lang="ja">
      <head>
        <meta charset="UTF-8">
        <title>GraphAI 処理結果</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; background: #f0f0f0; }
          .container { max-width: 1200px; margin: 0 auto; }
          .pipeline { background: white; margin: 20px 0; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .images { display: flex; gap: 15px; flex-wrap: wrap; }
          .image-stage { text-align: center; }
          .image-stage img { width: 200px; height: 200px; object-fit: cover; border: 2px solid #ddd; border-radius: 4px; }
          .image-stage h4 { margin: 10px 0 5px 0; color: #333; }
          h1 { color: #2c3e50; text-align: center; }
          .arrow { font-size: 24px; margin: 0 10px; color: #3498db; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🚀 GraphAI 画像処理結果</h1>
          
          <div class="pipeline">
            <h2>📸 パイプライン 1</h2>
            <div class="images">
              <div class="image-stage">
                <h4>Original</h4>
                <img src="/images/image1.jpg" alt="元画像1" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuWFg+eUu+WDjzE8L3RleHQ+PC9zdmc+'">
              </div>
              <span class="arrow">→</span>
              <div class="image-stage">
                <h4>Mosaic</h4>
                <img src="/output/image1_mosaic.jpg" alt="モザイク1" onerror="this.style.display='none'">
              </div>
              <span class="arrow">→</span>
              <div class="image-stage">
                <h4>Rotated</h4>
                <img src="/output/image1_rotated.jpg" alt="回転1" onerror="this.style.display='none'">
              </div>
              <span class="arrow">→</span>
              <div class="image-stage">
                <h4>Final</h4>
                <img src="/output/image1_final.jpg" alt="最終1" onerror="this.style.display='none'">
              </div>
            </div>
          </div>
          
          <div class="pipeline">
            <h2>🎭 パイプライン 2</h2>
            <div class="images">
              <div class="image-stage">
                <h4>Original</h4>
                <img src="/images/image2.jpg" alt="元画像2" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuWFg+eUu+WDjzI8L3RleHQ+PC9zdmc+'">
              </div>
              <span class="arrow">→</span>
              <div class="image-stage">
                <h4>Mosaic</h4>
                <img src="/output/image2_mosaic.jpg" alt="モザイク2" onerror="this.style.display='none'">
              </div>
              <span class="arrow">→</span>
              <div class="image-stage">
                <h4>Rotated</h4>
                <img src="/output/image2_rotated.jpg" alt="回転2" onerror="this.style.display='none'">
              </div>
              <span class="arrow">→</span>
              <div class="image-stage">
                <h4>Final</h4>
                <img src="/output/image2_final.jpg" alt="最終2" onerror="this.style.display='none'">
              </div>
            </div>
          </div>
          
          <div class="pipeline">
            <h2>🌶️ パイプライン 3</h2>
            <div class="images">
              <div class="image-stage">
                <h4>Original</h4>
                <img src="/images/image3.jpg" alt="元画像3" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuWFg+eUu+WDjzM8L3RleHQ+PC9zdmc+'">
              </div>
              <span class="arrow">→</span>
              <div class="image-stage">
                <h4>Mosaic</h4>
                <img src="/output/image3_mosaic.jpg" alt="モザイク3" onerror="this.style.display='none'">
              </div>
              <span class="arrow">→</span>
              <div class="image-stage">
                <h4>Rotated</h4>
                <img src="/output/image3_rotated.jpg" alt="回転3" onerror="this.style.display='none'">
              </div>
              <span class="arrow">→</span>
              <div class="image-stage">
                <h4>Final</h4>
                <img src="/output/image3_final.jpg" alt="最終3" onerror="this.style.display='none'">
              </div>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <p><strong>🎯 GraphAIの並列処理により、3つの画像が同時に処理されました！</strong></p>
            <button onclick="location.reload()" style="padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer;">🔄 更新</button>
          </div>
        </div>
      </body>
      </html>
    `);
  });
  
  app.listen(PORT, () => {
    console.log(`🌐 Webサーバー起動: http://localhost:${PORT}`);
    console.log('ブラウザで結果を確認してください！');
  });
}

// メイン実行
if (require.main === module) {
  runImageProcessingDemo().catch(console.error);
}

module.exports = { runImageProcessingDemo };