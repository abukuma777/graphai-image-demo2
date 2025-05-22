// run-demo-showcase.js - Linux/Docker最適化版
const { GraphAI } = require('graphai');
const fs = require('fs').promises;
const yaml = require('js-yaml');
const express = require('express');
const cors = require('cors');

// 進捗追跡クラス（Linux最適化）
class ParallelProgressTracker {
  constructor() {
    this.pipelines = {
      'Pipeline 1 📸': { steps: [], currentStep: 0, color: '🔴', emoji: '📸' },
      'Pipeline 2 🌶️': { steps: [], currentStep: 0, color: '🟢', emoji: '🌶️' },
      'Pipeline 3 👩': { steps: [], currentStep: 0, color: '🔵', emoji: '👩' }
    };
    this.startTime = null;
    this.events = [];
  }
  
  start() {
    this.startTime = Date.now();
    console.log('\n' + '='.repeat(70));
    console.log('🚀 GraphAI 並列処理デモ開始！（Linux/Docker版）');
    console.log('='.repeat(70));
    this.displayHeader();
  }
  
  displayHeader() {
    console.log('📊 リアルタイム並列進捗表示:');
    console.log('🔴 Pipeline 1 📸: 測量技師の写真 (Mosaic→Rotate→Resize)');
    console.log('🟢 Pipeline 2 🌶️: ピーマンの写真   (Mosaic→Rotate→Resize)');  
    console.log('🔵 Pipeline 3 👩: ポートレート写真 (Mosaic→Rotate→Resize)');
    console.log('');
    console.log('💡 3つのパイプラインが同時実行される様子を確認してください');
    console.log('');
  }
  
  logEvent(nodeId, status, duration = null) {
    const elapsed = Date.now() - this.startTime;
    const pipeline = this.getPipelineFromNode(nodeId);
    const emoji = this.getStatusEmoji(status);
    const pipelineInfo = this.pipelines[pipeline];
    const color = pipelineInfo?.color || '⚪';
    const pipeEmoji = pipelineInfo?.emoji || '📋';
    
    const event = {
      nodeId,
      pipeline,
      status,
      elapsed,
      duration,
      timestamp: this.getJSTTime()
    };
    
    this.events.push(event);
    
    if (status === 'start') {
      console.log(`${color} [${pipeline}] ${pipeEmoji} ${nodeId} ${emoji} 開始 (+${elapsed}ms)`);
    } else if (status === 'complete') {
      console.log(`${color} [${pipeline}] ${pipeEmoji} ${nodeId} ${emoji} 完了 (${duration}ms) [+${elapsed}ms]`);
      this.updateConcurrentDisplay(elapsed);
    }
  }
  
  getPipelineFromNode(nodeId) {
    if (nodeId.includes('1')) return 'Pipeline 1 📸';
    if (nodeId.includes('2')) return 'Pipeline 2 🌶️';
    if (nodeId.includes('3')) return 'Pipeline 3 👩';
    return 'Summary 📋';
  }
  
  getStatusEmoji(status) {
    switch (status) {
      case 'start': return '🚀';
      case 'complete': return '✅';
      case 'error': return '❌';
      default: return '🔄';
    }
  }
  
  updateConcurrentDisplay(currentTime) {
    // 並列実行の可視化
    const concurrentOps = this.events.filter(e => 
      e.status === 'start' && 
      this.events.some(e2 => 
        e2.nodeId !== e.nodeId && 
        e2.status === 'start' && 
        Math.abs(e.elapsed - e2.elapsed) < 100
      )
    );
    
    if (concurrentOps.length > 1) {
      console.log(`   ⚡ 並列実行検出: ${concurrentOps.length}個の処理が同時実行中！`);
    }
  }
  
  getJSTTime() {
    const now = new Date();
    return now.toLocaleTimeString('ja-JP', {
      timeZone: 'Asia/Tokyo',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }
  
  displayFinalResults(totalTime) {
    console.log('\n' + '🎉'.repeat(25));
    console.log('🏆 GraphAI 並列処理完了！（Linux/Docker版）');
    console.log('🎉'.repeat(25));
    console.log('');
    
    // 順次処理との比較
    const sequentialTime = (30 + 25 + 20) * 3; // 各ステップの想定時間 × 3パイプライン
    const speedup = (sequentialTime / totalTime).toFixed(2);
    const efficiency = ((speedup / 3) * 100).toFixed(1); // 3コア想定
    
    console.log('📈 パフォーマンス比較結果:');
    console.log(`   🐌 順次処理（想定）: ${sequentialTime}ms`);
    console.log(`   ⚡ 並列処理（実際）: ${totalTime}ms`);
    console.log(`   🚀 高速化率: ${speedup}倍`);
    console.log(`   💯 並列効率: ${efficiency}%`);
    console.log('');
    
    console.log('📊 詳細な並列実行タイムライン:');
    this.displayParallelTimeline();
    
    console.log('\n💡 GraphAI並列処理の利点:');
    console.log('   ✅ YAML設定だけで複雑な並列処理を実現');
    console.log('   ✅ 依存関係を自動解析・最適化');
    console.log('   ✅ Linux環境で最高のパフォーマンス');
    console.log('   ✅ スケーラブルな処理パイプライン');
    console.log('   ✅ コンテナ環境での安定動作');
    
    console.log('\n🎉'.repeat(25));
  }
  
  displayParallelTimeline() {
    const timelineWidth = 60;
    const maxTime = Math.max(...this.events.map(e => e.elapsed));
    
    console.log('   Time: 0ms' + ' '.repeat(timelineWidth-15) + `${maxTime}ms`);
    console.log('   ' + '├' + '─'.repeat(timelineWidth-2) + '┤');
    
    // 各パイプラインのタイムライン表示
    Object.entries(this.pipelines).forEach(([name, pipeline]) => {
      const pipelineEvents = this.events.filter(e => e.pipeline === name && e.status === 'complete');
      let timeline = ' '.repeat(timelineWidth);
      
      pipelineEvents.forEach(event => {
        const position = Math.floor((event.elapsed / maxTime) * (timelineWidth - 1));
        timeline = timeline.substring(0, position) + '█' + timeline.substring(position + 1);
      });
      
      console.log(`   ${pipeline.color} ${timeline} ${name}`);
    });
    
    console.log('   ' + '└' + '─'.repeat(timelineWidth-2) + '┘');
    
    // 並列性の統計
    const parallelSessions = this.calculateParallelism();
    console.log(`\n   📊 最大同時実行数: ${parallelSessions.maxConcurrent}個の処理`);
    console.log(`   ⚡ 平均並列度: ${parallelSessions.averageParallelism.toFixed(1)}`);
  }
  
  calculateParallelism() {
    let maxConcurrent = 0;
    let totalParallelTime = 0;
    let measurements = 0;
    
    for (let t = 0; t <= Math.max(...this.events.map(e => e.elapsed)); t += 10) {
      const concurrent = this.events.filter(e => 
        e.status === 'start' && e.elapsed <= t &&
        this.events.some(e2 => e2.nodeId === e.nodeId && e2.status === 'complete' && e2.elapsed > t)
      ).length;
      
      maxConcurrent = Math.max(maxConcurrent, concurrent);
      totalParallelTime += concurrent;
      measurements++;
    }
    
    return {
      maxConcurrent,
      averageParallelism: measurements > 0 ? totalParallelTime / measurements : 0
    };
  }
}

const progressTracker = new ParallelProgressTracker();

// Linux最適化画像処理エージェント
const baseAgent = require('./imageAgent-context.js');

const linuxOptimizedAgent = async (context) => {
  const nodeId = context.debugInfo?.nodeId;
  const operation = context.params?.operation;
  
  if (nodeId && operation !== 'summary') {
    progressTracker.logEvent(nodeId, 'start');
  }
  
  const startTime = Date.now();
  
  try {
    // Linux環境では並列処理が安定なので遅延不要
    const result = await baseAgent.agent(context);
    
    const duration = Date.now() - startTime;
    
    if (nodeId && operation !== 'summary') {
      progressTracker.logEvent(nodeId, 'complete', duration);
    }
    
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    if (nodeId) {
      progressTracker.logEvent(nodeId, 'error', duration);
    }
    throw error;
  }
};

async function runLinuxParallelDemo() {
  console.log('🐳 GraphAI Linux/Docker 並列処理ショーケース');
  console.log('💡 コンテナ環境でのGraphAI真の並列性能を体験');
  console.log('🌍 実行環境: Linux Container (Docker)');
  console.log('🕒 タイムゾーン: Asia/Tokyo (JST)');
  console.log('');
  
  try {
    // 環境準備
    await setupLinuxEnvironment();
    
    // 比較説明
    displayLinuxComparisonInfo();
    
    // GraphAI設定読み込み
    const yamlContent = await fs.readFile('./graph.yaml', 'utf8');
    const graphData = yaml.load(yamlContent);
    
    // エージェント登録（Linux最適化版）
    const agents = {
      imageProcessingAgent: {
        agent: linuxOptimizedAgent,
        mock: linuxOptimizedAgent
      }
    };
    
    // 並列処理開始
    progressTracker.start();
    const startTime = Date.now();
    
    const graph = new GraphAI(graphData, agents);
    const results = await graph.run();
    
    const totalTime = Date.now() - startTime;
    
    // 結果表示
    progressTracker.displayFinalResults(totalTime);
    
    // ファイル結果確認
    await displayOutputFiles();
    
    // Webサーバー情報
    console.log('\n🌐 Webで結果を確認:');
    console.log('   docker-compose up web-server');
    console.log('   http://localhost:3001');
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
    console.error('📝 詳細:', error.stack);
  }
}

async function setupLinuxEnvironment() {
  console.log('🔧 Linux/Docker環境をセットアップ中...');
  
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
  
  console.log('✅ Linux/Docker環境セットアップ完了');
  console.log('');
}

function displayLinuxComparisonInfo() {
  console.log('📊 Linux vs Windows 並列処理比較:');
  console.log('');
  console.log('🪟 Windows環境の問題:');
  console.log('   ❌ ファイルシステムロック競合');
  console.log('   ❌ 並列書き込み制限');
  console.log('   ❌ Sharp画像処理での競合');
  console.log('');
  console.log('🐧 Linux/Docker環境の利点:');
  console.log('   ✅ 安定した並列ファイル操作');
  console.log('   ✅ 最適化されたSharp性能');
  console.log('   ✅ 真の並列処理を実現');
  console.log('');
  console.log('⚡ 予想結果:');
  console.log('   🐌 順次処理: ~225ms');
  console.log('   ⚡ GraphAI並列: ~80ms (2.8倍高速化)');
  console.log('');
}

async function displayOutputFiles() {
  console.log('\n📁 生成されたファイル:');
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
  runLinuxParallelDemo().catch(console.error);
}

module.exports = { runLinuxParallelDemo };