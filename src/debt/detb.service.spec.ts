import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DebtService } from './debt.service';
import { Debt } from './debt.entity';

describe('DebtService', () => {
  let service: DebtService;
  let mockRepository = {
    clear: jest.fn(),
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DebtService,
        {
          provide: getRepositoryToken(Debt),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<DebtService>(DebtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('deleteAll', () => {
    it('should call debtRepository.clear', async () => {
      await service.deleteAll();
      expect(mockRepository.clear).toHaveBeenCalled();
    });

    it('should log "Deleting all debts"', async () => {
      console.log = jest.fn();
      await service.deleteAll();
      expect(console.log).toHaveBeenCalledWith('Deleting all debts');
    });
  });

  describe('getAll', () => {
    it('should call debtRepository.find and return the result', async () => {
      const mockDebts = [
        { id: 1, name: 'Debt 1' },
        { id: 2, name: 'Debt 2' },
      ];
      mockRepository.find.mockResolvedValue(mockDebts);

      const result = await service.getAll();
      expect(mockRepository.find).toHaveBeenCalled();
      expect(result).toEqual(mockDebts);
    });

    it('should return an empty array if no debts are found', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await service.getAll();
      expect(mockRepository.find).toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });
});
