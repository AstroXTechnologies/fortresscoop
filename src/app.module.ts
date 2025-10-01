import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AuthModule } from './modules/auth/auth.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { InvestmentModule } from './modules/investment/investment.module';
import { PaymentModule } from './modules/payment/payment.module';
import { ProfileModule } from './modules/profile/profile.module';
import { ProfitModule } from './modules/profit/profit.module';
import { SavingsModule } from './modules/savings/savings.module';
import { TransactionModule } from './modules/transaction/transaction.module';
import { UserModule } from './modules/user/user.module';
import { WalletModule } from './modules/wallet/wallet.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    AuthModule,
    UserModule,
    DashboardModule,
    WalletModule,
    SavingsModule,
    InvestmentModule,
    AnalyticsModule,
    ProfileModule,
    TransactionModule,
    PaymentModule,
    ProfitModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
