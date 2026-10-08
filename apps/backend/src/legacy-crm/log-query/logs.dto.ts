import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() || undefined : value;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export const WRITE_ACTIONS = [
  'create',
  'update',
  'delete',
  'rename',
  'import',
] as const;
export const PRINT_KINDS = [
  'document_preview',
  'document_print',
  'report_query',
  'report_print',
  'statement_print',
] as const;

/** 兩種紀錄共用的條件：日期（台北，含起迄）、使用者、單號、分頁。 */
class LogQueryBase {
  @ApiPropertyOptional({
    description: '日期起（台北，含）',
    example: '2026-10-01',
  })
  @IsOptional()
  @Matches(DATE, { message: '日期格式為 YYYY-MM-DD' })
  from?: string;

  @ApiPropertyOptional({
    description: '日期迄（台北，含）',
    example: '2026-10-31',
  })
  @IsOptional()
  @Matches(DATE, { message: '日期格式為 YYYY-MM-DD' })
  to?: string;

  @ApiPropertyOptional({
    description: '使用者：帳號或員工姓名（部分相符）、員工編號，或 users.id',
  })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(40)
  user?: string;

  @ApiPropertyOptional({ description: '單號／編號（開頭相符）' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(60)
  entity_key?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 50, maximum: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  page_size?: number;
}

export class WriteLogQueryDto extends LogQueryBase {
  @ApiPropertyOptional({ description: 'order_document、partner…' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(40)
  entity_type?: string;

  @ApiPropertyOptional({ enum: WRITE_ACTIONS })
  @IsOptional()
  @IsIn(WRITE_ACTIONS, { message: '動作無效' })
  action?: string;
}

export class PrintLogQueryDto extends LogQueryBase {
  @ApiPropertyOptional({ enum: PRINT_KINDS })
  @IsOptional()
  @IsIn(PRINT_KINDS, { message: '種類無效' })
  kind?: string;

  @ApiPropertyOptional({ description: '單據種類或報表代碼' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(40)
  target?: string;
}
