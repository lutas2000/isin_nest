export interface PrintOptions {
  title?: string;
  styles?: string;
  pageSize?: 'A4' | 'A5' | 'A3' | 'Letter';
  margin?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
}

const getPageDimensions = (pageSize: string) => {
  switch (pageSize) {
    case 'A5':
      return { width: '148mm', minHeight: '210mm' };
    case 'A3':
      return { width: '297mm', minHeight: '420mm' };
    case 'Letter':
      return { width: '216mm', minHeight: '279mm' };
    case 'A4':
    default:
      return { width: '210mm', minHeight: '297mm' };
  }
};

/**
 * 取得基礎列印樣式
 */
const getBasePrintStyles = (pageSize: string, margin: string): string => {
  const { width, minHeight } = getPageDimensions(pageSize);
  return `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Microsoft JhengHei', '微軟正黑體', Arial, sans-serif;
      font-size: 12pt;
      line-height: 1.5;
      color: #000;
      background: white;
    }
    
    .print-container {
      width: ${width};
      min-height: ${minHeight};
      margin: 0 auto;
      padding: ${margin};
      background: white;
    }
    
    @media print {
      @page {
        size: ${pageSize};
        margin: 0;
      }
      
      body {
        margin: 0;
        padding: 0;
      }
      
      .print-container {
        width: 100%;
        min-height: 100vh;
        padding: ${margin};
        margin: 0;
      }
    }
  `;
};

/**
 * 列印 HTML 內容
 * @param content HTML 內容
 * @param options 列印選項
 */
export const printHtml = (
  content: string,
  options: PrintOptions = {}
): void => {
  const {
    title = '列印文件',
    styles = '',
    pageSize = 'A4',
    margin = { top: '15mm', right: '20mm', bottom: '15mm', left: '20mm' },
  } = options;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('無法開啟列印視窗，請檢查瀏覽器的彈出視窗設定');
    return;
  }

  const marginStr = `${margin.top} ${margin.right} ${margin.bottom} ${margin.left}`;
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        ${getBasePrintStyles(pageSize, marginStr)}
        ${styles}
      </style>
    </head>
    <body>
      ${content}
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();

  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };
};

/**
 * 從 Vue 組件 ref 列印
 * @param elementRef Vue 組件的 ref
 * @param options 列印選項
 */
export const printFromRef = (
  elementRef: HTMLElement | null,
  options: PrintOptions = {}
): void => {
  if (!elementRef) {
    console.error('列印元素不存在');
    return;
  }

  const content = elementRef.innerHTML;
  printHtml(content, options);
};
