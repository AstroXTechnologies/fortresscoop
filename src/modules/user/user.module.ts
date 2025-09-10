import { Module } from '@nestjs/common';
import { AuthModule } from 'src/modules/auth/auth.module';
import { WalletModule } from 'src/modules/wallet/wallet.module';
import { UserInvestmentsModule } from '././investment/investment.module';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  imports: [WalletModule, UserInvestmentsModule, AuthModule],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
