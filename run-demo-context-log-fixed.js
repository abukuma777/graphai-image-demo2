// run-demo-context-log-fixed.js - 日本時間対応+Windows問題修正版
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

// 日本時間取得関数
function getJSTTime() {
  const now = new Date();
  const jstOffset = 9 * 60; // JST = UTC + 9時間
  const jst = new Date(now.getTime() + (jstOffset * 60 * 1000));
  return jst;
}

// 日本時間フォーマット関数
function formatJSTTime(date = null) {
  const jstTime = date || getJSTTime();
  return {
    iso: jstTime.toISOString().replace('Z', '+09:00'),
    local: jstTime.toLocaleString('ja-JP', { 
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }),
    time: jstTime.toLocaleTimeString('ja-JP', {
      timeZone: 'Asia/Tokyo',
      hour: '2-digit',
      minute: '2-digit', 
      second: '2-digit'
    })
  };
}

// 元のconsole関数を保存
const originalLog = console.log;
const originalError = console.error;

// ログ書き込み関数
function writeLog(message, isError = false) {
  const timeInfo = formatJSTTime();
  const logMessage = `[${timeInfo.iso}] ${message}\n`;
  
  // コンソールに出力（元の関数を使用）
  if (isError) {
    originalError(message);
  } else {
    originalLog(message);
  }
  
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
  writeLog(`ERROR: ${message}`, true);
};

// デモ開始ログ
const startTime = formatJSTTime();
writeLog('🚀 Context版デモスクリプト開始 (日本時間+Windows修正版)');
writeLog(`📝 ログファイル: ${logFilePath}`);
writeLog(`🕒 実行開始時刻: ${startTime.local}`);
writeLog('='.repeat(60));

try {
  const { GraphAI } = require('graphai');
  const fsPromises = require('fs').promises;
  const yaml = require('js-yaml');

  // Windows対応画像処理エージェント
  const imageProcessingAgentBase = require('./imageAgent-context.js');

  // Windows並列処理対応ラッパー
  const windowsSafeAgent = async (context) => {
    const nodeId = context.debugInfo?.nodeId;
    const operation = context.params?.operation;
    
    // Windows並列処理の安全性を高めるための遅延
    if (operation && operation !== 'summary') {
      const delay = Math.random() * 50 + 10; // 10-60ms のランダム遅延
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    try {
      return await imageProcessingAgentBase.agent(context);
    } catch (error) {
      // Windows特有のファイル書き込みエラーの場合はリトライ
      if (error.message.includes('unable to open for write') || 
          error.message.includes('デバイスがコマンドを認識できません')) {
        
        console.log(`⚠️  Windows書き込みエラー検出、リトライ中... (${nodeId})`);
        
        // 少し待ってからリトライ
        await new Promise(resolve => setTimeout(resolve, 100));
        
        try {
          return await imageProcessingAgentBase.agent(context);
        } catch (retryError) {
          console.error(`❌ リトライ後もエラー: ${retryError.message}`);
          throw retryError;
        }
      }
      throw error;
    }
  };

  async function runImageProcessingDemoFixed() {
    writeLog('🚀 GraphAI 画像処理デモ開始! (Windows対応版)');
    writeLog('='.repeat(50));
    
    try {
      // 画像ファイルの存在確認
      writeLog('📁 画像ファイル存在確認:');
      const imageFiles = ['./images/image1.jpg', './images/image2.jpg', './images/image3.jpg'];
      let missingFiles = 0;
      
      for (const imageFile of imageFiles) {
        const exists = fs.existsSync(imageFile);
        writeLog(`   ${imageFile}: ${exists ? '✅ 存在' : '❌ 見つからない'}`);
        if (!exists) {
          writeLog(`⚠️  警告: ${imageFile} が見つかりません！`);
          missingFiles++;
        }
      }
      
      if (missingFiles > 0) {
        writeLog('❌ 必要な画像ファイルが見つかりません。');
        writeLog('💡 解決方法: 以下のファイルを ./images/ ディレクトリに配置してください:');
        writeLog('   - image1.jpg (測量技師の写真)');
        writeLog('   - image2.jpg (ピーマンの写真)');
        writeLog('   - image3.jpg (ポートレート写真)');
        return;
      }
      
      // 必要なディレクトリを作成（Windows権限対応）
      await ensureDirectoriesWindows();
      
      // GraphAI設定を読み込み
      const yamlContent = await fsPromises.readFile('./graph.yaml', 'utf8');
      const graphData = yaml.load(yamlContent);
      
      writeLog('📊 YAML設定確認:');
      writeLog(`   image1 value: ${graphData.nodes.image1.value}`);
      writeLog(`   image2 value: ${graphData.nodes.image2.value}`);
      writeLog(`   image3 value: ${graphData.nodes.image3.value}`);
      
      // エージェント辞書を作成（Windows対応版）
      const agents = {
        imageProcessingAgent: {
          agent: windowsSafeAgent,
          mock: windowsSafeAgent
        }
      };
      
      writeLog('🔧 Windows対応エージェント登録状況:');
      writeLog(`- カスタムエージェント: imageProcessingAgent (Windows安全版)`);
      writeLog(`- 並列処理安全対策: 有効`);
      
      writeLog('📊 Graph構造:');
      writeLog(`- ノード数: ${Object.keys(graphData.nodes).length}`);
      writeLog(`- 並列パイプライン: 3つ`);
      writeLog(`- 処理ステップ: Input → Mosaic → Rotate → Resize → Summary`);
      writeLog('');
      
      // 実行開始時刻
      const execStartTime = formatJSTTime();
      const execStartMs = Date.now();
      writeLog(`⏰ 処理開始: ${execStartTime.time}`);
      writeLog('');
      
      // GraphAIインスタンス作成
      writeLog('🔧 GraphAI Windows対応版インスタンス作成中...');
      const graph = new GraphAI(graphData, agents);
      
      // GraphAI実行（並列処理）
      writeLog('🚀 GraphAI Windows対応版実行開始...');
      writeLog('='.repeat(50));
      const results = await graph.run();
      
      // 実行終了時刻
      const execEndTime = formatJSTTime();
      const totalTime = Date.now() - execStartMs;
      
      writeLog('');
      writeLog('='.repeat(50));
      writeLog('✅ Windows対応版処理完了!');
      writeLog(`⏰ 総処理時間: ${totalTime}ms`);
      writeLog(`🕒 完了時刻: ${execEndTime.time}`);
      writeLog('');
      
      // 結果表示
      await displayResults(results);
      
      writeLog('🎉 Windows対応版デモ完了！');
      writeLog(`📝 詳細ログ: ${logFilePath}`);
      writeLog(`🕒 実行終了時刻: ${execEndTime.local}`);
      
    } catch (error) {
      writeLog(`❌ Windows対応版エラー: ${error.message}`);
      writeLog(`スタックトレース: ${error.stack}`);
    }
  }

  // Windows対応ディレクトリ作成
  async function ensureDirectoriesWindows() {
    const dirs = ['./images', './output'];
    
    for (const dir of dirs) {
      try {
        await fsPromises.mkdir(dir, { recursive: true });
        
        // Windows権限確認
        try {
          await fsPromises.access(dir, fs.constants.R_OK | fs.constants.W_OK);
          writeLog(`📁 ディレクトリ確認: ${dir} (読み書き可能)`);
        } catch (permError) {
          writeLog(`⚠️  権限警告: ${dir} - ${permError.message}`);
        }
        
      } catch (error) {
        if (error.code !== 'EEXIST') {
          writeLog(`❌ ディレクトリ作成エラー: ${dir} - ${error.message}`);
          throw error;
        }
      }
    }
  }

  // 結果表示
  async function displayResults(results) {
    writeLog('📋 Windows対応版処理結果:');
    writeLog(`結果の型: ${typeof results}`);
    writeLog(`結果のキー: ${Object.keys(results || {}).join(', ')}`);
    
    writeLog('');
    writeLog('📁 出力ファイル:');
    try {
      const outputFiles = await fsPromises.readdir('./output');
      if (outputFiles.length > 0) {
        outputFiles.forEach(file => {
          const filePath = `./output/${file}`;
          try {
            const stats = fs.statSync(filePath);
            const sizeKB = Math.round(stats.size / 1024);
            writeLog(`   - ${file} (${sizeKB} KB)`);
          } catch (error) {
            writeLog(`   - ${file} (サイズ不明)`);
          }
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
    runImageProcessingDemoFixed().catch((error) => {
      writeLog(`❌ 最上位エラー: ${error.message}`);
      writeLog(`スタックトレース: ${error.stack}`);
    });
  }

} catch (error) {
  writeLog(`❌ モジュール読み込みエラー: ${error.message}`);
  writeLog(`スタックトレース: ${error.stack}`);
}

writeLog('📍 Windows対応版スクリプト読み込み完了');