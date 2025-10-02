import { Module } from '@nestjs/common';
import { AuthModule } from 'src/modules/auth/auth.module';
import { SavingsAdminController } from './savings.admin.controller';
import { SavingsController } from './savings.controller';
import { SavingsService } from './savings.service';

@Module({
  imports: [AuthModule],
  controllers: [SavingsController, SavingsAdminController],
  providers: [SavingsService],
  exports: [SavingsService],
})
export class SavingsModule {}
