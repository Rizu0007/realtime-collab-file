import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*', // Configure properly in production
  },
})
export class CollaborationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  // Store active users per document
  private activeUsers = new Map<string, Set<string>>();
  // Store document content
  private documents = new Map<string, string>();

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    // Remove user from all documents
    this.activeUsers.forEach((users, documentId) => {
      users.delete(client.id);
      this.broadcastActiveUsers(documentId);
    });
  }

  @SubscribeMessage('join-document')
  handleJoinDocument(
    @MessageBody() data: { documentId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { documentId, userId } = data;

    // Join the room
    client.join(documentId);

    // Add user to active users
    if (!this.activeUsers.has(documentId)) {
      this.activeUsers.set(documentId, new Set());
    }
    this.activeUsers.get(documentId)?.add(userId);

    // Send current document content
    const content = this.documents.get(documentId) || '';
    client.emit('document-content', { content });

    // Broadcast active users
    this.broadcastActiveUsers(documentId);

    return { success: true };
  }

  @SubscribeMessage('leave-document')
  handleLeaveDocument(
    @MessageBody() data: { documentId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { documentId, userId } = data;

    client.leave(documentId);

    const users = this.activeUsers.get(documentId);
    if (users) {
      users.delete(userId);
      this.broadcastActiveUsers(documentId);
    }
  }

  @SubscribeMessage('content-change')
  handleContentChange(
    @MessageBody()
    data: {
      documentId: string;
      userId: string;
      changes: any; // The changes made
      content: string; // Full content
    },
    @ConnectedSocket() client: Socket,
  ) {
    const { documentId, userId, changes, content } = data;

    // Store the content
    this.documents.set(documentId, content);

    // Broadcast to all other users in the document
    client.to(documentId).emit('content-updated', {
      userId,
      changes,
      content,
    });
  }

  @SubscribeMessage('cursor-position')
  handleCursorPosition(
    @MessageBody()
    data: {
      documentId: string;
      userId: string;
      position: number;
      userName: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    // Broadcast cursor position to other users
    client.to(data.documentId).emit('cursor-moved', {
      userId: data.userId,
      position: data.position,
      userName: data.userName,
    });
  }

  private broadcastActiveUsers(documentId: string) {
    const users = Array.from(this.activeUsers.get(documentId) || []);
    this.server.to(documentId).emit('active-users', { users });
  }
}