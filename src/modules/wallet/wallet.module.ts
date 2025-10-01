import { forwardRef, Module } from '@nestjs/common';
import { AuthModule } from 'src/modules/auth/auth.module';
import { TransactionModule } from 'src/modules/transaction/transaction.module';
import { WalletAdminController } from './wallet.admin.controller';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';

@Module({
  imports: [forwardRef(() => AuthModule), forwardRef(() => TransactionModule)],
  controllers: [WalletController, WalletAdminController],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
