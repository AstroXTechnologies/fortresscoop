import { forwardRef, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ConfigAdminController } from './config.admin.controller';
import { ConfigService } from './config.service';

@Module({
  imports: [forwardRef(() => AuthModule)],
  providers: [ConfigService],
  controllers: [ConfigAdminController],
  exports: [ConfigService],
})
export class ConfigModule {}
