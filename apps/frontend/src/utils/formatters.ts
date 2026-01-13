/**
 * 格式化民國年日期
 * @param dateString ISO 日期字串
 * @returns 民國年格式字串 (例如: 115.01.09)
 */
export const formatRocDate = (dateString?: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const rocYear = date.getFullYear() - 1911;
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${rocYear}.${month}.${day}`;
};

/**
 * 格式化數字（保留兩位小數）
 */
export const formatNumber = (num: number): string => {
  return Number(num || 0).toFixed(2);
};

/**
 * 格式化整數（不帶小數點）
 */
export const formatInteger = (num: number): string => {
  return Math.round(num || 0).toString();
};

/**
 * 格式化貨幣（加入千分位符號）
 */
export const formatCurrency = (num: number): string => {
  return Number(num || 0).toLocaleString('zh-TW', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};
