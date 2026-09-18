import type { Locale } from '../i18n/strings';
import { tr } from '../i18n/strings';

let currentLocale: Locale = 'ar';

export function setFormatLocale(l: Locale) {
  currentLocale = l;
}

function dateTag(): string {
  return currentLocale === 'ar' ? 'ar-DZ' : currentLocale === 'fr' ? 'fr-DZ' : 'en';
}

export function formatCurrency(amount: number, currency?: string): string {
  if (amount == null || isNaN(amount)) return `0 ${currency || tr(currentLocale, 'misc.currency')}`;
  return `${Math.round(amount).toLocaleString(dateTag())} ${currency || tr(currentLocale, 'misc.currency')}`;
}

export function formatTimeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  if (isNaN(date)) return '';
  const diff = now - date;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return tr(currentLocale, 'misc.justNow');
  if (mins < 60) return tr(currentLocale, 'misc.minAgo', { n: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return tr(currentLocale, 'misc.hourAgo', { n: hours });
  const days = Math.floor(hours / 24);
  if (days < 30) return tr(currentLocale, 'misc.dayAgo', { n: days });
  return new Date(dateStr).toLocaleDateString(dateTag());
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString(dateTag(), {
    weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

const STATUS_AR: Record<string, string> = {
  pending: 'قيد الانتظار',
  confirmed: 'مؤكد',
  processing: 'قيد التجهيز',
  shipped: 'تم الشحن',
  delivered: 'تم التوصيل',
  cancelled: 'ملغي',
  returned: 'مرتجع',
  fake: 'مزيف',
  duplicate: 'مكرر',
  no_answer_1: 'لا رد 1',
  no_answer_2: 'لا رد 2',
  no_answer_3: 'لا رد 3',
  waiting_callback: 'انتظار اتصال',
  postponed: 'مؤجل',
};

const STATUS_FR: Record<string, string> = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  processing: 'En préparation',
  shipped: 'Expédiée',
  delivered: 'Livrée',
  cancelled: 'Annulée',
  returned: 'Retournée',
  fake: 'Fausse',
  duplicate: 'Doublon',
  no_answer_1: 'Sans réponse 1',
  no_answer_2: 'Sans réponse 2',
  no_answer_3: 'Sans réponse 3',
  waiting_callback: 'Rappel attendu',
  postponed: 'Reportée',
};

const STATUS_EN: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  returned: 'Returned',
  fake: 'Fake',
  duplicate: 'Duplicate',
  no_answer_1: 'No answer 1',
  no_answer_2: 'No answer 2',
  no_answer_3: 'No answer 3',
  waiting_callback: 'Callback pending',
  postponed: 'Postponed',
};

export function getStatusLabel(status: string): string {
  const map = currentLocale === 'ar' ? STATUS_AR : currentLocale === 'fr' ? STATUS_FR : STATUS_EN;
  return map[status] || status;
}

export function getNotificationIcon(type: string): string {
  switch (type) {
    case 'new_order': return '📦';
    case 'status_change': return '🔄';
    case 'low_stock': return '📉';
    case 'flagged_order': return '⚠️';
    case 'ai_alert': return '🤖';
    default: return '🔔';
  }
}
