import { NestFactory } from '@nestjs/core';
import { AllExceptionsFilter } from 'common/filters/all-exception-filter';
import { setupSwagger } from 'config/swagger';
import * as dotenv from 'dotenv';
import * as firebaseAdmin from 'firebase-admin';
import { AppModule } from './app.module';
dotenv.config();

// const filePath =
//   process.env.SERVICE_ACCOUNT_PATH || '/etc/secrets/serviceAccount.json';

const filePath = process.env.SERVICE_ACCOUNT_PATH || './serviceAccount.json';

firebaseAdmin.initializeApp({
  credential: firebaseAdmin.credential.cert(filePath),
});

export const db = firebaseAdmin.firestore();
export const dbFireStore = firebaseAdmin.firestore;
export const dbAuth = firebaseAdmin.auth();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: '*',
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });
  setupSwagger(app);
  app.useGlobalFilters(new AllExceptionsFilter());

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
