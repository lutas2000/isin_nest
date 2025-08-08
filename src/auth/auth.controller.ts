import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserInput } from './entities/user_input.entity';
import { ResetPasswordInput } from './entities/reset_password.entity';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AdminGuard } from './admin.guard';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('/login')
  async login(@Body() input: UserInput) {
    const user = await this.authService.validateUser(
      input.userName,
      input.password,
    );

    if (!user) {
      throw new UnauthorizedException('Username or password is incorrect');
    }

    return this.authService.login(user);
  }

  @Post('/register')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async register(@Body() input: UserInput) {
    try {
      const user = await this.authService.createUser(
        input.userName,
        input.password,
        input.isAdmin,
        input.features,
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

  @Post('/reset-password')
  @UseGuards(JwtAuthGuard)
  async resetPassword(@Body() input: ResetPasswordInput, @Request() req: any) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const currentUser = req.user; // 從 JWT 中獲取當前用戶資訊

      const updatedUser = await this.authService.resetPassword(
        input.userName,
        input.newPassword,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        currentUser,
        input.oldPassword,
      );

      // 不回傳密碼
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password: _, ...userWithoutPassword } = updatedUser;

      return {
        message: '密碼重設成功',
        user: userWithoutPassword,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '密碼重設失敗';
      throw new UnauthorizedException(message);
    }
  }
}
