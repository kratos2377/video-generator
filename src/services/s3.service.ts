import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio'

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
  private readonly minioClient: Minio.Client;
  private readonly bucketName: string;
  private readonly minioEndpoint: string;
  private readonly useMinIO: boolean;
  private readonly logger = new Logger(S3Service.name);

  constructor(private configService: ConfigService) {
    this.bucketName =
      this.configService.get<string>('MINIO_BUCKET_NAME') ||
      'movie-generator-chats';

    this.minioEndpoint =
      this.configService.get<string>('MINIO_ENDPOINT') ||
      'http://localhost:9000';

    const minioConfig: any = {
      region: this.configService.get<string>('AWS_REGION') || 'us-east-1',
      accessKey:
          this.configService.get<string>('MINIO_ACCESS_KEY') ||
          'minioadmin',
     secretKey:
          this.configService.get<string>('MINIO_SECRET_KEY') ||
          'minioadmin123',
      
    };

      minioConfig.endpoint = this.minioEndpoint;
      minioConfig.region = 'us-east-1'; 
    

    this.minioClient = new Minio.Client(minioConfig);
  }

  async uploadFile(
    file: Buffer,
    key: string,
    contentType: string,
  ): Promise<S3UploadResult> {
    try {


      await this.minioClient.putObject(
        this.bucketName,
        key,
        file
      );

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


      const response = await this.minioClient.presignedGetObject(this.bucketName , key , 3600);
      
      //Convert response string to actual chat data

      return []
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
    fileName: string,
    contentType: string,
  ): Promise<S3UploadResult> {
    const key = `chats/media/${Date.now()}-${fileName}`;
    return this.uploadFile(file, key, contentType);
  }

  // async deleteFile(key: string): Promise<void> {
  //   try {
  //     const command = new DeleteObjectCommand({
  //       Bucket: this.bucketName,
  //       Key: key,
  //     });

  //     await this.s3Client.send(command);
  //   } catch (error) {
  //     this.logger.error(`Failed to delete file from S3: ${error.message}`);
  //     throw new Error(`Failed to delete file: ${error.message}`);
  //   }
  // }

  // async fileExists(key: string): Promise<boolean> {
  //   try {
  //     const command = new HeadObjectCommand({
  //       Bucket: this.bucketName,
  //       Key: key,
  //     });

  //     await this.minioClient.send(command);
  //     return true;
  //   } catch (error) {
  //     return false;
  //   }
  // }


  async getSignedUrl(method: string , key: string , expiresIn: number): Promise<string> {

    return await this.minioClient.presignedUrl(
      method,
      this.bucketName,
      expiresIn.toString()
    )

  }

  async getSignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
 

    return await this.getSignedUrl('GET', key,  expiresIn);
  }

  async getSignedUploadUrl(
    key: string,
    contentType: string,
    expiresIn = 3600,
  ): Promise<string> {
 return await this.getSignedUrl('POST', key,  expiresIn);
  }

  generateChatFileKey(chatId: string): string {
    return `chats/${chatId}/chat.json`;
  }

  generateMediaFileKey(chatId: string, fileName: string): string {
    return `chats/${chatId}/media/${Date.now()}-${fileName}`;
  }

  private generateFileUrl(key: string): string {
      return `${this.minioEndpoint}/${this.bucketName}/${key}`;   
  }
}
