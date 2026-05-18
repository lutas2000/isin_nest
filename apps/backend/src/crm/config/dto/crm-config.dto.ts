import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, Length } from 'class-validator';

export class CreateCrmConfigDto {
  @ApiProperty({ description: '分類', example: 'shipping_method' })
  category!: string;

  @ApiProperty({ description: '快捷鍵代碼（單一字元）', example: 'E' })
  @Length(1, 1, { message: '代碼必須為單一字元' })
  code!: string;

  @ApiProperty({ description: '顯示名稱', example: '快遞' })
  label!: string;

  @ApiProperty({ description: '排序', required: false, example: 1 })
  displayOrder?: number;
}

export class UpdateCrmConfigDto {
  @ApiProperty({ description: '分類', required: false, example: 'shipping_method' })
  category?: string;

  @ApiProperty({ description: '快捷鍵代碼（單一字元）', required: false, example: 'E' })
  @IsOptional()
  @Length(1, 1, { message: '代碼必須為單一字元' })
  code?: string;

  @ApiProperty({ description: '顯示名稱', required: false, example: '快遞' })
  label?: string;

  @ApiProperty({ description: '排序', required: false, example: 1 })
  displayOrder?: number;
}

