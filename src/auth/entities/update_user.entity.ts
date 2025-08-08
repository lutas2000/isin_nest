import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserInput {
  @ApiProperty({
    description: '要更新的用户名',
    example: 'admin',
  })
  userName!: string; // 要更新的用戶名稱

  @ApiProperty({
    description: '新的用户名',
    required: false,
    example: 'newAdmin',
  })
  newUserName?: string; // 新的用戶名稱

  @ApiProperty({
    description: '新密码',
    required: false,
    example: 'newPassword123',
  })
  password?: string; // 新密碼

  @ApiProperty({
    description: '是否为管理员',
    required: false,
    example: true,
  })
  isAdmin?: boolean; // 是否為管理員

  @ApiProperty({
    description: '功能权限列表',
    required: false,
    type: [String],
    example: ['feature1', 'feature2'],
  })
  features?: string[]; // 功能權限

  @ApiProperty({
    description: '关联的员工ID',
    required: false,
    example: 'STAFF001',
  })
  staffId?: string; // 關聯的員工 ID
}
