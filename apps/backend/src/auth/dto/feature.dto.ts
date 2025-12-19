import { ApiProperty } from '@nestjs/swagger';

export class CreateFeatureDto {
  @ApiProperty({ description: '功能名稱', example: 'crm' })
  name!: string;

  @ApiProperty({ description: '功能描述', required: false, example: '客戶關係管理' })
  description?: string;
}

