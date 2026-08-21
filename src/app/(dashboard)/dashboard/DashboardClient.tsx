"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, ShoppingBag, Users, DollarSign, RefreshCw } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export function DashboardClient() {
  const [stats, setStats] = useState<any>(null);
  const [hourlyData, setHourlyData] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchStats = useCallback(async (manual = false) => {
    if (manual) setIsRefreshing(true);
    try {
      const res = await fetch("/api/dashboard/stats", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setHourlyData(data.hourlyData || []);
        setRecentOrders(data.recentOrders || []);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error("Failed to fetch dashboard stats:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => fetchStats(), 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const statCards = [
    {
      label: "Today'\''s Sales",
      value: `\u20b9${(stats?.today_revenue || 0).toLocaleString("en-IN")}`,
      change: stats?.revenue_change || "0",
      icon: DollarSign,
      color: "#10B981",
      cardClass: "stat-card-emerald",
    },
    {
      label: "Orders Today",
      value: stats?.orders_today || 0,
      icon: ShoppingBag,
      color: "#F97316",
      cardClass: "stat-card-orange",
    },
    {
      label: "Active Tables",
      value: `${stats?.active_tables ?? 0}/${stats?.total_tables ?? 0}`,
      icon: Users,
      color: "#3B82F6",
      cardClass: "stat-card-blue",
    },
    {
      label: "Avg Order Value",
      value: `\u20b9${Math.round(stats?.avg_order_value || 0).toLocaleString("en-IN")}`,
      icon: TrendingUp,
      color: "#10B981",
      cardClass: "stat-card-emerald",
    },
    {
      label: "GST Collected",
      value: `\u20b9${(stats?.total_gst || 0).toLocaleString("en-IN")}`,
      icon: DollarSign,
      color: "#8B5CF6",
      cardClass: "stat-card-blue",
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin" style={{ color: "#10B981" }} />
          <p className="text-sm" style={{ color: "#6B7280" }}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="section-header" style={{ marginBottom: 0 }}>
          <div className="section-icon" style={{ background: "linear-gradient(135deg, #ECFDF5, #D1FAE5)" }}>
            <TrendingUp className="w-5 h-5" style={{ color: "#059669" }} />
          </div>
          <div>
            <h1 className="section-title">Dashboard</h1>
            <p className="section-subtitle">
              {lastUpdated
                ? `Last updated ${lastUpdated.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
                : "Today'\''s overview and analytics"}
            </p>
          </div>
        </div>
        <button
          onClick={() => fetchStats(true)}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border cursor-pointer disabled:opacity-60"
          style={{ borderColor: "#E5E7EB", color: "#6B7280" }}
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {statCards.map((card, index) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`stat-card ${card.cardClass} p-5`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium" style={{ color: "#6B7280" }}>{card.label}</span>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${card.color}15` }}>
                <card.icon className="w-4 h-4" style={{ color: card.color }} />
              </div>
            </div>
            <p className="text-2xl font-bold" style={{ fontFamily: "var(--font-mono)", color: "#1A1A1A" }}>
              {card.value}
            </p>
            {card.change && (
              <div className="flex items-center gap-1 mt-1">
                {parseFloat(card.change) >= 0 ? (
                  <TrendingUp className="w-3 h-3" style={{ color: "#16A34A" }} />
                ) : (
                  <TrendingDown className="w-3 h-3" style={{ color: "#EF4444" }} />
                )}
                <span className="text-[11px] font-medium" style={{ color: parseFloat(card.change) >= 0 ? "#16A34A" : "#EF4444" }}>
                  {card.change}% vs yesterday
                </span>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Hourly Sales Chart */}
      <div className="premium-card" style={{ padding: "24px", marginBottom: "32px" }}>
        <h2 className="text-base font-bold mb-4" style={{ fontFamily: "var(--font-heading)", color: "#1A1A1A" }}>
          Hourly Sales
        </h2>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={hourlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="hour" tick={{ fontSize: 11, fill: "#9CA3AF" }} tickLine={false} axisLine={{ stroke: "#E5E7EB" }} />
            <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} tickLine={false} axisLine={{ stroke: "#E5E7EB" }} tickFormatter={(v) => `\u20b9${v}`} />
            <Tooltip
              contentStyle={{ backgroundColor: "#fff", border: "1px solid #E5E7EB", borderRadius: "8px", fontSize: "12px" }}
              formatter={(value: any) => [`\u20b9${value}`, "Sales"]}
            />
            <Bar dataKey="revenue" fill="#10B981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Recent Orders */}
      <div className="premium-card" style={{ overflow: "hidden" }}>
        <div className="px-5 py-4" style={{ borderBottom: "1px solid #E5E7EB" }}>
          <h2 className="text-base font-bold" style={{ fontFamily: "var(--font-heading)", color: "#1A1A1A" }}>Recent Orders</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}>
              <th className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: "#6B7280" }}>Invoice</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: "#6B7280" }}>Table</th>
              <th className="text-right px-4 py-2.5 text-xs font-medium" style={{ color: "#6B7280" }}>Items</th>
              <th className="text-right px-4 py-2.5 text-xs font-medium" style={{ color: "#6B7280" }}>Amount</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: "#6B7280" }}>Payment</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: "#6B7280" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {recentOrders.map((order) => (
              <tr key={order.id} style={{ borderBottom: "1px solid #F3F4F6" }}>
                <td className="px-4 py-2.5 font-medium" style={{ fontFamily: "var(--font-mono)", color: "#1A1A1A", fontSize: "12px" }}>{order.invoice_number}</td>
                <td className="px-4 py-2.5" style={{ color: "#6B7280" }}>{order.table_number}</td>
                <td className="px-4 py-2.5 text-right" style={{ fontFamily: "var(--font-mono)" }}>{order.items_count}</td>
                <td className="px-4 py-2.5 text-right font-semibold" style={{ fontFamily: "var(--font-mono)", color: "#1A1A1A" }}>\u20b9{order.total?.toLocaleString("en-IN")}</td>
                <td className="px-4 py-2.5">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ backgroundColor: "#F5F5F3", color: "#6B7280" }}>
                    {order.payment_mode || "\u2014"}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                    style={{
                      backgroundColor: order.status === "PAID" ? "#ECFDF5" : "#FEF3C7",
                      color: order.status === "PAID" ? "#16A34A" : "#B8792E",
                    }}
                  >
                    {order.status}
                  </span>
                </td>
              </tr>
            ))}
            {recentOrders.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm" style={{ color: "#9CA3AF" }}>
                  No orders yet today
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
