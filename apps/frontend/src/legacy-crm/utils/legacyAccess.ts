import { computed, type ComputedRef, type Ref } from 'vue';
import { useAuthStore } from '../../stores/auth';

/** 舊版銷管以 `crm` 功能控管（規劃第 8 節）：read 可查詢、瀏覽、列印；write 才能新增、修改、刪除。 */
export const LEGACY_CRM_FEATURE = 'crm';

/** 只有 read 的使用者：新增、更新、刪除、更改編號停用，欄位不可編輯，狀態列顯示「唯讀」。 */
export function useLegacyReadOnly(): ComputedRef<boolean> {
  const auth = useAuthStore();
  return computed(() => !auth.hasFeature(LEGACY_CRM_FEATURE, 'write'));
}

/**
 * 交易表單欄位的鎖定屬性（`v-bind`）。可以編輯時不加；不能編輯時 `disabled`，
 * 和 isin_vb6 相同。唯讀使用者看單據時改用 `readonly`：欄位仍可聚焦，明細的
 * F1、F11 秀圖、F12 交易歷史照常可用，但不能改內容。
 */
export function useLegacyFieldLock(
  editable: Ref<boolean>,
  mode: Ref<string>,
): ComputedRef<{ disabled: boolean } | { readonly: true }> {
  const readOnly = useLegacyReadOnly();
  return computed(() =>
    readOnly.value && mode.value === 'edit'
      ? { readonly: true }
      : { disabled: !editable.value },
  );
}
