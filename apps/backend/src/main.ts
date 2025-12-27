import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  try {
    logger.log('正在啟動應用程式...');
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });

  // 啟用 CORS
  app.enableCors({
    origin: [
      'http://localhost:3000',  // 前端默認端口
      'http://localhost:3001',  // 前端開發端口
      'http://localhost:5173',  // Vite 默認端口
      'http://localhost:8080',  // 其他可能的端口
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // Swagger 配置
  const config = new DocumentBuilder()
    .setTitle('ISIN Nest API')
    .setDescription('ISIN Nest API 文件')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: '請輸入 JWT token',
        in: 'header',
      },
      'JWT-auth', // 这里是 security scheme name
    )
    .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);

    const port = process.env.PORT ?? 3000;
    await app.listen(port);
    logger.log(`✅ 應用程式已成功啟動在端口 ${port}`);
    logger.log(`📚 Swagger 文件: http://localhost:${port}/api`);
  } catch (error) {
    logger.error('❌ 應用程式啟動失敗:', error);
    if (error instanceof Error) {
      logger.error('錯誤訊息:', error.message);
      logger.error('錯誤堆疊:', error.stack);
    }
    process.exit(1);
  }
}
void bootstrap();
