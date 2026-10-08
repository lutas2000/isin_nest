import { RequestMethod, UseGuards, applyDecorators } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { ApiBearerAuth } from '@nestjs/swagger';
import {
  FEATURE_PERMISSION_KEY,
  FeaturePermissionMetadata,
} from '../../auth/decorators/feature-permission.decorator';
import { PermissionType } from '../../auth/entities/user-feature.entity';
import { FeatureGuard } from '../../auth/guards/feature.guard';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

/**
 * 新版 CRM 暫不使用，現行為舊版銷管 `legacy-crm`（LEGACY-CRM-REBUILD-PLAN.md 第 6 節）。
 * 所有新版 CRM API 需要 `crm_v2` 功能權限；這個功能不由 migration 或啟動流程建立，
 * 也不在 `features.config.ts` 的可授權清單，所以除了 admin（FeatureGuard 直接放行）沒有人能用。
 * 要重新啟用時由 admin 在權限設定授權 `crm_v2`，前端另以 `VITE_CRM_V2_ENABLED` 開啟畫面。
 */
export const CRM_V2_FEATURE = 'crm_v2';

const READ_METHODS = new Set<RequestMethod>([
  RequestMethod.GET,
  RequestMethod.HEAD,
]);

/**
 * 新版 CRM controller 的 class decorator：登入（JwtAuthGuard）＋ 功能權限（FeatureGuard）。
 * FeatureGuard 只讀方法上的 `@RequireFeature`，所以這裡逐一替每個路由方法補上
 * `crm_v2`：GET／HEAD 要 read，其餘要 write。方法上已明寫 `@RequireFeature` 的以明寫為準。
 * class decorator 在方法 decorator 之後執行，路由 metadata 此時已經存在。
 */
export function CrmV2Controller(): ClassDecorator {
  const guards = applyDecorators(
    UseGuards(JwtAuthGuard, FeatureGuard),
    ApiBearerAuth('JWT-auth'),
  );
  return (target) => {
    guards(target);
    const prototype = target.prototype as Record<string, unknown>;
    for (const key of Object.getOwnPropertyNames(prototype)) {
      if (key === 'constructor') continue;
      const handler: unknown = Object.getOwnPropertyDescriptor(
        prototype,
        key,
      )?.value;
      if (typeof handler !== 'function') continue;
      if (Reflect.getMetadata(PATH_METADATA, handler) === undefined) continue;
      if (Reflect.hasMetadata(FEATURE_PERMISSION_KEY, handler)) continue;
      const method = Reflect.getMetadata(
        METHOD_METADATA,
        handler,
      ) as RequestMethod;
      const metadata: FeaturePermissionMetadata = {
        feature: CRM_V2_FEATURE,
        permission: READ_METHODS.has(method)
          ? PermissionType.READ
          : PermissionType.WRITE,
      };
      Reflect.defineMetadata(FEATURE_PERMISSION_KEY, metadata, handler);
    }
  };
}
