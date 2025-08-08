import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserInput } from './entities/user_input.entity';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('/login')
  async login(@Body() input: UserInput) {
    // 验证用户身份
    const user = await this.authService.validateUser(
      input.username,
      input.password,
    );

    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 验证成功，返回JWT token
    return this.authService.login(user);
  }
}
