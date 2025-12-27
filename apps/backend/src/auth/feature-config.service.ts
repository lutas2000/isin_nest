import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FeatureConfig } from './entities/feature-config.entity';
import { FeaturePermission } from './entities/feature-permission.entity';
import { Feature } from './entities/feature.entity';
import {
  CreateFeatureConfigDto,
  UpdateFeatureConfigDto,
} from './dto/feature-config.dto';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';

@Injectable()
export class FeatureConfigService {
  constructor(
    @InjectRepository(FeatureConfig)
    private readonly featureConfigRepository: Repository<FeatureConfig>,
    @InjectRepository(FeaturePermission)
    private readonly featurePermissionRepository: Repository<FeaturePermission>,
    @InjectRepository(Feature)
    private readonly featureRepository: Repository<Feature>,
  ) {}

  async findAll(
    page?: number,
    limit?: number,
  ): Promise<FeatureConfig[] | PaginatedResponseDto<FeatureConfig>> {
    // 使用預設值：page=1, limit=50
    const pageNum = page ?? 1;
    const limitNum = limit ?? 50;

    // 限制最大每頁筆數
    const maxLimit = Math.min(limitNum, 100);
    const skip = (pageNum - 1) * maxLimit;

    const [data, total] = await this.featureConfigRepository.findAndCount({
      relations: ['permissions', 'permissions.feature'],
      order: { jobTitle: 'ASC' },
      take: maxLimit,
      skip: skip,
    });

    return new PaginatedResponseDto(data, total, pageNum, maxLimit);
  }

  async findOne(id: number) {
    return this.featureConfigRepository.findOne({
      where: { id },
      relations: ['permissions', 'permissions.feature'],
    });
  }

  async create(createDto: CreateFeatureConfigDto) {
    const featureConfig = this.featureConfigRepository.create({
      jobTitle: createDto.jobTitle,
      description: createDto.description,
    });

    const savedConfig = await this.featureConfigRepository.save(featureConfig);

    // 處理權限
    if (createDto.permissions && createDto.permissions.length > 0) {
      await this.updatePermissions(savedConfig.id, createDto.permissions);
    }

    return this.findOne(savedConfig.id);
  }

  async update(id: number, updateDto: UpdateFeatureConfigDto) {
    const featureConfig = await this.featureConfigRepository.findOne({
      where: { id },
    });

    if (!featureConfig) {
      throw new Error('職稱設定不存在');
    }

    if (updateDto.jobTitle !== undefined) {
      featureConfig.jobTitle = updateDto.jobTitle;
    }
    if (updateDto.description !== undefined) {
      featureConfig.description = updateDto.description;
    }

    await this.featureConfigRepository.save(featureConfig);

    // 處理權限
    if (updateDto.permissions !== undefined) {
      await this.updatePermissions(id, updateDto.permissions);
    }

    return this.findOne(id);
  }

  async remove(id: number) {
    const featureConfig = await this.featureConfigRepository.findOne({
      where: { id },
    });

    if (!featureConfig) {
      throw new Error('職稱設定不存在');
    }

    await this.featureConfigRepository.remove(featureConfig);
    return { message: '職稱設定已刪除' };
  }

  private async updatePermissions(
    configId: number,
    permissions: Array<{ feature: string; permission: string }>,
  ) {
    // 刪除現有權限
    await this.featurePermissionRepository.delete({
      featureConfig: { id: configId },
    });

    // 創建新權限
    for (const perm of permissions) {
      let feature = await this.featureRepository.findOne({
        where: { name: perm.feature },
      });

      if (!feature) {
        feature = this.featureRepository.create({ name: perm.feature });
        feature = await this.featureRepository.save(feature);
      }

      const featurePermission = this.featurePermissionRepository.create({
        featureConfig: { id: configId },
        feature: feature,
        permission: perm.permission as any,
      });

      await this.featurePermissionRepository.save(featurePermission);
    }
  }
}

