import { Module } from '@nestjs/common';
import { BankPaymentService } from './bankPayment.service';

@Module({
  providers: [BankPaymentService],
  exports: [BankPaymentService],
})
export class BankPaymentModule {}
