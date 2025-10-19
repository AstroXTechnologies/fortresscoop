import { forwardRef, Module } from '@nestjs/common';
import { AuthModule } from 'src/modules/auth/auth.module';
import { ConfigModule } from 'src/modules/config/config.module';
import { UserInvestmentsController } from './investment.controller';
import { UserInvestmentsService } from './investment.service';

@Module({
  imports: [forwardRef(() => AuthModule), ConfigModule],
  controllers: [UserInvestmentsController],
  providers: [UserInvestmentsService],
  exports: [UserInvestmentsService],
})
export class UserInvestmentsModule {}
