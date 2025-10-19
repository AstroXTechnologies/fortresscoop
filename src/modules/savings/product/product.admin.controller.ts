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
import { ApAuthGuard } from 'src/modules/auth/auth-guard.decorator';
import { UserRole } from 'src/modules/user/user.model';
import { CreateSavingProductDto, UpdateSavingProductDto } from './product.dto';
import { SavingProductsService } from './product.service';

@ApAuthGuard(UserRole.ADMIN)
@ApiTags('Saving Products Admin')
@ApiBearerAuth('access-token')
@Controller('admin/saving-products')
export class SavingProductsAdminController {
  constructor(private readonly service: SavingProductsService) {}

  @Post()
  @ApiOperation({ summary: 'Admin: create a new saving product' })
  create(@Body() dto: CreateSavingProductDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Admin: list all saving products' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Admin: get a saving product by id' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Admin: update a saving product by id' })
  update(@Param('id') id: string, @Body() dto: UpdateSavingProductDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Admin: delete a saving product by id' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
