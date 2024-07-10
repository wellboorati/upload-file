import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DebtRepository } from '../debt/debt.repository';
import { Debt } from '../debt/debt.entity';
import * as csvParser from 'csv-parser';
import { Stream } from 'stream';
import { EmailService } from '../services/email.service';
import { BankPaymentService } from '../services/bankPayment.service';
import { validate as isUuid } from 'uuid';
@Injectable()
export class UploadService {
  private readonly maxAttempts = 3;
  private readonly chunkSize = 500;
  constructor(
    @InjectRepository(Debt)
    private readonly debtRepository: DebtRepository,
    private readonly emailService: EmailService,
    private readonly bankPaymentService: BankPaymentService,
  ) {}
  async processFile(file: Express.Multer.File): Promise<any> {
    return new Promise((resolve, reject) => {
      const bufferStream = new Stream.PassThrough();
      bufferStream.end(file.buffer);
      const results = [];
      let chunk = [];
      let isProcessing = false;
      let isFirstChunk = true;
      const processingPromises = [];
      let errorOccurred = false;

      const headers = [
        'name',
        'governmentId',
        'email',
        'debtAmount',
        'debtDueDate',
        'debtId',
      ];
      bufferStream
        .pipe(csvParser({ headers }))
        .on('data', (data) => {
          if (isFirstChunk) {
            isFirstChunk = false;
            return;
          }
          chunk.push(data);
          if (chunk.length >= this.chunkSize) {
            bufferStream.pause();
            if (!isProcessing) {
              isProcessing = true;
              const processingPromise = this.processChunks(chunk, results)
                .then(() => {
                  chunk = [];
                  isProcessing = false;
                  bufferStream.resume();
                })
                .catch((error) => {
                  bufferStream.resume();
                  errorOccurred = true;
                  reject(`Failed to process chunk: ${error.message}`);
                });
              processingPromises.push(processingPromise);
            }
          }
        })
        .on('end', async () => {
          if (errorOccurred) {
            return;
          }
          if (chunk.length > 0) {
            const processingPromise = this.processChunks(chunk, results);
            processingPromises.push(processingPromise);
          }
          Promise.all(processingPromises)
            .then(() =>
              resolve({
                message: 'File processed successfully',
                data: results,
              }),
            )
            .catch((error) =>
              reject({
                message: 'Failed to process file',
                error: error.message,
              }),
            );
        })
        .on('error', (error) => {
          reject({ message: 'Failed to read file', error: error.message });
          bufferStream.end();
        });
    });
  }

  private async processChunks(chunk: any[], results: any[]): Promise<void> {
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
          throw error; // Throw the error after max attempts
        }
      }
    }
  }

  private async processChunk(chunk: any[]): Promise<Debt[]> {
    const debts = chunk.map((data) => {
      const debt = new Debt();
      debt.name = data['name'];
      debt.governmentId = data['governmentId'];
      debt.email = data['email'];
      debt.debtAmount = data['debtAmount'];
      debt.debtDueDate = new Date(data['debtDueDate']);
      debt.debtID = data['debtId'];
      return debt;
    });
    const processedDebts = [];
    for (const debt of debts) {
      const existingDebt = await this.debtRepository.findOne({
        where: { debtID: debt.debtID },
      });
      if (existingDebt) {
        console.log(`Debt with ID ${debt.debtID} has already been processed.`);
        continue;
      }
      if (!debt.name || !debt.email || !debt.debtID || !debt.debtAmount) {
        console.error(
          `Invalid data for debt with ID ${debt.debtID}. Skipping...`,
        );
        continue;
      }
      if (!isUuid(debt.debtID)) {
        console.error(
          `Invalid UUID format for debt with ID ${debt.debtID}. Skipping...`,
        );
        continue;
      }
      const success = await this.processDebt(debt);
      if (success) {
        processedDebts.push(debt);
      }
    }
    if (processedDebts.length > 0) {
      await this.retrySave(processedDebts);
    }
    return processedDebts;
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
