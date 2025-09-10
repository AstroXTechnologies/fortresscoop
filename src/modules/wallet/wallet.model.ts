import { ApiProperty } from '@nestjs/swagger';

export class Wallet {
  @ApiProperty({ description: 'Unique identifier for the wallet' })
  id: string;

  @ApiProperty({ description: 'User ID that owns this wallet' })
  userId: string;

  @ApiProperty({ description: 'Current balance of the wallet', default: 0 })
  balance: number;

  @ApiProperty({ description: 'Currency type for the wallet', example: 'NGN' })
  currency: string;

  @ApiProperty({ description: 'Date when the wallet was created' })
  createdAt: Date;
}
