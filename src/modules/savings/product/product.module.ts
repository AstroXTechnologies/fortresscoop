import { Module } from '@nestjs/common';
import { AuthModule } from 'src/modules/auth/auth.module';
import { SavingProductsAdminController } from './product.admin.controller';
import { SavingProductsController } from './product.controller';
import { SavingProductsService } from './product.service';

@Module({
  imports: [AuthModule],
  controllers: [SavingProductsAdminController, SavingProductsController],
  providers: [SavingProductsService],
  exports: [SavingProductsService],
})
export class SavingProductsModule {}
