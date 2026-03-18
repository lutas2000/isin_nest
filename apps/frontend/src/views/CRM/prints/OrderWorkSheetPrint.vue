<template>
  <PrintContainer>
    <CompanyHeader
      company-name="奕新雷射精機股份有限公司"
      document-title="工作單"
    />

    <div class="print-order-info">
      <div class="order-info-left">
        <div class="info-row">
          <span class="info-label">公司名稱：</span>
          <span class="info-value">
            {{ customerName }}<template v-if="customerId"> ({{ customerId }})</template>
          </span>
        </div>
      </div>
      <div class="order-info-right">
        <div class="info-row">
          <span class="info-label">訂單編號：</span>
          <span class="info-value">{{ orderId }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">日期：</span>
          <span class="info-value">{{ orderDate }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">業務：</span>
          <span class="info-value">{{ handler }}</span>
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
      <div class="cnc-preview-title">CNC Preview</div>
      <table class="cnc-preview-table">
        <tbody>
          <tr>
            <td
              v-for="panel in previewPanels"
              :key="panel.itemIndex"
              class="cnc-preview-cell"
            >
              <div class="preview-panel">
                <img
                  v-if="panel.imageDataUrl"
                  :src="panel.imageDataUrl"
                  alt="CNC preview"
                  class="preview-image"
                />
                <div class="preview-index">項次 {{ panel.itemIndex }}</div>
                <div class="preview-size">
                  {{ formatSizeCm(panel.widthCm, panel.heightCm) }}
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </PrintContainer>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import PrintContainer from '@/components/Print/PrintContainer.vue';
import CompanyHeader from '@/components/Print/CompanyHeader.vue';
import { getCompanyHeaderStyles } from '@/components/Print/printStyles';
import { formatRocDate, formatInteger } from '@/utils/formatters';
// dxf-viewer 沒有型別宣告，使用 any 承接
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
import { DxfViewer } from 'dxf-viewer';
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
const handler = computed(() => props.workOrder.staff?.name || '未知');

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

const formatSizeCm = (
  widthCm: number | null,
  heightCm: number | null,
): string => {
  if (widthCm === null || heightCm === null) return '-';
  return `${widthCm} x ${heightCm} cm`;
};

const getProcessingNames = (processingIds?: number[]) => {
  if (!processingIds || processingIds.length === 0) return '-';
  return processingIds
    .map(
      (id) => allProcessings.value.find((processing) => processing.id === id)?.name || `ID:${id}`,
    )
    .join('、');
};

const escapeHtml = (value: string | number | null | undefined) => {
  const raw = String(value ?? '');
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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
    });

    // dxf-viewer 支援字串內容，這裡直接傳入
    await viewer.load({
      name: 'preview.dxf',
      data: content,
    });

    // 等待一兩個 frame，讓 three.js 把畫面 render 完
    await waitForAnimationFrames(2);

    // dxf-viewer 會在 container 裡面建立 canvas
    const canvas = host.querySelector('canvas') as HTMLCanvasElement | null;
    if (!canvas) {
      console.warn('DXF 預覽找不到 canvas');
      return null;
    }

    return canvas.toDataURL('image/png');
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

    body {
      margin: 0;
      padding: 0;
      font-family: 'Microsoft JhengHei', '微軟正黑體', Arial, sans-serif;
      font-size: 12pt;
      color: #000;
      background: #fff;
    }

    .print-container {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      padding: 15mm 20mm;
      background: #fff;
    }

    @media print {
      @page {
        size: A4;
        margin: 0;
      }

      .print-container {
        width: 100%;
        min-height: 100vh;
        margin: 0;
      }
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
      border-spacing: 4px;
      direction: rtl;
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
      gap: 4px;
      font-size: 9pt;
      line-height: 1.2;
      padding: 4px;
    }

    .preview-image {
      width: 100%;
      height: 70px;
      object-fit: contain;
      border-bottom: 1px dashed #777;
      padding-bottom: 2px;
    }

    .preview-index {
      font-weight: 700;
    }
  `;
};

const buildPrintHtml = (): string => {
  const tableRows = props.items
    .map((item, index) => {
      return `
        <tr>
          <td class="col-item">${index + 1}</td>
          <td class="col-drawing">${escapeHtml(item.cadFile || '-')}</td>
          <td class="col-material">${escapeHtml(item.material || '-')}</td>
          <td class="col-thickness">${escapeHtml(item.thickness ?? '-')}</td>
          <td class="col-substitute">${escapeHtml(item.substitute || '-')}</td>
          <td class="col-quantity text-right">${escapeHtml(formatInteger(item.quantity))}</td>
          <td class="col-processing">${escapeHtml(getProcessingNames(item.processingIds))}</td>
        </tr>
      `;
    })
    .join('');

  const previewCells = previewPanels.value
    .map((panel) => {
      const imageHtml = panel.imageDataUrl
        ? `<img src="${panel.imageDataUrl}" alt="CNC preview" class="preview-image" />`
        : '';
      return `
        <td class="cnc-preview-cell">
          <div class="preview-panel">
            ${imageHtml}
            <div class="preview-index">項次 ${panel.itemIndex}</div>
            <div class="preview-size">${escapeHtml(formatSizeCm(panel.widthCm, panel.heightCm))}</div>
          </div>
        </td>
      `;
    })
    .join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>工作單 - ${escapeHtml(props.workOrder.id)}</title>
        <style>
          ${getOrderPrintStyles()}
        </style>
      </head>
      <body>
        <div class="print-container">
          <div class="company-header">
            <div class="company-name">奕新雷射精機股份有限公司</div>
            <div class="document-title">工作單</div>
          </div>

          <div class="print-order-info">
            <div class="order-info-left">
              <div class="info-row">
                <span class="info-label">公司名稱：</span>
                <span class="info-value">${escapeHtml(customerName.value)}${customerId.value ? ` (${escapeHtml(customerId.value)})` : ''}</span>
              </div>
            </div>
            <div class="order-info-right">
              <div class="info-row"><span class="info-label">訂單編號：</span><span class="info-value">${escapeHtml(orderId.value)}</span></div>
              <div class="info-row"><span class="info-label">日期：</span><span class="info-value">${escapeHtml(orderDate.value)}</span></div>
              <div class="info-row"><span class="info-label">業務：</span><span class="info-value">${escapeHtml(handler.value)}</span></div>
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
              <tbody>${tableRows}</tbody>
            </table>
          </div>

          <div class="cnc-preview-section">
            <div class="cnc-preview-title">CNC Preview</div>
            <table class="cnc-preview-table">
              <tbody><tr>${previewCells}</tr></tbody>
            </table>
          </div>
        </div>

        <script>
          (() => {
            const images = Array.from(document.images);
            const waiters = images.map((img) => (
              img.complete
                ? Promise.resolve()
                : new Promise((resolve) => {
                    img.addEventListener('load', resolve, { once: true });
                    img.addEventListener('error', resolve, { once: true });
                  })
            ));
            Promise.all(waiters).then(() => {
              setTimeout(() => {
                window.print();
              }, 150);
            });
          })();
        <\/script>
      </body>
    </html>
  `;
};

const print = async () => {
  await preparePrintData();
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('無法開啟列印視窗，請檢查瀏覽器彈出視窗設定');
    return;
  }
  printWindow.document.write(buildPrintHtml());
  printWindow.document.close();
};

onMounted(() => {
  void preparePrintData();
});

defineExpose({ print });
</script>

<style scoped src="@/components/Print/print-common.css"></style>
