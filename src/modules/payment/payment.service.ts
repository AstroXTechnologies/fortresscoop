import { BadRequestException, Injectable } from '@nestjs/common';
import { ApiClient } from 'config/apiClient';
import isErrorWithMessage from 'utils/helper';
import { TransactionsService } from '../transaction/transaction.service';
import { PaymentInputDto } from './payment.dto';
import { FlutterwaveTransactionResponse } from './payment.model';

@Injectable()
export class PaymentService {
  private readonly baseUrl = process.env.FLW_ENDPOINT;
  private readonly apiClient: ApiClient;

  constructor(private readonly transanctionsService: TransactionsService) {
    this.apiClient = new ApiClient(this.baseUrl!);
  }

  async initialize(data: PaymentInputDto) {
    let transaction: { reference?: string } | undefined; // <-- declare outside try so catch can access it
    try {
      transaction = await this.transanctionsService.create(data.userId, {
        walletId: data.walletId,
        type: 'DEPOSIT',
        amount: data.amount,
        reference: `tx-${Date.now()}`,
      });

      const payload = {
        tx_ref: transaction.reference,
        amount: data.amount,
        currency: data.currency,
        redirect_url: data.redirect_url,
        payment_options: data.payment_options || 'card,banktransfer,ussd',
        customer: {
          email: data.email,
          phoneNumber: data.phone_number,
          name: data.fullname,
        },
        customizations: {
          title: 'Fortresscoop',
          description: 'Payment for deposit',
        },
      };
      const response = await this.apiClient.post('/payments', payload);
      return response;
    } catch (error: unknown) {
      // transaction is available here
      if (transaction?.reference) {
        try {
          if (
            typeof this.transanctionsService.deleteByReference === 'function'
          ) {
            await this.transanctionsService.deleteByReference(
              transaction.reference,
            );
          }
        } catch {
          // swallow or log cleanup failure
        }
      }

      let message = 'Payment initialization failed';

      if (isErrorWithMessage(error)) {
        message = error.message;
      }

      throw new Error(message);
    }
  }

  async verifyTransaction(transactionId: string) {
    const response = await this.apiClient.get<FlutterwaveTransactionResponse>(
      `/transactions/${transactionId}/verify`,
    );

    const data = response?.data;

    if (data?.status === 'successful') {
      const tx_ref = data?.tx_ref;
      await this.transanctionsService.updateByReference(tx_ref, {
        status: 'SUCCESS',
      });
      return { message: 'Wallet funded successfully' };
    }
    const tx_ref = data?.tx_ref;

    await this.transanctionsService.updateByReference(tx_ref as string, {
      status: 'FAILED',
    });

    throw new BadRequestException('Payment verification failed');
  }
}
