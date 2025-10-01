import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { TriggerPayoutInputDto } from './profit.dto';
import { ProfitService } from './profit.service';

@Controller('profits/admin')
export class ProfitController {
  constructor(private readonly service: ProfitService) {}

  @Get('summary')
  getSummary() {
    return this.service.getSummary();
  }

  @Get('recent-payouts')
  getRecent(@Query('limit') limit = '10') {
    return this.service.getRecentPayouts(parseInt(limit) || 10);
  }

  @Get('upcoming')
  getUpcoming(@Query('limit') limit = '4') {
    return this.service.getUpcoming(parseInt(limit) || 4);
  }

  @Post('trigger')
  trigger(@Body() body: TriggerPayoutInputDto) {
    return this.service.triggerManualPayout(body);
  }

  // Control state endpoints
  @Get('control')
  controlState() {
    return this.service.getControlState();
  }

  @Post('control/mode')
  setMode(@Body() body: { mode: 'auto' | 'manual' }) {
    return this.service.setMode(body.mode);
  }

  @Post('control/pause')
  pause(@Body() body: { paused: boolean }) {
    return this.service.pauseAll(body.paused);
  }

  @Post('control/trigger-all')
  triggerAll() {
    return this.service.triggerAll();
  }

  @Post('control/retry-failed')
  retryFailed() {
    return this.service.retryFailed();
  }
}
