import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Processing, ProcessingStatus } from './entities/processing.entity';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { CreateProcessingDto } from './dto/create-processing.dto';
import { UpdateProcessingDto } from './dto/update-processing.dto';

@Injectable()
export class ProcessingService {
  constructor(
    @InjectRepository(Processing)
    private processingRepository: Repository<Processing>,
  ) {}

  async findAll(
    page?: number,
    limit?: number,
  ): Promise<PaginatedResponseDto<Processing>> {
    const pageNum = page ?? 1;
    const limitNum = limit ?? 50;
    const maxLimit = Math.min(limitNum, 100);
    const skip = (pageNum - 1) * maxLimit;

    const [data, total] = await this.processingRepository.findAndCount({
      relations: ['orderItem', 'vendor'],
      order: { createdAt: 'DESC' },
      take: maxLimit,
      skip,
    });

    return new PaginatedResponseDto(data, total, pageNum, maxLimit);
  }

  async findByOrderItemId(orderItemId: number): Promise<Processing[]> {
    return this.processingRepository.find({
      where: { orderItemId },
      relations: ['vendor'],
      order: { createdAt: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Processing> {
    const processing = await this.processingRepository.findOne({
      where: { id },
      relations: ['orderItem', 'vendor'],
    });

    if (!processing) {
      throw new NotFoundException(`加工 ID ${id} 不存在`);
    }

    return processing;
  }

  async create(createProcessingDto: CreateProcessingDto): Promise<Processing> {
    const processing = this.processingRepository.create(createProcessingDto);
    return this.processingRepository.save(processing);
  }

  async update(id: number, updateProcessingDto: UpdateProcessingDto): Promise<Processing> {
    const processing = await this.findOne(id);

    // 自動設定時間戳記
    if (updateProcessingDto.status === ProcessingStatus.IN_PROGRESS && !processing.startedAt) {
      processing.startedAt = new Date();
    }
    if (updateProcessingDto.status === ProcessingStatus.COMPLETED && !processing.completedAt) {
      processing.completedAt = new Date();
    }

    Object.assign(processing, updateProcessingDto);
    return this.processingRepository.save(processing);
  }

  async updateStatus(id: number, status: ProcessingStatus): Promise<Processing> {
    const processing = await this.findOne(id);
    
    processing.status = status;
    
    // 自動設定時間戳記
    if (status === ProcessingStatus.IN_PROGRESS && !processing.startedAt) {
      processing.startedAt = new Date();
    }
    if (status === ProcessingStatus.COMPLETED && !processing.completedAt) {
      processing.completedAt = new Date();
    }

    return this.processingRepository.save(processing);
  }

  async remove(id: number): Promise<void> {
    const processing = await this.findOne(id);
    await this.processingRepository.remove(processing);
  }

  async bulkCreate(orderItemId: number, processingCodes: string[]): Promise<Processing[]> {
    const processings = processingCodes.map((code) =>
      this.processingRepository.create({
        orderItemId,
        processingCode: code,
        isOutsourced: false,
        status: ProcessingStatus.PENDING,
      }),
    );
    return this.processingRepository.save(processings);
  }
}
