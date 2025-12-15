const { composePlugins, withNx } = require('@nx/webpack');

module.exports = composePlugins(withNx(), (config) => {
  // 確保這是 Node.js 應用
  config.target = 'node';
  
  // 設置 Node.js 環境
  config.node = {
    __dirname: false,
    __filename: false,
  };

  // 排除 Node.js 內建模組和可選依賴
  config.externals = [
    'express',
    'mysql',
    'bcrypt',
    'passport',
    'passport-jwt',
    'passport-local',
    'node-cron',
    // NestJS 可選模組
    '@nestjs/websockets',
    '@nestjs/websockets/socket-module',
    '@nestjs/microservices',
    '@nestjs/microservices/microservices-module',
    // class-transformer 可選功能
    'class-transformer/storage',
    // TypeORM 可選驅動程式（避免警告）
    'mysql2',
    'pg',
    'pg-native',
    'pg-query-stream',
    'oracledb',
    'mongodb',
    'better-sqlite3',
    'sqlite3',
    'react-native-sqlite-storage',
    '@google-cloud/spanner',
    '@sap/hana-client',
    'hdb-pool',
    'redis',
    'ioredis',
    'typeorm-aurora-data-api-driver',
    '@sap/hana-client/extension/Stream',
    'sql.js',
    'mssql'
  ];

  return config;
});
