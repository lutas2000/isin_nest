import { onBeforeUnmount, onMounted, type Ref } from 'vue';

/**
 * 回報與紀錄查詢視窗開著時，鍵盤只給這個視窗：視窗內的按鍵由元素上的 @keydown 處理並停止傳遞；
 * 焦點不在視窗內（例如按鈕停用後焦點回到 body）的按鍵在這裡攔下，交給同一個 handler，
 * 不讓後面表單的 F5～F7、查詢 R 等快捷鍵作用。
 */
export function useLegacyModalKeys(
  layer: Ref<HTMLElement | null>,
  handle: (event: KeyboardEvent) => void,
): void {
  const onKey = (event: KeyboardEvent) => {
    if (layer.value?.contains(event.target as Node)) return;
    event.stopPropagation();
    handle(event);
  };
  onMounted(() => window.addEventListener('keydown', onKey, true));
  onBeforeUnmount(() => window.removeEventListener('keydown', onKey, true));
}
