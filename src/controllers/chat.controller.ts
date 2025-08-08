import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ChatService } from '../services/chat.service';
import {
  CreateChatSessionDto,
  SendMessageDto,
  ChatSessionDto,
} from '../dto/chat.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@Controller('chat')
@UseGuards(JwtAuthGuard)
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
  ): Promise<ChatSessionDto> {
    return this.chatService.getChatSession(req.user.id, sessionId);
  }

  @Post('messages')
  async sendMessage(@Request() req, @Body() sendDto: SendMessageDto) {
    return this.chatService.sendMessage(req.user.id, sendDto);
  }
}
