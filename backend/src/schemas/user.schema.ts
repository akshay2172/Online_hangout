// backend/schemas/user.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  username: string;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  password: string; // Should be hashed

  @Prop({ type: String })
  displayName?: string;

  @Prop({ type: String })
  gender: 'male' | 'female' | 'other';

  @Prop({ type: String })
  country: string;

  @Prop({ type: String })
  avatar?: string; // URL or base64

  @Prop({ type: String })
  bio?: string;

  @Prop({ type: String })
  status: 'online' | 'offline' | 'away' | 'busy';

  @Prop({ type: Date })
  lastSeen?: Date;

  @Prop({ type: [String], default: [] })
  blockedUsers: string[];

  @Prop({ type: Object, default: {} })
  preferences: {
    notifications: boolean;
    soundEnabled: boolean;
    theme: 'light' | 'dark' | 'auto';
    fontSize: 'small' | 'medium' | 'large';
  };

  @Prop({ type: [String], default: [] })
  rooms: string[];

  @Prop({ default: false })
  isVerified: boolean;

  @Prop({ default: false })
  isModerator: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Add indexes
UserSchema.index({ username: 1 });
UserSchema.index({ email: 1 });