import i18next, { type TFunction } from "i18next";

export type ActivityEntityType =
  | 'contact'
  | 'project'
  | 'task'
  | 'document'
  | 'transaction'
  | 'user'
  | 'all';

export interface ActivityLog {
  id: string;
  action: string;
  summaryKey: string;
  summaryParams?: Record<string, unknown> | null;
  entityType: string;
  entityId: string;
  projectId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface ActivityListResponse {
  data: ActivityLog[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

const FIELD_KEYS = new Set([
  'name', 'role', 'company', 'email', 'phone', 'website', 'tags', 'notes',
  'relationshipLevel', 'status', 'dueDate', 'issueDate', 'totalCents',
]);

function translateFieldKey(t: TFunction, key: string): string {
  return FIELD_KEYS.has(key) ? t(`activity:fields.${key}`) : key;
}

/** Resolves a single param value, translating any nested `activity:`-prefixed i18n key references. */
function resolveParam(t: TFunction, value: unknown): unknown {
  if (typeof value === 'string' && value.startsWith('activity:')) return t(value);
  if (Array.isArray(value)) {
    const resolved = value.map((v) => resolveParam(t, v));
    return new Intl.ListFormat(i18next.language).format(resolved as string[]);
  }
  return value;
}

export function translateSummary(t: TFunction, log: ActivityLog): string {
  const params = log.summaryParams ?? {};
  const resolved = Object.fromEntries(
    Object.entries(params).map(([k, v]) => [k, resolveParam(t, v)]),
  );
  return t(log.summaryKey, resolved);
}

function formatValue(t: TFunction, value: unknown): string {
  if (value === null || value === undefined || value === '') return t('activity:detail.empty');
  if (typeof value === 'boolean') return value ? t('activity:detail.yes') : t('activity:detail.no');
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function formatActivityDetail(t: TFunction, metadata: Record<string, unknown> | null | undefined): string | null {
  if (!metadata) return null;

  if (Array.isArray(metadata.changed) && metadata.from && metadata.to) {
    const changed = metadata.changed as string[];
    const from = metadata.from as Record<string, unknown>;
    const to = metadata.to as Record<string, unknown>;
    const parts = changed.slice(0, 3).map((key) =>
      t('activity:detail.fieldChange', {
        label: translateFieldKey(t, key),
        from: formatValue(t, from[key]),
        to: formatValue(t, to[key]),
      }),
    );
    if (changed.length > 3) parts.push(t('activity:detail.moreFields', { count: changed.length - 3 }));
    return parts.join(' · ');
  }

  if (typeof metadata.field === 'string' && 'to' in metadata) {
    return t('activity:detail.fieldValue', {
      label: translateFieldKey(t, metadata.field),
      value: formatValue(t, metadata.to),
    });
  }

  if (typeof metadata.fileName === 'string') {
    return metadata.fileName;
  }

  if (typeof metadata.mergedContactName === 'string') {
    return t('activity:detail.mergedContact', { name: metadata.mergedContactName });
  }

  return null;
}

export interface ActivityLinkTarget {
  to: string;
  params?: Record<string, string>;
}

export function activityEntityLink(log: ActivityLog): ActivityLinkTarget | null {
  switch (log.entityType) {
    case 'contact':
      return { to: '/contacts/$contactId', params: { contactId: log.entityId } };
    case 'project':
      return { to: '/projects/$projectId/overview', params: { projectId: log.entityId } };
    case 'document':
      return { to: '/documents/$documentId', params: { documentId: log.entityId } };
    case 'task':
      return log.projectId
        ? {
            to: '/projects/$projectId/issues/$taskId',
            params: { projectId: log.projectId, taskId: log.entityId },
          }
        : null;
    case 'transaction':
      return { to: '/accounting/transactions' };
    default:
      return null;
  }
}

/** Keys live in the `contacts` namespace — the timeline is the only consumer. */
export const ACTIVITY_FILTER_OPTIONS: { value: ActivityEntityType; labelKey: string }[] = [
  { value: 'all', labelKey: 'timeline.filterAll' },
  { value: 'contact', labelKey: 'timeline.filterContact' },
  { value: 'project', labelKey: 'timeline.filterProjects' },
  { value: 'document', labelKey: 'timeline.filterDocuments' },
  { value: 'task', labelKey: 'timeline.filterTasks' },
  { value: 'transaction', labelKey: 'timeline.filterTransactions' },
];
