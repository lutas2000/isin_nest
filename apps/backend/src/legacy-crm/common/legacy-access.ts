import {
  applyDecorators,
  createParamDecorator,
  ExecutionContext,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { randomUUID } from 'crypto';
import { RequireFeature } from '../../auth/decorators/feature-permission.decorator';
import { PermissionType } from '../../auth/entities/user-feature.entity';
import { FeatureGuard } from '../../auth/guards/feature.guard';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { LegacyErrorInterceptor } from './legacy-errors';

/** 舊版銷管以 `crm` 功能控管：read 可查詢、瀏覽、列印；write 可新增、修改、刪除。 */
export const LEGACY_CRM_FEATURE = 'crm';

/** 整個 controller：登入、功能權限、錯誤轉換。各方法再標 LegacyRead／LegacyWrite。 */
export function LegacyController(): ClassDecorator {
  return applyDecorators(
    UseGuards(JwtAuthGuard, FeatureGuard),
    UseInterceptors(LegacyErrorInterceptor),
    ApiBearerAuth('JWT-auth'),
  ) as ClassDecorator;
}

export const LegacyRead = () =>
  RequireFeature(LEGACY_CRM_FEATURE, PermissionType.READ);
export const LegacyWrite = () =>
  RequireFeature(LEGACY_CRM_FEATURE, PermissionType.WRITE);

/** 寫入紀錄需要的請求資訊。 */
export interface LegacyRequestContext {
  userId: number | null;
  requestId: string;
  client: {
    ip: string | null;
    userAgent: string | null;
    frontendVersion: string | null;
  };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const LegacyContext = createParamDecorator(
  (_data: unknown, context: ExecutionContext): LegacyRequestContext => {
    const request = context.switchToHttp().getRequest();
    const header = (name: string) => {
      const value = request.headers?.[name];
      return typeof value === 'string' ? value.slice(0, 200) : null;
    };
    const requestId = header('x-request-id');
    return {
      userId: request.user?.id ?? null,
      // 前端帶的 X-Request-Id 必須是 UUID（write_log.request_id 為 uuid 欄），否則自己產生。
      requestId: requestId && UUID.test(requestId) ? requestId : randomUUID(),
      client: {
        ip: request.ip ?? null,
        userAgent: header('user-agent'),
        frontendVersion: header('x-client-version'),
      },
    };
  },
);
