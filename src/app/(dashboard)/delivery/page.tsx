'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smartphone, Check, X, Printer, IndianRupee, Clock, ChefHat } from 'lucide-react';
import { toast } from 'sonner';

// Mock Data for Demonstration
const MOCK_ORDERS = [
  {
    id: 'ORD-SW-9284',
    platform: 'SWIGGY',
    status: 'NEW',
    time: new Date(Date.now() - 1000 * 60 * 2).toISOString(), // 2 mins ago
    customerName: 'Rahul Verma',
    total: 845.00,
    items: [
      { name: 'Paneer Butter Masala', qty: 1, price: 320 },
      { name: 'Garlic Naan', qty: 3, price: 55 },
      { name: 'Jeera Rice', qty: 1, price: 160 },
      { name: 'Gulab Jamun', qty: 2, price: 100 }
    ],
    notes: 'Please make it extra spicy. Add extra onions.'
  },
  {
    id: 'ORD-ZM-4412',
    platform: 'ZOMATO',
    status: 'PREPARING',
    time: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 mins ago
    customerName: 'Priya Singh',
    total: 450.00,
    items: [
      { name: 'Chicken Biryani', qty: 1, price: 380 },
      { name: 'Raita', qty: 1, price: 70 }
    ],
    notes: 'No cutlery required.'
  },
  {
    id: 'ORD-SW-9285',
    platform: 'SWIGGY',
    status: 'NEW',
    time: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    customerName: 'Amit Kumar',
    total: 350.00,
    items: [
      { name: 'Veg Fried Rice', qty: 1, price: 200 },
      { name: 'Chilli Paneer', qty: 1, price: 150 }
    ],
    notes: ''
  },
];

export default function DeliveryDashboard() {
  const [orders, setOrders] = useState(MOCK_ORDERS);
  const [activeTab, setActiveTab] = useState<'ALL' | 'SWIGGY' | 'ZOMATO'>('ALL');

  const handleAcceptOrder = (id: string) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'PREPARING' } : o));
    toast.success('Order accepted! KOT sent to kitchen.');
  };

  const handleRejectOrder = (id: string) => {
    setOrders(prev => prev.filter(o => o.id !== id));
    toast.error('Order rejected.');
  };

  const handlePrintKOT = () => {
    toast.info('Printing Kitchen Order Ticket...');
  };

  const swiggyOrders = orders.filter(o => o.platform === 'SWIGGY');
  const zomatoOrders = orders.filter(o => o.platform === 'ZOMATO');

  return (
    <div className="p-8 min-h-[calc(100vh-64px)] bg-gray-50 flex flex-col">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-heading">Online Orders</h1>
          <p className="text-sm text-gray-500 mt-1">Manage incoming delivery orders</p>
        </div>
        
        <div className="flex bg-white rounded-lg p-1 shadow-sm border border-gray-100">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${
              activeTab === 'ALL' 
                ? 'bg-gray-900 text-white shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setActiveTab('SWIGGY')}
            className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${
              activeTab === 'SWIGGY' 
                ? 'bg-orange-500 text-white shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Swiggy
          </button>
          <button
            onClick={() => setActiveTab('ZOMATO')}
            className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${
              activeTab === 'ZOMATO' 
                ? 'bg-red-500 text-white shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Zomato
          </button>
        </div>
      </div>

      <div className="space-y-12">
        {/* Swiggy Section */}
        {(activeTab === 'ALL' || activeTab === 'SWIGGY') && (
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center font-bold text-xl text-orange-600 shadow-sm">
              S
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Swiggy Orders</h2>
              <p className="text-sm text-gray-500">{swiggyOrders.length} active orders</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {swiggyOrders.map(order => (
                <OrderCard 
                  key={order.id} 
                  order={order} 
                  onAccept={handleAcceptOrder} 
                  onReject={handleRejectOrder} 
                  onPrint={handlePrintKOT} 
                />
              ))}
            </AnimatePresence>
            {swiggyOrders.length === 0 && (
              <div className="col-span-full py-12 flex flex-col items-center justify-center border-2 border-dashed border-orange-100 rounded-2xl bg-orange-50/30">
                <Smartphone className="w-10 h-10 text-orange-200 mb-2" />
                <p className="text-orange-400 font-medium">No active Swiggy orders</p>
              </div>
            )}
          </div>
        </section>
        )}

        {/* Zomato Section */}
        {(activeTab === 'ALL' || activeTab === 'ZOMATO') && (
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center font-bold text-xl text-red-600 shadow-sm">
              Z
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Zomato Orders</h2>
              <p className="text-sm text-gray-500">{zomatoOrders.length} active orders</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {zomatoOrders.map(order => (
                <OrderCard 
                  key={order.id} 
                  order={order} 
                  onAccept={handleAcceptOrder} 
                  onReject={handleRejectOrder} 
                  onPrint={handlePrintKOT} 
                />
              ))}
            </AnimatePresence>
            {zomatoOrders.length === 0 && (
              <div className="col-span-full py-12 flex flex-col items-center justify-center border-2 border-dashed border-red-100 rounded-2xl bg-red-50/30">
                <Smartphone className="w-10 h-10 text-red-200 mb-2" />
                <p className="text-red-400 font-medium">No active Zomato orders</p>
              </div>
            )}
          </div>
        </section>
        )}
      </div>
    </div>
  );
}

function OrderCard({ order, onAccept, onReject, onPrint }: any) {
  const isSwiggy = order.platform === 'SWIGGY';
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.90 }}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col p-5 relative"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-start gap-3">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xl text-white shadow-sm ${
            isSwiggy ? 'bg-gray-800' : 'bg-red-500' // Swiggy uses dark grey, Zomato red in the user's screenshot context (or just S/Z)
          }`}>
            {isSwiggy ? 'SW' : 'ZO'}
          </div>
          <div>
            <h3 className="font-bold text-gray-900 leading-tight">{order.customerName}</h3>
            <p className="text-sm text-gray-500 mt-0.5 font-mono">{order.id}</p>
          </div>
        </div>
        
        {/* Toggle-like Switch UI for Status */}
        <div className={`flex items-center w-10 h-6 rounded-full px-1 cursor-pointer transition-colors ${
          order.status === 'NEW' ? 'bg-gray-300' : 'bg-green-500'
        }`} title={order.status}>
          <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform transform ${
            order.status === 'NEW' ? 'translate-x-0' : 'translate-x-4'
          }`} />
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-gray-100 text-gray-600 rounded-lg">
          <ChefHat className="w-3.5 h-3.5" />
          {order.items.length} Items
        </span>
        <span className={`px-2.5 py-1 text-xs font-semibold rounded-lg ${order.status === 'NEW' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'}`}>
          {order.status === 'NEW' ? 'Active' : 'Preparing'}
        </span>
      </div>

      <div className="flex-1 space-y-1 mb-4">
        {order.items.slice(0, 2).map((item: any, idx: number) => (
          <div key={idx} className="flex justify-between items-center text-sm">
            <span className="text-gray-600 truncate mr-2"><span className="text-gray-400 font-medium">{item.qty}x</span> {item.name}</span>
          </div>
        ))}
        {order.items.length > 2 && (
          <div className="text-xs text-gray-400 mt-1">+{order.items.length - 2} more items</div>
        )}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-50 mt-auto">
        <div className="flex items-center gap-4">
          {order.status === 'NEW' ? (
            <>
              <button 
                onClick={() => onAccept(order.id)}
                className="text-gray-400 hover:text-green-500 transition-colors"
                title="Accept Order"
              >
                <Check className="w-5 h-5" />
              </button>
              <button 
                onClick={() => onReject(order.id)}
                className="text-gray-400 hover:text-red-500 transition-colors"
                title="Reject Order"
              >
                <X className="w-5 h-5" />
              </button>
            </>
          ) : (
            <button 
              onClick={() => onPrint()}
              className="text-gray-400 hover:text-blue-500 transition-colors"
              title="Reprint KOT"
            >
              <Printer className="w-5 h-5" />
            </button>
          )}
        </div>
        
        <span className="font-bold text-gray-900 flex items-center gap-0.5">
          <IndianRupee className="w-4 h-4" />
          {order.total.toFixed(2)}
        </span>
      </div>
    </motion.div>
  );
}
