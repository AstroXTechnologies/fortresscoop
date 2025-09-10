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
import {
  CreateInvestmentProductDto,
  UpdateInvestmentProductDto,
} from './product.dto';
import { InvestmentProductsService } from './product.service';

@ApAuthGuard(UserRole.ADMIN)
@ApiTags('Investment Products')
@Controller('investment-products')
export class InvestmentProductsController {
  constructor(private readonly service: InvestmentProductsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new investment product' })
  create(@Body() dto: CreateInvestmentProductDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all investment products' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an investment product by ID' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an investment product by ID' })
  update(@Param('id') id: string, @Body() dto: UpdateInvestmentProductDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an investment product by ID' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
