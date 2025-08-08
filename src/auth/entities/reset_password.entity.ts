import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordInput {
  @ApiProperty({
    description: '用户名',
    example: 'admin',
  })
  userName!: string;

  @ApiProperty({
    description: '新密码',
    example: 'newPassword123',
  })
  newPassword!: string;

  @ApiProperty({
    description: '旧密码（一般用户需要提供，管理员不需要）',
    required: false,
    example: 'oldPassword123',
  })
  oldPassword?: string; // 一般用戶需要提供舊密碼，管理員則不需要
}
