import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export class WalletManualAdjustDto {
  @IsString()
  @IsNotEmpty()
  userEmail: string;

  @IsEnum(['credit', 'debit'])
  type: 'credit' | 'debit';

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsString()
  @IsOptional()
  reason?: string;
}

export class WalletAdjustmentResultDto {
  success: boolean;
  previousBalance: number;
  newBalance: number;
  currency: string;
  transactionId: string;
}
