import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewStaffLeaveDto {
  @ApiProperty({ required: false, example: '已確認代理人安排' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;
}
