import { ApiProperty } from '@nestjs/swagger';
import { PermissionType } from '../entities/user-feature.entity';

/**
 * JWT Payload 型別定義
 */
export class JwtPayload {
  userName: string;
  sub: string;
}

/**
 * Feature 權限輸入
 */
export class FeaturePermissionInput {
  @ApiProperty({
    description: '功能名稱',
    example: 'crm',
  })
  feature!: string;

  @ApiProperty({
    description: '權限類型：read 或 write',
    enum: PermissionType,
    example: PermissionType.READ,
  })
  permission!: PermissionType;
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
    type: [FeaturePermissionInput],
    example: [
      { feature: 'crm', permission: 'read' },
      { feature: 'hr', permission: 'write' },
    ],
  })
  features?: FeaturePermissionInput[];
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
    type: [FeaturePermissionInput],
    example: [
      { feature: 'crm', permission: 'read' },
      { feature: 'hr', permission: 'write' },
    ],
  })
  features?: FeaturePermissionInput[];
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

/**
 * 創建用戶和員工輸入
 */
export class CreateUserWithStaffInput {
  @ApiProperty({
    description: '用戶名',
    example: 'staff001',
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
    description: '員工姓名',
    example: '張三',
  })
  name!: string;

  @ApiProperty({
    description: '職稱',
    required: false,
    example: '工程師',
  })
  post?: string;

  @ApiProperty({
    description: '工作組別（用於自動分配預設權限）',
    required: false,
    example: 'A組',
  })
  work_group?: string;

  @ApiProperty({
    description: '部門',
    required: false,
    example: '技術部',
  })
  department?: string;

  @ApiProperty({
    description: '本薪',
    required: false,
    example: 50000,
  })
  wage?: number;

  @ApiProperty({
    description: '勤務津貼',
    required: false,
    example: 5000,
  })
  allowance?: number;

  @ApiProperty({
    description: '幹部加給',
    required: false,
    example: 3000,
  })
  organizer?: number;

  @ApiProperty({
    description: '勞保',
    required: false,
    example: 2000,
  })
  labor_insurance?: number;

  @ApiProperty({
    description: '健保',
    required: false,
    example: 1500,
  })
  health_insurance?: number;

  @ApiProperty({
    description: '退休提撥',
    required: false,
    example: 3000,
  })
  pension?: number;

  @ApiProperty({
    description: '是否為外勞',
    required: false,
    example: false,
  })
  is_foreign?: boolean;

  @ApiProperty({
    description: '是否參加福委會',
    required: false,
    example: true,
  })
  benifit?: boolean;

  @ApiProperty({
    description: '是否需要打卡',
    required: false,
    example: true,
  })
  need_check?: boolean;

  @ApiProperty({
    description: '到職日期',
    required: false,
    example: '2023-01-01',
  })
  begain_work?: Date;

  @ApiProperty({
    description: '離職日期',
    required: false,
    example: '2024-12-31',
  })
  stop_work?: Date;

  @ApiProperty({
    description: '是否需要外帳',
    required: false,
    example: false,
  })
  have_fake?: boolean;
}

