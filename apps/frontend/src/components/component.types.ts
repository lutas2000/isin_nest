import type { CrmConfigCategory } from '@/services/crm/crm-config-autocomplete.service'

export type EditableColumnWidth = 'sequence' | 'short-number' | 'long-number' | 'notes'

export interface EditableColumn {
  key: string
  label: string
  sortable?: boolean
  editable?: boolean
  keyboardFocusable?: boolean
  hotkeys?: {
    f10?: boolean
  }
  required?: boolean
  type?:
    | 'text'
    | 'number'
    | 'select'
    | 'textarea'
    | 'boolean'
    | 'search-select'
    | 'crm-config-select'
    | 'date'
  /** 與 type=crm-config-select 併用：銷管設定分類 */
  crmConfigCategory?: CrmConfigCategory
  /** 與 type=textarea 併用：列高 */
  textareaRows?: number
  /** 與 type=text 併用：瀏覽器 datalist 建議值（仍可自由輸入） */
  datalistOptions?: string[]
  options?: Array<{ value: any; label: string }> | (() => Array<{ value: any; label: string }>)
  searchFunction?: (searchTerm: string) => Promise<Array<{ value: any; label: string }>>
  truncate?: boolean
  validator?: (value: any) => boolean
  width?: EditableColumnWidth
}

export interface SortOption {
  key: string
  label: string
}

export interface SortValue {
  key: string
  direction: 'asc' | 'desc'
}

export interface FilterOption {
  value: string
  label: string
}

export interface FilterDefinition {
  key: string
  placeholder: string
  options: FilterOption[]
}

export interface DetailFieldItem {
  key: string
  label: string
  value: string | number | null | undefined
  fullWidth?: boolean
}
