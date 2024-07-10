import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Debt {
  @PrimaryGeneratedColumn('uuid')
  debtID: string;

  @Column()
  name: string;

  @Column()
  governmentId: string;

  @Column()
  email: string;

  @Column('decimal')
  debtAmount: number;

  @Column('date')
  debtDueDate: Date;
}
