export type UserRole = 'customer' | 'maker' | 'delivery'

export interface Profile {
  id: string
  full_name: string
  avatar_url?: string
  phone?: string
  role: UserRole
  city?: string
  address?: string
  created_at: string
  updated_at: string
}

export interface Sweet {
  id: string
  maker_id: string
  name: string
  description?: string
  price_per_unit: number
  image_url?: string
  shop_location: string
  category: string
  is_available: boolean
  stock_count: number
  created_at: string
  updated_at: string
  profiles?: Profile
}

export interface OrderItem {
  id: string
  order_id: string
  sweet_id: string
  sweet_name: string
  quantity: number
  unit_price: number
  subtotal: number
  sweet?: Sweet
}

export interface Order {
  id: string
  customer_id: string
  maker_id: string
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivering' | 'delivered' | 'cancelled'
  total_price: number
  delivery_address?: string
  delivery_fee: number
  notes?: string
  created_at: string
  updated_at: string
  order_items?: OrderItem[]
  customer?: Profile
  maker?: Profile
}

export interface Message {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  is_read: boolean
  order_id?: string
  created_at: string
  sender?: Profile
  receiver?: Profile
}

export interface Workshop {
  id: string
  maker_id: string
  title: string
  description?: string
  zoom_link: string
  scheduled_at: string
  duration_minutes: number
  price: number
  max_participants: number
  category: string
  thumbnail_url?: string
  is_active: boolean
  created_at: string
  updated_at: string
  maker?: Profile
  workshop_registrations?: WorkshopRegistration[]
}

export interface WorkshopRegistration {
  id: string
  workshop_id: string
  user_id: string
  registered_at: string
}

export interface CartItem {
  sweet: Sweet
  quantity: number
}

export interface Delivery {
  id: string
  order_id: string
  driver_id?: string
  status: 'pending' | 'assigned' | 'picked_up' | 'on_way' | 'delivered'
  estimated_time?: number
  current_location?: string
  notes?: string
  created_at: string
  updated_at: string
}
