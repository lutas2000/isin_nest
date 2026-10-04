import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { LEAVE_TYPES, LeaveType } from '../../payroll/domain/leave-types';

const WALL_CLOCK = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export class CreateStaffLeaveDto {
  @ApiProperty({ description: '員工姓名', example: '張三' })
  @IsString()
  @MaxLength(6)
  name!: string;

  @ApiProperty({ description: '假別（12 種，不含防疫假）', enum: LEAVE_TYPES, example: '特休' })
  @IsIn(LEAVE_TYPES as readonly string[])
  type!: LeaveType;

  @ApiProperty({ description: '開始時間（台北）', example: '2026-06-01 08:00' })
  @Matches(WALL_CLOCK, { message: 'start_time 必須是 YYYY-MM-DD HH:mm' })
  start_time!: string;

  @ApiProperty({ description: '結束時間（台北）；跨日會拆成每天一筆', example: '2026-06-02 17:00' })
  @Matches(WALL_CLOCK, { message: 'end_time 必須是 YYYY-MM-DD HH:mm' })
  end_time!: string;
}

export class UpdateStaffLeaveDto {
  @ApiPropertyOptional({ enum: LEAVE_TYPES })
  @IsOptional()
  @IsIn(LEAVE_TYPES as readonly string[])
  type?: LeaveType;

  @ApiPropertyOptional({ example: '2026-06-01 08:00' })
  @IsOptional()
  @Matches(WALL_CLOCK, { message: 'start_time 必須是 YYYY-MM-DD HH:mm' })
  start_time?: string;

  @ApiPropertyOptional({ example: '2026-06-01 17:00' })
  @IsOptional()
  @Matches(WALL_CLOCK, { message: 'end_time 必須是 YYYY-MM-DD HH:mm' })
  end_time?: string;
}

export class LeaveBalanceQueryDto {
  @ApiProperty({ example: '張三' })
  @IsString()
  @MaxLength(6)
  name!: string;

  @ApiPropertyOptional({ description: '基準日，預設今天（台北）', example: '2026-06-01' })
  @IsOptional()
  @Matches(DATE, { message: 'date 必須是 YYYY-MM-DD' })
  date?: string;
}

export class LeaveRangeQueryDto {
  @ApiProperty({ example: '2026-06-01' })
  @Matches(DATE, { message: 'start 必須是 YYYY-MM-DD' })
  start!: string;

  @ApiProperty({ example: '2026-06-30' })
  @Matches(DATE, { message: 'end 必須是 YYYY-MM-DD' })
  end!: string;

  @ApiPropertyOptional({ example: '張三' })
  @IsOptional()
  @IsString()
  @MaxLength(6)
  name?: string;
}
