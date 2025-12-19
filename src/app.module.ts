import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AuthModule } from './modules/auth/auth.module';
import { FilesModule } from './modules/files/files.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { SharesModule } from './modules/shares/shares.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    UsersModule,
    AuthModule,
    FilesModule,
    SharesModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
