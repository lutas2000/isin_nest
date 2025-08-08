import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { UserInput } from './entities/user_input.entity';
import { ResetPasswordInput } from './entities/reset_password.entity';
import { UpdateUserInput } from './entities/update_user.entity';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AdminGuard } from './admin.guard';

@ApiTags('认证')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: '用户登录' })
  @ApiResponse({ status: 200, description: '登录成功，返回JWT token' })
  @ApiResponse({ status: 401, description: '用户名或密码错误' })
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

  @ApiOperation({ summary: '注册新用户（需要管理员权限）' })
  @ApiResponse({ status: 200, description: '用户注册成功' })
  @ApiResponse({ status: 401, description: '权限不足或注册失败' })
  @ApiBearerAuth('JWT-auth')
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

  @ApiOperation({ summary: '重设密码' })
  @ApiResponse({ status: 200, description: '密码重设成功' })
  @ApiResponse({ status: 401, description: '权限不足或重设失败' })
  @ApiBearerAuth('JWT-auth')
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

  @ApiOperation({ summary: '更新用户信息（需要管理员权限）' })
  @ApiResponse({ status: 200, description: '用户信息更新成功' })
  @ApiResponse({ status: 401, description: '权限不足或更新失败' })
  @ApiBearerAuth('JWT-auth')
  @Post('/update-user')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async updateUser(@Body() input: UpdateUserInput, @Request() req: any) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const currentUser = req.user; // 從 JWT 中獲取當前用戶資訊

      const updatedUser = await this.authService.updateUser(
        input.userName,
        {
          newUserName: input.newUserName,
          password: input.password,
          isAdmin: input.isAdmin,
          features: input.features,
          staffId: input.staffId,
        },
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        currentUser,
      );

      // 不回傳密碼
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password: _, ...userWithoutPassword } = updatedUser;

      return {
        message: '用戶資料更新成功',
        user: userWithoutPassword,
      };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : '用戶資料更新失敗';
      throw new UnauthorizedException(message);
    }
  }
}
