import { Debt } from 'src/debt/debt.entity';

export class BankPaymentService {
  sendPaymentSlip(debt: Debt) {
    console.log(`Bank payment slip sent to ${debt.name} (${debt.email}).`);
  }
}
