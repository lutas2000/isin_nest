import { ApiProperty } from '@nestjs/swagger';

/**
 * JWT Payload 型別定義
 */
export class JwtPayload {
  userName: string;
  sub: string;
}

/**
 * 登入/註冊輸入
 */
export class UserInput {
  @ApiProperty({
    description: '用戶名',
    example: 'admin',
  })
  userName!: string;

  @ApiProperty({
    description: '密碼',
    example: 'password123',
  })
  password!: string;

  @ApiProperty({
    description: '是否為管理員',
    required: false,
    example: false,
  })
  isAdmin?: boolean;

  @ApiProperty({
    description: '用戶功能權限列表',
    required: false,
    type: [String],
    example: ['feature1', 'feature2'],
  })
  features?: string[];
}

/**
 * 更新用戶輸入
 */
export class UpdateUserInput {
  @ApiProperty({
    description: '要更新的用戶名',
    example: 'admin',
  })
  userName!: string;

  @ApiProperty({
    description: '新的用戶名',
    required: false,
    example: 'newAdmin',
  })
  newUserName?: string;

  @ApiProperty({
    description: '新密碼',
    required: false,
    example: 'newPassword123',
  })
  password?: string;

  @ApiProperty({
    description: '是否為管理員',
    required: false,
    example: true,
  })
  isAdmin?: boolean;

  @ApiProperty({
    description: '功能權限列表',
    required: false,
    type: [String],
    example: ['feature1', 'feature2'],
  })
  features?: string[];
}

/**
 * 重設密碼輸入
 */
export class ResetPasswordInput {
  @ApiProperty({
    description: '用戶名',
    example: 'admin',
  })
  userName!: string;

  @ApiProperty({
    description: '新密碼',
    example: 'newPassword123',
  })
  newPassword!: string;

  @ApiProperty({
    description: '舊密碼（一般用戶需要提供，管理員不需要）',
    required: false,
    example: 'oldPassword123',
  })
  oldPassword?: string;
}

