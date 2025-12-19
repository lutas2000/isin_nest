import { ApiProperty } from '@nestjs/swagger';

export class FeaturePermissionDto {
  @ApiProperty({ description: '功能名稱', example: 'crm' })
  feature!: string;

  @ApiProperty({ description: '權限類型', example: 'read', enum: ['read', 'write'] })
  permission!: string;
}

export class CreateFeatureConfigDto {
  @ApiProperty({ description: '工作組別', example: 'A組' })
  workGroup!: string;

  @ApiProperty({ description: '描述', required: false, example: 'A組的預設權限' })
  description?: string;

  @ApiProperty({
    description: '權限列表',
    required: false,
    type: [FeaturePermissionDto],
    example: [
      { feature: 'crm', permission: 'read' },
      { feature: 'hr', permission: 'write' },
    ],
  })
  permissions?: FeaturePermissionDto[];
}

export class UpdateFeatureConfigDto {
  @ApiProperty({ description: '工作組別', required: false, example: 'A組' })
  workGroup?: string;

  @ApiProperty({ description: '描述', required: false, example: 'A組的預設權限' })
  description?: string;

  @ApiProperty({
    description: '權限列表',
    required: false,
    type: [FeaturePermissionDto],
  })
  permissions?: FeaturePermissionDto[];
}

