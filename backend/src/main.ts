import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    const app = await NestFactory.create(AppModule);

    const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
    const allowedOrigins = corsOrigin.split(',').map((o) => o.trim());

    app.enableCors({
      origin: allowedOrigins,
      credentials: true,
    });

    app.setGlobalPrefix('api');

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    const port = process.env.PORT || 4000;
    await app.listen(port);
    logger.log(`RideFlow API running on http://localhost:${port}/api`);
  } catch (error) {
    logger.error(`Failed to start application: ${(error as Error).message}`);
    logger.error((error as Error).stack ?? '');
    process.exit(1);
  }
}
bootstrap();
