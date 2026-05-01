import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

export enum SalesStatisticsView {
  VOUCHER = 'voucher',
  ITEM = 'item',
}

export class SalesStatisticsQueryDto {
  @ApiPropertyOptional({
    description: '統計視角',
    enum: SalesStatisticsView,
    default: SalesStatisticsView.VOUCHER,
  })
  @IsOptional()
  @IsEnum(SalesStatisticsView)
  view?: SalesStatisticsView = SalesStatisticsView.VOUCHER;

  @ApiPropertyOptional({
    description: '年月（格式 YYYY-MM）',
    example: '2026-04',
  })
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'yearMonth 格式必須為 YYYY-MM',
  })
  yearMonth?: string;

  @ApiPropertyOptional({
    description: '客戶 ID',
    example: 'CUST001',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  customerId?: string;

  @ApiPropertyOptional({
    description: '備註關鍵字',
    example: '急件',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  notes?: string;

  @ApiPropertyOptional({
    description: '頁碼（預設 1）',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: '每頁筆數（預設 50，最大 100）',
    example: 50,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;
}

export class SalesStatisticsRowDto {
  @ApiProperty({ enum: SalesStatisticsView })
  view: SalesStatisticsView;

  @ApiProperty({ description: '銷貨單 ID' })
  voucherId: string;

  @ApiPropertyOptional({ description: '銷貨明細 ID（item 視角時有值）' })
  itemId?: number | null;

  @ApiProperty({ description: '客戶 ID' })
  customerId: string;

  @ApiPropertyOptional({ description: '客戶名稱（簡稱優先）' })
  customerName?: string;

  @ApiPropertyOptional({ description: '備註' })
  notes?: string;

  @ApiPropertyOptional({ description: '金額（voucher: 未稅合計；item: 明細小計）' })
  amount?: number | null;

  @ApiPropertyOptional({ description: '稅額（voucher 視角有值）' })
  tax?: number | null;

  @ApiPropertyOptional({ description: '含稅總額（voucher 視角有值）' })
  totalAmount?: number | null;

  @ApiPropertyOptional({ description: '數量（item 視角有值）' })
  quantity?: number | null;

  @ApiPropertyOptional({ description: '單價（item 視角有值）' })
  unitPrice?: number | null;

  @ApiPropertyOptional({ description: '來源（item 視角有值）' })
  source?: string | null;

  @ApiProperty({ description: '建立時間' })
  createdAt: Date;
}
