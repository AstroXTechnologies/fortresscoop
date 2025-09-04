import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { ProfileModule } from './modules/profile/profile.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { InvestmentModule } from './modules/investment/investment.module';
import { SavingsModule } from './modules/savings/savings.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [AuthModule, UserModule, DashboardModule, WalletModule, SavingsModule, InvestmentModule, AnalyticsModule, ProfileModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
