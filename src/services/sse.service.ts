import { Injectable } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';

export interface SSEConnection {
  userId: string;
  sessionId: string;
  response: any;
  send: (data: any) => void;
}

export interface SSEEvent {
  type: string;
  data: any;
  sessionId?: string;
  userId?: string;
}

@Injectable()
export class SSEService {
  private connections: Map<string, SSEConnection> = new Map();
  private eventSubject = new Subject<SSEEvent>();

  addConnection(connectionId: string, connection: SSEConnection) {
    this.connections.set(connectionId, connection);
    console.log(
      `SSE connection added: ${connectionId} for session: ${connection.sessionId}`,
    );
  }

  removeConnection(connectionId: string) {
    const connection = this.connections.get(connectionId);
    if (connection) {
      this.connections.delete(connectionId);
      console.log(`SSE connection removed: ${connectionId}`);
    }
  }

  broadcastToSession(sessionId: string, event: Omit<SSEEvent, 'sessionId'>) {
    const sessionEvent: SSEEvent = { ...event, sessionId };

    this.connections.forEach((connection, connectionId) => {
      if (connection.sessionId === sessionId) {
        try {
          connection.send({
            data: JSON.stringify(sessionEvent),
          });
        } catch (error) {
          console.error(`Error sending to connection ${connectionId}:`, error);
          this.removeConnection(connectionId);
        }
      }
    });
  }

  broadcastToUser(userId: string, event: Omit<SSEEvent, 'userId'>) {
    const userEvent: SSEEvent = { ...event, userId };

    this.connections.forEach((connection, connectionId) => {
      if (connection.userId === userId) {
        try {
          connection.send({
            data: JSON.stringify(userEvent),
          });
        } catch (error) {
          console.error(`Error sending to connection ${connectionId}:`, error);
          this.removeConnection(connectionId);
        }
      }
    });
  }

  getEventStream(): Observable<SSEEvent> {
    return this.eventSubject.asObservable();
  }

  emitEvent(event: SSEEvent) {
    this.eventSubject.next(event);
  }

  getConnectionCount(): number {
    return this.connections.size;
  }

  getSessionConnectionCount(sessionId: string): number {
    let count = 0;
    this.connections.forEach((connection) => {
      if (connection.sessionId === sessionId) {
        count++;
      }
    });
    return count;
  }
}
