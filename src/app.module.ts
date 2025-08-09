import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MulterModule } from '@nestjs/platform-express';

import { User } from './entities/user.entity';
import { ChatSession } from './entities/chat-session.entity';
import { MediaFile } from './entities/media-file.entity';
import { Script } from './entities/script.entity';
import { Scene } from './entities/scene.entity';

import { AppController } from './app.controller';
import { AuthController } from './controllers/auth.controller';
import { ChatController } from './controllers/chat.controller';

import { AppService } from './app.service';
import { AuthService } from './services/auth.service';
import { ChatService } from './services/chat.service';
import { OpenAIService } from './services/openai.service';
import { SSEService } from './services/sse.service';
import { S3Service } from './services/s3.service';

import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleService } from './services/google.service';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT!) || 5432,
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      database: process.env.DB_DATABASE || 'movie_generator',
      entities: [User, ChatSession, MediaFile, Script, Scene],
      synchronize: process.env.NODE_ENV !== 'production',
      logging: process.env.NODE_ENV === 'development',
    }),
    TypeOrmModule.forFeature([User, ChatSession, MediaFile, Script, Scene]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '24h' },
    }),
    MulterModule.register({
      storage: undefined,
    }),
  ],
  controllers: [AppController, AuthController, ChatController],
  providers: [
    AppService,
    AuthService,
    ChatService,
    OpenAIService,
    SSEService,
    S3Service,
    JwtAuthGuard,
    GoogleService,
  ],
})
export class AppModule {}
