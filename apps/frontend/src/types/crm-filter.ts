export interface CrmFilterOption {
  value: string;
  label: string;
}

export interface CrmSelectFilterDefinition {
  type: 'select';
  key: string;
  label: string;
  placeholder?: string;
  options: CrmFilterOption[];
  searchable?: boolean;
}

export interface CrmDateRangeFilterDefinition {
  type: 'date-range';
  label: string;
  fromKey: string;
  toKey: string;
  /** 顯示「本月」與上／下月快速鍵 */
  showMonthShortcuts?: boolean;
}

export type CrmFilterDefinition = CrmSelectFilterDefinition | CrmDateRangeFilterDefinition;
