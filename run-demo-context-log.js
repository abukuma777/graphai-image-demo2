// run-demo-context-log.js - GraphAI Context版デモ実行スクリプト（ログ出力版）
const fs = require('fs');
const path = require('path');

// ログファイルの設定（固定ファイル名）
const logFileName = 'graphai-demo.log';
const logFilePath = path.join(__dirname, 'logs', logFileName);

// ログディレクトリ作成
if (!fs.existsSync('./logs')) {
  fs.mkdirSync('./logs', { recursive: true });
}

// 既存のログファイルを削除（新規作成）
if (fs.existsSync(logFilePath)) {
  fs.unlinkSync(logFilePath);
}

// 元のconsole関数を保存
const originalLog = console.log;
const originalError = console.error;

// ログ書き込み関数
function writeLog(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  
  // コンソールに出力（元の関数を使用）
  originalLog(message);
  
  // ファイルに出力
  fs.appendFileSync(logFilePath, logMessage, 'utf8');
}

// console.log, console.error を上書き
console.log = (...args) => {
  const message = args.map(arg => {
    if (typeof arg === 'object' && arg !== null) {
      try {
        return JSON.stringify(arg, null, 2);
      } catch (error) {
        return '[Circular Object]';
      }
    }
    return String(arg);
  }).join(' ');
  writeLog(`LOG: ${message}`);
};

console.error = (...args) => {
  const message = args.map(arg => {
    if (typeof arg === 'object' && arg !== null) {
      try {
        return JSON.stringify(arg, null, 2);
      } catch (error) {
        return '[Circular Object]';
      }
    }
    return String(arg);
  }).join(' ');
  writeLog(`ERROR: ${message}`);
};

// デモ開始ログ
writeLog('🚀 Context版デモスクリプト開始 (ログ出力版)');
writeLog(`📝 ログファイル: ${logFilePath}`);
writeLog(`🕒 実行開始時刻: ${new Date().toLocaleString()}`);
writeLog('='.repeat(60));

try {
  const { GraphAI } = require('graphai');
  const fsPromises = require('fs').promises;
  const yaml = require('js-yaml');

  // Context版画像処理エージェントをインポート
  const imageProcessingAgent = require('./imageAgent-context.js');

  async function runImageProcessingDemoContext() {
    writeLog('🚀 GraphAI 画像処理デモ開始! (Context版)');
    writeLog('='.repeat(50));
    
    try {
      // 画像ファイルの存在確認
      writeLog('📁 画像ファイル存在確認:');
      const imageFiles = ['./images/image1.png', './images/image2.png', './images/image3.png'];
      for (const imageFile of imageFiles) {
        const exists = fs.existsSync(imageFile);
        writeLog(`   ${imageFile}: ${exists ? '✅ 存在' : '❌ 見つからない'}`);
        if (!exists) {
          writeLog(`⚠️  警告: ${imageFile} が見つかりません！`);
        }
      }
      
      // 必要なディレクトリを作成
      await ensureDirectories();
      
      // GraphAI設定を読み込み
      const yamlContent = await fsPromises.readFile('./graph.yaml', 'utf8');
      const graphData = yaml.load(yamlContent);
      
      writeLog('📊 YAML設定確認:');
      writeLog(`   image1 value: ${graphData.nodes.image1.value}`);
      writeLog(`   image2 value: ${graphData.nodes.image2.value}`);
      writeLog(`   image3 value: ${graphData.nodes.image3.value}`);
      
      // エージェント辞書を作成（Context版エージェントのみ）
      const agents = {
        imageProcessingAgent: imageProcessingAgent
      };
      
      writeLog('🔧 Context版エージェント登録状況:');
      writeLog(`- カスタムエージェント: imageProcessingAgent (Context版)`);
      writeLog(`- エージェント構造: ${typeof imageProcessingAgent}`);
      
      writeLog('📊 Graph構造:');
      writeLog(`- ノード数: ${Object.keys(graphData.nodes).length}`);
      writeLog(`- 並列パイプライン: 3つ`);
      writeLog(`- 処理ステップ: Input → Mosaic → Rotate → Resize → Summary`);
      writeLog('');
      
      // 実行開始時刻
      const startTime = Date.now();
      writeLog(`⏰ 処理開始: ${new Date().toLocaleTimeString()}`);
      writeLog('');
      
      // GraphAIインスタンス作成（エージェントを渡す）
      writeLog('🔧 GraphAI Context版インスタンス作成中...');
      const graph = new GraphAI(graphData, agents);
      
      // GraphAI実行（並列処理）
      writeLog('🚀 GraphAI Context版実行開始...');
      writeLog('='.repeat(50));
      const results = await graph.run();
      
      // 実行終了時刻
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      writeLog('');
      writeLog('='.repeat(50));
      writeLog('✅ Context版処理完了!');
      writeLog(`⏰ 総処理時間: ${totalTime}ms`);
      writeLog('');
      
      // 結果表示
      await displayResults(results);
      
      writeLog('🎉 Context版デモ完了！');
      writeLog(`📝 詳細ログ: ${logFilePath}`);
      writeLog(`🕒 実行終了時刻: ${new Date().toLocaleString()}`);
      
    } catch (error) {
      writeLog(`❌ Context版エラー: ${error.message}`);
      writeLog(`スタックトレース: ${error.stack}`);
    }
  }

  // 必要なディレクトリを作成
  async function ensureDirectories() {
    const dirs = ['./images', './output'];
    
    for (const dir of dirs) {
      try {
        await fsPromises.mkdir(dir, { recursive: true });
        writeLog(`📁 ディレクトリ作成: ${dir}`);
      } catch (error) {
        if (error.code !== 'EEXIST') throw error;
      }
    }
  }

  // 結果表示
  async function displayResults(results) {
    writeLog('📋 Context版処理結果:');
    writeLog(`結果の型: ${typeof results}`);
    writeLog(`結果のキー: ${Object.keys(results || {}).join(', ')}`);
    
    writeLog('');
    writeLog('📁 出力ファイル:');
    try {
      const outputFiles = await fsPromises.readdir('./output');
      if (outputFiles.length > 0) {
        outputFiles.forEach(file => {
          const filePath = `./output/${file}`;
          const stats = fs.statSync(filePath);
          const sizeKB = Math.round(stats.size / 1024);
          writeLog(`   - ${file} (${sizeKB} KB)`);
        });
      } else {
        writeLog('   出力ファイルがありません');
      }
    } catch (error) {
      writeLog('   出力ディレクトリが見つかりません');
    }
  }

  // メイン実行
  if (require.main === module) {
    writeLog('📍 メイン関数実行中...');
    runImageProcessingDemoContext().catch((error) => {
      writeLog(`❌ 最上位エラー: ${error.message}`);
      writeLog(`スタックトレース: ${error.stack}`);
    });
  }

} catch (error) {
  writeLog(`❌ モジュール読み込みエラー: ${error.message}`);
  writeLog(`スタックトレース: ${error.stack}`);
}

writeLog('📍 Context版スクリプト読み込み完了');