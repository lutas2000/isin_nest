import { ApiProperty } from '@nestjs/swagger';

export class PaginatedResponseDto<T> {
  @ApiProperty({ description: '數據列表' })
  data: T[];

  @ApiProperty({ description: '總筆數', example: 100 })
  total: number;

  @ApiProperty({ description: '當前頁碼', example: 1 })
  page: number;

  @ApiProperty({ description: '每頁筆數', example: 50 })
  limit: number;

  @ApiProperty({ description: '總頁數', example: 2 })
  totalPages: number;

  constructor(data: T[], total: number, page: number, limit: number) {
    this.data = data;
    this.total = total;
    this.page = page;
    this.limit = limit;
    this.totalPages = Math.ceil(total / limit);
  }
}

