const { composePlugins, withNx } = require('@nx/webpack');

module.exports = composePlugins(withNx(), (config) => {
  // 確保這是 Node.js 應用
  config.target = 'node';
  
  // 設置 Node.js 環境
  config.node = {
    __dirname: false,
    __filename: false,
  };

  // 排除 Node.js 內建模組
  config.externals = [
    'express',
    'mysql',
    'bcrypt',
    'passport',
    'passport-jwt',
    'passport-local',
    'node-cron'
  ];

  return config;
});
