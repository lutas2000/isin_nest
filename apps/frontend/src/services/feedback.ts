import { apiDownload, apiGet, apiPatch, apiRequest } from './api';

/**
 * 回報系統（後端 `/feedback`，見 docs/FEEDBACK-AND-LOGS.md）。送出：任何登入者；列表與處理：admin 或
 * `feedback` write；截圖：只有 admin。
 */
export type FeedbackKind = 'bug' | 'feature' | 'question';
export type FeedbackStatus =
  | 'open'
  | 'triaged'
  | 'in_progress'
  | 'done'
  | 'wont_fix';

export const FEEDBACK_KIND_LABELS: Record<FeedbackKind, string> = {
  bug: '錯誤',
  feature: '需求',
  question: '問題',
};

export const FEEDBACK_STATUS_LABELS: Record<FeedbackStatus, string> = {
  open: '未處理',
  triaged: '已分類',
  in_progress: '處理中',
  done: '已完成',
  wont_fix: '不處理',
};

/** 截圖上限，與後端相同。 */
export const FEEDBACK_SCREENSHOT_MAX_BYTES = 5 * 1024 * 1024;

export interface FeedbackReport {
  id: number;
  created_at: string;
  updated_at: string;
  user_id: number;
  reporter: string | null;
  kind: FeedbackKind;
  title: string;
  body: string;
  context: Record<string, unknown> | null;
  status: FeedbackStatus;
  assignee_user_id: number | null;
  assignee: string | null;
  resolution: string | null;
  /** 只有 admin 的回應有這個欄位 */
  has_screenshot?: boolean;
}

export interface FeedbackPage {
  items: FeedbackReport[];
  total: number;
  page: number;
  page_size: number;
}

export interface FeedbackFilters {
  status?: FeedbackStatus | '';
  kind?: FeedbackKind | '';
  assignee?: string;
  q?: string;
  from?: string;
  to?: string;
  page?: number;
  page_size?: number;
}

export interface NewFeedback {
  kind: FeedbackKind;
  title: string;
  body: string;
  context?: Record<string, unknown>;
  screenshot?: Blob | null;
}

/**
 * 送出回報。`silent` 為 true 時錯誤不跳新系統的錯誤視窗（舊版畫面自己顯示），登入失效仍會提示。
 */
export function submitFeedback(
  report: NewFeedback,
  silent = false,
): Promise<{ item: FeedbackReport }> {
  const form = new FormData();
  form.append('kind', report.kind);
  form.append('title', report.title);
  form.append('body', report.body);
  if (report.context) form.append('context', JSON.stringify(report.context));
  if (report.screenshot)
    form.append('screenshot', report.screenshot, 'screenshot.png');
  return apiRequest('/feedback', { method: 'POST', body: form }, silent);
}

export function listFeedback(filters: FeedbackFilters): Promise<FeedbackPage> {
  const params = Object.fromEntries(
    Object.entries(filters).filter(
      ([, value]) => value !== '' && value != null,
    ),
  );
  return apiGet('/feedback', params);
}

export function updateFeedback(
  id: number,
  patch: {
    status?: FeedbackStatus;
    assignee_user_id?: number | null;
    resolution?: string | null;
  },
): Promise<{ item: FeedbackReport }> {
  return apiPatch(`/feedback/${id}`, patch);
}

export function listFeedbackAssignees(): Promise<
  { id: number; name: string }[]
> {
  return apiGet('/feedback/assignees');
}

/** 截圖（admin）；回傳 blob，由呼叫端建立與釋放 object URL。 */
export async function fetchFeedbackScreenshot(id: number): Promise<Blob> {
  const file = await apiDownload(
    `/feedback/${id}/screenshot`,
    `feedback-${id}.png`,
  );
  return file.blob;
}
