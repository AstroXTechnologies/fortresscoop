import { forwardRef, Module } from '@nestjs/common';
import { AuthModule } from 'src/modules/auth/auth.module';
import { UserInvestmentsController } from './investment.controller';
import { UserInvestmentsService } from './investment.service';

@Module({
  imports: [forwardRef(() => AuthModule)],
  controllers: [UserInvestmentsController],
  providers: [UserInvestmentsService],
  exports: [UserInvestmentsService],
})
export class UserInvestmentsModule {}
