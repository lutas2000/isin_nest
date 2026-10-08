import type { InjectionKey, Ref } from 'vue';

// 訂單登錄 F2「建立工件圖檔」opens 工件建檔 at 新增 with the row's fields; the
// shell provides the draft and the function that opens it.
export interface PartDraft {
  id: number;
  values: Record<string, unknown>;
}

export const PART_DRAFT_KEY: InjectionKey<Ref<PartDraft | null>> =
  Symbol('legacy-part-draft');
export const OPEN_PART_DRAFT_KEY: InjectionKey<
  (values: Record<string, unknown>) => void
> = Symbol('legacy-open-part-draft');
