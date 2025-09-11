import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApAuthGuard } from 'src/modules/auth/auth-guard.decorator';
import { UserRole } from 'src/modules/user/user.model';
import { CreateInvestmentDto, UpdateInvestmentDto } from './investment.dto';
import { InvestmentsService } from './investment.service';

@ApAuthGuard(UserRole.USER)
@ApiBearerAuth('access-token')
@ApiTags('Investments')
@Controller('investments')
export class InvestmentsController {
  constructor(private readonly service: InvestmentsService) {}

  @Post(':userId')
  @ApiOperation({ summary: 'Create a new investment for a user' })
  create(@Param('userId') userId: string, @Body() dto: CreateInvestmentDto) {
    return this.service.create(userId, dto);
  }

  @Get(':userId')
  @ApiOperation({ summary: 'Get all investments for a user' })
  findAll(@Param('userId') userId: string) {
    return this.service.findAll(userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an investment status' })
  update(@Param('id') id: string, @Body() dto: UpdateInvestmentDto) {
    return this.service.update(id, dto);
  }
}
