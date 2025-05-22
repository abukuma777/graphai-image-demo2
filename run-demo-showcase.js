// run-demo-showcase.js - 完全統合版（ノード名解決機能付き）
const { GraphAI } = require('graphai');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const sharp = require('sharp');

console.log('🚀 デモ初期化中...');

// ===== 確実なログ機能実装 =====
const logFileName = 'graphai-demo.log';
const logFilePath = path.join('/app', 'logs', logFileName);

// ログディレクトリ作成
if (!fsSync.existsSync('/app/logs')) {
  fsSync.mkdirSync('/app/logs', { recursive: true });
  console.log('📁 ログディレクトリ作成: /app/logs');
}

// 既存のログファイルを削除（新規作成）
if (fsSync.existsSync(logFilePath)) {
  fsSync.unlinkSync(logFilePath);
  console.log('🗑️  既存ログファイル削除: ' + logFilePath);
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

// ログ書き込み関数（確実版）
function writeLogSafe(message, isError = false) {
  const timeInfo = formatJSTTime();
  const logMessage = `[${timeInfo.iso}] ${message}\n`;
  
  // コンソールに出力（元の関数を使用）
  if (isError) {
    originalError(message);
  } else {
    originalLog(message);
  }
  
  // ファイルに出力（リトライ付き）
  let attempts = 3;
  while (attempts > 0) {
    try {
      fsSync.appendFileSync(logFilePath, logMessage, 'utf8');
      break; // 成功したらループ終了
    } catch (error) {
      attempts--;
      if (attempts === 0) {
        originalError(`ログファイル書き込み失敗: ${error.message}`);
      }
    }
  }
}

// console.log, console.error を上書き（確実版）
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
  writeLogSafe(`LOG: ${message}`);
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
  writeLogSafe(`ERROR: ${message}`, true);
};

// デモ開始ログ（確実に出力）
const startTime = formatJSTTime();
console.log('🚀 完全統合版デモスクリプト開始 (ノード名解決機能付き)');
console.log(`📝 ログファイル: ${logFilePath}`);
console.log(`🕒 実行開始時刻: ${startTime.local}`);
console.log('='.repeat(60));

// ===== GraphAIノード値解決機能 =====
let graphDataCache = null; // GraphAI設定をキャッシュ

// ノード名を実際の値に解決する関数
function resolveNodeValue(nodeName, graphData) {
  if (!graphData || !graphData.nodes) {
    console.log(`⚠️  GraphAIデータが無効: ${nodeName}`);
    return nodeName;
  }
  
  const node = graphData.nodes[nodeName];
  if (!node) {
    console.log(`⚠️  ノードが見つかりません: ${nodeName}`);
    return nodeName;
  }
  
  // value プロパティがある場合はそれを返す
  if (node.value) {
    console.log(`🔍 ノード値解決: ${nodeName} -> ${node.value}`);
    return node.value;
  }
  
  // value がない場合は、処理済みノードの出力パスを推測
  const nodeOutputPaths = {
    'mosaic1': './output/image1_mosaic.jpg',
    'mosaic2': './output/image2_mosaic.jpg',
    'mosaic3': './output/image3_mosaic.jpg',
    'rotate1': './output/image1_rotated.jpg',
    'rotate2': './output/image2_rotated.jpg',
    'rotate3': './output/image3_rotated.jpg',
    'resize1': './output/image1_final.jpg',
    'resize2': './output/image2_final.jpg',
    'resize3': './output/image3_final.jpg'
  };
  
  if (nodeOutputPaths[nodeName]) {
    console.log(`🔍 ノード出力パス解決: ${nodeName} -> ${nodeOutputPaths[nodeName]}`);
    return nodeOutputPaths[nodeName];
  }
  
  console.log(`⚠️  ノード値解決失敗: ${nodeName}`);
  return nodeName;
}

// ===== 完全統合画像処理エージェント（ノード名解決機能付き） =====
const completeImageProcessingAgent = async (context) => {
  const startTime = Date.now();
  
  // contextから必要な情報を取得
  const namedInputs = context.namedInputs || {};
  const inputs = context.inputs || [];
  const params = context.params || {};
  const nodeId = context.debugInfo?.nodeId;
  
  console.log(`🔍 [${nodeId}] 統合版エージェント呼び出し:`);
  console.log(`   namedInputs:`, namedInputs);
  console.log(`   inputs:`, inputs);
  console.log(`   params:`, params);
  
  if (!params.operation) {
    throw new Error('params.operation が見つかりません。');
  }
  
  console.log(`🎬 [${nodeId}] 処理開始: ${params.operation} - ${new Date().toLocaleTimeString('ja-JP', {timeZone: 'Asia/Tokyo'})}`);
  
  try {
    let result;
    let inputValue;
    
    if (params.operation === 'summary') {
      // summary操作の場合は全ての入力を配列として取得
      inputValue = inputs.length > 0 ? inputs : Object.values(namedInputs);
      console.log(`🔍 [${nodeId}] Summary入力値:`, inputValue.length, '個のアイテム');
    } else {
      // 通常の処理の場合、最初の入力を使用
      const firstInput = inputs.length > 0 ? inputs[0] : Object.values(namedInputs)[0];
      console.log(`🔍 [${nodeId}] 第一入力値: ${firstInput}, type: ${typeof firstInput}`);
      
      // GraphAIから渡される値を適切に処理（ノード名解決機能付き）
      if (typeof firstInput === 'string') {
        // ファイルパスの場合はそのまま使用
        if (firstInput.includes('./images/') || firstInput.includes('./output/')) {
          inputValue = firstInput;
          console.log(`🔍 [${nodeId}] ファイルパス直接使用: ${inputValue}`);
        } else {
          // ノード名の場合は値を解決
          inputValue = resolveNodeValue(firstInput, graphDataCache);
          console.log(`🔍 [${nodeId}] ノード名解決結果: ${firstInput} -> ${inputValue}`);
        }
      } else if (typeof firstInput === 'object' && firstInput !== null) {
        // オブジェクトの場合、outputPathを取得
        inputValue = firstInput.outputPath || firstInput.value || firstInput;
        if (typeof inputValue !== 'string') {
          throw new Error(`オブジェクトから有効なパスを取得できません: ${JSON.stringify(firstInput)}`);
        }
        console.log(`🔍 [${nodeId}] オブジェクト解決結果: ${inputValue}`);
      } else {
        throw new Error(`不正な入力値: ${firstInput} (type: ${typeof firstInput})`);
      }
    }
    
    console.log(`🔍 [${nodeId}] 処理対象: ${params.operation}, 最終入力値: ${inputValue}`);
    
    // 処理実行
    switch (params.operation) {
      case 'mosaic':
        result = await safeMosaic(inputValue, params, nodeId);
        break;
        
      case 'rotate':
        result = await safeRotate(inputValue, params, nodeId);
        break;
        
      case 'resize':
        result = await safeResize(inputValue, params, nodeId);
        break;
        
      case 'summary':
        result = await safeSummary(inputValue, params, nodeId);
        break;
        
      default:
        throw new Error(`未対応の操作: ${params.operation}`);
    }
    
    const endTime = Date.now();
    const processingTime = endTime - startTime;
    
    console.log(`✅ [${nodeId}] 処理完了: ${params.operation} (${processingTime}ms) - ${new Date().toLocaleTimeString('ja-JP', {timeZone: 'Asia/Tokyo'})}`);
    console.log(`📤 [${nodeId}] 出力: ${typeof result === 'object' ? JSON.stringify(result) : result}`);
    
    // GraphAI互換の戻り値
    return {
      outputPath: params.outputPath || result,
      operation: params.operation,
      processingTime,
      timestamp: new Date().toISOString(),
      nodeId: nodeId,
      value: params.outputPath || result
    };
    
  } catch (error) {
    console.error(`❌ [${nodeId}] 処理エラー: ${params.operation}`, error.message);
    throw error;
  }
};

// ===== 安全な画像処理関数群 =====

// 安全なモザイク処理
async function safeMosaic(inputPath, params, nodeId) {
  const { blockSize = 10, outputPath } = params;
  
  console.log(`🎨 [${nodeId}] モザイク処理開始: ${inputPath} -> ${outputPath}`);
  
  // 出力ディレクトリ作成
  await ensureDirSafe(path.dirname(outputPath));
  
  // 入力ファイル存在確認
  try {
    await fs.access(inputPath);
    const stats = await fs.stat(inputPath);
    console.log(`📁 [${nodeId}] 入力ファイル確認: ${inputPath} (${Math.round(stats.size/1024)}KB)`);
  } catch (error) {
    throw new Error(`入力ファイルが見つかりません: ${inputPath}`);
  }
  
  try {
    const image = sharp(inputPath);
    const metadata = await image.metadata();
    
    console.log(`🔧 [${nodeId}] 画像メタデータ: ${metadata.width}x${metadata.height}, フォーマット: ${metadata.format}`);
    
    const smallWidth = Math.max(1, Math.floor(metadata.width / blockSize));
    const smallHeight = Math.max(1, Math.floor(metadata.height / blockSize));
    
    console.log(`🔧 [${nodeId}] モザイクサイズ: ${smallWidth}x${smallHeight} (ブロックサイズ: ${blockSize})`);
    
    await image
      .resize(smallWidth, smallHeight, { kernel: 'nearest' })
      .resize(metadata.width, metadata.height, { kernel: 'nearest' })
      .jpeg({ quality: 90 })
      .toFile(outputPath);
    
    // ファイル書き込み完了の確認
    await fs.access(outputPath);
    const outputStats = await fs.stat(outputPath);
    console.log(`💾 [${nodeId}] モザイク処理完了: ${outputPath} (${Math.round(outputStats.size/1024)}KB)`);
    
    return outputPath;
  } catch (error) {
    console.error(`❌ [${nodeId}] モザイク処理エラー: ${error.message}`);
    throw error;
  }
}

// 安全な回転処理
async function safeRotate(inputPath, params, nodeId) {
  const { angle = 90, outputPath } = params;
  
  console.log(`🔄 [${nodeId}] 回転処理開始: ${inputPath} -> ${outputPath} (${angle}度)`);
  
  await ensureDirSafe(path.dirname(outputPath));
  
  // 入力ファイル存在確認（依存関係対応）
  await waitForFileSafe(inputPath, nodeId);
  
  try {
    const stats = await fs.stat(inputPath);
    console.log(`📁 [${nodeId}] 入力ファイル確認: ${inputPath} (${Math.round(stats.size/1024)}KB)`);
    
    await sharp(inputPath)
      .rotate(angle)
      .jpeg({ quality: 90 })
      .toFile(outputPath);
    
    // ファイル書き込み完了の確認
    await fs.access(outputPath);
    const outputStats = await fs.stat(outputPath);
    console.log(`💾 [${nodeId}] 回転処理完了: ${outputPath} (${Math.round(outputStats.size/1024)}KB)`);
    
    return outputPath;
  } catch (error) {
    console.error(`❌ [${nodeId}] 回転処理エラー: ${error.message}`);
    throw error;
  }
}

// 安全なリサイズ処理
async function safeResize(inputPath, params, nodeId) {
  const { width = 300, height = 300, outputPath } = params;
  
  console.log(`📏 [${nodeId}] リサイズ処理開始: ${inputPath} -> ${outputPath} (${width}x${height})`);
  
  await ensureDirSafe(path.dirname(outputPath));
  
  // 入力ファイル存在確認（依存関係対応）
  await waitForFileSafe(inputPath, nodeId);
  
  try {
    const stats = await fs.stat(inputPath);
    console.log(`📁 [${nodeId}] 入力ファイル確認: ${inputPath} (${Math.round(stats.size/1024)}KB)`);
    
    await sharp(inputPath)
      .resize(width, height, { 
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 90 })
      .toFile(outputPath);
    
    // ファイル書き込み完了の確認
    await fs.access(outputPath);
    const outputStats = await fs.stat(outputPath);
    console.log(`💾 [${nodeId}] リサイズ処理完了: ${outputPath} (${Math.round(outputStats.size/1024)}KB)`);
    
    return outputPath;
  } catch (error) {
    console.error(`❌ [${nodeId}] リサイズ処理エラー: ${error.message}`);
    throw error;
  }
}

// 安全なファイル待機関数
async function waitForFileSafe(filePath, nodeId, maxWaitMs = 5000) {
  const startTime = Date.now();
  
  console.log(`⏳ [${nodeId}] ファイル待機開始: ${filePath}`);
  
  while (Date.now() - startTime < maxWaitMs) {
    try {
      await fs.access(filePath);
      // ファイル存在確認後、少し待機（書き込み完了確保）
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // ファイルサイズが0でないことを確認
      const stats = await fs.stat(filePath);
      if (stats.size > 0) {
        console.log(`✅ [${nodeId}] ファイル準備完了: ${filePath} (${Math.round(stats.size/1024)}KB)`);
        return true;
      }
    } catch (error) {
      // ファイルがまだ存在しない場合は少し待機
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  throw new Error(`[${nodeId}] 依存ファイルの待機タイムアウト: ${filePath}`);
}

// 安全なサマリー作成
async function safeSummary(inputs, params, nodeId) {
  const { outputPath } = params;
  
  console.log(`📊 [${nodeId}] サマリー作成開始: ${inputs.length}個の結果`);
  
  await ensureDirSafe(path.dirname(outputPath));
  
  const summary = {
    totalProcessed: inputs.length,
    completedAt: new Date().toLocaleString('ja-JP', {timeZone: 'Asia/Tokyo'}),
    processingNode: nodeId,
    results: inputs.map((input, index) => {
      const result = {
        pipeline: index + 1,
        processingTime: 'N/A'
      };
      
      if (typeof input === 'object' && input !== null) {
        result.outputPath = input.outputPath || input.value;
        result.processingTime = input.processingTime || 'N/A';
        result.operation = input.operation;
      } else {
        result.outputPath = input;
      }
      
      return result;
    })
  };
  
  await fs.writeFile(outputPath, JSON.stringify(summary, null, 2));
  
  console.log(`💾 [${nodeId}] サマリー作成完了: ${outputPath}`);
  
  return summary;
}

// 安全なディレクトリ作成
async function ensureDirSafe(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      console.warn(`⚠️  ディレクトリ作成警告: ${error.message}`);
      if (error.code === 'EPERM' || error.code === 'EACCES') {
        console.log(`📁 既存ディレクトリを使用: ${dirPath}`);
        return;
      }
      throw error;
    }
  }
}

// ===== メイン処理 =====
async function runCompleteDemo() {
  console.log('🐳 GraphAI 完全統合版並列処理デモ（ノード名解決機能付き）');
  console.log('💡 すべての機能を単一ファイルに統合');
  console.log('🌍 実行環境: Linux Container (Docker)');
  console.log('🕒 タイムゾーン: Asia/Tokyo (JST)');
  console.log('');
  
  try {
    // 環境準備
    await setupEnvironment();
    
    // GraphAI設定読み込み
    const yamlContent = await fs.readFile('./graph.yaml', 'utf8');
    const graphData = yaml.load(yamlContent);
    
    // GraphAIデータをキャッシュ（ノード名解決用）
    graphDataCache = graphData;
    
    console.log('🔧 GraphAI設定確認:');
    console.log(`   version: ${graphData.version}`);
    console.log(`   ノード数: ${Object.keys(graphData.nodes).length}`);
    
    // エージェント登録（完全統合版・ノード名解決機能付き）
    const agents = {
      imageProcessingAgent: {
        agent: completeImageProcessingAgent,
        mock: completeImageProcessingAgent
      }
    };
    
    console.log('🔧 完全統合版エージェント登録:');
    console.log('   - imageProcessingAgent: 完全統合版（ノード名解決機能付き）');
    console.log('   - ログ機能: 確実に有効');
    console.log('   - ファイル待機機能: 有効');
    console.log('   - ノード名解決機能: 有効');
    
    // GraphAI実行
    console.log('\n' + '='.repeat(70));
    console.log('🚀 GraphAI 並列処理実行開始！（完全統合版）');
    console.log('='.repeat(70));
    
    const startTime = Date.now();
    
    const graph = new GraphAI(graphData, agents);
    const results = await graph.run();
    
    const totalTime = Date.now() - startTime;
    
    // 結果表示
    console.log('\n' + '🎉'.repeat(25));
    console.log('🏆 GraphAI 並列処理完了！（完全統合版）');
    console.log('🎉'.repeat(25));
    console.log('');
    
    console.log('📈 パフォーマンス結果:');
    console.log(`   ⚡ 総処理時間: ${totalTime}ms`);
    console.log('');
    
    // ファイル結果確認
    await displayOutputFiles();
    
    console.log(`\n📝 詳細ログ: ${logFilePath}`);
    console.log(`🕒 実行完了時刻: ${formatJSTTime().local}`);
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
    console.error('📝 詳細:', error.stack);
  }
}

async function setupEnvironment() {
  console.log('🔧 環境をセットアップ中...');
  
  // ディレクトリ作成
  const dirs = ['./output'];
  for (const dir of dirs) {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
    }
  }
  
  // 画像ファイル確認
  const imageFiles = ['./images/image1.jpg', './images/image2.jpg', './images/image3.jpg'];
  console.log('📸 使用する画像ファイル:');
  
  for (const file of imageFiles) {
    try {
      await fs.access(file);
      const stats = await fs.stat(file);
      const sizeKB = Math.round(stats.size / 1024);
      console.log(`   ✅ ${file} (${sizeKB} KB)`);
    } catch (error) {
      throw new Error(`必要な画像ファイルが見つかりません: ${file}`);
    }
  }
  
  console.log('✅ 環境セットアップ完了');
  console.log('');
}

async function displayOutputFiles() {
  console.log('📁 生成されたファイル:');
  try {
    const outputFiles = await fs.readdir('./output');
    if (outputFiles.length > 0) {
      outputFiles.forEach(file => {
        console.log(`   ✅ ${file}`);
      });
    } else {
      console.log('   ⚠️  出力ファイルが見つかりません');
    }
  } catch (error) {
    console.log('   ❌ 出力ディレクトリの確認に失敗');
  }
}

// メイン実行
if (require.main === module) {
  console.log('📍 メイン関数実行中...');
  runCompleteDemo().catch((error) => {
    console.error(`❌ 最上位エラー: ${error.message}`);
    console.error(`スタックトレース: ${error.stack}`);
  });
}

console.log('📍 完全統合版スクリプト読み込み完了');
console.log(`📝 ログファイル作成確認: ${logFilePath}`);

module.exports = { runCompleteDemo };