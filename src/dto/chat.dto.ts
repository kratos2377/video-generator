import { IsString, IsOptional, IsUUID } from 'class-validator';
import { MessageRole, MessageType } from '../entities/chat-message.entity';

export class CreateChatSessionDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class SendMessageDto {
  @IsString()
  content: string;

  @IsOptional()
  @IsUUID()
  chatSessionId?: string;
}

export class ChatMessageDto {
  id: string;
  role: MessageRole;
  type: MessageType;
  content: string;
  metadata?: any;
  createdAt: Date;
}

export class ChatSessionDto {
  id: string;
  title: string;
  description?: string;
  messages: ChatMessageDto[];
  createdAt: Date;
  updatedAt: Date;
}
