import { Repository } from 'typeorm';
import { Debt } from './debt.entity';

export class DebtRepository extends Repository<Debt> {}
