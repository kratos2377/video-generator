import { IsString, IsOptional, IsUUID, IsEnum } from 'class-validator';
import { MediaType } from '../entities/media-file.entity';

export class CreateChatSessionDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class SendMessageDto {
  @IsUUID()
  userId: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsUUID()
  chatSessionId?: string;
}

export class ChatSessionDto {
  id: string;
  title: string;
  userId: string;
  description?: string;
  messages: ChatMessageDto[];
  mediaFiles: MediaFileDto[];
  messageCount: number;
  lastMessageAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class ChatMessageDto {
  id: string;
  role: string;
  type: string;
  content: string;
  metadata?: any;
  createdAt: Date;
}

export class MediaFileDto {
  id: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  mediaType: MediaType;
  s3Url: string;
  thumbnailUrl?: string;
  metadata?: any;
  createdAt: Date;
}

export class StreamJoinDto {
  @IsUUID()
  sessionId: string;
}

export class StreamEventDto {
  type: string;
  data: any;
  sessionId?: string;
  userId?: string;
  timestamp: string;
}

export class UploadMediaDto {
  @IsUUID()
  chatSessionId: string;

  @IsOptional()
  @IsString()
  description?: string;
}
