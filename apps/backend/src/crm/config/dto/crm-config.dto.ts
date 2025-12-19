import { ApiProperty } from '@nestjs/swagger';

export class CreateCrmConfigDto {
  @ApiProperty({ description: '分類', example: 'shipping_method' })
  category!: string;

  @ApiProperty({ description: '代碼', example: 'EXPRESS' })
  code!: string;

  @ApiProperty({ description: '顯示名稱', example: '快遞' })
  label!: string;

  @ApiProperty({ description: '排序', required: false, example: 1 })
  displayOrder?: number;
}

export class UpdateCrmConfigDto {
  @ApiProperty({ description: '分類', required: false, example: 'shipping_method' })
  category?: string;

  @ApiProperty({ description: '代碼', required: false, example: 'EXPRESS' })
  code?: string;

  @ApiProperty({ description: '顯示名稱', required: false, example: '快遞' })
  label?: string;

  @ApiProperty({ description: '排序', required: false, example: 1 })
  displayOrder?: number;
}

