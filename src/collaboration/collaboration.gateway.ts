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
import { DocumentService } from '../document/document.service';

interface ActiveUser {
  socketId: string;
  userId: string;
  userName: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class CollaborationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  // Store active users per document: Map<documentId, Map<userId, ActiveUser>>
  private activeUsers = new Map<string, Map<string, ActiveUser>>();

  // Store socket to user mapping for cleanup on disconnect
  private socketToUser = new Map<string, { visitorId: string; documentId: string }>();

  // Debounce timers for saving content
  private saveTimers = new Map<string, NodeJS.Timeout>();
  private pendingContent = new Map<string, string>();

  constructor(private readonly documentService: DocumentService) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);

    const userInfo = this.socketToUser.get(client.id);
    if (userInfo) {
      const { visitorId, documentId } = userInfo;
      const users = this.activeUsers.get(documentId);
      if (users) {
        users.delete(visitorId);
        if (users.size === 0) {
          this.activeUsers.delete(documentId);
        }
        this.broadcastActiveUsers(documentId);
      }
      this.socketToUser.delete(client.id);
    }
  }

  @SubscribeMessage('join-document')
  async handleJoinDocument(
    @MessageBody() data: { documentId: string; userId: string; userName: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { documentId, userId, userName } = data;

    try {
      const document = await this.documentService.findOne(documentId);

      client.join(documentId);

      if (!this.activeUsers.has(documentId)) {
        this.activeUsers.set(documentId, new Map());
      }
      this.activeUsers.get(documentId)?.set(userId, {
        socketId: client.id,
        userId,
        userName,
      });

      this.socketToUser.set(client.id, { visitorId: userId, documentId });

      client.emit('document-loaded', {
        id: document.id,
        title: document.title,
        content: document.content,
      });

      this.broadcastActiveUsers(documentId);

      return { success: true };
    } catch (error) {
      client.emit('error', { message: error.message });
      return { success: false, error: error.message };
    }
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
      if (users.size === 0) {
        this.activeUsers.delete(documentId);
      }
      this.broadcastActiveUsers(documentId);
    }

    this.socketToUser.delete(client.id);

    return { success: true };
  }

  @SubscribeMessage('content-change')
  handleContentChange(
    @MessageBody()
    data: {
      documentId: string;
      userId: string;
      content: string;
      cursorPosition?: number;
    },
    @ConnectedSocket() client: Socket,
  ) {
    const { documentId, userId, content, cursorPosition } = data;

    // Store pending content for debounced save
    this.pendingContent.set(documentId, content);

    // Clear existing timer
    const existingTimer = this.saveTimers.get(documentId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Debounced save - saves after 1 second of no changes
    const timer = setTimeout(async () => {
      const contentToSave = this.pendingContent.get(documentId);
      if (contentToSave !== undefined) {
        try {
          await this.documentService.updateContent(documentId, contentToSave);
          console.log(`Document ${documentId} saved`);
        } catch (error) {
          console.error(`Failed to save document ${documentId}:`, error.message);
        }
        this.pendingContent.delete(documentId);
      }
      this.saveTimers.delete(documentId);
    }, 1000);

    this.saveTimers.set(documentId, timer);

    // Broadcast immediately to other users
    client.to(documentId).emit('content-updated', {
      userId,
      content,
      cursorPosition,
    });
  }

  @SubscribeMessage('cursor-move')
  handleCursorMove(
    @MessageBody()
    data: {
      documentId: string;
      userId: string;
      userName: string;
      position: number;
      selection?: { start: number; end: number };
    },
    @ConnectedSocket() client: Socket,
  ) {
    client.to(data.documentId).emit('cursor-moved', {
      userId: data.userId,
      userName: data.userName,
      position: data.position,
      selection: data.selection,
    });
  }

  private broadcastActiveUsers(documentId: string) {
    const usersMap = this.activeUsers.get(documentId);
    const users = usersMap
      ? Array.from(usersMap.values()).map(({ userId, userName }) => ({
          userId,
          userName,
        }))
      : [];
    this.server.to(documentId).emit('active-users', { users });
  }
}
