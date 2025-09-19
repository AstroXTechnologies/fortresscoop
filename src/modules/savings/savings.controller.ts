import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
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
  @ApiOperation({ summary: 'Get all savings records' })
  findAllSavings() {
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
}
