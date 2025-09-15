import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for frontend communication
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3005',
      'https://baab.iq',
      'https://www.baab.iq',
    ],
    credentials: true,
  });

  // Set global API prefix
  app.setGlobalPrefix('api');

  const port = process.env.PORT ?? 3005;
  await app.listen(port);

  console.log(`🚀 BAAB API Server running on http://localhost:${port}/api`);
}
void bootstrap();
