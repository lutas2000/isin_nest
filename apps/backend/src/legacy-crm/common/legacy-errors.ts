import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  NotFoundException,
} from '@nestjs/common';
import { catchError, Observable, throwError } from 'rxjs';
import { LegacyValidationError } from './legacy-validation.error';

/** 找不到資料；訊息同 isin_vb6。 */
export class LegacyNotFoundError extends Error {
  constructor(message = '找不到指定資料') {
    super(message);
    this.name = 'LegacyNotFoundError';
  }
}

/** 主檔表單「資料新增」遇到已有的編號時，舊版顯示的訊息（Win7 2026-10-08）。 */
export const MASTER_DUPLICATE = '資料重覆。';

/** 主鍵或唯一鍵重複（PostgreSQL 23505）時換成 isin_vb6 的訊息。 */
export function rethrowUnique(error: unknown, message: string): never {
  const code =
    (error as { code?: string; driverError?: { code?: string } })?.driverError
      ?.code ?? (error as { code?: string })?.code;
  if (code === '23505') throw new LegacyValidationError(message);
  throw error;
}

/** 舊版的驗證與找不到錯誤轉成 400／404，交給全域 exception filter 記錄與回應。 */
@Injectable()
export class LegacyErrorInterceptor implements NestInterceptor {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    return next.handle().pipe(
      catchError((error) => {
        if (error instanceof LegacyValidationError)
          return throwError(() => new BadRequestException(error.message));
        if (error instanceof LegacyNotFoundError)
          return throwError(() => new NotFoundException(error.message));
        return throwError(() => error);
      }),
    );
  }
}
