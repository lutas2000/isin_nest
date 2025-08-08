import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserInput } from './entities/user_input.entity';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('/login')
  async login(@Body() input: UserInput) {
    const user = await this.authService.validateUser(
      input.username,
      input.password,
    );

    if (!user) {
      throw new UnauthorizedException('Username or password is incorrect');
    }

    return this.authService.login(user);
  }

  @Post('/register')
  async register(@Body() input: UserInput) {
    try {
      const user = await this.authService.createUser(
        input.username,
        input.password,
      );

      // 不回傳密碼
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password: _, ...userWithoutPassword } = user;
      return {
        message: '使用者註冊成功',
        user: userWithoutPassword,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '註冊失敗';
      throw new UnauthorizedException(message);
    }
  }
}
