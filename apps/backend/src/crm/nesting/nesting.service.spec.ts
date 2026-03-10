/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { readFileSync } from 'fs';
import { promises as fs } from 'fs';
import { resolve } from 'path';
import { NestingService } from './nesting.service';
import { Nesting } from './entities/nesting.entity';
import { NestingItem } from './entities/nesting-item.entity';

describe('NestingService', () => {
  let service: NestingService;

  const nestingRepository = {
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const nestingItemRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    nestingRepository.create.mockImplementation((payload: Partial<Nesting>) => payload);
    nestingRepository.save.mockImplementation(async (payload: Partial<Nesting>) => payload);

    const queryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(0),
    };
    nestingRepository.createQueryBuilder.mockReturnValue(queryBuilder);

    nestingItemRepository.create.mockImplementation((payload: Partial<NestingItem>) => payload);
    nestingItemRepository.save.mockImplementation(async (payload: Partial<NestingItem>[]) => payload);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NestingService,
        {
          provide: getRepositoryToken(Nesting),
          useValue: nestingRepository,
        },
        {
          provide: getRepositoryToken(NestingItem),
          useValue: nestingItemRepository,
        },
      ],
    }).compile();

    service = module.get<NestingService>(NestingService);
  });

  describe('importFromDocx', () => {
    const meta = {
      orderId: 'ORD001',
      material: 'SUS304',
    };

    it('should throw NotFoundException when DOCX file buffer is missing', async () => {
      await expect(service.importFromDocx(undefined, meta)).rejects.toThrow(NotFoundException);
      await expect(service.importFromDocx({} as any, meta)).rejects.toThrow(NotFoundException);
    });

    const fixturePath =
      // process.env.NESTING_IMPORT_DOCX_TEST_FILE ||
      resolve(process.cwd(), 'tests/fixtures/nesting-import.docx');

    const testWithRealDocx = it;

    testWithRealDocx('should import data from a real DOCX file', async () => {
      const writeFileSpy = jest.spyOn(fs, 'writeFile').mockResolvedValue();
      const mkdirSpy = jest.spyOn(fs, 'mkdir').mockResolvedValue(undefined as any);

      const originalEnv = process.env.NESTING_PATH;
      process.env.NESTING_PATH = '/tmp/nesting-test';

      const fileBuffer = readFileSync(fixturePath);
      const result = await service.importFromDocx(
        { buffer: fileBuffer, originalname: 'DAQ8206E01.docx' },
        meta,
      );

      const now = new Date();
      const dateCode = `${now.getFullYear().toString().slice(-2)}${(now.getMonth() + 1)
        .toString()
        .padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}`;

      expect(result).toEqual(
        expect.objectContaining({
          id: 'DAQ8206E01',
          orderId: meta.orderId,
          material: meta.material,
        }),
      );
      expect(result.x).toBe(2415.6);
      expect(result.y).toBe(1194.3);

      const savedPayload = nestingRepository.save.mock.calls[0][0] as Partial<Nesting>;
      expect(savedPayload.orderId).toBe(meta.orderId);
      expect(savedPayload.material).toBe(meta.material);
      expect(savedPayload.thickness).toBe(2);

      const hasParsedSummaryField = [
        result.x,
        result.y,
        result.cutLength,
        result.lineLength,
        result.processingTime,
        result.utilization,
        result.weight,
        result.scrap,
      ].some((value) => value !== undefined);

      expect(hasParsedSummaryField).toBe(true);

      expect(mkdirSpy).toHaveBeenCalledWith('/tmp/nesting-test', { recursive: true });
      expect(writeFileSpy).toHaveBeenCalledWith(
        '/tmp/nesting-test/DAQ8206E01.docx',
        fileBuffer,
      );

      writeFileSpy.mockRestore();
      mkdirSpy.mockRestore();
      process.env.NESTING_PATH = originalEnv;
    });
  });
});
