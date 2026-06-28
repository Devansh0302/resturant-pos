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
  removeItem: (menuItemId: string) => void;
  updateQuantity: (menuItemId: string, quantity: number) => void;
  clearOrder: () => void;
  setItemsFromAPI: (items: OrderItemInCart[]) => void;

  // Computed
  getSubtotal: () => number;
  getItemQuantity: (menuItemId: string) => number;
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
    const existing = items.find((i) => i.menu_item_id === item.menu_item_id);

    if (existing) {
      set({
        items: items.map((i) =>
          i.menu_item_id === item.menu_item_id
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

  removeItem: (menuItemId) => {
    set({ items: get().items.filter((i) => i.menu_item_id !== menuItemId) });
  },

  updateQuantity: (menuItemId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(menuItemId);
      return;
    }
    set({
      items: get().items.map((i) =>
        i.menu_item_id === menuItemId
          ? { ...i, quantity, total_price: quantity * i.unit_price }
          : i
      ),
    });
  },

  clearOrder: () =>
    set({ items: [], tableId: null, orderId: null, guestCount: 1, notes: '' }),

  setItemsFromAPI: (items) => set({ items }),

  getSubtotal: () => get().items.reduce((sum, i) => sum + i.total_price, 0),

  getItemQuantity: (menuItemId) => {
    const item = get().items.find((i) => i.menu_item_id === menuItemId);
    return item?.quantity || 0;
  },
}));
