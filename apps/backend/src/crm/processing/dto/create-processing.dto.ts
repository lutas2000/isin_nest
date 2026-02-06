import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsInt, MaxLength } from 'class-validator';

export class CreateProcessingDto {
  @ApiProperty({ description: '加工名稱', example: '折彎' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: '廠商 ID（null 代表內部加工）', example: 1, required: false })
  @IsInt()
  @IsOptional()
  vendorId?: number;

  @ApiProperty({ description: '顯示順序', example: 1, required: false })
  @IsInt()
  @IsOptional()
  displayOrder?: number;

  @ApiProperty({ description: '是否啟用', example: true, required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
