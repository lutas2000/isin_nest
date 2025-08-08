import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { User } from './entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  // 驗證使用者是否存在，並檢查密碼（從資料庫）
  async validateUser(username: string, password: string): Promise<User | null> {
    const user = await this.userRepository.findOne({
      where: { username },
    });

    if (!user) {
      return null;
    }

    // 比較提供的密碼與資料庫中儲存的雜湊密碼
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (isPasswordValid) {
      return user;
    }

    return null;
  }

  // 建立新使用者，密碼以雜湊形式儲存
  async createUser(username: string, password: string): Promise<User> {
    // 檢查使用者是否已存在
    const existingUser = await this.userRepository.findOne({
      where: { username },
    });

    if (existingUser) {
      throw new Error('使用者已存在');
    }

    // 產生鹽值並雜湊密碼
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 建立新使用者物件
    const newUser = this.userRepository.create({
      username,
      password: hashedPassword,
    });

    // 儲存到資料庫
    return await this.userRepository.save(newUser);
  }

  // 簽發 JWT Token
  login(user: User) {
    const payload = { username: user.username, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload), // 簽發 JWT
    };
  }
}
