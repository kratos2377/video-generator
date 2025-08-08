import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatSession } from '../entities/chat-session.entity';
import { User } from '../entities/user.entity';
import { Script } from '../entities/script.entity';
import { Scene } from '../entities/scene.entity';
import { MediaFile, MediaType } from '../entities/media-file.entity';
import { OpenAIService } from './openai.service';
import { SSEService } from './sse.service';
import { S3Service, ChatMessage } from './s3.service';
import { v4 as uuidv4 } from 'uuid';
import {
  CreateChatSessionDto,
  SendMessageDto,
  ChatSessionDto,
} from '../dto/chat.dto';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatSession)
    private chatSessionRepository: Repository<ChatSession>,
    @InjectRepository(Script)
    private scriptRepository: Repository<Script>,
    @InjectRepository(Scene)
    private sceneRepository: Repository<Scene>,
    @InjectRepository(MediaFile)
    private mediaFileRepository: Repository<MediaFile>,
    private openaiService: OpenAIService,
    private sseService: SSEService,
    private s3Service: S3Service,
  ) {}

  async createChatSession(
    userId: string,
    createDto: CreateChatSessionDto,
  ): Promise<ChatSessionDto> {
    const chatSession = this.chatSessionRepository.create({
      ...createDto,
      userId,
    });

    const savedSession = await this.chatSessionRepository.save(chatSession);

    // Initialize empty chat file in S3
    await this.s3Service.uploadChatFile(savedSession.id, []);

    // Update session with S3 file info
    savedSession.s3ChatFileKey = this.s3Service.generateChatFileKey(
      savedSession.id,
    );
    savedSession.s3ChatFileUrl = `https://${process.env.AWS_S3_BUCKET_NAME || 'movie-generator-chats'}.s3.amazonaws.com/${savedSession.s3ChatFileKey}`;
    await this.chatSessionRepository.save(savedSession);

    // Broadcast session creation event
    this.sseService.broadcastToUser(userId, {
      type: 'chat_session_created',
      data: this.mapToChatSessionDto(savedSession),
    });

    return this.mapToChatSessionDto(savedSession);
  }

  async getChatSessions(userId: string): Promise<ChatSessionDto[]> {
    const sessions = await this.chatSessionRepository.find({
      where: { userId },
      relations: ['mediaFiles'],
      order: { updatedAt: 'DESC' },
    });

    return sessions.map((session) => this.mapToChatSessionDto(session));
  }

  async getChatSession(
    userId: string,
    sessionId: string,
  ): Promise<ChatSessionDto> {
    const session = await this.chatSessionRepository.findOne({
      where: { id: sessionId, userId },
      relations: ['mediaFiles'],
    });

    if (!session) {
      throw new Error('Chat session not found');
    }

    // Load messages from S3
    const messages = await this.s3Service.downloadChatFile(sessionId);

    return {
      ...this.mapToChatSessionDto(session),
      messages: messages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        type: msg.type,
        content: msg.content,
        metadata: msg.metadata,
        createdAt: new Date(msg.timestamp),
      })),
    };
  }

  async sendMessage(
    userId: string,
    sendDto: SendMessageDto,
  ): Promise<ChatMessage> {
    let chatSession: ChatSession | null;

    if (sendDto.chatSessionId) {
      chatSession = await this.chatSessionRepository.findOne({
        where: { id: sendDto.chatSessionId, userId },
      });
    } else {
      chatSession = this.chatSessionRepository.create({
        title: 'New Chat',
        userId,
      });
      chatSession = await this.chatSessionRepository.save(chatSession);

      // Initialize S3 file for new session
      await this.s3Service.uploadChatFile(chatSession.id, []);
      chatSession.s3ChatFileKey = this.s3Service.generateChatFileKey(
        chatSession.id,
      );
      chatSession.s3ChatFileUrl = `https://${process.env.AWS_S3_BUCKET_NAME || 'movie-generator-chats'}.s3.amazonaws.com/${chatSession.s3ChatFileKey}`;
      await this.chatSessionRepository.save(chatSession);
    }

    // Create user message
    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      type: 'text',
      content: sendDto.content,
      timestamp: new Date().toISOString(),
    };

    // Save user message to S3
    await this.s3Service.appendMessageToChat(chatSession!.id, userMessage);

    // Update session metadata
    chatSession!.messageCount += 1;
    chatSession!.lastMessageAt = new Date();
    await this.chatSessionRepository.save(chatSession!);

    // Broadcast user message to session
    this.sseService.broadcastToSession(chatSession!.id, {
      type: 'new_message',
      data: {
        message: userMessage,
        sessionId: chatSession!.id,
      },
    });

    // Process with AI and tools
    const aiResponse = await this.processWithAI(
      sendDto.content,
      userId,
      chatSession!.id,
    );

    // Save AI response to S3
    await this.s3Service.appendMessageToChat(chatSession!.id, aiResponse);

    // Update session metadata
    chatSession!.messageCount += 1;
    chatSession!.lastMessageAt = new Date();
    await this.chatSessionRepository.save(chatSession!);

    // Broadcast AI response to session
    this.sseService.broadcastToSession(chatSession!.id, {
      type: 'new_message',
      data: {
        message: aiResponse,
        sessionId: chatSession!.id,
      },
    });

    return aiResponse;
  }

  async uploadMediaFile(
    userId: string,
    chatSessionId: string,
    file: Buffer,
    originalName: string,
    mimeType: string,
  ): Promise<MediaFile> {
    // Verify chat session belongs to user
    const chatSession = await this.chatSessionRepository.findOne({
      where: { id: chatSessionId, userId },
    });

    if (!chatSession) {
      throw new Error('Chat session not found');
    }

    // Upload file to S3
    const uploadResult = await this.s3Service.uploadMediaFile(
      file,
      chatSessionId,
      originalName,
      mimeType,
    );

    // Determine media type
    let mediaType = MediaType.DOCUMENT;
    if (mimeType.startsWith('image/')) {
      mediaType = MediaType.IMAGE;
    } else if (mimeType.startsWith('video/')) {
      mediaType = MediaType.VIDEO;
    } else if (mimeType.startsWith('audio/')) {
      mediaType = MediaType.AUDIO;
    }

    // Save media file metadata to database
    const mediaFile = this.mediaFileRepository.create({
      fileName: uploadResult.key.split('/').pop() || originalName,
      originalName,
      mimeType,
      fileSize: uploadResult.size,
      mediaType,
      s3Key: uploadResult.key,
      s3Url: uploadResult.url,
      chatSessionId,
    });

    const savedMediaFile = await this.mediaFileRepository.save(mediaFile);

    // Create message about uploaded file
    const mediaMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      type: 'image',
      content: uploadResult.url,
      metadata: {
        mediaFileId: savedMediaFile.id,
        originalName,
        mimeType,
        fileSize: uploadResult.size,
      },
      timestamp: new Date().toISOString(),
    };

    // Save media message to S3
    await this.s3Service.appendMessageToChat(chatSessionId, mediaMessage);

    // Update session metadata
    chatSession.messageCount += 1;
    chatSession.lastMessageAt = new Date();
    await this.chatSessionRepository.save(chatSession);

    // Broadcast media upload event
    this.sseService.broadcastToSession(chatSessionId, {
      type: 'media_uploaded',
      data: {
        mediaFile: savedMediaFile,
        message: mediaMessage,
        sessionId: chatSessionId,
      },
    });

    return savedMediaFile;
  }

  private async processWithAI(
    userMessage: string,
    userId: string,
    sessionId: string,
  ): Promise<ChatMessage> {
    // Check if user wants to generate a script
    if (
      userMessage.toLowerCase().includes('script') ||
      userMessage.toLowerCase().includes('write')
    ) {
      return this.handleScriptGeneration(userMessage, userId, sessionId);
    }

    // Check if user wants to generate an image
    if (
      userMessage.toLowerCase().includes('image') ||
      userMessage.toLowerCase().includes('scene')
    ) {
      return this.handleImageGeneration(userMessage, userId, sessionId);
    }

    // Default AI response
    return this.handleDefaultResponse(userMessage, sessionId);
  }

  private async handleScriptGeneration(
    userMessage: string,
    userId: string,
    sessionId: string,
  ): Promise<ChatMessage> {
    // Extract genre if mentioned
    const genreMatch = userMessage.match(/(?:genre|type|style):\s*(\w+)/i);
    const genre = genreMatch ? genreMatch[1] : undefined;

    // Generate script
    const scriptContent = await this.openaiService.generateScript(
      userMessage,
      genre,
    );

    // Save script to database
    const script = this.scriptRepository.create({
      title: `Script from chat - ${new Date().toLocaleDateString()}`,
      content: scriptContent,
      userId,
      genre,
    });

    await this.scriptRepository.save(script);

    // Create tool call message
    const toolCallMessage: ChatMessage = {
      id: uuidv4(),
      role: 'assistant',
      type: 'tool_call',
      content: 'Generating movie script...',
      metadata: { tool: 'script_generation', scriptId: script.id },
      timestamp: new Date().toISOString(),
    };

    // Create tool result message
    const toolResultMessage: ChatMessage = {
      id: uuidv4(),
      role: 'assistant',
      type: 'script',
      content: scriptContent,
      metadata: { scriptId: script.id, genre },
      timestamp: new Date().toISOString(),
    };

    return toolResultMessage;
  }

  private async handleImageGeneration(
    userMessage: string,
    userId: string,
    sessionId: string,
  ): Promise<ChatMessage> {
    // Extract style if mentioned
    const styleMatch = userMessage.match(/(?:style|art style):\s*([^,]+)/i);
    const style = styleMatch ? styleMatch[1].trim() : undefined;

    // Generate scene description if not provided
    let imagePrompt = userMessage;
    if (
      !userMessage.toLowerCase().includes('scene') &&
      !userMessage.toLowerCase().includes('image')
    ) {
      imagePrompt =
        await this.openaiService.generateSceneDescription(userMessage);
    }

    // Generate image
    const imageUrl = await this.openaiService.generateImage(imagePrompt, style);

    // Save scene to database
    const scene = this.sceneRepository.create({
      title: `Scene from chat - ${new Date().toLocaleDateString()}`,
      description: imagePrompt,
      imageUrl,
      userId,
    });

    await this.sceneRepository.save(scene);

    // Create tool call message
    const toolCallMessage: ChatMessage = {
      id: uuidv4(),
      role: 'assistant',
      type: 'tool_call',
      content: 'Generating scene image...',
      metadata: { tool: 'image_generation', sceneId: scene.id },
      timestamp: new Date().toISOString(),
    };

    // Create tool result message
    const toolResultMessage: ChatMessage = {
      id: uuidv4(),
      role: 'assistant',
      type: 'image',
      content: imageUrl,
      metadata: { sceneId: scene.id, style },
      timestamp: new Date().toISOString(),
    };

    return toolResultMessage;
  }

  private async handleDefaultResponse(
    userMessage: string,
    sessionId: string,
  ): Promise<ChatMessage> {
    const response = await this.openaiService.generateScript(
      `User message: ${userMessage}\n\nPlease provide a helpful response about movie script writing, scene generation, or creative filmmaking.`,
    );

    return {
      id: uuidv4(),
      role: 'assistant',
      type: 'text',
      content: response,
      timestamp: new Date().toISOString(),
    };
  }

  private mapToChatSessionDto(session: ChatSession): ChatSessionDto {
    return {
      id: session.id,
      title: session.title,
      description: session.description,
      messages: [], // Messages are loaded from S3 when needed
      mediaFiles:
        session.mediaFiles?.map((media) => ({
          id: media.id,
          fileName: media.fileName,
          originalName: media.originalName,
          mimeType: media.mimeType,
          fileSize: media.fileSize,
          mediaType: media.mediaType,
          s3Url: media.s3Url,
          thumbnailUrl: media.thumbnailUrl,
          metadata: media.metadata,
          createdAt: media.createdAt,
        })) || [],
      messageCount: session.messageCount,
      lastMessageAt: session.lastMessageAt,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    };
  }
}
