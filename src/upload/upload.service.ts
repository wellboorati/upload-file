import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DebtRepository } from '../debt/debt.repository';
import { Debt } from '../debt/debt.entity';
import * as csvParser from 'csv-parser';
import { Stream } from 'stream';
import { EmailService } from '../services/email.service';
import { BankPaymentService } from '../services/bankPayment.service';
import { validate as isUuid } from 'uuid';

interface CsvDebt {
  name: string;
  governmentId: string;
  email: string;
  debtAmount: number;
  debtDueDate: number;
  debtId: string;
}

@Injectable()
export class UploadService {
  private readonly maxAttempts = 3;
  private readonly chunkSize = 1000;
  private readonly concurrencyLimit = 10;

  constructor(
    @InjectRepository(Debt)
    private readonly debtRepository: DebtRepository,
    private readonly emailService: EmailService,
    private readonly bankPaymentService: BankPaymentService,
  ) {}

  async processFile(
    file: Express.Multer.File,
  ): Promise<{ message: string; totalProcessed: number }> {
    return new Promise((resolve, reject) => {
      const bufferStream = new Stream.PassThrough();
      bufferStream.end(file.buffer);

      const processedResults: Debt[] = [];
      let currentChunk: CsvDebt[] = [];
      let isFirstLine = true;
      const chunkQueue: CsvDebt[][] = [];
      let totalProcessed = 0;

      const csvHeaders = [
        'name',
        'governmentId',
        'email',
        'debtAmount',
        'debtDueDate',
        'debtId',
      ];

      bufferStream
        .pipe(csvParser({ headers: csvHeaders }))
        .on('data', (data: CsvDebt) => {
          if (isFirstLine) {
            isFirstLine = false;
            return;
          }
          currentChunk.push(data);

          if (currentChunk.length >= this.chunkSize) {
            bufferStream.pause();
            chunkQueue.push([...currentChunk]);
            totalProcessed += currentChunk.length;

            currentChunk = [];

            this.processChunkQueue(chunkQueue, processedResults)
              .then(() => {
                bufferStream.resume();
              })
              .catch(reject);
          }
        })
        .on('end', async () => {
          if (currentChunk.length > 0) {
            chunkQueue.push([...currentChunk]);
            totalProcessed += currentChunk.length;
          }

          try {
            await this.processChunkQueue(chunkQueue, processedResults);
            resolve({
              message: 'File processed successfully',
              totalProcessed,
            });
          } catch (error) {
            reject({
              message: 'Failed to process file',
              error: error.message,
              totalProcessed,
            });
          }
        })
        .on('error', (error: Error) => {
          reject({ message: 'Failed to read file', error: error.message });
          bufferStream.end();
        });
    });
  }

  private async processChunkQueue(
    chunkQueue: CsvDebt[][],
    results: Debt[],
  ): Promise<void> {
    const activePromises: Promise<void>[] = [];

    while (chunkQueue.length > 0) {
      const chunk = chunkQueue.shift();
      if (!chunk) continue;

      const chunkPromise = this.processChunks(chunk, results).catch((error) => {
        throw error;
      });

      activePromises.push(chunkPromise);

      if (activePromises.length >= this.concurrencyLimit) {
        await Promise.all(activePromises);
        activePromises.length = 0;
      }
    }

    await Promise.all(activePromises);
  }

  private async processChunks(
    chunk: CsvDebt[],
    results: Debt[],
  ): Promise<void> {
    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try {
        const processedDebts = await this.processChunk(chunk);
        results.push(...processedDebts);
        return;
      } catch (error) {
        console.error(
          `Attempt ${attempt} to process chunk failed: ${error.message}`,
        );
        if (attempt === this.maxAttempts) {
          console.error(
            `Failed to process chunk after ${this.maxAttempts} attempts.`,
          );
          throw error;
        }
      }
    }
  }

  private async processChunk(chunk: CsvDebt[]): Promise<Debt[]> {
    const debts = chunk.map((data) => this.mapToDebtEntity(data));
    const processedDebts: Debt[] = [];

    for (const debt of debts) {
      if (await this.shouldSkipDebt(debt)) {
        continue;
      }

      const isSuccess = await this.processDebt(debt);
      if (isSuccess) {
        processedDebts.push(debt);
      }
    }

    if (processedDebts.length > 0) {
      await this.retrySave(processedDebts);
    }

    return processedDebts;
  }

  private mapToDebtEntity(data: CsvDebt): Debt {
    const debt = new Debt();
    debt.name = data['name'];
    debt.governmentId = data['governmentId'];
    debt.email = data['email'];
    debt.debtAmount = data['debtAmount'];
    debt.debtDueDate = new Date(data['debtDueDate']);
    debt.debtID = data['debtId'];
    return debt;
  }

  private async shouldSkipDebt(debt: Debt): Promise<boolean> {
    if (await this.isExistingDebt(debt)) {
      console.log(`Debt with ID ${debt.debtID} has already been processed.`);
      return true;
    }

    if (this.isInvalidDebtData(debt)) {
      console.error(
        `Invalid data for debt with ID ${debt.debtID}. Skipping...`,
      );
      return true;
    }

    if (!isUuid(debt.debtID)) {
      console.error(
        `Invalid UUID format for debt with ID ${debt.debtID}. Skipping...`,
      );
      return true;
    }

    return false;
  }

  private async isExistingDebt(debt: Debt): Promise<boolean> {
    const existingDebt = await this.debtRepository.findOne({
      where: { debtID: debt.debtID },
    });
    return existingDebt !== null;
  }

  private isInvalidDebtData(debt: Debt): boolean {
    return !debt.name || !debt.email || !debt.debtID || !debt.debtAmount;
  }

  private async retrySave(debts: Debt[], attempt: number = 1): Promise<void> {
    try {
      console.log(`Attempt ${attempt} to save debts:`, debts);
      await this.debtRepository.save(debts);
    } catch (error) {
      if (attempt < this.maxAttempts) {
        console.error(
          `Attempt ${attempt} to save debts failed: ${error.message}`,
        );
        await this.retrySave(debts, attempt + 1);
      } else {
        console.error(
          `Failed to save debts after ${this.maxAttempts} attempts.`,
        );
        throw error;
      }
    }
  }

  private async processDebt(debt: Debt): Promise<boolean> {
    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try {
        await this.emailService.sendEmail(debt);
        await this.bankPaymentService.sendPaymentSlip(debt);
        console.log(`Debt with ID ${debt.debtID} processed successfully.`);
        return true;
      } catch (error) {
        console.error(
          `Attempt ${attempt} to process debt with ID ${debt.debtID} failed: ${error.message}`,
        );

        if (attempt === this.maxAttempts) {
          console.error(
            `Failed to process debt with ID ${debt.debtID} after ${this.maxAttempts} attempts.`,
          );
        }
      }
    }
    return false;
  }
}
