import { BadRequestException, Injectable } from '@nestjs/common';
import { ApiClient } from 'config/apiClient';
import isErrorWithMessage from 'utils/helper';
import { TransactionsService } from '../transaction/transaction.service';
import { PaymentInputDto } from './payment.dto';
import { FlutterwaveTransactionResponse } from './payment.model';

@Injectable()
export class PaymentService {
  private readonly baseUrl: string;
  private readonly apiClient: ApiClient;

  constructor(private readonly transanctionsService: TransactionsService) {
    // Try multiple potential environment variable names
    this.baseUrl =
      process.env.FLW_ENDPOINT ||
      process.env.FLUTTERWAVE_ENDPOINT ||
      process.env.FLUTTER_ENDPOINT ||
      'https://api.flutterwave.com/v3'; // fallback to default

    // Add validation and logging for debugging
    console.log('Environment check:');
    console.log('FLW_ENDPOINT:', process.env.FLW_ENDPOINT);
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log(
      'All FLW env vars:',
      Object.keys(process.env)
        .filter((key) => key.includes('FLW'))
        .reduce((obj, key) => ({ ...obj, [key]: process.env[key] }), {}),
    );

    if (!this.baseUrl || this.baseUrl === '') {
      console.error('FLW_ENDPOINT environment variable is not set');
      throw new Error('FLW_ENDPOINT environment variable is required');
    }

    console.log('Flutterwave endpoint initialized:', this.baseUrl);
    this.apiClient = new ApiClient(this.baseUrl);
  }

  async initialize(data: PaymentInputDto) {
    if (!data?.email) {
      throw new BadRequestException('User email is required');
    }

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
