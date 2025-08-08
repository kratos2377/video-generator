import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { ChatService } from '../services/chat.service';
import { SendMessageDto } from '../dto/chat.dto';
import { WsJwtGuard } from '../guards/ws-jwt.guard';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly chatService: ChatService) {}

  async handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('joinChat')
  async handleJoinChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ) {
    client.join(data.sessionId);
    return { event: 'joinedChat', sessionId: data.sessionId };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SendMessageDto & { userId: string },
  ) {
    try {
      const message = await this.chatService.sendMessage(data.userId, {
        content: data.content,
        chatSessionId: data.chatSessionId,
      });

      // Emit the message to all clients in the chat session
      if (data.chatSessionId) {
        this.server.to(data.chatSessionId).emit('newMessage', {
          message,
          sessionId: data.chatSessionId,
        });
      }

      return { event: 'messageSent', message };
    } catch (error) {
      client.emit('error', { message: 'Failed to send message' });
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('typing')
  async handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { sessionId: string; userId: string; isTyping: boolean },
  ) {
    client.to(data.sessionId).emit('userTyping', {
      userId: data.userId,
      isTyping: data.isTyping,
    });
  }
}
