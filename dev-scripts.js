const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 啟動 ISIN Nest 開發環境...\n');

// 啟動後端服務
const backend = spawn('npx', ['nest', 'start', '--watch', '--preserveWatchOutput'], {
  cwd: path.join(__dirname, 'apps/backend'),
  stdio: 'inherit',
  shell: true
});

// 等待後端啟動
setTimeout(() => {
  // 啟動前端服務
  const frontend = spawn('npx', ['nx', 'serve', 'frontend'], {
    cwd: __dirname,
    stdio: 'inherit',
    shell: true
  });

  frontend.on('close', (code) => {
    console.log(`\n❌ 前端服務已停止，退出碼: ${code}`);
    backend.kill();
    process.exit(code);
  });
}, 5000);

backend.on('close', (code) => {
  console.log(`\n❌ 後端服務已停止，退出碼: ${code}`);
  process.exit(code);
});

// 處理進程信號
process.on('SIGINT', () => {
  console.log('\n🛑 收到中斷信號，正在關閉服務...');
  backend.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 收到終止信號，正在關閉服務...');
  backend.kill();
  process.exit(0);
});
