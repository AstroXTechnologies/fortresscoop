import { Module } from '@nestjs/common';
import { TransactionModule } from '../transaction/transaction.module';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';

@Module({
  imports: [TransactionModule],
  controllers: [PaymentController],
  providers: [PaymentController, PaymentService],
})
export class PaymentModule {}
