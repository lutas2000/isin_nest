import { API_CONFIG } from '@/config/api';
import { apiGet } from '@/services/api';

export type CrmConfigCategory =
  | 'shipping_method'
  | 'payment_method'
  | 'source'
  | 'substitute'
  | 'unit';

export interface CrmConfigOption {
  value: string;
  label: string;
  code: string;
}

interface CrmConfigRecord {
  id: number;
  category: string;
  code: string;
  label: string;
  displayOrder: number;
}

interface CacheEntry {
  expiresAt: number;
  records: CrmConfigRecord[];
}

const CACHE_TTL_MS = 5 * 60 * 1000;
const categoryCache = new Map<CrmConfigCategory, CacheEntry>();

const normalize = (value: unknown) => String(value ?? '').trim().toLowerCase();

const getDisplayLabel = (record: CrmConfigRecord): string => record.label?.trim() || '';

const toOption = (record: CrmConfigRecord): CrmConfigOption => ({
  value: getDisplayLabel(record),
  label: getDisplayLabel(record),
  code: record.code?.trim() || '',
});

const sortRecords = (records: CrmConfigRecord[]): CrmConfigRecord[] =>
  records.slice().sort((a, b) => {
    if (a.displayOrder !== b.displayOrder) {
      return a.displayOrder - b.displayOrder;
    }
    return a.id - b.id;
  });

const fetchCategoryRecords = async (category: CrmConfigCategory): Promise<CrmConfigRecord[]> => {
  const now = Date.now();
  const cached = categoryCache.get(category);
  if (cached && cached.expiresAt > now) {
    return cached.records;
  }

  const records = sortRecords(await apiGet<CrmConfigRecord[]>(`${API_CONFIG.CRM.CONFIGS}/${category}`));
  categoryCache.set(category, {
    records,
    expiresAt: now + CACHE_TTL_MS,
  });

  return records;
};

const filterRecords = (
  records: CrmConfigRecord[],
  keyword: string,
  showAll: boolean,
): CrmConfigRecord[] => {
  if (showAll || !keyword) {
    return records;
  }

  return records.filter((record) => {
    const code = normalize(record.code);
    const label = normalize(record.label);
    return code === keyword || code.includes(keyword) || label.includes(keyword);
  });
};

export const fetchCrmConfigOptions = async (
  category: CrmConfigCategory,
  searchTerm: string,
  showAll = false,
): Promise<CrmConfigOption[]> => {
  const keyword = normalize(searchTerm);
  const records = await fetchCategoryRecords(category);
  const seen = new Set<string>();

  return filterRecords(records, keyword, showAll)
    .filter((record) => {
      const key = normalize(record.label);
      if (!key || seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .map(toOption);
};

export const findCrmConfigByCode = async (
  category: CrmConfigCategory,
  code: string,
): Promise<CrmConfigOption | null> => {
  const normalizedCode = String(code ?? '').trim();
  if (!normalizedCode) {
    return null;
  }

  const records = await fetchCategoryRecords(category);
  const record = records.find((item) => item.code === normalizedCode);
  return record ? toOption(record) : null;
};

export const createCrmConfigSearchFunction =
  (category: CrmConfigCategory) =>
  async (searchTerm: string): Promise<Array<{ value: string; label: string }>> => {
    const options = await fetchCrmConfigOptions(category, searchTerm, !normalize(searchTerm));
    return options.map(({ value, label }) => ({ value, label }));
  };

export const invalidateCrmConfigCache = (category?: CrmConfigCategory) => {
  if (category) {
    categoryCache.delete(category);
    return;
  }
  categoryCache.clear();
};
