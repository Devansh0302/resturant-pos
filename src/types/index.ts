import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: 'ADMIN' | 'CASHIER' | 'WAITER' | 'CHEF';
    };
  }

  interface User {
    id: string;
    name: string;
    email: string;
    role: 'ADMIN' | 'CASHIER' | 'WAITER' | 'CHEF';
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: 'ADMIN' | 'CASHIER' | 'WAITER' | 'CHEF';
  }
}

// ─── App Types ─────────────────────────────────────

export interface MenuItemWithCategory {
  id: string;
  name: string;
  description: string | null;
  price: number;
  food_type: 'VEG' | 'NON_VEG';
  is_available: boolean;
  image_url: string | null;
  category: {
    id: string;
    name: string;
  };
}

export interface TableWithOrder {
  id: string;
  table_number: string;
  capacity: number;
  area: 'INDOOR' | 'OUTDOOR' | 'ROOFTOP';
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED';
  activeOrder?: {
    id: string;
    guest_count: number;
    total_amount: number;
    created_at: string;
    order_items: {
      id: string;
      quantity: number;
      unit_price: number;
      total_price: number;
      menu_item: {
        name: string;
        food_type: 'VEG' | 'NON_VEG';
      };
    }[];
  };
}

export interface OrderItemInCart {
  id?: string;
  menu_item_id: string;
  name: string;
  food_type: 'VEG' | 'NON_VEG';
  quantity: number;
  unit_price: number;
  total_price: number;
  notes?: string;
}

export interface BillData {
  restaurant: {
    name: string;
    address: string;
    phone: string;
    gstin: string;
  };
  invoice_number: string;
  date: string;
  table_number: string;
  guest_count: number;
  items: {
    name: string;
    quantity: number;
    rate: number;
    amount: number;
  }[];
  subtotal: number;
  cgst_rate: number;
  cgst_amount: number;
  sgst_rate: number;
  sgst_amount: number;
  total_amount: number;
  payment_mode?: string;
}
