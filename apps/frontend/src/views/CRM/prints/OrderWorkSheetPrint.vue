<template>
  <PrintContainer ref="printContainerRef">
    <CompanyHeader
      company-name="奕新雷射精機股份有限公司"
      document-title="工作單"
    />

    <div class="print-order-info">
      <div class="order-info-left">
        <div class="info-row">
          <span class="info-label">客戶名稱：</span>
          <span class="info-value">
            {{ customerName }}<template v-if="customerId"> ({{ customerId }})</template>
          </span>
        </div>
        <div class="info-row">
          <span class="info-label">訂單編號：</span>
          <span class="info-value">{{ orderId }}</span>
        </div>
      </div>
      <div class="order-info-right">
        <div class="info-row">
          <span class="info-label">日期：</span>
          <span class="info-value">{{ orderDate }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">備註：</span>
          <span class="info-value">{{ notes }}</span>
        </div>
      </div>
    </div>

    <div class="print-table-container">
      <table class="print-table">
        <thead>
          <tr>
            <th class="col-item">項次</th>
            <th class="col-drawing">圖號</th>
            <th class="col-material">材料</th>
            <th class="col-thickness">厚度</th>
            <th class="col-substitute">代料</th>
            <th class="col-quantity">數量</th>
            <th class="col-processing">後加工</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, index) in items" :key="item.id">
            <td class="col-item">{{ index + 1 }}</td>
            <td class="col-drawing">{{ item.cadFile || '-' }}</td>
            <td class="col-material">{{ item.material || '-' }}</td>
            <td class="col-thickness">{{ item.thickness ?? '-' }}</td>
            <td class="col-substitute">{{ item.substitute || '-' }}</td>
            <td class="col-quantity text-right">{{ formatInteger(item.quantity) }}</td>
            <td class="col-processing">{{ getProcessingNames(item.processingIds) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="cnc-preview-section">
      <table class="cnc-preview-table">
        <tbody>
          <tr>
            <td
              v-for="panel in previewPanels"
              :key="panel.itemIndex"
              class="cnc-preview-cell"
            >
              <div class="preview-panel">
                <div class="preview-index">{{ panel.itemIndex }}</div>
                <img
                  v-if="panel.imageDataUrl"
                  :src="panel.imageDataUrl"
                  alt="CNC preview"
                  class="preview-image"
                />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </PrintContainer>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import PrintContainer from '@/components/Print/PrintContainer.vue';
import CompanyHeader from '@/components/Print/CompanyHeader.vue';
import { getCompanyHeaderStyles } from '@/components/Print/printStyles';
import { formatRocDate, formatInteger } from '@/utils/formatters';
// dxf-viewer 沒有型別宣告，使用 any 承接
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
import { DxfViewer } from 'dxf-viewer';
// three 為 dxf-viewer 的相依套件，這裡只取色彩類別調整背景
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error 沒有額外安裝 three 的型別宣告
import { Color as ThreeColor } from 'three';
import {
  processingService,
  type Processing,
} from '@/services/crm/processing.service';
import { designWorkOrderService, type DesignWorkOrder } from '@/services/crm/design-work-order.service';
import { orderItemService, type WorkOrder, type WorkOrderItem } from '@/services/crm/order.service';

interface Props {
  workOrder: WorkOrder;
  items: WorkOrderItem[];
}

interface CncPreviewPanel {
  itemIndex: number;
  widthCm: number | null;
  heightCm: number | null;
  imageDataUrl: string | null;
}

const props = defineProps<Props>();

const allProcessings = ref<Processing[]>([]);
const printContainerRef =
  ref<InstanceType<typeof PrintContainer> | null>(null);
const designWorkOrdersByItemId = ref<Record<number, DesignWorkOrder>>({});
const previewSizeByItemId = ref<Record<number, { width: number | null; height: number | null; imageDataUrl: string | null }>>({});
const preparing = ref(false);

const customerName = computed(
  () =>
    props.workOrder.customer?.companyName ||
    props.workOrder.customer?.companyShortName ||
    '未指定',
);
const customerId = computed(() => props.workOrder.customer?.id);
const orderId = computed(() => props.workOrder.id);
const orderDate = computed(() => formatRocDate(props.workOrder.createdAt));
const notes = computed(() => props.workOrder.notes);

const previewItems = computed(() => props.items.slice(0, 7));

const previewPanels = computed<CncPreviewPanel[]>(() =>
  previewItems.value.map((item, index) => {
    const size = previewSizeByItemId.value[item.id];
    return {
      itemIndex: index + 1,
      widthCm: toRoundedCm(size?.width),
      heightCm: toRoundedCm(size?.height),
      imageDataUrl: size?.imageDataUrl || null,
    };
  }),
);

const toRoundedCm = (mmValue: number | null | undefined): number | null => {
  if (typeof mmValue !== 'number' || Number.isNaN(mmValue)) return null;
  return Math.round(mmValue / 10);
};

const getProcessingNames = (processingIds?: number[]) => {
  if (!processingIds || processingIds.length === 0) return '-';
  return processingIds
    .map(
      (id) => allProcessings.value.find((processing) => processing.id === id)?.name || `ID:${id}`,
    )
    .join('、');
};

const waitForAnimationFrames = (count: number) =>
  new Promise<void>((resolve) => {
    const step = (remaining: number) => {
      if (remaining <= 0) {
        resolve();
        return;
      }
      requestAnimationFrame(() => step(remaining - 1));
    };
    step(count);
  });

const convertCanvasToBlackOnWhiteDataUrl = (
  sourceCanvas: HTMLCanvasElement,
): string => {
  const width = sourceCanvas.width;
  const height = sourceCanvas.height;
  if (!width || !height) return sourceCanvas.toDataURL('image/png');

  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = width;
  outputCanvas.height = height;

  const outputCtx = outputCanvas.getContext('2d');
  if (!outputCtx) return sourceCanvas.toDataURL('image/png');

  // 先鋪白底，再把 DXF 畫面貼上去，最後做黑白二值化。
  outputCtx.fillStyle = '#ffffff';
  outputCtx.fillRect(0, 0, width, height);
  outputCtx.drawImage(sourceCanvas, 0, 0);

  const imageData = outputCtx.getImageData(0, 0, width, height);
  const { data } = imageData;
  const LUMINANCE_THRESHOLD = 245;
  const ALPHA_THRESHOLD = 8;

  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha < ALPHA_THRESHOLD) {
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
      data[i + 3] = 255;
      continue;
    }

    const luminance = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    const isWhite = luminance >= LUMINANCE_THRESHOLD;
    data[i] = isWhite ? 255 : 0;
    data[i + 1] = isWhite ? 255 : 0;
    data[i + 2] = isWhite ? 255 : 0;
    data[i + 3] = 255;
  }

  outputCtx.putImageData(imageData, 0, 0);
  return outputCanvas.toDataURL('image/png');
};

const renderDxfImageDataUrl = async (content: string): Promise<string | null> => {
  // 在隱形容器中用 dxf-viewer render DXF，之後抓 canvas 轉成圖片
  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.left = '-99999px';
  host.style.top = '0';
  host.style.width = '260px';
  host.style.height = '120px';
  host.style.pointerEvents = 'none';
  host.style.opacity = '0';
  document.body.appendChild(host);

  try {
    const viewer: any = new DxfViewer(host, {
      autoResize: false,
      clearColor: new ThreeColor('#ffffff'),
      clearAlpha: 1.0,
    });

    // dxf-viewer 目前只支援透過 URL 載入 DXF，這裡用 Blob 建立暫時的 object URL
    const dxfBlob = new Blob([content], { type: 'application/dxf' });
    const dxfUrl = URL.createObjectURL(dxfBlob);

    try {
      await viewer.Load({
        url: dxfUrl,
      });

      // 保留白底，讓 viewer 本身渲染穩定；黑線轉換改在輸出前的像素後處理。
    } finally {
      URL.revokeObjectURL(dxfUrl);
    }

    // 等待一兩個 frame，讓 three.js 把畫面 render 完
    await waitForAnimationFrames(2);

    // dxf-viewer 會在 container 裡面建立 canvas
    const canvas = host.querySelector('canvas') as HTMLCanvasElement | null;
    if (!canvas) {
      console.warn('DXF 預覽找不到 canvas');
      return null;
    }
    return convertCanvasToBlackOnWhiteDataUrl(canvas);
  } catch (err) {
    console.error('渲染 DXF 圖片失敗:', err);
    return null;
  } finally {
    host.remove();
  }
};

const loadAllProcessings = async () => {
  try {
    allProcessings.value = await processingService.getAllActive();
  } catch (err) {
    console.error('載入加工項目失敗:', err);
    allProcessings.value = [];
  }
};

const loadDesignWorkOrders = async () => {
  try {
    const records = await designWorkOrderService.getByOrderId(props.workOrder.id);
    const nextMap: Record<number, DesignWorkOrder> = {};
    for (const record of records) {
      if (!record.orderItemId) continue;
      if (!nextMap[record.orderItemId]) {
        nextMap[record.orderItemId] = record;
      }
    }
    designWorkOrdersByItemId.value = nextMap;
  } catch (err) {
    console.error('載入設計工作單失敗:', err);
    designWorkOrdersByItemId.value = {};
  }
};

const loadPreviewSizes = async () => {
  const previewEntries = previewItems.value;
  const nextMap: Record<number, { width: number | null; height: number | null; imageDataUrl: string | null }> = {};

  for (const item of previewEntries) {
    if (!item.cadFile?.trim()) {
      nextMap[item.id] = { width: null, height: null, imageDataUrl: null };
      continue;
    }
    try {
      const preview = await orderItemService.getDxfPreview(item.id);
      const imageDataUrl = await renderDxfImageDataUrl(preview.content);
      nextMap[item.id] = {
        // DXF 目前沒有計算寬高，先顯示為 null，只用圖形 preview
        width: null,
        height: null,
        imageDataUrl,
      };
    } catch (err) {
      console.error(`載入 DXF preview 失敗 (itemId=${item.id}):`, err);
      nextMap[item.id] = { width: null, height: null, imageDataUrl: null };
    }
  }
  previewSizeByItemId.value = nextMap;
};

const preparePrintData = async () => {
  if (preparing.value) return;
  preparing.value = true;
  try {
    await Promise.all([loadAllProcessings(), loadDesignWorkOrders()]);
    await loadPreviewSizes();
  } finally {
    preparing.value = false;
  }
};

const getOrderPrintStyles = (): string => {
  return `
    ${getCompanyHeaderStyles()}

    * {
      box-sizing: border-box;
    }

    .print-order-info {
      display: flex;
      justify-content: space-between;
      margin-bottom: 20px;
      font-size: 11pt;
    }

    .order-info-left,
    .order-info-right {
      flex: 1;
    }

    .info-row {
      margin-bottom: 5px;
    }

    .info-label {
      font-weight: 500;
    }

    .info-value {
      margin-left: 5px;
    }

    .print-table-container {
      margin-bottom: 14px;
    }

    .print-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10pt;
    }

    .print-table th,
    .print-table td {
      border: 1px solid #000;
      padding: 5px;
      text-align: left;
      vertical-align: top;
    }

    .print-table th {
      background-color: #f0f0f0;
      font-weight: bold;
      text-align: center;
    }

    .text-right {
      text-align: right;
    }

    .col-item {
      width: 7%;
      text-align: center;
    }

    .col-drawing {
      width: 20%;
    }

    .col-material {
      width: 12%;
    }

    .col-thickness {
      width: 8%;
      text-align: center;
    }

    .col-substitute {
      width: 8%;
      text-align: center;
    }

    .col-quantity {
      width: 8%;
    }

    .col-processing {
      width: 25%;
    }

    .cnc-preview-section {
      margin-top: 12px;
    }

    .cnc-preview-title {
      font-size: 10pt;
      font-weight: bold;
      margin-bottom: 6px;
    }

    .cnc-preview-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      direction: ltr;
      table-layout: fixed;
    }

    .cnc-preview-cell {
      border: 1px solid #000;
      height: 56px;
      padding: 0;
      direction: ltr;
      vertical-align: middle;
    }

    .preview-panel {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      height: 100%;
      font-size: 9pt;
      line-height: 1.2;
    }

    .preview-image {
      width: 100%;
      height: 70px;
      object-fit: contain;
    }

    .preview-index {
      font-weight: 700;
    }
  `;
};

const print = async () => {
  await preparePrintData();
  printContainerRef.value?.print({
    title: `工作單 - ${props.workOrder.id}`,
    styles: getOrderPrintStyles(),
  });
};

defineExpose({ print });
</script>

<style scoped src="@/components/Print/print-common.css"></style>
