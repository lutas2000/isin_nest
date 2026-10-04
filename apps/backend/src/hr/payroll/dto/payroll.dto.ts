import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { ManualWageFields, PayrollVariant } from '../domain/types';

export const PAYROLL_VARIANTS: PayrollVariant[] = ['official', 'foreign', 'fake'];
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class PayrollPeriodDto {
  @ApiProperty({ description: '期間起日', example: '2026-06-01' })
  @IsString()
  @Matches(DATE_PATTERN, { message: 'start 必須是 YYYY-MM-DD' })
  start!: string;

  @ApiProperty({ description: '期間迄日', example: '2026-06-30' })
  @IsString()
  @Matches(DATE_PATTERN, { message: 'end 必須是 YYYY-MM-DD' })
  end!: string;

  @ApiProperty({ enum: PAYROLL_VARIANTS, example: 'official' })
  @IsIn(PAYROLL_VARIANTS)
  variant!: PayrollVariant;

  @ApiPropertyOptional({
    description: '要計算的部門；省略時依 variant 使用舊報表預設部門',
    example: ['銷管部', '生產部'],
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @MaxLength(4, { each: true })
  departments?: string[];
}

/** 每人手動欄位，以姓名為鍵；欄位可只給部分。 */
export type ManualWageMap = Record<string, Partial<ManualWageFields>>;

export class PreviewPayrollDto extends PayrollPeriodDto {
  @ApiPropertyOptional({
    description: '每人手動欄位（獎金、特休加、特休減、借支、其他代扣、稅金代扣），以姓名為鍵',
    example: { 張三: { bonus: 1000, advance: 500 } },
  })
  @IsOptional()
  @IsObject()
  manual?: ManualWageMap;
}

export class CreatePayrollRunDto extends PreviewPayrollDto {}

export class UpdatePayrollManualDto {
  @ApiProperty({
    description: '要更新的手動欄位，以姓名為鍵；只覆寫給定的欄位',
    example: { 張三: { bonus: 1000 } },
  })
  @IsObject()
  manual!: ManualWageMap;
}

export class QueryPayrollRunsDto {
  @ApiPropertyOptional({ description: '期間起日（精確比對）', example: '2026-06-01' })
  @IsOptional()
  @Matches(DATE_PATTERN, { message: 'start 必須是 YYYY-MM-DD' })
  start?: string;

  @ApiPropertyOptional({ enum: PAYROLL_VARIANTS })
  @IsOptional()
  @IsIn(PAYROLL_VARIANTS)
  variant?: PayrollVariant;

  @ApiPropertyOptional({ example: '生產部' })
  @IsOptional()
  @IsString()
  @MaxLength(4)
  department?: string;

  @ApiPropertyOptional({ enum: ['draft', 'final'] })
  @IsOptional()
  @IsIn(['draft', 'final'])
  status?: 'draft' | 'final';

  @ApiPropertyOptional({ description: '最多回傳筆數，預設 100', example: 100 })
  @IsOptional()
  @IsInt()
  limit?: number;
}
