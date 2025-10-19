import { Module } from '@nestjs/common';
import { AuthModule } from 'src/modules/auth/auth.module';
import { ConfigModule } from 'src/modules/config/config.module';
import { SavingsAdminController } from './savings.admin.controller';
import { SavingsController } from './savings.controller';
import { SavingsService } from './savings.service';

@Module({
  imports: [AuthModule, ConfigModule],
  controllers: [SavingsController, SavingsAdminController],
  providers: [SavingsService],
  exports: [SavingsService],
})
export class SavingsModule {}
