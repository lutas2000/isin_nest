import { legacyGet } from '../services/legacyApi';
import { companyProfile } from './companyProfile';
import {
  drawingNumbers,
  groupDocumentPages,
  orderDocumentPages,
  partLabelPages,
  quoteDocumentPages,
  saleDocumentPages,
  workDocumentPages,
  type DocumentPrintContext,
  type DrawingShape,
} from './legacyDocumentPaper';
import type { PaperPage } from './legacyPapers';

type Row = Record<string, any>;

// The saved document with its customer and part outlines, as the legacy
// program prints the stored record rather than the form (isin_vb6
// src/utils/documentPrinting.js).
async function loadPrintData(
  endpoint: string,
  number: string,
  withShapes: boolean | undefined,
): Promise<DocumentPrintContext & { document: Row }> {
  const { item } = await legacyGet<{ item: Row }>(
    `${endpoint}/${encodeURIComponent(number)}`,
  );
  const code = String(item.customer_code ?? '').trim();
  const numbers = withShapes ? drawingNumbers(item) : [];
  const [customer, drawings] = await Promise.all([
    code
      ? legacyGet<{ item: Row }>(
          `/partners/customer/${encodeURIComponent(code)}`,
        )
          .then((payload) => payload.item)
          .catch(() => null)
      : null,
    numbers.length
      ? legacyGet<{ shapes?: Record<string, DrawingShape | null> }>(
          `/drawings/shapes?numbers=${encodeURIComponent(numbers.join(','))}&customer=${encodeURIComponent(code)}`,
        ).catch(() => ({ shapes: {} }))
      : { shapes: {} },
  ]);
  return {
    document: item,
    customer,
    shapes: drawings.shapes ?? {},
    profile: companyProfile,
  };
}

export type DocumentPrintType = 'order' | 'sale' | 'quote' | 'group' | 'work';

const documents: Record<
  DocumentPrintType,
  {
    endpoint: string;
    label: string;
    pages: (document: Row, ctx: DocumentPrintContext) => PaperPage[];
    shapes?: boolean;
  }
> = {
  order: {
    endpoint: '/orders',
    label: '訂貨單',
    pages: orderDocumentPages,
    shapes: true,
  },
  sale: {
    endpoint: '/sales',
    label: '出貨單',
    pages: saleDocumentPages,
    shapes: true,
  },
  quote: { endpoint: '/quotes', label: '估價單', pages: quoteDocumentPages },
  group: {
    endpoint: '/groups',
    label: '圖組組合表',
    pages: groupDocumentPages,
  },
  work: {
    endpoint: '/work-orders',
    label: '工作單',
    pages: workDocumentPages,
    shapes: true,
  },
};

export interface DocumentPrint {
  label: string;
  pages: PaperPage[];
  // What the print log records (services/legacyPrintLog.ts).
  log: { target: string; entityKey: string; criteria?: Record<string, string> };
}

// {label, pages} for 列印 P ("document") of an order, sale, quote, work order
// or drawing group, or 列印標籤(L) ("label") of an order or sale.
export async function buildDocumentPrint(
  kind: 'document' | 'label',
  type: DocumentPrintType,
  number: string,
): Promise<DocumentPrint> {
  const definition = documents[type];
  const data = await loadPrintData(
    definition.endpoint,
    number,
    definition.shapes,
  );
  if (kind === 'label') {
    return {
      label: '標籤',
      pages: partLabelPages(data.document, data, {
        quantityDecimals: type === 'sale' ? 2 : 0,
      }),
      log: {
        target: '標籤',
        entityKey: number,
        criteria: { document: definition.label },
      },
    };
  }
  return {
    label: definition.label,
    pages: definition.pages(data.document, data),
    log: { target: definition.label, entityKey: number },
  };
}
