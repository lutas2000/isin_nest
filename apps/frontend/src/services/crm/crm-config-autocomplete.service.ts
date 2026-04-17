import { API_CONFIG } from '@/config/api';
import { apiGet } from '@/services/api';

export type CrmConfigCategory = 'shipping_method' | 'payment_method' | 'source_type';

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

const matchesKeyword = (record: CrmConfigRecord, keyword: string): boolean => {
  if (!keyword) return true;
  return (
    normalize(record.id).includes(keyword) ||
    normalize(record.code).includes(keyword) ||
    normalize(record.label).includes(keyword)
  );
};

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

export const createCrmConfigSearchFunction =
  (category: CrmConfigCategory) =>
  async (searchTerm: string): Promise<Array<{ value: string; label: string }>> => {
    const keyword = normalize(searchTerm);
    const records = await fetchCategoryRecords(category);
    const seen = new Set<string>();

    return records
      .filter((record) => matchesKeyword(record, keyword))
      .filter((record) => {
        const key = normalize(record.label);
        if (!key || seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      })
      .map((record) => ({
        value: record.label,
        label: getDisplayLabel(record),
      }));
  };

export const invalidateCrmConfigCache = (category?: CrmConfigCategory) => {
  if (category) {
    categoryCache.delete(category);
    return;
  }
  categoryCache.clear();
};
