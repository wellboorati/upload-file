import { Controller, Delete, Get } from '@nestjs/common';
import { DebtService } from './debt.service';

@Controller('debt')
export class DebtController {
  constructor(private readonly debtService: DebtService) {}

  @Delete()
  async deleteAll() {
    await this.debtService.deleteAll();
    return { message: 'All debts deleted successfully' };
  }

  @Get()
  async getAll() {
    const debts = await this.debtService.getAll();
    return debts.length;
  }
}
