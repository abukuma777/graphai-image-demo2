// create-test-images.js - テスト用画像作成スクリプト
const sharp = require('sharp');
const fs = require('fs');

async function createTestImages() {
  console.log('🎨 テスト用画像を作成中...');
  
  // imagesディレクトリ作成
  if (!fs.existsSync('./images')) {
    fs.mkdirSync('./images', { recursive: true });
    console.log('📁 ./images ディレクトリを作成しました');
  }
  
  try {
    // 画像1: 赤いグラデーション
    await sharp({
      create: {
        width: 500,
        height: 500,
        channels: 3,
        background: { r: 255, g: 100, b: 100 }
      }
    })
    .jpeg()
    .toFile('./images/image1.jpg');
    console.log('✅ image1.jpg を作成しました (赤いグラデーション)');
    
    // 画像2: 緑のグラデーション
    await sharp({
      create: {
        width: 500,
        height: 500,
        channels: 3,
        background: { r: 100, g: 255, b: 100 }
      }
    })
    .jpeg()
    .toFile('./images/image2.jpg');
    console.log('✅ image2.jpg を作成しました (緑のグラデーション)');
    
    // 画像3: 青のグラデーション
    await sharp({
      create: {
        width: 500,
        height: 500,
        channels: 3,
        background: { r: 100, g: 100, b: 255 }
      }
    })
    .jpeg()
    .toFile('./images/image3.jpg');
    console.log('✅ image3.jpg を作成しました (青のグラデーション)');
    
    console.log('🎉 テスト用画像の作成が完了しました！');
    
  } catch (error) {
    console.error('❌ 画像作成エラー:', error);
  }
}

// メイン実行
if (require.main === module) {
  createTestImages();
}

module.exports = { createTestImages };