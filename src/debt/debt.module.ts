import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Debt } from './debt.entity';
import { DebtRepository } from './debt.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Debt])],
  providers: [DebtRepository],
  exports: [DebtRepository],
})
export class DebtModule {}
