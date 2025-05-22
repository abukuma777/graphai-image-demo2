// ===== GraphAI並列処理関数（安定化版） =====
async function runParallelProcessing() {
  console.log('⚡ GraphAI並列処理開始...');
  const startTime = Date.now();
  
  try {
    // GraphAI設定読み込み
    const yamlContent = await fs.readFile('./graph.yaml', 'utf8');
    const graphData = yaml.load(yamlContent);
    
    // GraphAIデータをキャッシュ（ノード名解決用）
    graphDataCache = graphData;
    
    console.log('🔧 GraphAI設定確認:');
    console.log(`   version: ${graphData.version}`);
    console.log(`   ノード数: ${Object.keys(graphData.nodes).length}`);
    
    // エージェント登録（完全統合版）
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
    
    const graph = new GraphAI(graphData, agents);
    
    // 🔧 タイムアウト付きでGraphAI実行
    const results = await Promise.race([
      graph.run(),
      new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('GraphAI処理がタイムアウトしました (20秒)'));
        }, 20000);
      })
    ]);
    
    const totalTime = Date.now() - startTime;
    console.log(`⚡ 並列処理総時間: ${totalTime}ms`);
    console.log('🎉 GraphAI処理完了！');
    
    // 結果を確認
    console.log('📊 処理結果確認:');
    if (results && typeof results === 'object') {
      console.log(`   結果オブジェクト: ${Object.keys(results).length}個のキー`);
    }
    
    // 生成されたファイルを確認
    try {
      const outputFiles = await fs.readdir('./output');
      console.log(`📁 生成ファイル: ${outputFiles.length}個`);
      outputFiles.forEach(file => {
        if (file.endsWith('.jpg') || file.endsWith('.json')) {
          console.log(`   ✅ ${file}`);
        }
      });
    } catch (error) {
      console.warn('⚠️  出力ディレクトリ確認エラー:', error.message);
    }
    
    return { totalTime, results };
    
  } catch (error) {
    console.error('❌ 並列処理エラー:', error.message);
    console.error('📝 詳細:', error.stack);
    
    // エラーが発生した場合でも基本的な処理時間は返す
    const totalTime = Date.now() - startTime;
    throw new Error(`GraphAI並列処理失敗 (${totalTime}ms): ${error.message}`);
  }
}