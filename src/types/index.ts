export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  business_name?: string;
  store_slug?: string;
  store_name?: string;
}

export interface AuthTokens {
  jwt: string;
  refresh_token?: string;
}

export interface DashboardStats {
  today_revenue: number;
  today_orders: number;
  pending_count: number;
  low_stock: number;
}

export interface MobileOrder {
  id: number;
  customer_name: string;
  customer_phone: string;
  product_title: string;
  total_price: number;
  currency: string;
  status: string;
  status_label: string;
  address?: string;
  quantity: number;
  created_at: string;
  wilaya_id?: number;
  commune_id?: number;
  variant_name?: string;
  order_source?: string;
  source_platform?: string;
  order_source_label?: string;
  source_platform_label?: string;
  delivery_type?: string;
  tracking_number?: string;
  store_id?: number | null;
  store_name?: string | null;
}

export interface StoreRef {
  id: number;
  name: string;
}

export interface OrderDetail extends MobileOrder {
  notes?: string;
  shipping_address?: string;
  delivery_type?: string;
  tracking_number?: string;
  timeline: StatusTimeline[];
}

export interface StatusTimeline {
  status: string;
  label: string;
  timestamp: string;
  active: boolean;
}

export interface DeliveryEvent {
  event_type: string;
  event_status: string;
  description?: string;
  location?: string;
  created_at: string;
}

export interface AppNotification {
  id: number;
  type: 'new_order' | 'status_change' | 'low_stock' | 'flagged_order' | 'ai_alert';
  title: string;
  body: string;
  order_id?: number;
  read: boolean;
  created_at: string;
}
