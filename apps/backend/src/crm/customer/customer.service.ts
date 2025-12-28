import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from './entities/customer.entity';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';

@Injectable()
export class CustomerService {
  constructor(
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
  ) {}

  async findAll(
    page?: number,
    limit?: number,
    search?: string,
  ): Promise<Customer[] | PaginatedResponseDto<Customer>> {
    // 使用預設值：page=1, limit=50
    const pageNum = page ?? 1;
    const limitNum = limit ?? 50;

    // 限制最大每頁筆數
    const maxLimit = Math.min(limitNum, 100);
    const skip = (pageNum - 1) * maxLimit;

    // 建立查詢建構器
    const queryBuilder = this.customerRepository
      .createQueryBuilder('customer')
      .leftJoinAndSelect('customer.contacts', 'contacts')
      .orderBy('customer.createdAt', 'DESC');

    // 如果有搜尋關鍵字，添加搜尋條件
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      // 使用 CONVERT 將 id 欄位轉換為 utf8mb4，因為 id 欄位可能是 latin1 charset
      // 這樣可以避免 collation 衝突，同時支援中文搜尋
      queryBuilder.where(
        '(CONVERT(customer.id USING utf8mb4) LIKE :search OR customer.companyName LIKE :search OR customer.companyShortName LIKE :search)',
        { search: searchTerm },
      );
    }

    // 執行分頁查詢
    const [data, total] = await queryBuilder
      .take(maxLimit)
      .skip(skip)
      .getManyAndCount();

    return new PaginatedResponseDto(data, total, pageNum, maxLimit);
  }

  findOne(id: string): Promise<Customer | null> {
    return this.customerRepository.findOne({
      where: { id },
      relations: ['contacts', 'quotes', 'workOrders'],
    });
  }

  async create(customer: Partial<Customer>): Promise<Customer> {
    const newCustomer = this.customerRepository.create(customer);
    return this.customerRepository.save(newCustomer);
  }

  async remove(id: string): Promise<void> {
    await this.customerRepository.delete(id);
  }

  async update(id: string, customer: Partial<Customer>): Promise<Customer | null> {
    const existingCustomer = await this.customerRepository.findOneBy({ id });
    if (existingCustomer) {
      Object.assign(existingCustomer, customer);
      return this.customerRepository.save(existingCustomer);
    }
    return null;
  }
}

