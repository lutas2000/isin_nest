import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
  MinLength,
} from 'class-validator';
import {
  FEEDBACK_KINDS,
  FEEDBACK_STATUSES,
  FeedbackKind,
  FeedbackStatus,
} from '../entities/feedback-report.entity';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** POST /feedback（multipart/form-data）；截圖另以 `screenshot` 檔案欄位上傳。 */
export class CreateFeedbackDto {
  @ApiProperty({ enum: FEEDBACK_KINDS, example: 'bug' })
  @IsIn(FEEDBACK_KINDS, { message: '回報類型無效' })
  kind: FeedbackKind;

  @ApiProperty({ maxLength: 100, example: '出貨登錄存檔後畫面沒有更新' })
  @Transform(trim)
  @IsString()
  @MinLength(1, { message: '請輸入標題' })
  @MaxLength(100, { message: '標題最多 100 字' })
  title: string;

  @ApiProperty({ maxLength: 5000 })
  @Transform(trim)
  @IsString()
  @MinLength(1, { message: '請輸入描述' })
  @MaxLength(5000, { message: '描述最多 5000 字' })
  body: string;

  @ApiPropertyOptional({
    description:
      'JSON 字串：route、window（MDI 目前視窗）、entity_key、client_version、user_agent、screen、viewport；最多 4000 字',
  })
  @IsOptional()
  @IsString()
  @MaxLength(4000, { message: '回報內容資訊過長' })
  context?: string;
}

export class FeedbackQueryDto {
  @ApiPropertyOptional({ enum: FEEDBACK_STATUSES })
  @IsOptional()
  @IsIn(FEEDBACK_STATUSES, { message: '狀態無效' })
  status?: FeedbackStatus;

  @ApiPropertyOptional({ enum: FEEDBACK_KINDS })
  @IsOptional()
  @IsIn(FEEDBACK_KINDS, { message: '回報類型無效' })
  kind?: FeedbackKind;

  @ApiPropertyOptional({
    description: '處理者 users.id；`none` 表示尚未指派',
    example: 'none',
  })
  @IsOptional()
  @Matches(/^(none|\d{1,9})$/, { message: '處理者無效' })
  assignee?: string;

  @ApiPropertyOptional({ description: '標題或描述包含的文字' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({
    description: '回報日期起（台北，含）',
    example: '2026-10-01',
  })
  @IsOptional()
  @Matches(DATE, { message: '日期格式為 YYYY-MM-DD' })
  from?: string;

  @ApiPropertyOptional({
    description: '回報日期迄（台北，含）',
    example: '2026-10-31',
  })
  @IsOptional()
  @Matches(DATE, { message: '日期格式為 YYYY-MM-DD' })
  to?: string;

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

/** PATCH /feedback/:id：只送要改的欄位；assignee_user_id 或 resolution 送 null 表示清除。 */
export class UpdateFeedbackDto {
  @ApiPropertyOptional({ enum: FEEDBACK_STATUSES })
  @IsOptional()
  @IsIn(FEEDBACK_STATUSES, { message: '狀態無效' })
  status?: FeedbackStatus;

  @ApiPropertyOptional({ nullable: true, description: '處理者 users.id' })
  @IsOptional()
  @IsInt({ message: '處理者無效' })
  @Min(1, { message: '處理者無效' })
  assignee_user_id?: number | null;

  @ApiPropertyOptional({ nullable: true, maxLength: 5000 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(5000, { message: '處理結果最多 5000 字' })
  resolution?: string | null;
}
