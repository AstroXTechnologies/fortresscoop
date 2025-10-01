import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateTransactionDto, UpdateTransactionDto } from './transaction.dto';

import { ApAuthGuard } from 'src/modules/auth/auth-guard.decorator';
import { UserRole } from 'src/modules/user/user.model';
import { TransactionsService } from './transaction.service';

@ApAuthGuard(UserRole.USER)
@ApiBearerAuth('access-token')
@ApiTags('Transactions')
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly service: TransactionsService) {}

  @Post(':userId')
  @ApiOperation({ summary: 'Create a new transaction for a user' })
  createTransaction(
    @Param('userId') userId: string,
    @Body() dto: CreateTransactionDto,
  ) {
    return this.service.create(userId, dto);
  }

  @Get(':userId')
  @ApiOperation({ summary: 'Get all transactions for a user' })
  findAllTransactions(
    @Param('userId') userId: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
    @Query('paginated') paginated?: string,
  ) {
    if (paginated === 'true') {
      const l = Number(limit);
      return this.service.findAllPaginated(userId, !isNaN(l) ? l : 25, cursor);
    }
    return this.service.findAll(userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a transaction status' })
  updateTransaction(
    @Param('id') id: string,
    @Body() dto: UpdateTransactionDto,
  ) {
    return this.service.update(id, dto);
  }

  @Get('transaction/:transactionId')
  @ApiOperation({ summary: 'Get history for a specific transaction' })
  async getTransactionHistory(@Param('transactionId') transactionId: string) {
    return this.service.getTransactionHistoryByTransactionId(transactionId);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get all transaction histories for a user' })
  async getTransactionHistoryByUserId(@Param('userId') userId: string) {
    return this.service.getTransactionHistoryByUserId(userId);
  }
}
