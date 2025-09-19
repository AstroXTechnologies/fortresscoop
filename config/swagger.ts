import { INestApplication } from '@nestjs/common';
import {
  DocumentBuilder,
  SwaggerCustomOptions,
  SwaggerModule,
} from '@nestjs/swagger';

export const setupSwagger = (app: INestApplication) => {
  const config = new DocumentBuilder()
    .setTitle('Fortresscoop API Docs')
    .setDescription('API for fortresscoop')
    .setVersion('1.0')
    .addTag('v1')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        in: 'header',
        name: 'Authorization',
      },
      'access-token',
    )
    .build();

  const customOptions: SwaggerCustomOptions = {
    useGlobalPrefix: true,
    customfavIcon: 'https://fav.farm/🛡️',
    customSiteTitle: 'Fortresscoop API Docs',

    swaggerOptions: {
      persistAuthorization: true,
    },
  };

  const documentFactory = SwaggerModule.createDocument(app, config, {
    operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
  });

  SwaggerModule.setup('api', app, documentFactory, customOptions);
};
