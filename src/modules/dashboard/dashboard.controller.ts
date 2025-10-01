// dashboard.controller.ts
import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApAuthGuard } from 'src/modules/auth/auth-guard.decorator';
import { UserRole } from 'src/modules/user/user.model';
import { AdminDashboardDto, UserDashboardDto } from './dashboard.dto';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@ApiBearerAuth('access-token')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @ApAuthGuard(UserRole.USER)
  @Get('user/:userId')
  @ApiOperation({ summary: 'Get dashboard summary for a user' })
  async getUserDashboard(
    @Param('userId') userId: string,
  ): Promise<UserDashboardDto> {
    return this.dashboardService.getUserDashboard(userId);
  }

  @ApAuthGuard(UserRole.ADMIN)
  @Get('admin')
  @ApiOperation({ summary: 'Get admin dashboard summary' })
  async getAdminDashboard(): Promise<AdminDashboardDto> {
    return this.dashboardService.getAdminDashboard();
  }

  // Alias route for frontend /admin/overview page (same data contract)
  @ApAuthGuard(UserRole.ADMIN)
  @Get('admin/overview')
  @ApiOperation({ summary: 'Get admin overview (alias of admin dashboard)' })
  async getAdminOverview(): Promise<AdminDashboardDto> {
    return this.dashboardService.getAdminDashboard();
  }
}
