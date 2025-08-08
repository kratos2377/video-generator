import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

// Entities
import { User } from './entities/user.entity';
import { ChatSession } from './entities/chat-session.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { Script } from './entities/script.entity';
import { Scene } from './entities/scene.entity';

// Controllers
import { AppController } from './app.controller';
import { AuthController } from './controllers/auth.controller';
import { ChatController } from './controllers/chat.controller';

// Services
import { AppService } from './app.service';
import { AuthService } from './services/auth.service';
import { ChatService } from './services/chat.service';
import { OpenAIService } from './services/openai.service';

// Guards and Strategies
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { WsJwtGuard } from './guards/ws-jwt.guard';
import { JwtStrategy } from './strategies/jwt.strategy';

// Gateways
import { ChatGateway } from './gateways/chat.gateway';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      database: process.env.DB_DATABASE || 'movie_generator',
      entities: [User, ChatSession, ChatMessage, Script, Scene],
      synchronize: process.env.NODE_ENV !== 'production',
      logging: process.env.NODE_ENV === 'development',
    }),
    TypeOrmModule.forFeature([User, ChatSession, ChatMessage, Script, Scene]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '24h' },
    }),
  ],
  controllers: [AppController, AuthController, ChatController],
  providers: [
    AppService,
    AuthService,
    ChatService,
    OpenAIService,
    JwtAuthGuard,
    WsJwtGuard,
    JwtStrategy,
    ChatGateway,
  ],
})
export class AppModule {}
