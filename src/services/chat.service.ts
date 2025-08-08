import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatSession } from '../entities/chat-session.entity';
import {
  ChatMessage,
  MessageRole,
  MessageType,
} from '../entities/chat-message.entity';
import { User } from '../entities/user.entity';
import { Script } from '../entities/script.entity';
import { Scene } from '../entities/scene.entity';
import { OpenAIService } from './openai.service';
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
    @InjectRepository(ChatMessage)
    private chatMessageRepository: Repository<ChatMessage>,
    @InjectRepository(Script)
    private scriptRepository: Repository<Script>,
    @InjectRepository(Scene)
    private sceneRepository: Repository<Scene>,
    private openaiService: OpenAIService,
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
    return this.mapToChatSessionDto(savedSession);
  }

  async getChatSessions(userId: string): Promise<ChatSessionDto[]> {
    const sessions = await this.chatSessionRepository.find({
      where: { userId },
      relations: ['messages'],
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
      relations: ['messages'],
    });

    if (!session) {
      throw new Error('Chat session not found');
    }

    return this.mapToChatSessionDto(session);
  }

  async sendMessage(
    userId: string,
    sendDto: SendMessageDto,
  ): Promise<ChatMessage> {
    let chatSession: ChatSession;

    if (sendDto.chatSessionId) {
      chatSession = await this.chatSessionRepository.findOne({
        where: { id: sendDto.chatSessionId, userId },
      });
    } else {
      // Create new session if none provided
      chatSession = this.chatSessionRepository.create({
        title: 'New Chat',
        userId,
      });
      chatSession = await this.chatSessionRepository.save(chatSession);
    }

    // Save user message
    const userMessage = this.chatMessageRepository.create({
      role: MessageRole.USER,
      type: MessageType.TEXT,
      content: sendDto.content,
      chatSessionId: chatSession.id,
    });

    await this.chatMessageRepository.save(userMessage);

    // Process with AI and tools
    const aiResponse = await this.processWithAI(
      sendDto.content,
      userId,
      chatSession.id,
    );

    return aiResponse;
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
    const toolCallMessage = this.chatMessageRepository.create({
      role: MessageRole.ASSISTANT,
      type: MessageType.TOOL_CALL,
      content: 'Generating movie script...',
      chatSessionId: sessionId,
      metadata: { tool: 'script_generation', scriptId: script.id },
    });

    await this.chatMessageRepository.save(toolCallMessage);

    // Create tool result message
    const toolResultMessage = this.chatMessageRepository.create({
      role: MessageRole.ASSISTANT,
      type: MessageType.SCRIPT,
      content: scriptContent,
      chatSessionId: sessionId,
      metadata: { scriptId: script.id, genre },
    });

    return this.chatMessageRepository.save(toolResultMessage);
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
    const toolCallMessage = this.chatMessageRepository.create({
      role: MessageRole.ASSISTANT,
      type: MessageType.TOOL_CALL,
      content: 'Generating scene image...',
      chatSessionId: sessionId,
      metadata: { tool: 'image_generation', sceneId: scene.id },
    });

    await this.chatMessageRepository.save(toolCallMessage);

    // Create tool result message
    const toolResultMessage = this.chatMessageRepository.create({
      role: MessageRole.ASSISTANT,
      type: MessageType.IMAGE,
      content: imageUrl,
      chatSessionId: sessionId,
      metadata: { sceneId: scene.id, style },
    });

    return this.chatMessageRepository.save(toolResultMessage);
  }

  private async handleDefaultResponse(
    userMessage: string,
    sessionId: string,
  ): Promise<ChatMessage> {
    const response = await this.openaiService.generateScript(
      `User message: ${userMessage}\n\nPlease provide a helpful response about movie script writing, scene generation, or creative filmmaking.`,
    );

    const aiMessage = this.chatMessageRepository.create({
      role: MessageRole.ASSISTANT,
      type: MessageType.TEXT,
      content: response,
      chatSessionId: sessionId,
    });

    return this.chatMessageRepository.save(aiMessage);
  }

  private mapToChatSessionDto(session: ChatSession): ChatSessionDto {
    return {
      id: session.id,
      title: session.title,
      description: session.description,
      messages:
        session.messages?.map((msg) => ({
          id: msg.id,
          role: msg.role,
          type: msg.type,
          content: msg.content,
          metadata: msg.metadata,
          createdAt: msg.createdAt,
        })) || [],
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    };
  }
}
