import { Module } from '@nestjs/common';

import { FilesModule } from '../files/files.module';
import { SharesController } from './shares.controller';
import { SharesService } from './shares.service';

@Module({
  imports: [FilesModule],
  controllers: [SharesController],
  providers: [SharesService],
})
export class SharesModule {}
