import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
