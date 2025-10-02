import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CreateSavingDto,
  PreviewSavingDto,
  UpdateSavingDto,
} from './savings.dto';
import { SavingsService } from './savings.service';

// @ApAuthGuard(UserRole.USER)
@ApiBearerAuth('access-token')
@ApiTags('Savings')
@Controller('savings')
export class SavingsController {
  constructor(private readonly service: SavingsService) {}

  @Post()
  @ApiOperation({ summary: 'Start a new fixed-term savings plan (UI aligned)' })
  createSavings(@Body() dto: CreateSavingDto) {
    return this.service.create(dto);
  }

  @Post('preview')
  @ApiOperation({ summary: 'Preview savings plan before creating' })
  previewSavings(@Body() dto: PreviewSavingDto) {
    return this.service.preview(dto.amount, dto.durationInDays);
  }

  @Get()
  @ApiOperation({
    summary: 'Get savings records (optionally paginated & filtered)',
  })
  findAllSavings(
    @Query('paginated') paginated?: string,
    @Query('userId') userId?: string,
    @Query('status') status?: string,
    @Query('minAmount') minAmount?: string,
    @Query('maxAmount') maxAmount?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    if (paginated === 'true') {
      return this.service.findAllPaginatedFiltered({
        userId,
        status,
        minAmount: minAmount ? parseFloat(minAmount) : undefined,
        maxAmount: maxAmount ? parseFloat(maxAmount) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
        cursor: cursor || undefined,
      });
    }
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a savings record by ID' })
  findOneSavings(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a savings record by ID' })
  updateSavings(@Param('id') id: string, @Body() dto: UpdateSavingDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Close a savings record by ID' })
  removeSavings(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Find user savings' })
  findUserSavings(@Param('userId') userId: string) {
    return this.service.findUserSavings(userId);
  }
}
