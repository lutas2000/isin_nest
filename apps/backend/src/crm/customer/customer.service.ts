import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from './entities/customer.entity';

@Injectable()
export class CustomerService {
  constructor(
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
  ) {}

  findAll(): Promise<Customer[]> {
    return this.customerRepository.find({
      relations: ['contacts'],
    });
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

