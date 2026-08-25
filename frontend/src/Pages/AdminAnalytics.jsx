import React, { useState, useEffect, useCallback } from "react";
import { getNewUsers, getTopProducts, getPurchases } from "../services/analyticsService";
import { ACCESS_TOKEN } from "../services/constants";
import { useToast } from "../Components/Toast/useToast";
import api from "../services/api";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  LayoutDashboard, TrendingUp, Package, Users, DollarSign,
  ShoppingCart, CalendarDays, Tag, Users2, Table2,
} from "lucide-react";
import "../css/Analytics.scss";

const TOKEN = {
  primary: "#3b82f6", success: "#10b981", warning: "#f59e0b",
  danger: "#ef4444", purple: "#8b5cf6", cyan: "#06b6d4",
  PALETTE: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316", "#ec4899"],
};

const getTheme = () => document.body.classList.contains("dark-theme") ? "dark" : "light";
const chartT = (theme) => ({
  grid: theme === "dark" ? "#374151" : "#e5e7eb",
  text: theme === "dark" ? "#9ca3af" : "#6b7280",
  bg: theme === "dark" ? "#1e293b" : "#ffffff",
  border: theme === "dark" ? "#374151" : "#e5e7eb",
});

const fmt = (v) => parseFloat(v || 0);
const fmtL = (v) => `L.E ${fmt(v).toFixed(2)}`;
const num = (v) => parseFloat(v || 0).toFixed(1);

/* ─── Shared Components ─── */
const TooltipBox = ({ active, payload, label, prefix = "", theme }) => {
  if (!active || !payload?.length) return null;
  const t = chartT(theme);
  return (
    <div style={{ background: t.bg, border: `1px solid ${t.border}`, borderRadius: 10, padding: "10px 14px", boxShadow: "0 4px 20px rgba(0,0,0,0.15)", minWidth: 140 }}>
      <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: t.text }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ margin: "2px 0", fontSize: 13, fontWeight: 600, color: p.color || "#000" }}>
          {p.name}: {prefix}{typeof p.value === "number" ? p.value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : p.value}
        </p>
      ))}
    </div>
  );
};

const KPICard = ({ label, value, sub, accent, icon }) => (
  <div className="stat-card" style={{ borderLeftColor: accent }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <div className="stat-label">{label}</div>
      <span style={{ fontSize: 20 }}>{icon}</span>
    </div>
    <div className="stat-value" style={{ color: accent }}>{value}</div>
    <div className="stat-sub">{sub}</div>
  </div>
);

const Section = ({ title, subtitle, children, span = 1 }) => (
  <div className="analytics-section" style={{ gridColumn: `span ${span}` }}>
    <div className="section-header"><div><h2 style={{ marginBottom: 0 }}>{title}</h2>{subtitle && <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--text-muted)" }}>{subtitle}</p>}</div></div>
    <div style={{ padding: "20px 20px 12px" }}>{children}</div>
  </div>
);

const TABS = [
  { id: "overview", label: "Overview", Icon: LayoutDashboard },
  { id: "revenue", label: "Revenue", Icon: TrendingUp },
  { id: "products", label: "Products", Icon: Package },
  { id: "customers", label: "Customers", Icon: Users },
  { id: "commission", label: "Commission & Sellers", Icon: DollarSign },
  { id: "coupons", label: "Coupons", Icon: Tag },
  { id: "tables", label: "Raw Data", Icon: Table2 },
];

/* ─── Main Component ─── */
const AdminAnalytics = () => {
  const toast = useToast();
  const [newUsers, setNewUsers] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [days, setDays] = useState(30);
  const [activeTab, setActiveTab] = useState("overview");
  const [theme, setTheme] = useState(getTheme);
  const t = chartT(theme);
  const [sellerEarnings, setSellerEarnings] = useState({ earnings: [], summary: {} });
  const [coupons, setCoupons] = useState([]);
  const [couponForm, setCouponForm] = useState({ code: "", discount_type: "percentage", discount_value: "", min_order_amount: "", max_discount_amount: "", max_uses_total: "", expires_at: "" });
  const [globalCommissionRate, setGlobalCommissionRate] = useState("");
  const [savingCommission, setSavingCommission] = useState(false);

  useEffect(() => {
    const obs = new MutationObserver(() => setTheme(getTheme()));
    obs.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  const fetchAllOrders = useCallback(async () => {
    try {
      const res = await api.get("/api/admins/orders/");
      const data = res.data;
      const arr = data.results || data;
      setAllOrders(Array.isArray(arr) ? arr : []);
    } catch (e) { console.error(e); }
  }, []);

  const fetchAnalyticsData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersData, productsData, purchasesData] = await Promise.all([
        getNewUsers(days), getTopProducts(10, days), getPurchases(null, null, days),
      ]);
      setNewUsers(usersData.users || []);
      setTopProducts(productsData.products || []);
      setPurchases(purchasesData.purchases || []);
      await fetchAllOrders();
    } catch (e) {
      setError(e.message || "Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  }, [days, fetchAllOrders]);

  useEffect(() => { fetchAnalyticsData(); }, [fetchAnalyticsData]);

  const fetchSellerEarnings = useCallback(async () => {
    try {
      const res = await api.get("/api/admins/sellers/earnings/");
      setSellerEarnings(res.data);
    } catch (e) { console.error(e); }
  }, []);

  const fetchCoupons = useCallback(async () => {
    try {
      const res = await api.get("/api/admins/coupons/");
      const data = res.data;
      setCoupons(data.results || data);
    } catch (e) { console.error(e); }
  }, []);

  const fetchPlatformSettings = useCallback(async () => {
    try {
      const res = await api.get("/api/admins/commission/");
      setGlobalCommissionRate(res.data.default_commission_rate ?? "");
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    if (activeTab === "commission") { fetchSellerEarnings(); fetchPlatformSettings(); }
    if (activeTab === "coupons") fetchCoupons();
  }, [activeTab, fetchSellerEarnings, fetchCoupons, fetchPlatformSettings]);

  const handleCreateCoupon = async () => {
    try {
      const res = await api.post("/api/admins/coupons/", {
        code: couponForm.code, discount_type: couponForm.discount_type,
        discount_value: parseFloat(couponForm.discount_value),
        min_order_amount: couponForm.min_order_amount ? parseFloat(couponForm.min_order_amount) : null,
        max_discount_amount: couponForm.max_discount_amount ? parseFloat(couponForm.max_discount_amount) : null,
        max_uses_total: couponForm.max_uses_total ? parseInt(couponForm.max_uses_total) : null,
        expires_at: couponForm.expires_at || null,
      });
      toast.success("Coupon created!");
      setCouponForm({ code: "", discount_type: "percentage", discount_value: "", min_order_amount: "", max_discount_amount: "", max_uses_total: "", expires_at: "" });
      fetchCoupons();
    } catch (e) { toast.error("Failed: " + (e.response?.data ? JSON.stringify(e.response.data) : e.message)); }
  };

  const toggleCouponActive = async (id, isActive) => {
    await api.patch(`/api/admins/coupons/${id}/`, { is_active: !isActive });
    fetchCoupons();
  };

  const deleteCoupon = async (id) => {
    await api.delete(`/api/admins/coupons/${id}/`);
    fetchCoupons();
  };

  const handleSaveGlobalCommission = async () => {
    const val = parseFloat(globalCommissionRate);
    if (isNaN(val) || val < 0 || val > 100) return toast.error("Enter a valid rate between 0 and 100");
    setSavingCommission(true);
    try {
      const res = await api.patch("/api/admins/commission/", { default_commission_rate: val });
      const data = res.data;
      setGlobalCommissionRate(String(data.default_commission_rate ?? val));
      toast.success("Commission rate updated to " + (data.default_commission_rate ?? val) + "%");
    } catch (e) { toast.error("Failed to save: " + (e.response?.data ? JSON.stringify(e.response.data) : e.message)); }
    finally { setSavingCommission(false); }
  };

  /* ─── Computed Data ─── */
  const totalRevenue = purchases.reduce((s, p) => s + fmt(p.subtotal), 0);
  const avgOrderValue = purchases.length > 0 ? totalRevenue / purchases.length : 0;

  const revenueByDay = {};
  purchases.forEach((p) => {
    const d = p.order_date?.slice(0, 10);
    if (d) revenueByDay[d] = (revenueByDay[d] || 0) + fmt(p.subtotal);
  });
  const revenueTrend = Object.entries(revenueByDay).sort().map(([date, revenue]) => ({ date, revenue: +revenue.toFixed(2) }));
  let running = 0;
  const cumulativeRevenue = revenueTrend.map((r) => { running += r.revenue; return { ...r, cumulative: +running.toFixed(2) }; });

  const userByDay = {};
  newUsers.forEach((u) => { const d = u.date_joined?.slice(0, 10); if (d) userByDay[d] = (userByDay[d] || 0) + 1; });
  const userGrowth = Object.entries(userByDay).sort().map(([date, count]) => ({ date, count }));

  const statusMap = {};
  allOrders.forEach((o) => { const s = (o.status || "unknown").toLowerCase(); statusMap[s] = (statusMap[s] || 0) + 1; });
  const orderStatusData = Object.entries(statusMap).map(([name, value]) => ({ name, value }));

  const dowNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dowRev = new Array(7).fill(0);
  purchases.forEach((p) => { const d = new Date(p.order_date); if (!isNaN(d)) dowRev[d.getDay()] += fmt(p.subtotal); });
  const revenueByDow = dowNames.map((day, i) => ({ day, revenue: +dowRev[i].toFixed(2) }));

  /* Top buyers / sellers from purchases */
  const buyerMap = {};
  purchases.forEach((p) => {
    const u = p.username || "Guest";
    if (!buyerMap[u]) buyerMap[u] = { username: u, totalSpent: 0, orderCount: 0 };
    buyerMap[u].totalSpent += fmt(p.subtotal);
    buyerMap[u].orderCount += 1;
  });
  const topBuyers = Object.values(buyerMap).sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 10);

  const sellerMap = {};
  purchases.forEach((p) => {
    const s = p.username || "Unknown";
    if (!sellerMap[s]) sellerMap[s] = { name: s, totalRevenue: 0, itemsSold: 0 };
    sellerMap[s].totalRevenue += fmt(p.subtotal);
    sellerMap[s].itemsSold += p.quantity || 1;
  });
  const topSellers = Object.values(sellerMap).sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 10);

  if (loading) return (
    <div className="analytics-loading">
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 48, height: 48, border: "3px solid var(--border-color)", borderTop: `3px solid ${TOKEN.primary}`, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Loading analytics...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="analytics-loading">
      <div className="error-box"><div className="error-title">Failed to load</div><div className="error-message">{error}</div><button className="retry-btn" onClick={fetchAnalyticsData}>Retry</button></div>
    </div>
  );

  return (
    <div className="analytics-root">
      {/* Top Bar */}
      <div className="analytics-topbar">
        <div className="analytics-brand"><div className="analytics-brand-dot" /><span className="analytics-brand-text">Analytics Dashboard</span></div>
        <div style={{ display: "flex", gap: 8, overflowX: "auto" }}>
          {TABS.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`button button--small ${activeTab === tab.id ? "button--primary" : ""}`}>
              <tab.Icon size={14} />{tab.label}
            </button>
          ))}
          <div className="analytics-controls">
            <label htmlFor="days-filter">Period:</label>
            <select id="days-filter" value={days} onChange={(e) => setDays(parseInt(e.target.value))}>
              <option value={7}>Last 7 days</option><option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option><option value={365}>Last year</option>
            </select>
          </div>
        </div>
      </div>

      <div className="analytics-content">
        {/* ═══ OVERVIEW ═══ */}
        {activeTab === "overview" && (<>
          <div className="analytics-stats-row" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
            <KPICard label="Gross Revenue" value={fmtL(totalRevenue)} sub="Before costs" accent={TOKEN.primary} icon={<DollarSign size={18} color="#22c55e" />} />
            <KPICard label="Total Purchases" value={purchases.length} sub="Transactions" accent={TOKEN.success} icon={<ShoppingCart size={18} color="#3b82f6" />} />
            <KPICard label="Avg Order Value" value={fmtL(avgOrderValue)} sub="Per transaction" accent={TOKEN.warning} icon={<TrendingUp size={18} color="#f59e0b" />} />
            <KPICard label="Active Days" value={revenueTrend.length} sub="Days with sales" accent={TOKEN.purple} icon={<CalendarDays size={18} color="#a855f7" />} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <Section title="Revenue Trend" subtitle={`Last ${days} days`}>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={cumulativeRevenue}>
                  <defs><linearGradient id="rg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={TOKEN.primary} stopOpacity={0.3} /><stop offset="95%" stopColor={TOKEN.primary} stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={t.grid} /><XAxis dataKey="date" tick={{ fill: t.text, fontSize: 10 }} tickLine={false} /><YAxis tick={{ fill: t.text, fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `L.E ${v}`} />
                  <Tooltip content={<TooltipBox prefix="L.E " theme={theme} />} />
                  <Area type="monotone" dataKey="cumulative" stroke={TOKEN.primary} fill="url(#rg)" strokeWidth={2} name="Cumulative Rev" />
                  <Area type="monotone" dataKey="revenue" stroke={TOKEN.cyan} fill="none" strokeWidth={2} dot={false} name="Daily Rev" />
                </AreaChart>
              </ResponsiveContainer>
            </Section>
            <Section title="User Growth" subtitle="New registrations per day">
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={userGrowth}>
                  <defs><linearGradient id="ug" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={TOKEN.success} stopOpacity={0.3} /><stop offset="95%" stopColor={TOKEN.success} stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={t.grid} /><XAxis dataKey="date" tick={{ fill: t.text, fontSize: 10 }} tickLine={false} /><YAxis tick={{ fill: t.text, fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<TooltipBox theme={theme} />} />
                  <Area type="monotone" dataKey="count" stroke={TOKEN.success} fill="url(#ug)" strokeWidth={2} name="New Users" />
                </AreaChart>
              </ResponsiveContainer>
            </Section>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr", gap: 20 }}>
            <Section title="Order Status" subtitle="All orders breakdown">
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie data={orderStatusData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} dataKey="value" label={({ name }) => name} labelLine>
                    {orderStatusData.map((_, i) => <Cell key={i} fill={TOKEN.PALETTE[i % TOKEN.PALETTE.length]} />)}
                  </Pie>
                  <Tooltip content={<TooltipBox theme={theme} />} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </Section>
            <Section title="Revenue by Day of Week" subtitle="Best performing days">
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={revenueByDow}>
                  <CartesianGrid strokeDasharray="3 3" stroke={t.grid} /><XAxis dataKey="day" tick={{ fill: t.text, fontSize: 11 }} tickLine={false} /><YAxis tick={{ fill: t.text, fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `L.E ${v}`} />
                  <Tooltip content={<TooltipBox prefix="L.E " theme={theme} />} />
                  <Bar dataKey="revenue" name="Revenue" radius={[6, 6, 0, 0]}>
                    {revenueByDow.map((_, i) => <Cell key={i} fill={TOKEN.PALETTE[i % TOKEN.PALETTE.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Section>
          </div>
        </>)}

        {/* ═══ REVENUE ═══ */}
        {activeTab === "revenue" && (<>
          <div className="analytics-stats-row" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
            <KPICard label="Gross Revenue" value={fmtL(totalRevenue)} sub="Before costs" accent={TOKEN.primary} icon={<DollarSign size={18} color="#22c55e" />} />
            <KPICard label="Total Purchases" value={purchases.length} sub="Transactions" accent={TOKEN.success} icon={<ShoppingCart size={18} color="#3b82f6" />} />
            <KPICard label="Avg Order Value" value={fmtL(avgOrderValue)} sub="Per transaction" accent={TOKEN.warning} icon={<TrendingUp size={18} color="#f59e0b" />} />
            <KPICard label="Active Days" value={revenueTrend.length} sub="Days with sales" accent={TOKEN.purple} icon={<CalendarDays size={18} color="#a855f7" />} />
          </div>
          <Section title="Revenue Over Time" subtitle={`Last ${days} days`}>
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={cumulativeRevenue}>
                <defs><linearGradient id="rg2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={TOKEN.primary} stopOpacity={0.3} /><stop offset="95%" stopColor={TOKEN.primary} stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke={t.grid} /><XAxis dataKey="date" tick={{ fill: t.text, fontSize: 10 }} tickLine={false} /><YAxis tick={{ fill: t.text, fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `L.E ${v}`} />
                <Tooltip content={<TooltipBox prefix="L.E " theme={theme} />} />
                <Area type="monotone" dataKey="cumulative" stroke={TOKEN.primary} fill="url(#rg2)" strokeWidth={2} name="Cumulative" />
                <Area type="monotone" dataKey="revenue" stroke={TOKEN.cyan} fill="none" strokeWidth={2} dot={false} name="Daily" />
              </AreaChart>
            </ResponsiveContainer>
          </Section>
          <Section title="Revenue by Day of Week">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueByDow}>
                <CartesianGrid strokeDasharray="3 3" stroke={t.grid} /><XAxis dataKey="day" tick={{ fill: t.text, fontSize: 11 }} tickLine={false} /><YAxis tick={{ fill: t.text, fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `L.E ${v}`} />
                <Tooltip content={<TooltipBox prefix="L.E " theme={theme} />} />
                <Bar dataKey="revenue" name="Revenue" radius={[6, 6, 0, 0]}>{revenueByDow.map((_, i) => <Cell key={i} fill={TOKEN.PALETTE[i % TOKEN.PALETTE.length]} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </Section>
        </>)}

        {/* ═══ PRODUCTS ═══ */}
        {activeTab === "products" && (<>
          <div className="analytics-stats-row" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
            <KPICard label="Unique Products Sold" value={topProducts.length} sub={`Top ${days} days`} accent={TOKEN.primary} icon={<Package size={18} color="#3b82f6" />} />
            <KPICard label="Total Items Sold" value={topProducts.reduce((s, p) => s + (p.total_sold || 0), 0)} sub="Across all products" accent={TOKEN.success} icon={<ShoppingCart size={18} color="#10b981" />} />
            <KPICard label="Top Product Revenue" value={topProducts.length > 0 ? fmtL(topProducts[0].total_revenue) : "L.E 0"} sub={topProducts[0]?.name || "—"} accent={TOKEN.warning} icon={<TrendingUp size={18} color="#f59e0b" />} />
          </div>
          <Section title="Top Products" subtitle="By revenue">
            <ResponsiveContainer width="100%" height={Math.max(300, topProducts.length * 40)}>
              <BarChart data={topProducts} layout="vertical" margin={{ left: 100 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={t.grid} />
                <XAxis type="number" tick={{ fill: t.text, fontSize: 10 }} tickFormatter={(v) => `L.E ${v}`} />
                <YAxis type="category" dataKey="name" tick={{ fill: t.text, fontSize: 11 }} width={120} />
                <Tooltip content={<TooltipBox prefix="L.E " theme={theme} />} />
                <Bar dataKey="total_revenue" name="Revenue" radius={[0, 6, 6, 0]}>{topProducts.map((_, i) => <Cell key={i} fill={TOKEN.PALETTE[i % TOKEN.PALETTE.length]} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </Section>
          {topProducts.length > 0 && (
            <Section title="Products Table">
              <div className="table-wrapper">
                <table className="analytics-table">
                  <thead><tr><th>Product</th><th>Price</th><th>Sold</th><th>Revenue</th></tr></thead>
                  <tbody>
                    {topProducts.map((p, i) => (
                      <tr key={p.id || i}>
                        <td className="cell-strong">{p.name}</td>
                        <td>{fmtL(p.price)}</td>
                        <td className="cell-center">{p.total_sold}</td>
                        <td className="cell-green">{fmtL(p.total_revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          )}
        </>)}

        {/* ═══ CUSTOMERS ═══ */}
        {activeTab === "customers" && (<>
          <div className="analytics-stats-row" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
            <KPICard label="New Users" value={newUsers.length} sub={`Last ${days} days`} accent={TOKEN.success} icon={<Users size={18} color="#10b981" />} />
            <KPICard label="Unique Buyers" value={topBuyers.length} sub="Active customers" accent={TOKEN.primary} icon={<Users2 size={18} color="#3b82f6" />} />
            <KPICard label="Top Buyer Spent" value={topBuyers.length > 0 ? fmtL(topBuyers[0].totalSpent) : "L.E 0"} sub={topBuyers[0]?.username || "—"} accent={TOKEN.warning} icon={<DollarSign size={18} color="#f59e0b" />} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <Section title="Top Buyers" subtitle="By total spent">
              <div className="table-wrapper">
                <table className="analytics-table">
                  <thead><tr><th>#</th><th>Customer</th><th>Spent</th><th>Orders</th></tr></thead>
                  <tbody>
                    {topBuyers.map((b, i) => (
                      <tr key={i}><td className="cell-center">{i + 1}</td><td className="cell-strong">{b.username}</td><td className="cell-green">{fmtL(b.totalSpent)}</td><td className="cell-center">{b.orderCount}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
            <Section title="New Users" subtitle={`Last ${days} days`}>
              <div className="table-wrapper" style={{ maxHeight: 400, overflowY: "auto" }}>
                <table className="analytics-table">
                  <thead><tr><th>Username</th><th>Email</th><th>Joined</th></tr></thead>
                  <tbody>
                    {newUsers.slice(0, 30).map((u, i) => (
                      <tr key={u.id || i}><td className="cell-strong">{u.username}</td><td>{u.email}</td><td>{u.date_joined?.slice(0, 10)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          </div>
        </>)}

        {/* ═══ COMMISSION & SELLERS ═══ */}
        {activeTab === "commission" && (<>
          <div className="analytics-stats-row" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
            <KPICard label="Total Revenue (30d)" value={fmtL(sellerEarnings.summary?.total_revenue_30d)} sub="All seller revenue" accent={TOKEN.primary} icon={<DollarSign size={18} color="#22c55e" />} />
            <KPICard label="Platform Commission (30d)" value={fmtL(sellerEarnings.summary?.total_commission_30d)} sub="Commission earned" accent={TOKEN.warning} icon={<DollarSign size={18} color="#c9a24b" />} />
            <KPICard label="Active Sellers" value={sellerEarnings.earnings?.length || 0} sub="Registered sellers" accent={TOKEN.success} icon={<Users2 size={18} color="#3b82f6" />} />
          </div>
          <div style={{ display: "flex", gap: 16, padding: "14px 20px", borderRadius: 10, background: "var(--bg-card, rgba(255,255,255,0.04))", border: "1px solid var(--border-color)", flexWrap: "wrap" }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Total Revenue: <span style={{ color: TOKEN.primary }}>{fmtL(sellerEarnings.summary?.total_revenue_30d)}</span></div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Platform Commission: <span style={{ color: TOKEN.warning }}>{fmtL(sellerEarnings.summary?.total_commission_30d)}</span></div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Total Payouts: <span style={{ color: TOKEN.success }}>{fmtL(fmt(sellerEarnings.summary?.total_revenue_30d) - fmt(sellerEarnings.summary?.total_commission_30d))}</span></div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", borderRadius: 10, background: "var(--bg-card, rgba(255,255,255,0.04))", border: "1px solid var(--border-color)", flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Default Commission Rate:</span>
            <input type="number" step="0.01" min="0" max="100" value={globalCommissionRate} onChange={(e) => setGlobalCommissionRate(e.target.value)} style={{ width: 80, padding: "4px 8px", fontSize: 13 }} />
            <span style={{ fontSize: 13 }}>%</span>
            <button className="button button--small button--primary" onClick={handleSaveGlobalCommission} disabled={savingCommission}>{savingCommission ? "Saving..." : "Save"}</button>
          </div>
          {sellerEarnings.earnings?.length > 0 ? (
            <Section title={`Seller Earnings (${sellerEarnings.earnings.length})`}>
              <div className="table-wrapper">
                <table className="analytics-table">
                  <thead><tr><th>Seller</th><th>Delivery</th><th>Commission</th><th>Revenue (30d)</th><th>Commission (30d)</th><th>Payout</th><th>Orders</th></tr></thead>
                  <tbody>
                    {sellerEarnings.earnings.map((s, i) => (
                      <tr key={s.seller_id || i}>
                        <td className="cell-strong">{s.business_name || "—"}</td>
                        <td className="cell-center">{s.delivery_type || "—"}</td>
                        <td className="cell-accent">{s.commission_rate != null ? `${num(s.commission_rate)}%` : "—"}</td>
                        <td className="cell-green">{fmtL(s.total_revenue_30d)}</td>
                        <td className="cell-green">{fmtL(s.total_commission_30d)}</td>
                        <td>{fmtL(s.seller_payout_30d)}</td>
                        <td className="cell-center">{s.total_orders_30d || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          ) : <p className="empty-state">No seller earnings data</p>}
        </>)}

        {/* ═══ COUPONS ═══ */}
        {activeTab === "coupons" && (<>
          <Section title="Create Coupon">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, marginBottom: 16 }}>
              {[
                { label: "Code", key: "code", type: "text", placeholder: "e.g. SUMMER25" },
                { label: "Discount Type", key: "discount_type", type: "select", options: [{ value: "percentage", label: "Percentage (%)" }, { value: "fixed", label: "Fixed Amount" }] },
                { label: "Discount Value", key: "discount_value", type: "number", placeholder: "e.g. 25" },
                { label: "Min Order Amount", key: "min_order_amount", type: "number", placeholder: "Optional" },
                { label: "Max Discount Amount", key: "max_discount_amount", type: "number", placeholder: "Optional" },
                { label: "Max Total Uses", key: "max_uses_total", type: "number", placeholder: "Unlimited" },
                { label: "Expiry Date", key: "expires_at", type: "datetime-local" },
              ].map((field) => (
                <div key={field.key}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>{field.label}</label>
                  {field.type === "select" ? (
                    <select value={couponForm[field.key]} onChange={(e) => setCouponForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                      className="analytics-input">
                      {field.options.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                  ) : (
                    <input type={field.type} value={couponForm[field.key]} placeholder={field.placeholder}
                      onChange={(e) => setCouponForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                      className="analytics-input" />
                  )}
                </div>
              ))}
            </div>
            <button className="button button--small button--primary" onClick={handleCreateCoupon}
              disabled={!couponForm.code || !couponForm.discount_value}
              style={{ cursor: couponForm.code && couponForm.discount_value ? "pointer" : "not-allowed", opacity: couponForm.code && couponForm.discount_value ? 1 : 0.5 }}>
              Create Coupon
            </button>
          </Section>
          <Section title={`Coupons (${coupons.length})`}>
            {coupons.length > 0 ? (
              <div className="table-wrapper">
                <table className="analytics-table">
                  <thead><tr><th>Code</th><th>Type</th><th>Value</th><th>Used</th><th>Max Uses</th><th>Active</th><th>Actions</th></tr></thead>
                  <tbody>
                    {coupons.map((c) => (
                      <tr key={c.id}>
                        <td className="cell-strong">{c.code}</td>
                        <td className="cell-center">{c.discount_type}</td>
                        <td className="cell-green">{c.discount_type === "percentage" ? `${c.discount_value}%` : fmtL(c.discount_value)}</td>
                        <td className="cell-center">{c.times_used || 0}</td>
                        <td className="cell-center">{c.max_uses_total || "∞"}</td>
                        <td className="cell-center">
                          <span className={`badge ${c.is_active ? "approved" : "pending"}`} style={{ cursor: "pointer" }} onClick={() => toggleCouponActive(c.id, c.is_active)}>
                            {c.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td><button className="button button--small button--danger" onClick={() => deleteCoupon(c.id)}>Delete</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="empty-state">No coupons created yet</p>}
          </Section>
        </>)}

        {/* ═══ RAW DATA ═══ */}
        {activeTab === "tables" && (<>
          <Section title="Recent Purchases" subtitle={`Last ${days} days — ${purchases.length} records`}>
            <div className="table-wrapper" style={{ maxHeight: 500, overflowY: "auto" }}>
              <table className="analytics-table">
                <thead><tr><th>Order</th><th>User</th><th>Product</th><th>Qty</th><th>Unit Price</th><th>Subtotal</th><th>Date</th></tr></thead>
                <tbody>
                  {purchases.map((p, i) => (
                    <tr key={i}>
                      <td className="cell-strong">#{p.order_id}</td>
                      <td>{p.username}</td>
                      <td>{p.product_name}</td>
                      <td className="cell-center">{p.quantity}</td>
                      <td>{fmtL(p.unit_price)}</td>
                      <td className="cell-green">{fmtL(p.subtotal)}</td>
                      <td>{p.order_date?.slice(0, 10)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
          <Section title="All Orders" subtitle={`${allOrders.length} orders`}>
            <div className="table-wrapper" style={{ maxHeight: 500, overflowY: "auto" }}>
              <table className="analytics-table">
                <thead><tr><th>ID</th><th>User</th><th>Status</th><th>Total</th><th>Date</th></tr></thead>
                <tbody>
                  {allOrders.slice(0, 50).map((o) => (
                    <tr key={o.id}>
                      <td className="cell-strong">#{o.id}</td>
                      <td>{o.owner_detail?.username || "—"}</td>
                      <td className="cell-center"><span className={`badge ${o.status}`}>{o.status || "—"}</span></td>
                      <td className="cell-green">{fmtL(o.total_price)}</td>
                      <td>{o.created_at?.slice(0, 10)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        </>)}
      </div>
    </div>
  );
};

export default AdminAnalytics;
