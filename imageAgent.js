// imageAgent.js - GraphAI画像処理エージェント
const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

// GraphAI エージェント関数
const imageProcessingAgent = async (namedInputs, params, context) => {
  const startTime = Date.now();
  
  // デバッグ情報を出力
  console.log(`🔍 エージェント呼び出し: namedInputs=`, namedInputs);
  console.log(`🔍 params=`, params);
  console.log(`🔍 context=`, context);
  
  // paramsが渡されていない場合の対応
  if (!params) {
    console.error('❌ params が undefined です。contextから取得を試みます...');
    // contextからparamsを取得してみる
    if (context && context.params) {
      params = context.params;
    } else {
      throw new Error('params が見つかりません。GraphAIの設定を確認してください。');
    }
  }
  
  console.log(`🎬 処理開始: ${params.operation} - ${new Date().toLocaleTimeString()}`);
  
  try {
    let result;
    
    // Named Inputsから適切な入力データを取得
    let inputValue;
    if (params.operation === 'summary') {
      // summary操作の場合は全ての入力を配列として取得
      inputValue = Object.values(namedInputs);
    } else {
      // 他の操作の場合は source または最初の値を取得
      inputValue = namedInputs.source || Object.values(namedInputs)[0];
    }
    
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
    
    return {
      success: true,
      operation: params.operation,
      outputPath: params.outputPath,
      processingTime,
      timestamp: new Date().toISOString(),
      result
    };
    
  } catch (error) {
    console.error(`❌ 処理エラー: ${params.operation}`, error);
    return {
      success: false,
      error: error.message,
      operation: params.operation
    };
  }
};

// モザイク処理
async function applyMosaic(inputPath, params) {
  const { blockSize = 10, outputPath } = params;
  
  // 出力ディレクトリ作成
  await ensureDir(path.dirname(outputPath));
  
  // Sharp を使ってモザイク効果を適用
  const image = sharp(inputPath);
  const metadata = await image.metadata();
  
  // 画像を小さくしてから元のサイズに戻すことでモザイク効果
  const smallWidth = Math.floor(metadata.width / blockSize);
  const smallHeight = Math.floor(metadata.height / blockSize);
  
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
      ...input
    }))
  };
  
  await fs.writeFile(outputPath, JSON.stringify(summary, null, 2));
  
  return summary;
}

// ディレクトリ作成
async function ensureDir(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
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