// backend/chat/chat.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Message, MessageDocument } from '../schemas/message.schema';
import { User, UserDocument } from '../schemas/user.schema';
import { Room, RoomDocument } from '../schemas/room.schema';

export interface RoomUser {
  name: string;
  gender: 'male' | 'female' | 'other';
  country: string;
  socketId: string;
  isActive: boolean;
  avatar?: string;
  status?: string;
}

@Injectable()
export class ChatService {
  private activeUsers: Record<string, RoomUser[]> = {};

  constructor(
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Room.name) private roomModel: Model<RoomDocument>,
  ) {}

  // User Management
  addUserToRoom(room: string, user: RoomUser) {
    if (!this.activeUsers[room]) {
      this.activeUsers[room] = [];
    }

    const exists = this.activeUsers[room].some(u => u.socketId === user.socketId);
    if (!exists) {
      this.activeUsers[room].push(user);
    }
  }

  getUsersInRoom(room: string): RoomUser[] {
    return this.activeUsers[room] || [];
  }

  removeUserFromRoom(room: string, username: string) {
    if (!this.activeUsers[room]) return;
    this.activeUsers[room] = this.activeUsers[room].filter(u => u.name !== username);
  }

  getUserBySocket(socketId: string) {
    for (const room in this.activeUsers) {
      const user = this.activeUsers[room].find(u => u.socketId === socketId);
      if (user) return { room, user };
    }
    return null;
  }

  // Message CRUD with Database
  async createMessage(messageData: any): Promise<MessageDocument> {
    const message = new this.messageModel(messageData);
    return await message.save();
  }

  async getMessages(room: string, limit: number = 100, skip: number = 0): Promise<MessageDocument[]> {
    return await this.messageModel
      .find({ room, isDeleted: false })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .exec();
  }

  async getMessageById(messageId: string): Promise<MessageDocument | null> {
    return await this.messageModel.findById(messageId).exec();
  }

  async updateMessage(messageId: string, updates: any): Promise<MessageDocument | null> {
    return await this.messageModel
      .findByIdAndUpdate(messageId, updates, { new: true })
      .exec();
  }

  async deleteMessage(messageId: string): Promise<MessageDocument | null> {
    return await this.messageModel
      .findByIdAndUpdate(messageId, { isDeleted: true }, { new: true })
      .exec();
  }

  // Edit Message
// CORRECT - Updates message field
async editMessage(messageId: string, newMessage: string): Promise<MessageDocument | null> {
  return await this.messageModel
    .findByIdAndUpdate(
      messageId,
      {
        message: newMessage,  // ✅ CORRECT FIELD
        isEdited: true,
        editedAt: new Date(),
      },
      { new: true }
    )
    .exec();
}

  // Reactions
  async addReaction(messageId: string, emoji: string, username: string): Promise<MessageDocument | null> {
    const message = await this.messageModel.findById(messageId);
    if (!message) return null;

    const reactions = message.reactions || [];
    const existingReaction = reactions.find(r => r.emoji === emoji);

    if (existingReaction) {
      if (!existingReaction.users.includes(username)) {
        existingReaction.users.push(username);
      }
    } else {
      reactions.push({ emoji, users: [username] });
    }

    return await this.messageModel
      .findByIdAndUpdate(messageId, { reactions }, { new: true })
      .exec();
  }

  async removeReaction(messageId: string, emoji: string, username: string): Promise<MessageDocument | null> {
    const message = await this.messageModel.findById(messageId);
    if (!message) return null;

    let reactions = message.reactions || [];
    reactions = reactions
      .map(r => {
        if (r.emoji === emoji) {
          return { emoji: r.emoji, users: r.users.filter(u => u !== username) };
        }
        return r;
      })
      .filter(r => r.users.length > 0);

    return await this.messageModel
      .findByIdAndUpdate(messageId, { reactions }, { new: true })
      .exec();
  }

  // Read Receipts
  async markAsRead(messageId: string, username: string): Promise<MessageDocument | null> {
    const message = await this.messageModel.findById(messageId);
    if (!message) return null;

    const readBy = message.readBy || [];
    if (!readBy.includes(username)) {
      readBy.push(username);
    }

    return await this.messageModel
      .findByIdAndUpdate(messageId, { readBy }, { new: true })
      .exec();
  }

  async markRoomAsRead(room: string, username: string): Promise<void> {
    const messages = await this.messageModel.find({
      room,
      sender: { $ne: username },
      readBy: { $ne: username },
    });

    for (const message of messages) {
      const readBy = message.readBy || [];
      readBy.push(username);
      await this.messageModel.findByIdAndUpdate(message._id, { readBy });
    }
  }

  // Search Messages
  async searchMessages(room: string, query: string, limit: number = 50): Promise<MessageDocument[]> {
    return await this.messageModel
      .find({
        room,
        isDeleted: false,
        $or: [
          { message: { $regex: query, $options: 'i' } },
          { sender: { $regex: query, $options: 'i' } },
        ],
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  // Pin/Unpin Messages
  async pinMessage(messageId: string): Promise<MessageDocument | null> {
    return await this.messageModel
      .findByIdAndUpdate(messageId, { isPinned: true }, { new: true })
      .exec();
  }

  async unpinMessage(messageId: string): Promise<MessageDocument | null> {
    return await this.messageModel
      .findByIdAndUpdate(messageId, { isPinned: false }, { new: true })
      .exec();
  }

  async getPinnedMessages(room: string): Promise<MessageDocument[]> {
    return await this.messageModel
      .find({ room, isPinned: true, isDeleted: false })
      .sort({ createdAt: -1 })
      .exec();
  }

  // User Profile Management
  async createUser(userData: any): Promise<UserDocument> {
    const user = new this.userModel(userData);
    return await user.save();
  }

  async getUserByUsername(username: string): Promise<UserDocument | null> {
    return await this.userModel.findOne({ username }).exec();
  }

  async updateUserProfile(username: string, updates: any): Promise<UserDocument | null> {
    return await this.userModel
      .findOneAndUpdate({ username }, updates, { new: true })
      .exec();
  }

  async updateUserStatus(username: string, status: string): Promise<UserDocument | null> {
    return await this.userModel
      .findOneAndUpdate(
        { username },
        { status, lastSeen: new Date() },
        { new: true }
      )
      .exec();
  }

  // Room Management
  async createRoom(roomData: any): Promise<RoomDocument> {
    const room = new this.roomModel(roomData);
    return await room.save();
  }

  async getRoomByName(name: string): Promise<RoomDocument | null> {
    return await this.roomModel.findOne({ name }).exec();
  }

  async getRoomsByUser(username: string): Promise<RoomDocument[]> {
    return await this.roomModel
      .find({ members: username, isActive: true })
      .exec();
  }

  async addMemberToRoom(roomName: string, username: string): Promise<RoomDocument | null> {
    return await this.roomModel
      .findOneAndUpdate(
        { name: roomName },
        { $addToSet: { members: username } },
        { new: true }
      )
      .exec();
  }

  async removeMemberFromRoom(roomName: string, username: string): Promise<RoomDocument | null> {
    return await this.roomModel
      .findOneAndUpdate(
        { name: roomName },
        { $pull: { members: username } },
        { new: true }
      )
      .exec();
  }

  // File Management (metadata only, actual files stored separately)
  async saveFileMessage(room: string, sender: string, fileData: any): Promise<MessageDocument> {
    const messageData = {
      room,
      sender,
      message: fileData.originalName,
      messageType: fileData.mimetype.startsWith('image/') ? 'image' : 'file',
      fileData,
    };

    return await this.createMessage(messageData);
  }

  // Analytics
  async getMessageCount(room: string): Promise<number> {
    return await this.messageModel.countDocuments({ room, isDeleted: false });
  }

  async getUserMessageCount(room: string, username: string): Promise<number> {
    return await this.messageModel.countDocuments({
      room,
      sender: username,
      isDeleted: false,
    });
  }

  async getUnreadCount(room: string, username: string): Promise<number> {
    return await this.messageModel.countDocuments({
      room,
      sender: { $ne: username },
      readBy: { $ne: username },
      isDeleted: false,
    });
  }
}