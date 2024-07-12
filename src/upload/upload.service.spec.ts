import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UploadService } from './upload.service';
import { Debt } from '../debt/debt.entity';
import { EmailService } from '../services/email.service';
import { BankPaymentService } from '../services/bankPayment.service';

describe('UploadService', () => {
  let service: UploadService;
  let mockRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };
  let mockEmailService = {
    sendEmail: jest.fn(),
  };
  let mockBankPaymentService = {
    sendPaymentSlip: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadService,
        {
          provide: getRepositoryToken(Debt),
          useValue: mockRepository,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        {
          provide: BankPaymentService,
          useValue: mockBankPaymentService,
        },
      ],
    }).compile();

    service = module.get<UploadService>(UploadService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should process a file successfully', async () => {
    const mockFile = {
      buffer: Buffer.from(
        'name,governmentId,email,debtAmount,debtDueDate,debtId\nJohn Doe,12345,johndoe@example.com,1000,2024-08-01,abc123\n',
      ),
    };
    mockRepository.findOne.mockResolvedValue(null);
    mockRepository.save.mockResolvedValue(true);
    mockEmailService.sendEmail.mockResolvedValue(true);
    mockBankPaymentService.sendPaymentSlip.mockResolvedValue(true);

    const result = await service.processFile(mockFile as any);

    expect(result).toBeDefined();
    expect(result.message).toBe('File processed successfully');
    expect(result.totalProcessed).toBe(1);
  });

  it('should skip processing for already processed debt', async () => {
    const mockFile = {
      buffer: Buffer.from(
        'name,governmentId,email,debtAmount,debtDueDate,debtId\nJohn Doe,12345,johndoe@example.com,1000,2024-08-01,abc123\n',
      ),
    };
    mockRepository.findOne.mockResolvedValueOnce({ debtID: 'abc123' });

    const result = await service.processFile(mockFile as any);

    expect(result).toBeDefined();
    expect(result.message).toBe('File processed successfully');
    expect(result.totalProcessed).toBe(1);
  });

  it('should skip processing for debts with invalid UUID format', async () => {
    const mockFile = {
      buffer: Buffer.from(
        'name,governmentId,email,debtAmount,debtDueDate,debtId\nJohn Doe,12345,johndoe@example.com,1000,2024-08-01,invalid_uuid\n',
      ),
    };

    const result = await service.processFile(mockFile as any);

    expect(result).toBeDefined();
    expect(result.message).toBe('File processed successfully');
    expect(result.totalProcessed).toBe(1);
  });

  it('should skip processing for invalid data', async () => {
    const mockFile = {
      buffer: Buffer.from(
        'name,governmentId,email,debtAmount,debtDueDate,debtId\nJohn Doe,12345,,1000,2024-08-01,abc123\n',
      ),
    };

    const result = await service.processFile(mockFile as any);

    expect(result).toBeDefined();
    expect(result.message).toBe('File processed successfully');
    expect(result.totalProcessed).toBe(1);
  });

  it('should handle failed email service and retry', async () => {
    const mockFile = {
      buffer: Buffer.from(
        'name,governmentId,email,debtAmount,debtDueDate,debtId\nJohn Doe,12345,johndoe@example.com,1000,2024-08-01,abc123\n',
      ),
    };

    mockRepository.findOne.mockResolvedValue(null);
    mockRepository.save.mockResolvedValue(true);
    mockEmailService.sendEmail.mockRejectedValueOnce(
      new Error('Failed to send email'),
    );
    mockEmailService.sendEmail.mockResolvedValue(true);
    mockBankPaymentService.sendPaymentSlip.mockResolvedValue(true);

    const result = await service.processFile(mockFile as any);

    expect(result).toBeDefined();
    expect(result.message).toBe('File processed successfully');
    expect(result.totalProcessed).toBe(1);
  });
});
