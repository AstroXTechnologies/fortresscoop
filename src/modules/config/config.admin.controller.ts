import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApAuthGuard } from 'src/modules/auth/auth-guard.decorator';
import { UserRole } from 'src/modules/user/user.model';
import { UpdateAllowedTypesDto } from './config.dto';
import { ConfigService } from './config.service';

@ApAuthGuard(UserRole.ADMIN)
@ApiBearerAuth('access-token')
@ApiTags('admin-config')
@Controller('admin/config')
export class ConfigAdminController {
  constructor(private readonly configService: ConfigService) {}

  @Get('types')
  @ApiOperation({
    summary: 'Get allowed saving types and allowed investment product ids',
  })
  async getAllowedTypes() {
    return this.configService.getAllowedTypes();
  }

  @Post('types')
  @ApiOperation({
    summary: 'Update allowed saving types and allowed investment product ids',
  })
  async updateAllowedTypes(@Body() dto: UpdateAllowedTypesDto) {
    // Basic validation is done by DTO
    return this.configService.updateAllowedTypes({
      allowedSavingTypes: dto.allowedSavingTypes || [],
      allowedInvestmentProductIds: dto.allowedInvestmentProductIds || [],
    });
  }
}
