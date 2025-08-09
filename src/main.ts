import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  await app.listen(process.env.PORT ?? 4000);
}
bootstrap()
  .then(() => {
    console.log('Server started');
  })
  .catch((err) => {
    console.log('Some Error occured while starting the server: ' + err);
  });
