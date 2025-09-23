import { ApiProperty } from '@nestjs/swagger';

export class PaymentInputDto {
  @ApiProperty({
    description: 'Unique ID for the user initiating this transaction',
  })
  userId: string;
  @ApiProperty({
    description: 'Unique Wallet ID for the user initiating this transaction',
  })
  walletId: string;
  @ApiProperty({ description: 'Amount to deposit' })
  amount: number;
  @ApiProperty({ description: 'Currency code, e.g., USD, EUR' })
  currency: string;
  @ApiProperty({ description: 'URL to redirect after payment' })
  redirect_url: string;
  @ApiProperty({ description: 'User email' })
  email: string;
  @ApiProperty({ description: 'User full name' })
  fullname: string;
  @ApiProperty({ description: 'User phone number', required: false })
  phone_number?: string;
  @ApiProperty({
    description: 'Payment method, e.g., card, bank',
    required: false,
  })
  payment_options?: string;
}
