// imageAgent-context.js - GraphAI画像処理エージェント（Context版）
const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

// GraphAI エージェント関数（Context版）
const imageProcessingAgent = async (context) => {
  const startTime = Date.now();
  
  // contextから必要な情報を取得
  const namedInputs = context.namedInputs || context.inputs || {};
  const params = context.params || {};
  
  console.log(`🔍 Context呼び出し: namedInputs=`, namedInputs);
  console.log(`🔍 params=`, params);
  console.log(`🔍 全コンテキスト=`, {
    keys: Object.keys(context),
    nodeId: context.debugInfo?.nodeId
  });
  
  if (!params.operation) {
    throw new Error('params.operation が見つかりません。GraphAIの設定を確認してください。');
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
      // 他の操作の場合、まず source の値を取得
      const sourceNodeName = namedInputs.source;
      console.log(`🔍 sourceNodeName: ${sourceNodeName}`);
      
      // sourceNodeName が文字列で、実際のファイルパスでない場合
      if (typeof sourceNodeName === 'string' && !sourceNodeName.includes('/')) {
        // これはノード名なので、実際のファイルパスに変換
        console.log(`⚠️  ノード名を受信: ${sourceNodeName}, 実際の値を取得中...`);
        
        // ノード名からファイルパスへのマッピング
        const nodeNameMapping = {
          // 初期入力ノード
          'image1': './images/image1.png',
          'image2': './images/image2.png', 
          'image3': './images/image3.png',
          
          // 処理済みノード（出力ファイルパスを推測）
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
        
        if (nodeNameMapping[sourceNodeName]) {
          inputValue = nodeNameMapping[sourceNodeName];
          console.log(`🔄 ノード名をファイルパスに変換: ${sourceNodeName} → ${inputValue}`);
        } else {
          inputValue = sourceNodeName;
          console.log(`⚠️  ノード名の変換ができません: ${sourceNodeName}`);
        }
      } else {
        inputValue = sourceNodeName;
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
    return result;
    
  } catch (error) {
    console.error(`❌ 処理エラー: ${params.operation}`, error);
    throw error; // エラーを再スロー
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
      outputPath: input // 各パイプラインの最終出力パス
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