import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Debt } from './debt.entity';

@Injectable()
export class DebtService {
  constructor(
    @InjectRepository(Debt)
    private debtRepository: Repository<Debt>,
  ) {}

  async deleteAll() {
    console.log('Deleting all debts');
    await this.debtRepository.clear();
  }

  async getAll() {
    return await this.debtRepository.find();
  }
}
