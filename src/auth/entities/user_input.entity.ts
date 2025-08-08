import { ApiProperty } from '@nestjs/swagger';

export class UserInput {
  @ApiProperty({
    description: '用户名',
    example: 'admin',
  })
  userName!: string;

  @ApiProperty({
    description: '密码',
    example: 'password123',
  })
  password!: string;

  @ApiProperty({
    description: '是否为管理员',
    required: false,
    example: false,
  })
  isAdmin?: boolean;

  @ApiProperty({
    description: '用户功能权限列表',
    required: false,
    type: [String],
    example: ['feature1', 'feature2'],
  })
  features?: string[];
}
