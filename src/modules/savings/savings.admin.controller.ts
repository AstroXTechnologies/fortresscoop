import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApAuthGuard } from 'src/modules/auth/auth-guard.decorator';
import { UserRole } from 'src/modules/user/user.model';
import { SavingsService } from './savings.service';

@ApAuthGuard(UserRole.ADMIN)
@ApiBearerAuth('access-token')
@ApiTags('Savings Admin')
@Controller('admin/savings')
export class SavingsAdminController {
  constructor(private readonly service: SavingsService) {}

  @Get()
  @ApiOperation({ summary: 'Admin: list savings with filters & pagination' })
  async list(
    @Query('userId') userId?: string,
    @Query('status') status?: string,
    @Query('minAmount') minAmount?: string,
    @Query('maxAmount') maxAmount?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    // userId optional for admin; if omitted returns all savings records
    if (userId) {
      return this.service.findAllPaginatedFiltered({
        userId,
        status,
        minAmount: minAmount ? parseFloat(minAmount) : undefined,
        maxAmount: maxAmount ? parseFloat(maxAmount) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
        cursor: cursor || undefined,
      });
    }
    return this.service.findAllAdminPaginated({
      status,
      minAmount: minAmount ? parseFloat(minAmount) : undefined,
      maxAmount: maxAmount ? parseFloat(maxAmount) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      cursor: cursor || undefined,
    });
  }
}
