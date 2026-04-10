import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

/** 建立銷貨單時可帶入的明細（欄位對齊 order_item） */
export class CreateSalesVoucherItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cadFile?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerFile?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  material?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  thickness?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  quantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  substitute?: string;

  @ApiPropertyOptional()
  @IsString()
  source!: string;

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  processingIds?: number[];

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  unitPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  drawingNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateSalesVoucherDto {
  @ApiPropertyOptional({ description: '若提供則從該訂單複製表頭與明細' })
  @IsOptional()
  @IsString()
  sourceOrderId?: string;

  @ApiPropertyOptional({ description: '手動建立時必填（除非使用 sourceOrderId）' })
  @IsOptional()
  @IsString()
  staffId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shippingMethod?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: '稅金額，預設 0' })
  @IsOptional()
  @IsNumber()
  tax?: number;

  @ApiPropertyOptional({ description: '手動關聯訂單（不複製明細時使用）' })
  @IsOptional()
  @IsString()
  orderId?: string | null;

  @ApiPropertyOptional({ type: [CreateSalesVoucherItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSalesVoucherItemDto)
  items?: CreateSalesVoucherItemDto[];
}
