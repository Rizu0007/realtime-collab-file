import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as http from 'http';
import * as WebSocket from 'ws';
// import { setupWSConnection } from 'y-websocket/bin/utils'; // y-websocket helper
import * as url from 'url';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
