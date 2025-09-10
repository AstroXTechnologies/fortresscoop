import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApAuthGuard } from 'src/modules/auth/auth-guard.decorator';
import { UserRole } from 'src/modules/user/user.model';
import {
  CreateWalletDto,
  UpdateWalletDto,
} from 'src/modules/wallet/wallet.dto';
import { Wallet } from 'src/modules/wallet/wallet.model';
import { WalletService } from './wallet.service';

@ApAuthGuard(UserRole.USER)
@ApiTags('wallets')
@Controller('wallets')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new wallet (normally auto after user creation)',
  })
  @ApiResponse({
    status: 201,
    description: 'Return list of wallets.',
    type: Wallet,
  })
  create(@Body() createWalletDto: CreateWalletDto) {
    return this.walletService.create(createWalletDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all wallets' })
  @ApiResponse({
    status: 200,
    description: 'Return list of wallets',
    type: [Wallet],
  })
  findAll() {
    return this.walletService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get wallet by ID' })
  @ApiResponse({
    status: 200,
    description: 'Return wallet details',
    type: Wallet,
  })
  findOne(@Param('id') id: string) {
    return this.walletService.findOne(id);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get a wallet by User ID' })
  @ApiResponse({
    status: 200,
    description: 'Return wallet details for user',
    type: Wallet,
  })
  findByUserId(@Param('userId') userId: string): Promise<Wallet> {
    return this.walletService.findByUserId(userId);
  }

  @Patch(':id')
  @ApiOperation({
    summary:
      'Update a wallet (balance changes should use transactions instead)',
  })
  @ApiResponse({ status: 200, description: 'Wallet Updated', type: Wallet })
  update(@Param('id') id: string, @Body() updateWalletDto: UpdateWalletDto) {
    return this.walletService.update(id, updateWalletDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a wallet (dangerous, normally not used)' })
  @ApiResponse({ status: 200, description: 'Wallet deleted successfully.' })
  remove(@Param('id') id: string) {
    return this.walletService.remove(id);
  }
}
