// imageAgent-windows-safe.js - Windows並列処理安全版
const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

// Windows並列処理安全化のためのミューテックス
const processingLocks = new Set();

// GraphAI エージェント関数（Windows安全版）
const imageProcessingAgent = async (context) => {
  const startTime = Date.now();
  
  // contextから必要な情報を取得
  const namedInputs = context.namedInputs || context.inputs || {};
  const params = context.params || {};
  const nodeId = context.debugInfo?.nodeId;
  
  console.log(`🔍 Context呼び出し: namedInputs=`, namedInputs);
  console.log(`🔍 params=`, params);
  
  if (!params.operation) {
    throw new Error('params.operation が見つかりません。GraphAIの設定を確認してください。');
  }
  
  console.log(`🎬 処理開始: ${params.operation} - ${new Date().toLocaleTimeString('ja-JP', {timeZone: 'Asia/Tokyo'})}`);
  
  try {
    let result;
    let inputValue;
    
    if (params.operation === 'summary') {
      // summary操作の場合は全ての入力を配列として取得
      inputValue = Object.values(namedInputs);
    } else {
      // source という名前の入力を取得
      const sourceValue = namedInputs.source;
      console.log(`🔍 sourceValue: ${sourceValue}, type: ${typeof sourceValue}`);
      
      // GraphAIから渡される値を適切に処理
      if (typeof sourceValue === 'string') {
        // ファイルパスの場合はそのまま使用
        if (sourceValue.includes('./images/') || sourceValue.includes('./output/')) {
          inputValue = sourceValue;
        } else {
          // ノード名の場合はファイルパスに変換
          inputValue = await resolveNodeNameToPath(sourceValue, params.operation);
        }
      } else if (typeof sourceValue === 'object' && sourceValue !== null) {
        // オブジェクトの場合、outputPathを取得
        inputValue = sourceValue.outputPath || sourceValue;
      } else {
        throw new Error(`不正な入力値: ${sourceValue}`);
      }
    }
    
    console.log(`🔍 処理対象: ${params.operation}, 最終入力値: ${inputValue}`);
    
    // Windows並列処理安全化: 操作別の処理
    switch (params.operation) {
      case 'mosaic':
        result = await windowsSafeMosaic(inputValue, params, nodeId);
        break;
        
      case 'rotate':
        result = await windowsSafeRotate(inputValue, params, nodeId);
        break;
        
      case 'resize':
        result = await windowsSafeResize(inputValue, params, nodeId);
        break;
        
      case 'summary':
        result = await createSummary(inputValue, params);
        break;
        
      default:
        throw new Error(`未対応の操作: ${params.operation}`);
    }
    
    const endTime = Date.now();
    const processingTime = endTime - startTime;
    
    console.log(`✅ 処理完了: ${params.operation} (${processingTime}ms) - ${new Date().toLocaleTimeString('ja-JP', {timeZone: 'Asia/Tokyo'})}`);
    console.log(`📤 出力: ${result}`);
    
    // 次のノードが使えるシンプルな値を返す
    return {
      outputPath: params.outputPath || result,
      operation: params.operation,
      processingTime,
      timestamp: new Date().toISOString(),
      nodeId: nodeId
    };
    
  } catch (error) {
    console.error(`❌ 処理エラー: ${params.operation}`, error);
    throw error;
  }
};

// Windows安全版ファイル書き込み
async function windowsSafeFileWrite(operation, inputPath, outputPath, processFunction, nodeId) {
  const lockKey = `${operation}-${outputPath}`;
  
  // 同じファイルへの同時書き込みを防ぐ
  while (processingLocks.has(lockKey)) {
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  processingLocks.add(lockKey);
  
  try {
    // ノード別の遅延（並列処理の競合を避ける）
    const nodeDelay = getNodeDelay(nodeId);
    if (nodeDelay > 0) {
      console.log(`⏱️  ${nodeId}: 並列安全化のため${nodeDelay}ms待機`);
      await new Promise(resolve => setTimeout(resolve, nodeDelay));
    }
    
    // 出力ディレクトリの確認と作成
    await ensureDir(path.dirname(outputPath));
    
    // 入力ファイル存在確認
    try {
      await fs.access(inputPath);
    } catch (error) {
      throw new Error(`入力ファイルが見つかりません: ${inputPath}`);
    }
    
    // 一時ファイル名を使用（Windows並列書き込み安全化）
    const tempOutputPath = outputPath + '.tmp' + Date.now();
    
    try {
      // 実際の処理実行
      await processFunction(inputPath, tempOutputPath);
      
      // 一時ファイルを最終ファイル名に移動
      await fs.rename(tempOutputPath, outputPath);
      
      console.log(`💾 ${nodeId}: ファイル安全書き込み完了 - ${outputPath}`);
      
    } catch (processError) {
      // 一時ファイルの掃除
      try {
        await fs.unlink(tempOutputPath);
      } catch (cleanupError) {
        // 掃除失敗は無視
      }
      throw processError;
    }
    
  } finally {
    processingLocks.delete(lockKey);
  }
}

// ノード別遅延計算（並列処理の競合を避ける）
function getNodeDelay(nodeId) {
  if (!nodeId) return 0;
  
  // ノードIDから遅延を計算（同時実行を分散）
  const delays = {
    'mosaic1': 0,     // Pipeline 1は遅延なし
    'mosaic2': 25,    // Pipeline 2は25ms遅延  
    'mosaic3': 50,    // Pipeline 3は50ms遅延
    'rotate1': 10,
    'rotate2': 35,
    'rotate3': 60,
    'resize1': 20,
    'resize2': 45,
    'resize3': 70
  };
  
  return delays[nodeId] || 0;
}

// Windows安全版モザイク処理
async function windowsSafeMosaic(inputPath, params) {
  const { blockSize = 10, outputPath } = params;
  
  const processFunction = async (input, output) => {
    const image = sharp(input);
    const metadata = await image.metadata();
    
    const smallWidth = Math.max(1, Math.floor(metadata.width / blockSize));
    const smallHeight = Math.max(1, Math.floor(metadata.height / blockSize));
    
    await image
      .resize(smallWidth, smallHeight, { kernel: 'nearest' })
      .resize(metadata.width, metadata.height, { kernel: 'nearest' })
      .jpeg({ quality: 90 })
      .toFile(output);
  };
  
  await windowsSafeFileWrite('mosaic', inputPath, outputPath, processFunction, params.nodeId);
  return outputPath;
}

// Windows安全版回転処理
async function windowsSafeRotate(inputPath, params) {
  const { angle = 90, outputPath } = params;
  
  const processFunction = async (input, output) => {
    await sharp(input)
      .rotate(angle)
      .jpeg({ quality: 90 })
      .toFile(output);
  };
  
  await windowsSafeFileWrite('rotate', inputPath, outputPath, processFunction, params.nodeId);
  return outputPath;
}

// Windows安全版リサイズ処理
async function windowsSafeResize(inputPath, params) {
  const { width = 300, height = 300, outputPath } = params;
  
  const processFunction = async (input, output) => {
    await sharp(input)
      .resize(width, height, { 
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 90 })
      .toFile(output);
  };
  
  await windowsSafeFileWrite('resize', inputPath, outputPath, processFunction, params.nodeId);
  return outputPath;
}

// ノード名をファイルパスに解決する関数
async function resolveNodeNameToPath(nodeName, operation) {
  // 基本の入力画像ノード
  const baseImages = {
    'image1': './images/image1.jpg',
    'image2': './images/image2.jpg',
    'image3': './images/image3.jpg'
  };
  
  if (baseImages[nodeName]) {
    return baseImages[nodeName];
  }
  
  // 処理済みノードの出力パスを推測
  const processedNodes = {
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
  
  if (processedNodes[nodeName]) {
    // ファイルが存在するかチェック（リトライ付き）
    for (let i = 0; i < 10; i++) {
      try {
        await fs.access(processedNodes[nodeName]);
        return processedNodes[nodeName];
      } catch (error) {
        if (i < 9) {
          console.log(`⏳ ${nodeName}のファイル待機中... (${i+1}/10)`);
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }
    
    throw new Error(`依存ファイルが見つかりません: ${processedNodes[nodeName]}`);
  }
  
  throw new Error(`未知のノード名: ${nodeName}`);
}

// 処理サマリー作成
async function createSummary(inputs, params) {
  const { outputPath } = params;
  
  await ensureDir(path.dirname(outputPath));
  
  const summary = {
    totalProcessed: inputs.length,
    completedAt: new Date().toLocaleString('ja-JP', {timeZone: 'Asia/Tokyo'}),
    results: inputs.map((input, index) => ({
      pipeline: index + 1,
      outputPath: typeof input === 'object' ? input.outputPath : input,
      processingTime: typeof input === 'object' ? input.processingTime : 'N/A'
    }))
  };
  
  await fs.writeFile(outputPath, JSON.stringify(summary, null, 2));
  
  return summary;
}

// ディレクトリ作成（Windows権限エラー対応）
async function ensureDir(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      console.warn(`⚠️  ディレクトリ作成警告: ${error.message}`);
      // Windows権限問題の場合は警告のみで続行
      if (error.code === 'EPERM' || error.code === 'EACCES') {
        console.log(`📁 既存ディレクトリを使用: ${dirPath}`);
        return;
      }
      throw error;
    }
  }
}

// GraphAI用のエージェント情報オブジェクト
const imageProcessingAgentInfo = {
  name: "imageProcessingAgent",
  agent: imageProcessingAgent,
  mock: imageProcessingAgent,
  inputs: {
    type: "string"
  },
  output: {
    type: "object"
  }
};

module.exports = imageProcessingAgentInfo;