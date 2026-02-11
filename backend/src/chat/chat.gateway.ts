// backend/chat/chat.gateway.enhanced.ts
import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
  OnGatewayDisconnect,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';

@WebSocketGateway({
  cors: true,
  maxHttpBufferSize: 10 * 1024 * 1024 // 10MB for file uploads
})
export class ChatGateway implements OnGatewayDisconnect, OnGatewayConnection {
  constructor(private chatService: ChatService) { }

  @WebSocketServer()
  server: Server;

  // Rate limiting storage
  private messageRateLimit: Map<string, number[]> = new Map();
  private readonly RATE_LIMIT_WINDOW = 60000; // 1 minute
  private readonly RATE_LIMIT_MAX = 30; // 30 messages per minute

  async handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id} - chat.gateway.ts:30`);
  }

  // Rate limiting check
  private checkRateLimit(username: string): boolean {
    const now = Date.now();
    const userMessages = this.messageRateLimit.get(username) || [];
    
    // Remove old messages outside the window
    const validMessages = userMessages.filter(time => now - time < this.RATE_LIMIT_WINDOW);
    
    if (validMessages.length >= this.RATE_LIMIT_MAX) {
      return false; // Rate limit exceeded
    }
    
    validMessages.push(now);
    this.messageRateLimit.set(username, validMessages);
    return true;
  }

  @SubscribeMessage('joinRoom')
  async handleJoinRoom(
    @MessageBody() data: {
      room: string;
      username: string;
      gender: 'male' | 'female' | 'other';
      country: string;
      avatar?: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    // Check if user is banned from room
    const isBanned = await this.chatService.isUserBanned(data.room, data.username);
    if (isBanned) {
      client.emit('error', { message: 'You are banned from this room' });
      return;
    }

    client.join(data.room);

    this.chatService.addUserToRoom(data.room, {
      name: data.username,
      gender: data.gender,
      country: data.country,
      socketId: client.id,
      isActive: true,
      avatar: data.avatar,
      status: 'online',
    });

    // Update user status in database
    await this.chatService.updateUserStatus(data.username, 'online');

    // Send existing messages to the newly joined user
    const messages = await this.chatService.getMessages(data.room, 100);
    client.emit('loadMessages', messages.reverse());

    // Send pinned messages
    const pinnedMessages = await this.chatService.getPinnedMessages(data.room);
    client.emit('loadPinnedMessages', pinnedMessages);

    // Get unread count
    const unreadCount = await this.chatService.getUnreadCount(data.room, data.username);
    client.emit('unreadCount', unreadCount);

    // Broadcast user joined
    this.server.to(data.room).emit('userEvent', {
      type: 'join',
      username: data.username,
      avatar: data.avatar,
    });

    // Update user list
    this.server.to(data.room).emit(
      'updateUsers',
      this.chatService.getUsersInRoom(data.room),
    );
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @MessageBody() data: {
      room: string;
      message: string;
      username: string;
      replyTo?: string;
      mentions?: string[];
      messageType?: 'text' | 'gif' | 'sticker';
      gifData?: {
        width: number;
        height: number;
        preview: string;
      };
    },
    @ConnectedSocket() client: Socket,
  ) {
    try {

      if (!this.checkRateLimit(data.username)) {
        client.emit('error', { message: 'Rate limit exceeded. Please slow down.' });
        return;
      }

      // Create message in database
      const message = await this.chatService.createMessage({
        room: data.room,
        sender: data.username,
        message: data.message,
        messageType: data.messageType || 'text',
        replyTo: data.replyTo,
        mentions: data.mentions || [],
        readBy: [data.username],
        gifData: data.gifData,
      });
      // Broadcast to ALL users in the room
      this.server.to(data.room).emit('receiveMessage', message);

      // Send notifications to mentioned users
      if (data.mentions && data.mentions.length > 0) {
        data.mentions.forEach(mentionedUser => {
          const roomUsers = this.chatService.getUsersInRoom(data.room);
          const mentionedUserData = roomUsers.find(u => u.name === mentionedUser);

          if (mentionedUserData) {
            this.server.to(mentionedUserData.socketId).emit('mention', {
              messageId: message._id,
              mentionedBy: data.username,
              message: data.message,
            });
          }
        });
      }
    } catch (error) {
      client.emit('error', { message: 'Failed to send message' });
    }
  }

  @SubscribeMessage('editMessage')
  async handleEditMessage(
    @MessageBody() data: {
      messageId: string;
      newMessage: string;
      room: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const updatedMessage = await this.chatService.editMessage(
        data.messageId,
        data.newMessage,
      );

      if (updatedMessage) {
        this.server.to(data.room).emit('messageEdited', updatedMessage);
      }
    } catch (error) {
      client.emit('error', { message: 'Failed to edit message' });
    }
  }

  @SubscribeMessage('deleteMessage')
  async handleDeleteMessage(
    @MessageBody() data: {
      room: string;
      messageId: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      await this.chatService.deleteMessage(data.messageId);
      this.server.to(data.room).emit('messageDeleted', {
        messageId: data.messageId,
      });
    } catch (error) {
      client.emit('error', { message: 'Failed to delete message' });
    }
  }

  @SubscribeMessage('reactMessage')
  async handleReaction(
    @MessageBody() data: {
      room: string;
      messageId: string;
      emoji: string;
      username: string;
      action: 'add' | 'remove';
    },
  ) {
    try {
      let updatedMessage;

      if (data.action === 'add') {
        updatedMessage = await this.chatService.addReaction(
          data.messageId,
          data.emoji,
          data.username,
        );
      } else {
        updatedMessage = await this.chatService.removeReaction(
          data.messageId,
          data.emoji,
          data.username,
        );
      }

      if (updatedMessage) {
        this.server.to(data.room).emit('messageReaction', {
          messageId: data.messageId,
          reactions: updatedMessage.reactions,
        });
      }
    } catch (error) {
      console.error('Reaction error: - chat.gateway.ts:242', error);
    }
  }

  @SubscribeMessage('markAsRead')
  async handleMarkAsRead(
    @MessageBody() data: {
      messageId: string;
      username: string;
      room: string;
    },
  ) {
    try {
      const updatedMessage = await this.chatService.markAsRead(
        data.messageId,
        data.username,
      );

      if (updatedMessage) {
        this.server.to(data.room).emit('messageRead', {
          messageId: data.messageId,
          readBy: updatedMessage.readBy,
        });
      }
    } catch (error) {
      console.error('Mark as read error: - chat.gateway.ts:267', error);
    }
  }

  @SubscribeMessage('markRoomAsRead')
  async handleMarkRoomAsRead(
    @MessageBody() data: {
      room: string;
      username: string;
    },
  ) {
    try {
      await this.chatService.markRoomAsRead(data.room, data.username);

      this.server.to(data.room).emit('roomMarkedAsRead', {
        username: data.username,
      });
    } catch (error) {
      console.error('Mark room as read error: - chat.gateway.ts:285', error);
    }
  }

  @SubscribeMessage('searchMessages')
  async handleSearchMessages(
    @MessageBody() data: {
      room: string;
      query: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const results = await this.chatService.searchMessages(data.room, data.query);
      client.emit('searchResults', results);
    } catch (error) {
      client.emit('error', { message: 'Search failed' });
    }
  }

  @SubscribeMessage('pinMessage')
  async handlePinMessage(
    @MessageBody() data: {
      room: string;
      messageId: string;
    },
  ) {
    try {
      const pinnedMessage = await this.chatService.pinMessage(data.messageId);

      if (pinnedMessage) {
        this.server.to(data.room).emit('messagePinned', pinnedMessage);
      }
    } catch (error) {
      console.error('Pin message error: - chat.gateway.ts:319', error);
    }
  }

  @SubscribeMessage('unpinMessage')
  async handleUnpinMessage(
    @MessageBody() data: {
      room: string;
      messageId: string;
    },
  ) {
    try {
      const unpinnedMessage = await this.chatService.unpinMessage(data.messageId);

      if (unpinnedMessage) {
        this.server.to(data.room).emit('messageUnpinned', {
          messageId: data.messageId,
        });
      }
    } catch (error) {
      console.error('Unpin message error: - chat.gateway.ts:339', error);
    }
  }

  @SubscribeMessage('uploadFile')
  async handleFileUpload(
    @MessageBody() data: {
      room: string;
      username: string;
      fileData: {
        filename: string;
        originalName: string;
        mimetype: string;
        size: number;
        url: string;
        base64?: string;
      };
    },
  ) {
    try {
      const message = await this.chatService.saveFileMessage(
        data.room,
        data.username,
        data.fileData,
      );

      this.server.to(data.room).emit('receiveMessage', message);
    } catch (error) {
      console.error('File upload error: - chat.gateway.ts:367', error);
    }
  }

  @SubscribeMessage('reportMessage')
  async handleReportMessage(
    @MessageBody() data: {
      room: string;
      messageId: string;
      reportedBy: string;
      reason?: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      await this.chatService.updateMessage(data.messageId, {
        isReported: true,
      });

      // Notify moderators
      this.server.to(data.room).emit('messageReported', {
        messageId: data.messageId,
        reportedBy: data.reportedBy,
        reason: data.reason,
      });

      client.emit('reportSuccess', { messageId: data.messageId });
    } catch (error) {
      client.emit('error', { message: 'Failed to report message' });
    }
  }

  @SubscribeMessage('typing')
  handleTyping(
    @MessageBody() data: { room: string; username: string; isTyping: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    client.to(data.room).emit('userTyping', {
      username: data.username,
      isTyping: data.isTyping,
    });
  }

  @SubscribeMessage('updateProfile')
  async handleUpdateProfile(
    @MessageBody() data: {
      username: string;
      updates: any;
    },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const updatedUser = await this.chatService.updateUserProfile(
        data.username,
        data.updates,
      );

      if (updatedUser) {
        // Broadcast profile update to all rooms where user is a member
        const rooms = await this.chatService.getRoomsByUser(data.username);
        rooms.forEach(room => {
          this.server.to(room.name).emit('userProfileUpdated', {
            username: data.username,
            updates: data.updates,
          });
        });

        client.emit('profileUpdateSuccess', updatedUser);
      }
    } catch (error) {
      client.emit('error', { message: 'Failed to update profile' });
    }
  }

  // Room Management
  @SubscribeMessage('createRoom')
  async handleCreateRoom(
    @MessageBody() data: {
      name: string;
      description?: string;
      isPrivate: boolean;
      type: 'public' | 'private';
      createdBy: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const room = await this.chatService.createRoom({
        name: data.name,
        description: data.description,
        type: data.type,
        createdBy: data.createdBy,
        members: [data.createdBy],
        moderators: [],
        isActive: true,
      });

      client.emit('roomCreated', room);
      
      // Notify all clients about new room
      this.server.emit('roomListUpdated', await this.chatService.getAllRooms());
    } catch (error) {
      client.emit('error', { message: 'Failed to create room' });
    }
  }

  @SubscribeMessage('joinRoomById')
  async handleJoinRoomById(
    @MessageBody() data: {
      roomId: string;
      username: string;
      gender: 'male' | 'female' | 'other';
      country: string;
      avatar?: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const room = await this.chatService.getRoomById(data.roomId);
      if (!room) {
        client.emit('error', { message: 'Room not found' });
        return;
      }

      if (room.type === 'private' && !room.members.includes(data.username)) {
        client.emit('error', { message: 'This room is private' });
        return;
      }

      await this.chatService.addMemberToRoom(room.name, data.username);
      
      // Now join the room
      client.join(room.name);
      this.chatService.addUserToRoom(room.name, {
        name: data.username,
        gender: data.gender,
        country: data.country,
        socketId: client.id,
        isActive: true,
        avatar: data.avatar,
        status: 'online',
      });

      client.emit('joinedRoom', room);
      this.server.to(room.name).emit('userEvent', {
        type: 'join',
        username: data.username,
      });
      this.server.to(room.name).emit('updateUsers', this.chatService.getUsersInRoom(room.name));
    } catch (error) {
      client.emit('error', { message: 'Failed to join room' });
    }
  }

  @SubscribeMessage('deleteRoom')
  async handleDeleteRoom(
    @MessageBody() data: {
      roomId: string;
      username: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const room = await this.chatService.getRoomById(data.roomId);
      if (!room || room.createdBy !== data.username) {
        client.emit('error', { message: 'Only room owner can delete the room' });
        return;
      }

      await this.chatService.deleteRoom(data.roomId);
      
      this.server.to(room.name).emit('roomDeleted', { roomId: data.roomId });
      this.server.emit('roomListUpdated', await this.chatService.getAllRooms());
    } catch (error) {
      client.emit('error', { message: 'Failed to delete room' });
    }
  }

  // Moderation
  @SubscribeMessage('kickUser')
  async handleKickUser(
    @MessageBody() data: {
      room: string;
      username: string;
      by: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const room = await this.chatService.getRoomByName(data.room);
      if (!room) return;

      // Check if kicker has permission
      const canKick = room.createdBy === data.by || room.moderators?.includes(data.by);
      if (!canKick) {
        client.emit('error', { message: 'You do not have permission to kick users' });
        return;
      }

      // Find user's socket and kick them
      const userSocket = this.chatService.getUserSocketId(data.room, data.username);
      if (userSocket) {
        this.server.to(userSocket).emit('kicked', { room: data.room, by: data.by });
        const socket = this.server.sockets.sockets.get(userSocket);
        if (socket) {
          socket.leave(data.room);
        }
      }

      this.chatService.removeUserFromRoom(data.room, data.username);
      this.server.to(data.room).emit('userKicked', { username: data.username, by: data.by });
      this.server.to(data.room).emit('updateUsers', this.chatService.getUsersInRoom(data.room));
    } catch (error) {
      client.emit('error', { message: 'Failed to kick user' });
    }
  }

  @SubscribeMessage('banUser')
  async handleBanUser(
    @MessageBody() data: {
      room: string;
      username: string;
      by: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const room = await this.chatService.getRoomByName(data.room);
      if (!room) return;

      // Check if banner has permission
      const canBan = room.createdBy === data.by || room.moderators?.includes(data.by);
      if (!canBan) {
        client.emit('error', { message: 'You do not have permission to ban users' });
        return;
      }

      // Ban user
      await this.chatService.banUserFromRoom(data.room, data.username);

      // Find user's socket and kick them
      const userSocket = this.chatService.getUserSocketId(data.room, data.username);
      if (userSocket) {
        this.server.to(userSocket).emit('banned', { room: data.room, by: data.by });
        const socket = this.server.sockets.sockets.get(userSocket);
        if (socket) {
          socket.leave(data.room);
        }
      }

      this.chatService.removeUserFromRoom(data.room, data.username);
      this.server.to(data.room).emit('userBanned', { username: data.username, by: data.by });
      this.server.to(data.room).emit('updateUsers', this.chatService.getUsersInRoom(data.room));
    } catch (error) {
      client.emit('error', { message: 'Failed to ban user' });
    }
  }

  @SubscribeMessage('promoteUser')
  async handlePromoteUser(
    @MessageBody() data: {
      room: string;
      username: string;
      role: 'moderator' | 'admin';
      by: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const room = await this.chatService.getRoomByName(data.room);
      if (!room) return;

      // Only owner can promote to admin, owner and admins can promote to moderator
      const canPromote = data.role === 'admin' 
        ? room.createdBy === data.by
        : room.createdBy === data.by || room.moderators?.includes(data.by);

      if (!canPromote) {
        client.emit('error', { message: 'You do not have permission to promote users' });
        return;
      }

      await this.chatService.promoteUser(data.room, data.username, data.role);
      this.server.to(data.room).emit('userPromoted', { 
        username: data.username, 
        role: data.role,
        by: data.by 
      });
    } catch (error) {
      client.emit('error', { message: 'Failed to promote user' });
    }
  }

  @SubscribeMessage('leaveRoom')
  async handleLeaveRoom(
    @MessageBody() data: { room: string; username: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(data.room);
    this.chatService.removeUserFromRoom(data.room, data.username);

    // Update user status
    await this.chatService.updateUserStatus(data.username, 'offline');

    this.server.to(data.room).emit('userEvent', {
      type: 'leave',
      username: data.username,
    });

    this.server.to(data.room).emit(
      'updateUsers',
      this.chatService.getUsersInRoom(data.room),
    );
  }

  async handleDisconnect(client: Socket) {
    const result = this.chatService.getUserBySocket(client.id);

    if (!result) return;

    const { room, user } = result;

    this.chatService.removeUserFromRoom(room, user.name);

    // Update user status to offline
    await this.chatService.updateUserStatus(user.name, 'offline');

    this.server.to(room).emit('userEvent', {
      type: 'leave',
      username: user.name,
    });

    this.server.to(room).emit(
      'updateUsers',
      this.chatService.getUsersInRoom(room),
    );
  }
}