import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contact } from './entities/contact.entity';

@Injectable()
export class ContactService {
  constructor(
    @InjectRepository(Contact)
    private contactRepository: Repository<Contact>,
  ) {}

  findAll(): Promise<Contact[]> {
    return this.contactRepository.find({
      relations: ['customer'],
    });
  }

  findOne(id: number): Promise<Contact | null> {
    return this.contactRepository.findOne({
      where: { id },
      relations: ['customer'],
    });
  }

  findByCustomerId(customerId: string): Promise<Contact[]> {
    return this.contactRepository.find({
      where: { customerId },
      relations: ['customer'],
    });
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

