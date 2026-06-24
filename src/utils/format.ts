export function formatCurrency(amount: number, currency: string = 'DZD'): string {
  if (amount == null || isNaN(amount)) return `0 ${currency}`;
  return `${Math.round(amount).toLocaleString('ar-DZ')} ${currency}`;
}

export function formatTimeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  if (isNaN(date)) return '';
  const diff = now - date;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'الآن';
  if (mins < 60) return `منذ ${mins} د`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `منذ ${hours} س`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `منذ ${days} ي`;
  return new Date(dateStr).toLocaleDateString('ar-DZ');
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('ar-DZ', {
    weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
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
  return labels[status] || status;
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
