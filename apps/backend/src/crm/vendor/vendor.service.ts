import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vendor } from './entities/vendor.entity';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';

@Injectable()
export class VendorService {
  constructor(
    @InjectRepository(Vendor)
    private vendorRepository: Repository<Vendor>,
  ) {}

  async findAll(
    page?: number,
    limit?: number,
    search?: string,
  ): Promise<PaginatedResponseDto<Vendor>> {
    const pageNum = page ?? 1;
    const limitNum = limit ?? 50;
    const maxLimit = Math.min(limitNum, 100);
    const skip = (pageNum - 1) * maxLimit;

    const queryBuilder = this.vendorRepository
      .createQueryBuilder('vendor')
      .orderBy('vendor.name', 'ASC');

    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      queryBuilder.where(
        '(vendor.name ILIKE :search OR vendor.contactName ILIKE :search)',
        { search: searchTerm },
      );
    }

    const [data, total] = await queryBuilder
      .take(maxLimit)
      .skip(skip)
      .getManyAndCount();

    return new PaginatedResponseDto(data, total, pageNum, maxLimit);
  }

  async findAllWithoutPagination(): Promise<Vendor[]> {
    return this.vendorRepository.find({
      order: { name: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Vendor> {
    const vendor = await this.vendorRepository.findOne({
      where: { id },
    });

    if (!vendor) {
      throw new NotFoundException(`廠商 ID ${id} 不存在`);
    }

    return vendor;
  }

  async create(createVendorDto: CreateVendorDto): Promise<Vendor> {
    const vendor = this.vendorRepository.create(createVendorDto);
    return this.vendorRepository.save(vendor);
  }

  async update(id: number, updateVendorDto: UpdateVendorDto): Promise<Vendor> {
    const vendor = await this.findOne(id);
    Object.assign(vendor, updateVendorDto);
    return this.vendorRepository.save(vendor);
  }

  async remove(id: number): Promise<void> {
    const vendor = await this.findOne(id);
    await this.vendorRepository.remove(vendor);
  }
}
