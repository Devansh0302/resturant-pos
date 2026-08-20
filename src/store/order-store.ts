import { create } from 'zustand';
import { OrderItemInCart } from '@/types';

interface OrderState {
  items: OrderItemInCart[];
  tableId: string | null;
  orderId: string | null;
  guestCount: number;
  notes: string;

  // Actions
  setTableId: (id: string) => void;
  setOrderId: (id: string) => void;
  setGuestCount: (count: number) => void;
  setNotes: (notes: string) => void;
  addItem: (item: Omit<OrderItemInCart, 'quantity' | 'total_price'>) => void;
  removeItem: (menuItemId: string, variantName?: string | null) => void;
  updateQuantity: (menuItemId: string, quantity: number, variantName?: string | null) => void;
  clearOrder: () => void;
  setItemsFromAPI: (items: OrderItemInCart[]) => void;

  // Computed
  getSubtotal: () => number;
  getItemQuantity: (menuItemId: string, variantName?: string | null) => number;
}

export const useOrderStore = create<OrderState>((set, get) => ({
  items: [],
  tableId: null,
  orderId: null,
  guestCount: 1,
  notes: '',

  setTableId: (id) => set({ tableId: id }),
  setOrderId: (id) => set({ orderId: id }),
  setGuestCount: (count) => set({ guestCount: count }),
  setNotes: (notes) => set({ notes }),

  addItem: (item) => {
    const { items } = get();
    const vName = item.variant_name || null;
    const existing = items.find(
      (i) => i.menu_item_id === item.menu_item_id && (i.variant_name || null) === vName
    );

    if (existing) {
      set({
        items: items.map((i) =>
          i.menu_item_id === item.menu_item_id && (i.variant_name || null) === vName
            ? { ...i, quantity: i.quantity + 1, total_price: (i.quantity + 1) * i.unit_price }
            : i
        ),
      });
    } else {
      set({
        items: [...items, { ...item, quantity: 1, total_price: item.unit_price }],
      });
    }
  },

  removeItem: (menuItemId, variantName) => {
    const vName = variantName || null;
    set({
      items: get().items.filter(
        (i) => !(i.menu_item_id === menuItemId && (i.variant_name || null) === vName)
      ),
    });
  },

  updateQuantity: (menuItemId, quantity, variantName) => {
    const vName = variantName || null;
    if (quantity <= 0) {
      get().removeItem(menuItemId, vName);
      return;
    }
    set({
      items: get().items.map((i) =>
        i.menu_item_id === menuItemId && (i.variant_name || null) === vName
          ? { ...i, quantity, total_price: quantity * i.unit_price }
          : i
      ),
    });
  },

  clearOrder: () =>
    set({ items: [], tableId: null, orderId: null, guestCount: 1, notes: '' }),

  setItemsFromAPI: (items) => set({ items }),

  getSubtotal: () => get().items.reduce((sum, i) => sum + i.total_price, 0),

  getItemQuantity: (menuItemId, variantName) => {
    const vName = variantName || null;
    const item = get().items.find(
      (i) => i.menu_item_id === menuItemId && (i.variant_name || null) === vName
    );
    return item?.quantity || 0;
  },
}));
