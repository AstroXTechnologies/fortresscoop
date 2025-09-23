import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { PaymentInputDto } from './payment.dto';
import { PaymentService } from './payment.service';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentSvc: PaymentService) {}

  @Post('init')
  async initializePayment(@Body() body: PaymentInputDto) {
    return this.paymentSvc.initialize(body);
  }

  @Get('verify/:id')
  async verifyPayment(@Param('id') id: string) {
    return this.paymentSvc.verifyTransaction(id);
  }
}
