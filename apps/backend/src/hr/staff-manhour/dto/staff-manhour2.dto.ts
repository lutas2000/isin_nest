import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

const WALL_CLOCK = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export class Manhour2QueryDto {
  @ApiPropertyOptional({ example: '張三' })
  @IsOptional()
  @IsString()
  @MaxLength(6)
  name?: string;

  @ApiPropertyOptional({ description: '起日（台北）', example: '2026-06-01' })
  @IsOptional()
  @Matches(DATE, { message: 'from 必須是 YYYY-MM-DD' })
  from?: string;

  @ApiPropertyOptional({ description: '迄日（台北）', example: '2026-06-30' })
  @IsOptional()
  @Matches(DATE, { message: 'to 必須是 YYYY-MM-DD' })
  to?: string;
}

export class CreateManhour2Dto {
  @ApiProperty({ example: '張三' })
  @IsString()
  @MaxLength(5)
  name!: string;

  @ApiProperty({ description: '開始時間（台北）', example: '2026-06-01 08:00' })
  @Matches(WALL_CLOCK, { message: 'start_time 必須是 YYYY-MM-DD HH:mm' })
  start_time!: string;

  @ApiPropertyOptional({ description: '結束時間（台北）；可先空白', example: '2026-06-01 17:00' })
  @IsOptional()
  @Matches(WALL_CLOCK, { message: 'end_time 必須是 YYYY-MM-DD HH:mm' })
  end_time?: string;
}

export class UpdateManhour2Dto {
  @ApiPropertyOptional({ example: '2026-06-01 08:00' })
  @IsOptional()
  @Matches(WALL_CLOCK, { message: 'start_time 必須是 YYYY-MM-DD HH:mm' })
  start_time?: string;

  @ApiPropertyOptional({ example: '2026-06-01 17:00', nullable: true })
  @IsOptional()
  @Matches(WALL_CLOCK, { message: 'end_time 必須是 YYYY-MM-DD HH:mm' })
  end_time?: string | null;
}

export class CopyManhourDto {
  @ApiProperty({ example: '張三' })
  @IsString()
  @MaxLength(5)
  name!: string;

  @ApiProperty({ example: '2026-06-01' })
  @Matches(DATE, { message: 'from 必須是 YYYY-MM-DD' })
  from!: string;

  @ApiProperty({ example: '2026-06-30' })
  @Matches(DATE, { message: 'to 必須是 YYYY-MM-DD' })
  to!: string;
}
