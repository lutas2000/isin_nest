import { computed, type ComputedRef } from 'vue';
import { useAuthStore } from '../../stores/auth';

/** 舊版銷管以 `crm` 功能控管（規劃第 8 節）：read 可查詢、瀏覽、列印；write 才能新增、修改、刪除。 */
export const LEGACY_CRM_FEATURE = 'crm';

/** 只有 read 的使用者：新增、更新、刪除、更改編號停用，欄位不可編輯，狀態列顯示「唯讀」。 */
export function useLegacyReadOnly(): ComputedRef<boolean> {
  const auth = useAuthStore();
  return computed(() => !auth.hasFeature(LEGACY_CRM_FEATURE, 'write'));
}
