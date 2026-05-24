import { Module } from '@nestjs/common';
import { RemoteClockController } from './remote-clock.controller';
import { RemoteClockService } from './remote-clock.service';

@Module({
  controllers: [RemoteClockController],
  providers: [RemoteClockService],
})
export class RemoteClockModule {}
