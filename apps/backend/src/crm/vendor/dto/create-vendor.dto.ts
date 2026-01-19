import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength } from 'class-validator';

export class CreateVendorDto {
  @ApiProperty({ description: '廠商名稱', example: '永順加工廠' })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiProperty({ description: '聯絡人', example: '王先生', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  contactName?: string;

  @ApiProperty({ description: '電話', example: '02-1234-5678', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  phone?: string;

  @ApiProperty({ description: '地址', example: '台北市中山區中山北路一段100號', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  address?: string;

  @ApiProperty({ description: '備註', example: '專做電鍍加工', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}
