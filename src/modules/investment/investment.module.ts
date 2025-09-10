import { Module } from '@nestjs/common';
import { AuthModule } from 'src/modules/auth/auth.module';
import { InvestmentsController } from './investment.controller';
import { InvestmentsService } from './investment.service';
import { InvestmentProductsModule } from './product/product.module';

@Module({
  controllers: [InvestmentsController],
  providers: [InvestmentsService],
  exports: [InvestmentsService],
  imports: [InvestmentProductsModule, AuthModule],
})
export class InvestmentModule {}
