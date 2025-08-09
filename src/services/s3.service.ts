import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface S3UploadResult {
  key: string;
  url: string;
  size: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  type: 'text' | 'image' | 'script' | 'tool_call' | 'error';
  content: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

@Injectable()
export class S3Service {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly minioEndpoint: string;
  private readonly useMinIO: boolean;
  private readonly logger = new Logger(S3Service.name);

  constructor(private configService: ConfigService) {
    this.bucketName =
      this.configService.get<string>('MINIO_BUCKET_NAME') ||
      this.configService.get<string>('AWS_S3_BUCKET_NAME') ||
      'movie-generator-chats';

    // Check if we're using MinIO (local development)
    this.useMinIO =
      this.configService.get<string>('MINIO_ENDPOINT') !== undefined;
    this.minioEndpoint =
      this.configService.get<string>('MINIO_ENDPOINT') ||
      'http://localhost:9000';

    const s3Config: any = {
      region: this.configService.get<string>('AWS_REGION') || 'us-east-1',
      credentials: {
        accessKeyId:
          this.configService.get<string>('MINIO_ACCESS_KEY') ||
          this.configService.get<string>('AWS_ACCESS_KEY_ID') ||
          'minioadmin',
        secretAccessKey:
          this.configService.get<string>('MINIO_SECRET_KEY') ||
          this.configService.get<string>('AWS_SECRET_ACCESS_KEY') ||
          'minioadmin',
      },
    };

    // Configure for MinIO if using local storage
    if (this.useMinIO) {
      s3Config.endpoint = this.minioEndpoint;
      s3Config.forcePathStyle = true; // Required for MinIO
      s3Config.region = 'us-east-1'; // MinIO doesn't care about region, but SDK requires it
    }

    this.s3Client = new S3Client(s3Config);
  }

  async uploadFile(
    file: Buffer,
    key: string,
    contentType: string,
  ): Promise<S3UploadResult> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file,
        ContentType: contentType,
        ACL: 'private',
      });

      await this.s3Client.send(command);

      const url = this.generateFileUrl(key);

      return {
        key,
        url,
        size: file.length,
      };
    } catch (error) {
      this.logger.error(`Failed to upload file to S3: ${error.message}`);
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  async uploadChatFile(
    chatId: string,
    messages: ChatMessage[],
  ): Promise<S3UploadResult> {
    const key = `chats/${chatId}/chat.json`;
    const content = JSON.stringify(messages, null, 2);
    const buffer = Buffer.from(content, 'utf-8');

    return this.uploadFile(buffer, key, 'application/json');
  }

  async downloadChatFile(chatId: string): Promise<ChatMessage[]> {
    try {
      const key = `chats/${chatId}/chat.json`;
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await this.s3Client.send(command);
      const content = await response.Body?.transformToString();

      if (!content) {
        return [];
      }

      return JSON.parse(content);
    } catch (error) {
      this.logger.error(`Failed to download chat file: ${error.message}`);
      return [];
    }
  }

  async appendMessageToChat(
    chatId: string,
    message: ChatMessage,
  ): Promise<void> {
    try {
      const messages = await this.downloadChatFile(chatId);
      messages.push(message);

      await this.uploadChatFile(chatId, messages);
    } catch (error) {
      this.logger.error(`Failed to append message to chat: ${error.message}`);
      throw new Error(`Failed to append message: ${error.message}`);
    }
  }

  async uploadMediaFile(
    file: Buffer,
    chatId: string,
    fileName: string,
    contentType: string,
  ): Promise<S3UploadResult> {
    const key = `chats/${chatId}/media/${Date.now()}-${fileName}`;
    return this.uploadFile(file, key, contentType);
  }

  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
    } catch (error) {
      this.logger.error(`Failed to delete file from S3: ${error.message}`);
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  async fileExists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error) {
      return false;
    }
  }

  async getSignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn });
  }

  async getSignedUploadUrl(
    key: string,
    contentType: string,
    expiresIn = 3600,
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: contentType,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn });
  }

  generateChatFileKey(chatId: string): string {
    return `chats/${chatId}/chat.json`;
  }

  generateMediaFileKey(chatId: string, fileName: string): string {
    return `chats/${chatId}/media/${Date.now()}-${fileName}`;
  }

  private generateFileUrl(key: string): string {
    if (this.useMinIO) {
      // MinIO URL format: http://localhost:9000/bucket-name/key
      return `${this.minioEndpoint}/${this.bucketName}/${key}`;
    } else {
      // AWS S3 URL format
      return `https://${this.bucketName}.s3.amazonaws.com/${key}`;
    }
  }
}
