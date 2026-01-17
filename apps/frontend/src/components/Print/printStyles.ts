/**
 * Print 相關的 CSS 樣式工具
 * 用於在列印時提供統一的樣式定義
 */

/**
 * CompanyHeader 組件的列印樣式
 */
export const getCompanyHeaderStyles = (): string => {
  return `
    .print-header {
      margin-bottom: 20px;
    }
    
    .header-top {
      margin-bottom: 10px;
      text-align: center;
    }
    
    .company-name {
      font-size: 18pt;
      font-weight: bold;
      margin: 0;
    }
    
    .company-info {
      margin-bottom: 10px;
      text-align: center;
    }
    
    .company-address {
      font-size: 11pt;
      margin-bottom: 5px;
    }
    
    .company-contact {
      font-size: 10pt;
      display: flex;
      justify-content: center;
      gap: 15px;
    }
  `;
};

/**
 * 合併多個樣式字符串
 */
export const combinePrintStyles = (...styles: string[]): string => {
  return styles.join('\n');
};
