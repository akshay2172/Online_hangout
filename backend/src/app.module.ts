
import { Module } from '@nestjs/common';
import { ChatModule } from './chat/chat.module';
import { MongooseModule } from '@nestjs/mongoose';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { UploadModule } from './upload/upload.module';
@Module({
  imports: [ChatModule, AuthModule, UserModule , UploadModule, MongooseModule.forRoot(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/db_user'
    ),
  ],
})
export class AppModule {}
