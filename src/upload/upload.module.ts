import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { DebtRepository } from '../debt/debt.repository';
import { Debt } from '../debt/debt.entity';
import { DebtController } from '../debt/debt.controller';
import { DebtService } from '../debt/debt.service';
import { EmailModule } from 'src/services/email.module';
import { BankPaymentModule } from 'src/services/bankPayment.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DebtRepository, Debt]),
    EmailModule,
    BankPaymentModule,
  ],
  controllers: [UploadController, DebtController],
  providers: [UploadService, DebtService],
})
export class UploadModule {}
