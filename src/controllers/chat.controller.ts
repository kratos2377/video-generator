import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Request,
  Res,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ChatService } from '../services/chat.service';
import {
  CreateChatSessionDto,
  SendMessageDto,
  ChatSessionDto,
  UploadMediaDto,
} from '../dto/chat.dto';
import { v4 as uuidv4 } from 'uuid';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('sessions')
  async createChatSession(
    @Request() req,
    @Body() createDto: CreateChatSessionDto,
  ): Promise<ChatSessionDto> {
    return this.chatService.createChatSession(req.user.id, createDto);
  }

  @Get('sessions')
  async getChatSessions(@Request() req): Promise<ChatSessionDto[]> {
    return this.chatService.getChatSessions(req.user.id);
  }

  @Get('sessions/:id')
  async getChatSession(
    @Request() req,
    @Param('id') sessionId: string,
    @Param('userId') userId: string
  ): Promise<ChatSessionDto> {
    return this.chatService.getChatSession(userId, sessionId);
  }

  @Post('messages')
  async sendMessage(
    @Request() req,
    @Body() sendDto: SendMessageDto,
    @Res() res: Response,
  ) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    });

    try {
      const streamCallback = (chunk: any) => {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      };

      await this.chatService.sendMessageStream(
        sendDto.userId,
        sendDto,
        streamCallback,
      );

      res.write(`data: ${JSON.stringify({ type: 'Generation Complete' })}\n\n`);
      res.end();
    } catch (error) {
      res.write(
        `data: ${JSON.stringify({
          type: 'error',
          error: error.message,
        })}\n\n`,
      );
      res.end();
    }
  }

  @Post('upload-media')
  @UseInterceptors(FileInterceptor('file'))
  async uploadMedia(
    @Request() req,
    @Body() uploadDto: UploadMediaDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    return this.chatService.uploadMediaFile(
      req.user.id,
      uploadDto.chatSessionId,
      file.buffer,
      file.originalname,
      file.mimetype,
    );
  }

  @Post('stream/:sessionId/join')
  async joinChatStream(
    @Param('sessionId') sessionId: string,
    @Request() req,
    @Res() res: Response,
  ) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    });

    res.write(
      `data: ${JSON.stringify({
        type: 'connected',
        sessionId,
        userId: req.user.id,
        timestamp: new Date().toISOString(),
      })}\n\n`,
    );

    const pingInterval = setInterval(() => {
      res.write(
        `data: ${JSON.stringify({
          type: 'ping',
          timestamp: new Date().toISOString(),
        })}\n\n`,
      );
    }, 30000);

    req.on('close', () => {
      clearInterval(pingInterval);
    });

    req.on('end', () => {
      clearInterval(pingInterval);
    });
  }
}
