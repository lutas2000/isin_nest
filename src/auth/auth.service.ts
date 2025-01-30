import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { User } from './entities/user.entity';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  // 模擬從資料庫檢索使用者
  private users: User[] = [
    {
      id: 1,
      username: 'admin',
      password: '$2b$10$TlgKIbE1B/JF.Qkq8T0h3OWV8D7C8h5lDEHT9HcKOfOrFq2bAf.km',
    }, // password = "123456"
  ];

  // 驗證使用者是否存在，並檢查密碼
  async validateUser(username: string, password: string): Promise<any> {
    const user = this.users.find((user) => user.username === username);
    if (!user) {
      return null;
    }
    const validate = await bcrypt.compare(password, user.password);
    if (user && validate) {
      return user;
    }
    return null;
  }

  // 簽發 JWT Token
  login(user: User) {
    const payload = { username: user.username, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload), // 簽發 JWT
    };
  }
}
