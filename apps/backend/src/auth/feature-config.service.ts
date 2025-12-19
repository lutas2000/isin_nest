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

  async findAll() {
    return this.featureConfigRepository.find({
      relations: ['permissions', 'permissions.feature'],
      order: { workGroup: 'ASC' },
    });
  }

  async findOne(id: number) {
    return this.featureConfigRepository.findOne({
      where: { id },
      relations: ['permissions', 'permissions.feature'],
    });
  }

  async create(createDto: CreateFeatureConfigDto) {
    const featureConfig = this.featureConfigRepository.create({
      workGroup: createDto.workGroup,
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
      throw new Error('工作組別設定不存在');
    }

    if (updateDto.workGroup !== undefined) {
      featureConfig.workGroup = updateDto.workGroup;
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
      throw new Error('工作組別設定不存在');
    }

    await this.featureConfigRepository.remove(featureConfig);
    return { message: '工作組別設定已刪除' };
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

