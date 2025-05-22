// start-web-server.js - インタラクティブ比較デモ用Webサーバー（完全統合版）
const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { GraphAI } = require('graphai');
const yaml = require('js-yaml');
const sharp = require('sharp');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use('/output', express.static('output'));
app.use('/images', express.static('images'));

// グローバル変数（処理結果保存用）
let processingResults = {
  sequential: null,
  parallel: null,
  isRunning: false
};

// GraphAIデータキャッシュ
let graphDataCache = null;

// ===== GraphAIノード値解決機能 =====
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

// ===== 完全統合画像処理エージェント =====
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

// ===== 逐次処理関数 =====
async function runSequentialProcessing() {
  console.log('🔄 逐次処理開始...');
  const startTime = Date.now();
  
  const imageFiles = [
    { input: './images/image1.jpg', pipeline: 1, blockSize: 10, angle: 90 },
    { input: './images/image2.jpg', pipeline: 2, blockSize: 15, angle: 180 },
    { input: './images/image3.jpg', pipeline: 3, blockSize: 8, angle: 270 }
  ];
  
  const results = [];
  
  for (let i = 0; i < imageFiles.length; i++) {
    const { input, pipeline, blockSize, angle } = imageFiles[i];
    const pipelineStartTime = Date.now();
    
    // モザイク処理
    const mosaicOutput = `./output/seq_image${pipeline}_mosaic.jpg`;
    const mosaicStart = Date.now();
    await processImage(input, mosaicOutput, 'mosaic', { blockSize });
    const mosaicTime = Date.now() - mosaicStart;
    
    // 回転処理
    const rotateOutput = `./output/seq_image${pipeline}_rotated.jpg`;
    const rotateStart = Date.now();
    await processImage(mosaicOutput, rotateOutput, 'rotate', { angle });
    const rotateTime = Date.now() - rotateStart;
    
    // リサイズ処理
    const finalOutput = `./output/seq_image${pipeline}_final.jpg`;
    const resizeStart = Date.now();
    await processImage(rotateOutput, finalOutput, 'resize', { width: 300, height: 300 });
    const resizeTime = Date.now() - resizeStart;
    
    const pipelineTime = Date.now() - pipelineStartTime;
    
    results.push({
      pipeline,
      totalTime: pipelineTime,
      steps: {
        mosaic: mosaicTime,
        rotate: rotateTime,
        resize: resizeTime
      }
    });
  }
  
  const totalTime = Date.now() - startTime;
  console.log(`🎯 逐次処理総時間: ${totalTime}ms`);
  
  return { totalTime, results };
}

// ===== GraphAI並列処理関数（軽量化版） =====
async function runParallelProcessing(useExtended = false) {
  console.log('⚡ GraphAI並列処理開始...');
  const startTime = Date.now();
  
  try {
    // 設定ファイルを選択
    const yamlFile = useExtended ? './graph-extended.yaml' : './graph.yaml';
    console.log(`📄 使用設定: ${yamlFile}`);
    
    // GraphAI設定読み込み
    const yamlContent = await fs.readFile(yamlFile, 'utf8');
    const graphData = yaml.load(yamlContent);
    
    // GraphAIデータをキャッシュ（ノード名解決用）
    graphDataCache = graphData;
    
    console.log('🔧 GraphAI設定確認:');
    console.log(`   version: ${graphData.version}`);
    console.log(`   ノード数: ${Object.keys(graphData.nodes).length}`);
    
    // コンテナログをファイルに出力
    const logFileName = `graphai-comparison-${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.log`;
    const logFilePath = path.join('./logs', logFileName);
    
    // ログディレクトリ作成
    await ensureDirSafe('./logs');
    
    const logStream = fsSync.createWriteStream(logFilePath, { flags: 'a' });
    
    // コンソールログをファイルにも出力
    const originalLog = console.log;
    console.log = (...args) => {
      const message = args.join(' ');
      originalLog(...args);
      logStream.write(`[${new Date().toISOString()}] ${message}\n`);
    };
    
    console.log(`📝 ログファイル: ${logFilePath}`);
    
    // 軽量化されたエージェント（進捗表示のみ）
    let completedCount = 0;
    const totalNodes = Object.keys(graphData.nodes).filter(id => graphData.nodes[id].agent).length;
    
    const lightweightImageAgent = async (context) => {
      const nodeId = context.debugInfo?.nodeId;
      const operation = context.params?.operation;
      
      console.log(`🔄 [${nodeId}] ${operation} 開始`);
      
      try {
        const result = await completeImageProcessingAgent(context);
        completedCount++;
        console.log(`✅ [${nodeId}] ${operation} 完了 (${completedCount}/${totalNodes})`);
        return result;
      } catch (error) {
        console.error(`❌ [${nodeId}] ${operation} 失敗: ${error.message}`);
        throw error;
      }
    };
    
    const agents = {
      imageProcessingAgent: {
        agent: lightweightImageAgent,
        mock: lightweightImageAgent
      }
    };
    
    console.log('🔧 軽量化エージェント登録完了');
    
    // GraphAI実行
    console.log('\n' + '='.repeat(50));
    console.log('🚀 GraphAI 並列処理実行開始！');
    console.log('='.repeat(50));
    
    const graph = new GraphAI(graphData, agents);
    
    // シンプルなタイムアウト付き実行
    const timeout = useExtended ? 15000 : 10000; // 拡張版は15秒
    console.log(`⏰ タイムアウト: ${timeout}ms`);
    
    const results = await Promise.race([
      graph.run(),
      new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`GraphAI処理が${timeout}msでタイムアウト`));
        }, timeout);
      })
    ]);
    
    const totalTime = Date.now() - startTime;
    console.log(`⚡ 並列処理総時間: ${totalTime}ms`);
    console.log(`🎉 完了ノード: ${completedCount}/${totalNodes}`);
    
    // 生成ファイル数確認
    try {
      const outputFiles = await fs.readdir('./output');
      const imageFiles = outputFiles.filter(file => file.endsWith('.jpg'));
      console.log(`🖼️  生成画像: ${imageFiles.length}個`);
    } catch (error) {
      console.warn('⚠️  出力ファイル確認エラー');
    }
    
    // ログストリームをクローズ
    logStream.end();
    console.log = originalLog; // 元に戻す
    
    console.log(`📝 ログ保存完了: ${logFilePath}`);
    
    return { totalTime, results };
    
  } catch (error) {
    console.error('❌ 並列処理エラー:', error.message);
    const totalTime = Date.now() - startTime;
    throw new Error(`GraphAI並列処理失敗 (${totalTime}ms): ${error.message}`);
  }
}

// ===== 画像処理関数 =====
async function processImage(inputPath, outputPath, operation, params) {
  await ensureDirSafe(path.dirname(outputPath));
  
  let image = sharp(inputPath);
  
  switch (operation) {
    case 'mosaic':
      const { blockSize = 10 } = params;
      const metadata = await image.metadata();
      const smallWidth = Math.max(1, Math.floor(metadata.width / blockSize));
      const smallHeight = Math.max(1, Math.floor(metadata.height / blockSize));
      
      image = image
        .resize(smallWidth, smallHeight, { kernel: 'nearest' })
        .resize(metadata.width, metadata.height, { kernel: 'nearest' });
      break;
      
    case 'rotate':
      const { angle = 90 } = params;
      image = image.rotate(angle);
      break;
      
    case 'resize':
      const { width = 300, height = 300 } = params;
      image = image.resize(width, height, { 
        fit: 'cover',
        position: 'center'
      });
      break;
  }
  
  await image.jpeg({ quality: 90 }).toFile(outputPath);
}

// ===== API エンドポイント =====

// 逐次処理実行API
app.post('/api/run-sequential', async (req, res) => {
  if (processingResults.isRunning) {
    return res.status(429).json({ error: '処理が実行中です' });
  }
  
  try {
    processingResults.isRunning = true;
    console.log('API: 逐次処理開始');
    
    const result = await runSequentialProcessing();
    processingResults.sequential = result;
    
    res.json({ 
      success: true, 
      result,
      message: '逐次処理が完了しました'
    });
  } catch (error) {
    console.error('逐次処理エラー:', error);
    res.status(500).json({ 
      error: error.message,
      message: '逐次処理中にエラーが発生しました' 
    });
  } finally {
    processingResults.isRunning = false;
  }
});

// 並列処理実行API  
app.post('/api/run-parallel', async (req, res) => {
  if (processingResults.isRunning) {
    return res.status(429).json({ error: '処理が実行中です' });
  }
  
  try {
    processingResults.isRunning = true;
    console.log('API: 並列処理開始');
    
    const result = await runParallelProcessing();
    processingResults.parallel = result;
    
    res.json({ 
      success: true, 
      result,
      message: 'GraphAI並列処理が完了しました'
    });
  } catch (error) {
    console.error('並列処理エラー:', error);
    res.status(500).json({ 
      error: error.message,
      message: '並列処理中にエラーが発生しました' 
    });
  } finally {
    processingResults.isRunning = false;
  }
});

// 結果取得API
app.get('/api/results', (req, res) => {
  res.json(processingResults);
});

// 結果リセットAPI
app.post('/api/reset', async (req, res) => {
  try {
    // 出力ファイルを削除
    const outputDir = './output';
    if (fsSync.existsSync(outputDir)) {
      const files = await fs.readdir(outputDir);
      for (const file of files) {
        if (file.startsWith('seq_') || file.endsWith('.jpg') || file.endsWith('.json')) {
          await fs.unlink(path.join(outputDir, file));
        }
      }
    }
    
    // 結果をリセット
    processingResults = {
      sequential: null,
      parallel: null,
      isRunning: false
    };
    
    res.json({ success: true, message: '結果をリセットしました' });
  } catch (error) {
    console.error('リセットエラー:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== メインページ =====
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
        <meta charset="UTF-8">
        <title>GraphAI 逐次処理 vs 並列処理 比較デモ</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                margin: 0;
                padding: 20px;
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
            .controls {
                display: flex;
                justify-content: center;
                gap: 20px;
                margin: 30px 0;
                flex-wrap: wrap;
            }
            .btn {
                padding: 15px 30px;
                border: none;
                border-radius: 25px;
                font-size: 16px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s ease;
                min-width: 180px;
            }
            .btn-sequential {
                background: #FF6B6B;
                color: white;
            }
            .btn-parallel {
                background: #4ECDC4;
                color: white;
            }
            .btn-reset {
                background: #FFA726;
                color: white;
            }
            .btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            }
            .btn:disabled {
                opacity: 0.6;
                cursor: not-allowed;
                transform: none;
            }
            .results {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 30px;
                margin: 30px 0;
            }
            .result-card {
                background: rgba(255,255,255,0.1);
                border-radius: 15px;
                padding: 25px;
                text-align: center;
                min-height: 200px;
            }
            .sequential-card { border-left: 5px solid #FF6B6B; }
            .parallel-card { border-left: 5px solid #4ECDC4; }
            .time-display {
                font-size: 2.5em;
                font-weight: bold;
                margin: 20px 0;
                color: #FFD700;
            }
            .comparison {
                background: rgba(255,255,255,0.15);
                border-radius: 15px;
                padding: 25px;
                margin: 30px 0;
                text-align: center;
            }
            .metric {
                display: inline-block;
                margin: 0 30px;
                text-align: center;
            }
            .metric-value {
                font-size: 2em;
                font-weight: bold;
                color: #FFD700;
            }
            .progress-bar {
                width: 100%;
                height: 20px;
                background: rgba(255,255,255,0.2);
                border-radius: 10px;
                overflow: hidden;
                margin: 10px 0;
            }
            .progress-fill {
                height: 100%;
                transition: width 0.5s ease;
            }
            .progress-sequential {
                background: linear-gradient(90deg, #FF6B6B, #FF8E8E);
            }
            .progress-parallel {
                background: linear-gradient(90deg, #4ECDC4, #6EE7DB);
            }
            .loading {
                display: inline-block;
                width: 20px;
                height: 20px;
                border: 3px solid rgba(255,255,255,0.3);
                border-radius: 50%;
                border-top-color: #fff;
                animation: spin 1s ease-in-out infinite;
            }
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
            .image-results {
                background: rgba(255,255,255,0.1);
                border-radius: 15px;
                padding: 25px;
                margin: 30px 0;
            }
            .pipeline-images {
                display: flex;
                gap: 15px;
                align-items: center;
                margin: 15px 0;
                flex-wrap: wrap;
            }
            .image-stage {
                text-align: center;
                flex: 1;
                min-width: 120px;
            }
            .image-stage img {
                width: 120px;
                height: 120px;
                object-fit: cover;
                border: 2px solid rgba(255,255,255,0.3);
                border-radius: 8px;
                margin-bottom: 5px;
            }
            .arrow {
                font-size: 20px;
                color: #FFD700;
                margin: 0 5px;
            }
            .status {
                padding: 10px;
                border-radius: 8px;
                margin: 10px 0;
                text-align: center;
                font-weight: bold;
            }
            .status-info { background: rgba(33, 150, 243, 0.2); }
            .status-success { background: rgba(76, 175, 80, 0.2); }
            .status-error { background: rgba(244, 67, 54, 0.2); }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🚀 GraphAI パフォーマンス比較デモ</h1>
                <p>同じ画像処理タスクを逐次処理と並列処理で実行して性能を比較します</p>
                <p><strong>処理内容:</strong> 3枚の画像に「モザイク → 回転 → リサイズ」を適用</p>
            </div>
            
            <div class="controls">
                <button id="btnSequential" class="btn btn-sequential" onclick="runSequential()">
                    🔄 逐次処理実行
                </button>
                <button id="btnParallel" class="btn btn-parallel" onclick="runParallel()">
                    ⚡ GraphAI並列処理実行
                </button>
                <button id="btnReset" class="btn btn-reset" onclick="resetResults()">
                    🗑️ リセット
                </button>
            </div>
            
            <div id="status" class="status" style="display: none;"></div>
            
            <div class="results">
                <div class="result-card sequential-card">
                    <h3>🔄 逐次処理 (従来手法)</h3>
                    <div id="sequentialTime" class="time-display">--</div>
                    <p>3つの画像を1つずつ順番に処理</p>
                    <div class="progress-bar">
                        <div id="sequentialProgress" class="progress-fill progress-sequential" style="width: 0%;"></div>
                    </div>
                    <div id="sequentialDetails"></div>
                </div>
                
                <div class="result-card parallel-card">
                    <h3>⚡ GraphAI並列処理</h3>
                    <div id="parallelTime" class="time-display">--</div>
                    <p>3つの画像を同時に並列処理</p>
                    <div class="progress-bar">
                        <div id="parallelProgress" class="progress-fill progress-parallel" style="width: 0%;"></div>
                    </div>
                    <div id="parallelDetails"></div>
                </div>
            </div>
            
            <div id="comparison" class="comparison" style="display: none;">
                <h2>📊 パフォーマンス比較結果</h2>
                <div class="metric">
                    <div id="speedup" class="metric-value">--</div>
                    <div>速度向上</div>
                </div>
                <div class="metric">
                    <div id="efficiency" class="metric-value">--</div>
                    <div>効率改善</div>
                </div>
                <div class="metric">
                    <div id="timeSaved" class="metric-value">--</div>
                    <div>時間短縮 (ms)</div>
                </div>
            </div>
            
            <div id="imageResults" class="image-results" style="display: none;">
                <h3>🖼️ 処理結果画像</h3>
                <div id="imageGrid"></div>
            </div>
        </div>

        <script>
            let isProcessing = false;
            
            function showStatus(message, type = 'info') {
                const status = document.getElementById('status');
                status.innerHTML = message;
                status.className = 'status status-' + type;
                status.style.display = 'block';
                
                if (type === 'success') {
                    setTimeout(() => {
                        status.style.display = 'none';
                    }, 3000);
                }
            }
            
            function updateButtons() {
                document.getElementById('btnSequential').disabled = isProcessing;
                document.getElementById('btnParallel').disabled = isProcessing;
                document.getElementById('btnReset').disabled = isProcessing;
            }
            
            async function runSequential() {
                if (isProcessing) return;
                
                isProcessing = true;
                updateButtons();
                showStatus('🔄 逐次処理を実行中... <div class="loading"></div>', 'info');
                
                try {
                    const response = await fetch('/api/run-sequential', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' }
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        document.getElementById('sequentialTime').textContent = data.result.totalTime + 'ms';
                        document.getElementById('sequentialProgress').style.width = '100%';
                        
                        const details = data.result.results.map(r => 
                            \`Pipeline \${r.pipeline}: \${r.totalTime}ms\`
                        ).join('<br>');
                        document.getElementById('sequentialDetails').innerHTML = '<small>' + details + '</small>';
                        
                        showStatus('✅ 逐次処理が完了しました！', 'success');
                        updateComparison();
                    } else {
                        throw new Error(data.error);
                    }
                } catch (error) {
                    console.error('逐次処理エラー:', error);
                    showStatus('❌ 逐次処理でエラーが発生しました: ' + error.message, 'error');
                } finally {
                    isProcessing = false;
                    updateButtons();
                }
            }
            
            async function runParallel() {
                if (isProcessing) return;
                
                isProcessing = true;
                updateButtons();
                showStatus('⚡ GraphAI並列処理を実行中... <div class="loading"></div>', 'info');
                
                try {
                    const response = await fetch('/api/run-parallel', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' }
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        document.getElementById('parallelTime').textContent = data.result.totalTime + 'ms';
                        document.getElementById('parallelProgress').style.width = '100%';
                        
                        showStatus('✅ GraphAI並列処理が完了しました！', 'success');
                        updateComparison();
                        showImageResults();
                    } else {
                        throw new Error(data.error);
                    }
                } catch (error) {
                    console.error('並列処理エラー:', error);
                    showStatus('❌ 並列処理でエラーが発生しました: ' + error.message, 'error');
                } finally {
                    isProcessing = false;
                    updateButtons();
                }
            }
            
            function updateComparison() {
                const seqTime = parseInt(document.getElementById('sequentialTime').textContent);
                const parTime = parseInt(document.getElementById('parallelTime').textContent);
                
                if (seqTime && parTime) {
                    const speedup = (seqTime / parTime).toFixed(2);
                    const efficiency = ((seqTime - parTime) / seqTime * 100).toFixed(1);
                    const timeSaved = seqTime - parTime;
                    
                    document.getElementById('speedup').textContent = speedup + '倍';
                    document.getElementById('efficiency').textContent = efficiency + '%';
                    document.getElementById('timeSaved').textContent = timeSaved;
                    
                    document.getElementById('comparison').style.display = 'block';
                    
                    // プログレスバー調整
                    document.getElementById('parallelProgress').style.width = (parTime / seqTime * 100) + '%';
                }
            }
            
            function showImageResults() {
                const imageGrid = document.getElementById('imageGrid');
                imageGrid.innerHTML = \`
                    <div class="pipeline-images">
                        <div class="image-stage">
                            <img src="/images/image1.jpg" alt="元画像1">
                            <div>元画像1</div>
                        </div>
                        <div class="arrow">→</div>
                        <div class="image-stage">
                            <img src="/output/image1_mosaic.jpg" alt="モザイク1">
                            <div>モザイク</div>
                        </div>
                        <div class="arrow">→</div>
                        <div class="image-stage">
                            <img src="/output/image1_rotated.jpg" alt="回転1">
                            <div>回転</div>
                        </div>
                        <div class="arrow">→</div>
                        <div class="image-stage">
                            <img src="/output/image1_final.jpg" alt="最終1">
                            <div>リサイズ</div>
                        </div>
                    </div>
                \`;
                
                document.getElementById('imageResults').style.display = 'block';
            }
            
            async function resetResults() {
                if (isProcessing) return;
                
                try {
                    const response = await fetch('/api/reset', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' }
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        // UI をリセット
                        document.getElementById('sequentialTime').textContent = '--';
                        document.getElementById('parallelTime').textContent = '--';
                        document.getElementById('sequentialProgress').style.width = '0%';
                        document.getElementById('parallelProgress').style.width = '0%';
                        document.getElementById('sequentialDetails').innerHTML = '';
                        document.getElementById('parallelDetails').innerHTML = '';
                        document.getElementById('comparison').style.display = 'none';
                        document.getElementById('imageResults').style.display = 'none';
                        document.getElementById('status').style.display = 'none';
                        
                        showStatus('✅ 結果をリセットしました', 'success');
                    }
                } catch (error) {
                    console.error('リセットエラー:', error);
                    showStatus('❌ リセット中にエラーが発生しました', 'error');
                }
            }
            
            // 初期状態設定
            updateButtons();
        </script>
    </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`🌐 GraphAI比較デモサーバー起動: http://localhost:${PORT}`);
  console.log('ブラウザで逐次処理と並列処理の比較デモを開始してください！');
});