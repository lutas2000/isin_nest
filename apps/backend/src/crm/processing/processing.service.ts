import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Processing } from './entities/processing.entity';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { CreateProcessingDto } from './dto/create-processing.dto';
import { UpdateProcessingDto } from './dto/update-processing.dto';

// 預設加工類型 seed data
const DEFAULT_PROCESSINGS = [
  { name: '雷射切割', displayOrder: 0 },
  { name: '折彎', displayOrder: 1 },
  { name: '焊接', displayOrder: 2 },
  { name: '研磨', displayOrder: 3 },
  { name: '烤漆', displayOrder: 4 },
  { name: '電鍍', displayOrder: 5 },
  { name: '攻牙', displayOrder: 6 },
  { name: '鑽孔', displayOrder: 7 },
  { name: '組裝', displayOrder: 8 },
  { name: '其他', displayOrder: 99 },
];

@Injectable()
export class ProcessingService implements OnModuleInit {
  constructor(
    @InjectRepository(Processing)
    private processingRepository: Repository<Processing>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seedDefaults();
  }

  /**
   * 初始化預設加工類型
   */
  private async seedDefaults(): Promise<void> {
    const count = await this.processingRepository.count();
    if (count > 0) {
      return; // 已有資料，不需要 seed
    }

    const processings = DEFAULT_PROCESSINGS.map((item) =>
      this.processingRepository.create({
        name: item.name,
        displayOrder: item.displayOrder,
        // 不指定 vendorId，預設為內部加工（資料庫層會存成 NULL）
        isActive: true,
      }),
    );

    await this.processingRepository.save(processings);
  }

  async findAll(
    page?: number,
    limit?: number,
    includeInactive?: boolean,
  ): Promise<PaginatedResponseDto<Processing>> {
    const pageNum = page ?? 1;
    const limitNum = limit ?? 50;
    const maxLimit = Math.min(limitNum, 100);
    const skip = (pageNum - 1) * maxLimit;

    const where = includeInactive ? {} : { isActive: true };

    const [data, total] = await this.processingRepository.findAndCount({
      where,
      order: { displayOrder: 'ASC', name: 'ASC' },
      take: maxLimit,
      skip,
    });

    return new PaginatedResponseDto(data, total, pageNum, maxLimit);
  }

  /**
   * 取得所有加工類型（不分頁，用於下拉選單）
   */
  async findAllActive(): Promise<Processing[]> {
    return this.processingRepository.find({
      where: { isActive: true },
      relations: ['vendor'],
      order: { displayOrder: 'ASC', name: 'ASC' },
    });
  }

  /**
   * 根據多個 ID 查詢
   */
  async findByIds(ids: number[]): Promise<Processing[]> {
    if (!ids || ids.length === 0) {
      return [];
    }
    return this.processingRepository.find({
      where: ids.map((id) => ({ id })),
      relations: ['vendor'],
      order: { displayOrder: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Processing> {
    const processing = await this.processingRepository.findOne({
      where: { id },
      relations: ['vendor'],
    });

    if (!processing) {
      throw new NotFoundException(`加工項目 ID ${id} 不存在`);
    }

    return processing;
  }

  async create(createProcessingDto: CreateProcessingDto): Promise<Processing> {
    const processing = this.processingRepository.create(createProcessingDto);
    return this.processingRepository.save(processing);
  }

  async update(id: number, updateProcessingDto: UpdateProcessingDto): Promise<Processing> {
    const processing = await this.findOne(id);
    Object.assign(processing, updateProcessingDto);
    return this.processingRepository.save(processing);
  }

  async remove(id: number): Promise<void> {
    const processing = await this.findOne(id);
    await this.processingRepository.remove(processing);
  }

  /**
   * 軟刪除（設為非啟用）
   */
  async deactivate(id: number): Promise<Processing> {
    const processing = await this.findOne(id);
    processing.isActive = false;
    return this.processingRepository.save(processing);
  }

  /**
   * 重新啟用
   */
  async activate(id: number): Promise<Processing> {
    const processing = await this.findOne(id);
    processing.isActive = true;
    return this.processingRepository.save(processing);
  }
}
