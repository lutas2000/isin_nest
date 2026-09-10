import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsNotEmpty, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateStaffLeaveDto {
  @ApiProperty({ example: 'A001' })
  @IsString()
  @IsNotEmpty()
  staff_id!: string;

  @ApiProperty({ example: '特休' })
  @IsString()
  @IsNotEmpty()
  type!: string;

  @ApiProperty({ example: '2024-06-01T09:00:00.000Z' })
  @Type(() => Date)
  @IsDate()
  start_time!: Date;

  @ApiProperty({ example: '2024-06-01T18:00:00.000Z' })
  @Type(() => Date)
  @IsDate()
  end_time!: Date;
}
