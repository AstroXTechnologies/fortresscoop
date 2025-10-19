import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SavingProductsService } from './product.service';

@ApiTags('Saving Products')
@Controller('saving-products')
export class SavingProductsController {
  constructor(private readonly service: SavingProductsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }
}
