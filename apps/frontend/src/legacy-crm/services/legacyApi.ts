import { apiRequest } from '../../services/api';

/**
 * 舊版銷管 API（後端 `/legacy-crm/*`，見 docs/LEGACY-CRM-API.md）。路徑與查詢參數同
 * isin_vb6 的 `/api/<資源>`。錯誤不跳新版的全域錯誤視窗，由舊版表單自己顯示訊息；
 * 登入失效仍由 `apiRequest` 跳登出提示。
 */
const BASE = '/legacy-crm';

export function legacyGet<T>(path: string): Promise<T> {
  return apiRequest<T>(`${BASE}${path}`, { method: 'GET' }, true);
}

export function legacySend<T>(
  path: string,
  method: 'POST' | 'PUT' | 'DELETE',
  body?: unknown,
): Promise<T> {
  return apiRequest<T>(
    `${BASE}${path}`,
    { method, body: body === undefined ? undefined : JSON.stringify(body) },
    true,
  );
}

/** `?a=1&b=2`；沒有參數時為空字串。 */
export function queryString(params: URLSearchParams): string {
  const text = params.toString();
  return text ? `?${text}` : '';
}
