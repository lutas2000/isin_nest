import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Feature } from './entities/feature.entity';
import { CreateFeatureDto } from './dto/feature.dto';

@Injectable()
export class FeatureService {
  constructor(
    @InjectRepository(Feature)
    private readonly featureRepository: Repository<Feature>,
  ) {}

  async findAll() {
    return this.featureRepository.find({
      order: { name: 'ASC' },
    });
  }

  async create(createDto: CreateFeatureDto) {
    const existing = await this.featureRepository.findOne({
      where: { name: createDto.name },
    });

    if (existing) {
      throw new Error('功能名稱已存在');
    }

    const feature = this.featureRepository.create({
      name: createDto.name,
      description: createDto.description,
    });

    return this.featureRepository.save(feature);
  }
}

