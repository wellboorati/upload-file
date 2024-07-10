import { Debt } from 'src/debt/debt.entity';

export class EmailService {
  sendEmail(debt: Debt) {
    console.log(`Email sent to ${debt.name} (${debt.email}).`);
  }
}
