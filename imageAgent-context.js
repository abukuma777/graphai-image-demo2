// imageAgent-context.js - GraphAI画像処理エージェント（修正版）
const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

// GraphAI エージェント関数（Context版・修正版）
const imageProcessingAgent = async (context) => {
  const startTime = Date.now();
  
  // contextから必要な情報を取得
  const namedInputs = context.namedInputs || context.inputs || {};
  const params = context.params || {};
  
  console.log(`🔍 Context呼び出し: namedInputs=`, namedInputs);
  console.log(`🔍 params=`, params);
  
  if (!params.operation) {
    throw new Error('params.operation が見つかりません。GraphAIの設定を確認してください。');
  }
  
  console.log(`🎬 処理開始: ${params.operation} - ${new Date().toLocaleTimeString()}`);
  
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
    
    switch (params.operation) {
      case 'mosaic':
        result = await applyMosaic(inputValue, params);
        break;
        
      case 'rotate':
        result = await rotateImage(inputValue, params);
        break;
        
      case 'resize':
        result = await resizeImage(inputValue, params);
        break;
        
      case 'summary':
        result = await createSummary(inputValue, params);
        break;
        
      default:
        throw new Error(`未対応の操作: ${params.operation}`);
    }
    
    const endTime = Date.now();
    const processingTime = endTime - startTime;
    
    console.log(`✅ 処理完了: ${params.operation} (${processingTime}ms) - ${new Date().toLocaleTimeString()}`);
    console.log(`📤 出力: ${result}`);
    
    // 次のノードが使えるシンプルな値を返す
    return {
      outputPath: params.outputPath || result,
      operation: params.operation,
      processingTime,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error(`❌ 処理エラー: ${params.operation}`, error);
    throw error;
  }
};

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
    // ファイルが存在するかチェック
    try {
      await fs.access(processedNodes[nodeName]);
      return processedNodes[nodeName];
    } catch (error) {
      console.warn(`⚠️  ファイルが見つかりません: ${processedNodes[nodeName]}`);
      throw new Error(`依存ファイルが見つかりません: ${processedNodes[nodeName]}`);
    }
  }
  
  throw new Error(`未知のノード名: ${nodeName}`);
}

// モザイク処理
async function applyMosaic(inputPath, params) {
  const { blockSize = 10, outputPath } = params;
  
  // 出力ディレクトリ作成
  await ensureDir(path.dirname(outputPath));
  
  // 入力ファイル存在確認
  try {
    await fs.access(inputPath);
  } catch (error) {
    throw new Error(`入力ファイルが見つかりません: ${inputPath}`);
  }
  
  // Sharp を使ってモザイク効果を適用
  const image = sharp(inputPath);
  const metadata = await image.metadata();
  
  // 画像を小さくしてから元のサイズに戻すことでモザイク効果
  const smallWidth = Math.max(1, Math.floor(metadata.width / blockSize));
  const smallHeight = Math.max(1, Math.floor(metadata.height / blockSize));
  
  await image
    .resize(smallWidth, smallHeight, { kernel: 'nearest' })
    .resize(metadata.width, metadata.height, { kernel: 'nearest' })
    .jpeg({ quality: 90 })
    .toFile(outputPath);
  
  return outputPath;
}

// 回転処理
async function rotateImage(inputPath, params) {
  const { angle = 90, outputPath } = params;
  
  await ensureDir(path.dirname(outputPath));
  
  // 入力ファイル存在確認
  try {
    await fs.access(inputPath);
  } catch (error) {
    throw new Error(`入力ファイルが見つかりません: ${inputPath}`);
  }
  
  await sharp(inputPath)
    .rotate(angle)
    .jpeg({ quality: 90 })
    .toFile(outputPath);
  
  return outputPath;
}

// リサイズ処理
async function resizeImage(inputPath, params) {
  const { width = 300, height = 300, outputPath } = params;
  
  await ensureDir(path.dirname(outputPath));
  
  // 入力ファイル存在確認
  try {
    await fs.access(inputPath);
  } catch (error) {
    throw new Error(`入力ファイルが見つかりません: ${inputPath}`);
  }
  
  await sharp(inputPath)
    .resize(width, height, { 
      fit: 'cover',
      position: 'center'
    })
    .jpeg({ quality: 90 })
    .toFile(outputPath);
  
  return outputPath;
}

// 処理サマリー作成
async function createSummary(inputs, params) {
  const { outputPath } = params;
  
  await ensureDir(path.dirname(outputPath));
  
  const summary = {
    totalProcessed: inputs.length,
    completedAt: new Date().toISOString(),
    results: inputs.map((input, index) => ({
      pipeline: index + 1,
      outputPath: typeof input === 'object' ? input.outputPath : input,
      processingTime: typeof input === 'object' ? input.processingTime : 'N/A'
    }))
  };
  
  await fs.writeFile(outputPath, JSON.stringify(summary, null, 2));
  
  return summary;
}

// ディレクトリ作成（権限エラー対応）
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