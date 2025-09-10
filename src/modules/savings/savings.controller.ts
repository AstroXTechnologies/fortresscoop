import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApAuthGuard } from 'src/modules/auth/auth-guard.decorator';
import { UserRole } from 'src/modules/user/user.model';
import { CreateSavingDto, UpdateSavingDto } from './savings.dto';
import { SavingsService } from './savings.service';

@ApAuthGuard(UserRole.USER)
@ApiTags('Savings')
@Controller('savings')
export class SavingsController {
  constructor(private readonly service: SavingsService) {}

  @Post()
  @ApiOperation({ summary: 'Start a new savings plan' })
  create(@Body() dto: CreateSavingDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all savings records' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a savings record by ID' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a savings record by ID' })
  update(@Param('id') id: string, @Body() dto: UpdateSavingDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Close a savings record by ID' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
