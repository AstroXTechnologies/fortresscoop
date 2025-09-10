import { Module } from '@nestjs/common';
import { AuthModule } from 'src/modules/auth/auth.module';
import { InvestmentProductsController } from './product.controller';
import { InvestmentProductsService } from './product.service';

@Module({
  imports: [AuthModule],
  controllers: [InvestmentProductsController],
  providers: [InvestmentProductsService],
  exports: [InvestmentProductsService],
})
export class InvestmentProductsModule {}
