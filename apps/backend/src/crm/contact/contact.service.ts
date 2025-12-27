import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contact } from './entities/contact.entity';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';

@Injectable()
export class ContactService {
  constructor(
    @InjectRepository(Contact)
    private contactRepository: Repository<Contact>,
  ) {}

  async findAll(
    page?: number,
    limit?: number,
    search?: string,
  ): Promise<Contact[] | PaginatedResponseDto<Contact>> {
    // 使用預設值：page=1, limit=50
    const pageNum = page ?? 1;
    const limitNum = limit ?? 50;

    // 限制最大每頁筆數
    const maxLimit = Math.min(limitNum, 100);
    const skip = (pageNum - 1) * maxLimit;

    // 建立查詢建構器
    const queryBuilder = this.contactRepository
      .createQueryBuilder('contact')
      .leftJoinAndSelect('contact.customer', 'customer')
      .orderBy('contact.createdAt', 'DESC');

    // 如果有搜尋關鍵字，添加搜尋條件
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      queryBuilder.where(
        '(contact.name LIKE :search OR customer.companyName LIKE :search OR customer.companyShortName LIKE :search)',
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

  findOne(id: number): Promise<Contact | null> {
    return this.contactRepository.findOne({
      where: { id },
      relations: ['customer'],
    });
  }

  async findByCustomerId(
    customerId: string,
    page?: number,
    limit?: number,
    search?: string,
  ): Promise<Contact[] | PaginatedResponseDto<Contact>> {
    // 使用預設值：page=1, limit=50
    const pageNum = page ?? 1;
    const limitNum = limit ?? 50;

    // 限制最大每頁筆數
    const maxLimit = Math.min(limitNum, 100);
    const skip = (pageNum - 1) * maxLimit;

    // 建立查詢建構器
    const queryBuilder = this.contactRepository
      .createQueryBuilder('contact')
      .leftJoinAndSelect('contact.customer', 'customer')
      .where('contact.customerId = :customerId', { customerId })
      .orderBy('contact.createdAt', 'DESC');

    // 如果有搜尋關鍵字，添加搜尋條件
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      queryBuilder.andWhere('contact.name LIKE :search', { search: searchTerm });
    }

    // 執行分頁查詢
    const [data, total] = await queryBuilder
      .take(maxLimit)
      .skip(skip)
      .getManyAndCount();

    return new PaginatedResponseDto(data, total, pageNum, maxLimit);
  }

  async create(contact: Partial<Contact>): Promise<Contact> {
    const newContact = this.contactRepository.create(contact);
    return this.contactRepository.save(newContact);
  }

  async remove(id: number): Promise<void> {
    await this.contactRepository.delete(id);
  }

  async update(id: number, contact: Partial<Contact>): Promise<Contact | null> {
    const existingContact = await this.contactRepository.findOneBy({ id });
    if (existingContact) {
      Object.assign(existingContact, contact);
      return this.contactRepository.save(existingContact);
    }
    return null;
  }
}

