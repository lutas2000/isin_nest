import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsInt, IsEnum, MaxLength } from 'class-validator';
import { ProcessingStatus } from '../entities/processing.entity';

export class CreateProcessingDto {
  @ApiProperty({ description: '訂貨單工件 ID', example: 1 })
  @IsInt()
  orderItemId: number;

  @ApiProperty({ description: '加工類型代碼', example: 'LASER_CUT' })
  @IsString()
  @MaxLength(50)
  processingCode: string;

  @ApiProperty({ description: '是否委外', example: false, required: false })
  @IsBoolean()
  @IsOptional()
  isOutsourced?: boolean;

  @ApiProperty({
    description: '狀態',
    example: 'pending',
    enum: ProcessingStatus,
    required: false,
  })
  @IsEnum(ProcessingStatus)
  @IsOptional()
  status?: ProcessingStatus;

  @ApiProperty({ description: '委外廠商 ID', example: 1, required: false })
  @IsInt()
  @IsOptional()
  vendorId?: number;

  @ApiProperty({ description: '備註', example: '需要特別注意尺寸', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}
