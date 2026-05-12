export interface PrintPoint {
  x: number;
  y: number;
}

export interface PrintColumn {
  key:
    | 'sequence'
    | 'cadFile'
    | 'customerFile'
    | 'material'
    | 'thickness'
    | 'substitute'
    | 'quantity'
    | 'unitPrice'
    | 'amount';
  x: number;
  width: number;
  align?: 'left' | 'center' | 'right';
}

export const voucherA5Layout = {
  page: {
    widthMm: 210,
    heightMm: 148,
  },
  offset: {
    xMm: 0,
    yMm: 0,
  },
  font: {
    basePt: 8.5,
    headerPt: 9,
  },
  header: {
    customerName: { x: 14, y: 29 } satisfies PrintPoint,
    customerId: { x: 14, y: 34.4 } satisfies PrintPoint,
    shippingMethod: { x: 14, y: 39.8 } satisfies PrintPoint,
    voucherDate: { x: 98, y: 29 } satisfies PrintPoint,
    voucherId: { x: 98, y: 34.4 } satisfies PrintPoint,
    orderId: { x: 98, y: 39.8 } satisfies PrintPoint,
  },
  rows: {
    startY: 52.3,
    rowHeight: 8.5,
    maxRows: 8,
  },
  columns: [
    { key: 'sequence', x: 4.8, width: 7.5, align: 'center' },
    { key: 'cadFile', x: 13.5, width: 16.5, align: 'left' },
    { key: 'customerFile', x: 31.4, width: 26.5, align: 'left' },
    { key: 'material', x: 59.4, width: 14, align: 'left' },
    { key: 'thickness', x: 74.3, width: 8.2, align: 'center' },
    { key: 'substitute', x: 83.2, width: 7.2, align: 'center' },
    { key: 'quantity', x: 91.1, width: 12.2, align: 'right' },
    { key: 'unitPrice', x: 104.3, width: 13.2, align: 'right' },
    { key: 'amount', x: 118.6, width: 13.2, align: 'right' },
  ] satisfies PrintColumn[],
  summary: {
    amount: { x: 118.6, y: 123.1 } satisfies PrintPoint,
    tax: { x: 118.6, y: 129.4 } satisfies PrintPoint,
    total: { x: 118.6, y: 135.8 } satisfies PrintPoint,
  },
  footer: {
    notes: { x: 16, y: 108.1 } satisfies PrintPoint,
    handler: { x: 52, y: 136.1 } satisfies PrintPoint,
    copyCount: { x: 72, y: 136.1 } satisfies PrintPoint,
  },
} as const;
