import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getNewUsers, getTopProducts, getPurchases } from '../services/analyticsService';
import { ACCESS_TOKEN } from '../services/constants';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, ComposedChart,
  Scatter, ScatterChart, Treemap,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine
} from 'recharts';
import {
  LayoutDashboard,
  TrendingUp,
  Package,
  Users,
  Settings2,
  Table2,
  DollarSign,
  ShoppingCart,
  CalendarDays,
  UserPlus,
  Trophy,
  Repeat2,
  PackageCheck,
  Clock,
  XCircle,
} from "lucide-react";

import "../css/Analytics.scss"
/* ─────────────────────────────────────────────
   Theme helpers — stay in sync with site body class
───────────────────────────────────────────── */
const getSiteTheme = () =>
  document.body.classList.contains('dark-theme') ? 'dark' : 'light';

/* ─────────────────────────────────────────────
   Design tokens (mirrored from CSS vars so
   Recharts can consume them as JS values)
───────────────────────────────────────────── */
const TOKEN = {
  primary: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  purple: '#8b5cf6',
  cyan: '#06b6d4',
  pink: '#ec4899',
  orange: '#f97316',
  PALETTE: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899'],
};

/* ─────────────────────────────────────────────
   Recharts theme-aware helpers
───────────────────────────────────────────── */
const chartTheme = (theme) => ({
  grid: theme === 'dark' ? '#374151' : '#e5e7eb',
  text: theme === 'dark' ? '#9ca3af' : '#6b7280',
  bg: theme === 'dark' ? '#1e293b' : '#ffffff',
  border: theme === 'dark' ? '#374151' : '#e5e7eb',
});

/* ─────────────────────────────────────────────
   Custom Tooltip
───────────────────────────────────────────── */
const CustomTooltip = ({ active, payload, label, prefix = '', suffix = '', theme }) => {
  if (!active || !payload?.length) return null;
  const t = chartTheme(theme);
  return (
    <div style={{
      background: t.bg,
      border: `1px solid ${t.border}`,
      borderRadius: 10,
      padding: '10px 14px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      minWidth: 140,
    }}>
      <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: t.text }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ margin: '2px 0', fontSize: 13, fontWeight: 600, color: "#000" }}>
          {p.name}: {prefix}{typeof p.value === 'number' ? p.value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : p.value}{suffix}
        </p>
      ))}
    </div>
  );
};

/* ─────────────────────────────────────────────
   KPI Card
───────────────────────────────────────────── */
const KPICard = ({ label, value, sub, accent, icon, trend, trendLabel }) => (
  <div className="stat-card" style={{ borderLeftColor: accent }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div className="stat-label">{label}</div>
      <span style={{ fontSize: 20 }}>{icon}</span>
    </div>
    <div className="stat-value" style={{ color: accent }}>{value}</div>
    {trend !== undefined && (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
        <span style={{
          fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
          background: trend >= 0 ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
          color: trend >= 0 ? TOKEN.success : TOKEN.danger,
        }}>
          {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}%
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{trendLabel}</span>
      </div>
    )}
    <div className="stat-sub">{sub}</div>
  </div>
);

/* ─────────────────────────────────────────────
   Chart Section wrapper
───────────────────────────────────────────── */
const ChartCard = ({ title, subtitle, children, span = 1 }) => (
  <div className="analytics-section" style={{ gridColumn: `span ${span}` }}>
    <div className="section-header">
      <div>
        <h2 style={{ marginBottom: 0 }}>{title}</h2>
        {subtitle && <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>{subtitle}</p>}
      </div>
    </div>
    <div style={{ padding: '20px 20px 12px' }}>
      {children}
    </div>
  </div>
);

/* ─────────────────────────────────────────────
   Main Component
───────────────────────────────────────────── */
const AdminAnalytics = () => {
  const [newUsers, setNewUsers] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [topBuyers, setTopBuyers] = useState([]);
  const [topSellers, setTopSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [days, setDays] = useState(30);
  const [activeTab, setActiveTab] = useState('overview');
  const [theme, setTheme] = useState(getSiteTheme);

  useEffect(() => {
    const obs = new MutationObserver(() => setTheme(getSiteTheme()));
    obs.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  const toggleTheme = () => {
    const isDark = document.body.classList.contains('dark-theme');
    document.body.classList.toggle('dark-theme', !isDark);
    document.body.classList.toggle('light-theme', isDark);
    localStorage.setItem('theme', isDark ? 'light' : 'dark');
    setTheme(isDark ? 'light' : 'dark');
  };

  const fetchAllOrders = useCallback(async () => {
    try {
      const token = localStorage.getItem(ACCESS_TOKEN);
      if (!token) return;
      const res = await fetch('/api/admins/orders/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch orders');
      const data = await res.json();
      const arr = data.results || data;
      setAllOrders(Array.isArray(arr) ? arr : []);
    } catch (e) { console.error(e); }
  }, []);

  const calculateTopBuyers = useCallback((data) => {
    const map = {};
    data.forEach(p => {
      if (!map[p.username]) map[p.username] = { username: p.username, totalSpent: 0, orderCount: 0 };
      map[p.username].totalSpent += parseFloat(p.subtotal || 0);
      map[p.username].orderCount += 1;
    });
    return Object.values(map).sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 10);
  }, []);

  const calculateTopSellers = useCallback((data) => {
    const map = {};
    data.forEach(p => {
      const s = p.username || p.name || 'Unknown';
      if (!map[s]) map[s] = { name: s, totalRevenue: 0, itemsSold: 0, ordersCount: 0 };
      map[s].totalRevenue += parseFloat(p.subtotal || 0);
      map[s].itemsSold += p.quantity || 1;
      map[s].ordersCount += 1;
    });
    return Object.values(map).sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 10);
  }, []);

  const fetchAnalyticsData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [usersData, productsData, purchasesData] = await Promise.all([
        getNewUsers(days),
        getTopProducts(10, days),
        getPurchases(null, null, days),
      ]);
      const users = usersData.users || [];
      const products = productsData.products || [];
      const purArr = purchasesData.purchases || [];
      setNewUsers(users);
      setTopProducts(products);
      setPurchases(purArr);
      setTopBuyers(calculateTopBuyers(purArr));
      setTopSellers(calculateTopSellers(purArr));
      await fetchAllOrders();
    } catch (e) {
      setError(e.message || 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }, [days, calculateTopBuyers, calculateTopSellers, fetchAllOrders]);

  useEffect(() => { fetchAnalyticsData(); }, [fetchAnalyticsData]);

  /* ── Derived metrics ── */
  const totalRevenue = useMemo(
    () => purchases.reduce((s, p) => s + parseFloat(p.subtotal || 0), 0),
    [purchases]
  );

  const avgOrderValue = purchases.length ? totalRevenue / purchases.length : 0;

  /* Daily revenue for sparkline / area chart */
  const revenueTrend = useMemo(() => {
    const map = {};
    purchases.forEach(p => {
      const d = new Date(p.order_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      map[d] = (map[d] || 0) + parseFloat(p.subtotal || 0);
    });
    return Object.entries(map)
      .map(([date, revenue]) => ({ date, revenue: +revenue.toFixed(2) }))
      .slice(-14);
  }, [purchases]);

  /* Cumulative revenue */
  const cumulativeRevenue = useMemo(() => {
    let running = 0;
    return revenueTrend.map(r => {
      running += r.revenue;
      return { ...r, cumulative: +running.toFixed(2) };
    });
  }, [revenueTrend]);

  /* Daily new users */
  const userGrowth = useMemo(() => {
    const map = {};
    newUsers.forEach(u => {
      const d = new Date(u.date_joined).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      map[d] = (map[d] || 0) + 1;
    });
    return Object.entries(map).map(([date, count]) => ({ date, count })).slice(-14);
  }, [newUsers]);

  /* Order status pie */
  const orderStatusData = useMemo(() => {
    const map = {};
    allOrders.forEach(o => {
      const s = (o.status || 'pending').toLowerCase();
      map[s] = (map[s] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [allOrders]);

  /* Revenue by day-of-week */
  const revenueByDow = useMemo(() => {
    const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const map = Object.fromEntries(DAYS.map(d => [d, { day: d, revenue: 0, orders: 0 }]));
    purchases.forEach(p => {
      const d = DAYS[new Date(p.order_date).getDay()];
      map[d].revenue += parseFloat(p.subtotal || 0);
      map[d].orders += 1;
    });
    return DAYS.map(d => ({ ...map[d], revenue: +map[d].revenue.toFixed(2) }));
  }, [purchases]);

  /* Product revenue bar */
  const productRevenue = useMemo(() =>
    topProducts.slice(0, 8).map(p => ({
      name: p.name.length > 16 ? p.name.slice(0, 14) + '…' : p.name,
      revenue: +parseFloat(p.total_revenue || 0).toFixed(2),
      units: p.total_sold,
      price: +parseFloat(p.price).toFixed(2),
    })),
    [topProducts]
  );

  /* Seller comparison radar */
  const sellerRadar = useMemo(() =>
    topSellers.slice(0, 6).map(s => ({
      name: s.name.length > 12 ? s.name.slice(0, 10) + '…' : s.name,
      Revenue: +s.totalRevenue.toFixed(0),
      Items: s.itemsSold,
      Orders: s.ordersCount,
      AvgPrice: s.itemsSold ? +(s.totalRevenue / s.itemsSold).toFixed(2) : 0,
    })),
    [topSellers]
  );

  /* Buyer spend distribution */
  const buyerSpend = useMemo(() =>
    topBuyers.slice(0, 10).map(b => ({
      name: b.username,
      spent: +b.totalSpent.toFixed(2),
      orders: b.orderCount,
      avg: +(b.totalSpent / b.orderCount).toFixed(2),
    })),
    [topBuyers]
  );

  /* Hourly order heatmap (mock from order dates) */
  const hourlyActivity = useMemo(() => {
    const buckets = Array.from({ length: 24 }, (_, h) => ({ hour: `${h}:00`, orders: 0, revenue: 0 }));
    purchases.forEach(p => {
      const h = new Date(p.order_date).getHours();
      buckets[h].orders += 1;
      buckets[h].revenue += parseFloat(p.subtotal || 0);
    });
    return buckets.map(b => ({ ...b, revenue: +b.revenue.toFixed(2) }));
  }, [purchases]);

  /* Treemap data for product share */
  const productTreemap = useMemo(() =>
    topProducts.slice(0, 10).map(p => ({
      name: p.name.length > 14 ? p.name.slice(0, 12) + '…' : p.name,
      size: +parseFloat(p.total_revenue || 0).toFixed(2),
      fill: TOKEN.PALETTE[topProducts.indexOf(p) % TOKEN.PALETTE.length],
    })),
    [topProducts]
  );

  /* Profit margin per product */
  const profitMargins = useMemo(() =>
    topProducts.slice(0, 8).map(p => {
      const rev = parseFloat(p.total_revenue || 0);
      const cost = parseFloat(p.cost || 0);
      const profit = rev - cost;
      const margin = rev > 0 ? (profit / rev) * 100 : 0;
      return {
        name: p.name.length > 14 ? p.name.slice(0, 12) + '…' : p.name,
        revenue: +rev.toFixed(2),
        cost: +cost.toFixed(2),
        profit: +profit.toFixed(2),
        margin: +margin.toFixed(1),
      };
    }),
    [topProducts]
  );

  /* Shipping funnel */
  const shippingFunnel = useMemo(() => {
    const total = allOrders.length || 1;
    const statuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    return statuses.map(s => ({
      status: s.charAt(0).toUpperCase() + s.slice(1),
      count: allOrders.filter(o => o.status?.toLowerCase() === s).length,
      pct: +((allOrders.filter(o => o.status?.toLowerCase() === s).length / total) * 100).toFixed(1),
    }));
  }, [allOrders]);

  /* AOV over time */
  const aovTrend = useMemo(() => {
    const map = {};
    purchases.forEach(p => {
      const d = new Date(p.order_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (!map[d]) map[d] = { date: d, total: 0, count: 0 };
      map[d].total += parseFloat(p.subtotal || 0);
      map[d].count += 1;
    });
    return Object.values(map).map(v => ({ date: v.date, aov: +(v.total / v.count).toFixed(2) })).slice(-14);
  }, [purchases]);

  const t = chartTheme(theme);

  /* ─── Tab definitions ─── */
  const TABS = [
    { id: 'overview', label: 'Overview', Icon: LayoutDashboard },
    { id: 'revenue', label: 'Revenue', Icon: TrendingUp },
    { id: 'products', label: 'Products', Icon: Package },
    { id: 'customers', label: 'Customers', Icon: Users },
    { id: 'operations', label: 'Operations', Icon: Settings2 },
    { id: 'tables', label: 'Raw Data', Icon: Table2 },
  ];

  const getStatusBadge = (status) => {
    const map = {
      pending: { label: 'Pending', color: TOKEN.warning },
      processing: { label: 'Processing', color: TOKEN.primary },
      shipped: { label: 'Shipped', color: TOKEN.success },
      delivered: { label: 'Delivered', color: TOKEN.success },
      cancelled: { label: 'Cancelled', color: TOKEN.danger },
    };
    return map[status?.toLowerCase()] || { label: status || 'Unknown', color: '#6b7280' };
  };

  if (loading) return (
    <div className="analytics-loading">
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 48, height: 48, border: `3px solid var(--border-color)`,
          borderTop: `3px solid ${TOKEN.primary}`, borderRadius: '50%',
          animation: 'spin 0.8s linear infinite', margin: '0 auto 16px',
        }} />
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading analytics…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="analytics-error">
      <div className="analytics-error-card">
        <div className="error-icon">⚠</div>
        <div className="error-title">Failed to load</div>
        <div className="error-message">{error}</div>
        <button className="retry-btn" onClick={fetchAnalyticsData}>Retry</button>
      </div>
    </div>
  );

  return (
    <div className="analytics-root">

      {/* ── Top Bar ── */}
      <div className="analytics-topbar">
        <div className="analytics-brand">
          <div className="analytics-brand-dot" />
          <span className="analytics-brand-text">Analytics Dashboard</span>
        </div>

        <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 8,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: isActive ? TOKEN.primary : 'var(--bg-hover)',
                  color: isActive ? '#fff' : 'var(--text-color)',
                  transition: 'all 0.15s',
                }}
              >
                <tab.Icon size={14} />
                {tab.label}
              </button>
            );
          })}
          <div className="analytics-controls">
            <label htmlFor="days-filter">Period:</label>
            <select id="days-filter" value={days} onChange={e => setDays(parseInt(e.target.value))}>
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
              <option value={365}>Last year</option>
            </select>
          </div>
        </div>

      </div>

      <div className="analytics-container">

        {/* ══════════════════════════════════════════
            OVERVIEW TAB
        ══════════════════════════════════════════ */}
        {activeTab === 'overview' && (
          <>
            {/* KPI Row */}
            <div className="analytics-stats-row" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
              <KPICard label="Gross Revenue" value={`$${totalRevenue.toFixed(2)}`} sub="Before costs" accent={TOKEN.primary} icon={<DollarSign size={18} color="#22c55e" />} />
              <KPICard label="Total Purchases" value={purchases.length} sub="Transactions" accent={TOKEN.success} icon={<ShoppingCart size={18} color="#3b82f6" />} />
              <KPICard label="Avg Order Value" value={`$${avgOrderValue.toFixed(2)}`} sub="Per transaction" accent={TOKEN.warning} icon={<TrendingUp size={18} color="#f59e0b" />} />
              <KPICard label="Active Days" value={revenueTrend.length} sub="Days with sales" accent={TOKEN.purple} icon={<CalendarDays size={18} color="#a855f7" />} />
            </div>

            {/* Revenue + Users side by side */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <ChartCard title="Revenue Trend" subtitle={`Last ${days} days`}>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={cumulativeRevenue}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={TOKEN.primary} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={TOKEN.primary} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={t.grid} />
                    <XAxis dataKey="date" tick={{ fill: t.text, fontSize: 10 }} tickLine={false} />
                    <YAxis tick={{ fill: t.text, fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                    <Tooltip content={<CustomTooltip prefix="$" theme={theme} />} />
                    <Area type="monotone" dataKey="cumulative" stroke={TOKEN.primary} fill="url(#revGrad)" strokeWidth={2} name="Cumulative Rev" />
                    <Line type="monotone" dataKey="revenue" stroke={TOKEN.cyan} strokeWidth={2} dot={false} name="Daily Rev" />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="User Growth" subtitle="New registrations per day">
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={userGrowth}>
                    <defs>
                      <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={TOKEN.success} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={TOKEN.success} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={t.grid} />
                    <XAxis dataKey="date" tick={{ fill: t.text, fontSize: 10 }} tickLine={false} />
                    <YAxis tick={{ fill: t.text, fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip theme={theme} />} />
                    <Area type="monotone" dataKey="count" stroke={TOKEN.success} fill="url(#userGrad)" strokeWidth={2} name="New Users" />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            {/* Order Status + Revenue by DOW */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr', gap: 20 }}>
              <ChartCard title="Order Status" subtitle="All orders breakdown">
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie data={orderStatusData} cx="50%" cy="50%" innerRadius={55} outerRadius={90}
                      dataKey="value" label={({ name, pct }) => `${name}`} labelLine>
                      {orderStatusData.map((_, i) => (
                        <Cell key={i} fill={TOKEN.PALETTE[i % TOKEN.PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip theme={theme} />} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Revenue by Day of Week" subtitle="Best performing days">
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={revenueByDow}>
                    <CartesianGrid strokeDasharray="3 3" stroke={t.grid} />
                    <XAxis dataKey="day" tick={{ fill: t.text, fontSize: 11 }} tickLine={false} />
                    <YAxis tick={{ fill: t.text, fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                    <Tooltip content={<CustomTooltip prefix="$" theme={theme} />} />
                    <Bar dataKey="revenue" name="Revenue" radius={[6, 6, 0, 0]}>
                      {revenueByDow.map((_, i) => (
                        <Cell key={i} fill={TOKEN.PALETTE[i % TOKEN.PALETTE.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          </>
        )}

        {/* ══════════════════════════════════════════
            REVENUE TAB
        ══════════════════════════════════════════ */}
        {activeTab === 'revenue' && (
          <>
            <div className="analytics-stats-row" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
              <KPICard label="Gross Revenue" value={`$${totalRevenue.toFixed(2)}`} sub="Before costs" accent={TOKEN.primary} icon={<DollarSign size={18} color="#22c55e" />} />
              <KPICard label="Total Purchases" value={purchases.length} sub="Transactions" accent={TOKEN.success} icon={<ShoppingCart size={18} color="#3b82f6" />} />
              <KPICard label="Avg Order Value" value={`$${avgOrderValue.toFixed(2)}`} sub="Per transaction" accent={TOKEN.warning} icon={<TrendingUp size={18} color="#f59e0b" />} />
              <KPICard label="Active Days" value={revenueTrend.length} sub="Days with sales" accent={TOKEN.purple} icon={<CalendarDays size={18} color="#a855f7" />} />
            </div>

            <ChartCard title="Daily vs Cumulative Revenue" subtitle="Growth trajectory" span={1}>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={cumulativeRevenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke={t.grid} />
                  <XAxis dataKey="date" tick={{ fill: t.text, fontSize: 10 }} tickLine={false} />
                  <YAxis yAxisId="left" tick={{ fill: t.text, fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fill: t.text, fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                  <Tooltip content={<CustomTooltip prefix="$" theme={theme} />} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="revenue" name="Daily Revenue" fill={TOKEN.primary} opacity={0.7} radius={[4, 4, 0, 0]} />
                  <Line yAxisId="right" dataKey="cumulative" name="Cumulative Revenue" stroke={TOKEN.orange} strokeWidth={2.5} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartCard>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <ChartCard title="Average Order Value Trend" subtitle="AOV over time">
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={aovTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke={t.grid} />
                    <XAxis dataKey="date" tick={{ fill: t.text, fontSize: 10 }} tickLine={false} />
                    <YAxis tick={{ fill: t.text, fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                    <Tooltip content={<CustomTooltip prefix="$" theme={theme} />} />
                    <ReferenceLine y={avgOrderValue} stroke={TOKEN.danger} strokeDasharray="4 4" label={{ value: 'Avg', fill: TOKEN.danger, fontSize: 10 }} />
                    <Line type="monotone" dataKey="aov" stroke={TOKEN.purple} strokeWidth={2.5} dot={{ r: 3, fill: TOKEN.purple }} name="AOV" />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Revenue by Day of Week" subtitle="Peak revenue days">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={revenueByDow}>
                    <CartesianGrid strokeDasharray="3 3" stroke={t.grid} />
                    <XAxis dataKey="day" tick={{ fill: t.text, fontSize: 11 }} tickLine={false} />
                    <YAxis tick={{ fill: t.text, fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                    <Tooltip content={<CustomTooltip prefix="$" theme={theme} />} />
                    <Legend />
                    <Bar dataKey="revenue" name="Revenue" fill={TOKEN.primary} radius={[6, 6, 0, 0]} />
                    <Bar dataKey="orders" name="Orders" fill={TOKEN.cyan} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            <ChartCard title="Hourly Order Activity" subtitle="When do customers buy?">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={hourlyActivity}>
                  <defs>
                    <linearGradient id="hourGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={TOKEN.cyan} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={TOKEN.cyan} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={t.grid} />
                  <XAxis dataKey="hour" tick={{ fill: t.text, fontSize: 9 }} tickLine={false} interval={2} />
                  <YAxis tick={{ fill: t.text, fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip theme={theme} />} />
                  <Area type="monotone" dataKey="orders" stroke={TOKEN.cyan} fill="url(#hourGrad)" strokeWidth={2} name="Orders" />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
          </>
        )}

        {/* ══════════════════════════════════════════
            PRODUCTS TAB
        ══════════════════════════════════════════ */}
        {activeTab === 'products' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
              <ChartCard title="Product Revenue Comparison" subtitle="Top 8 by revenue">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={productRevenue} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke={t.grid} horizontal={false} />
                    <XAxis type="number" tick={{ fill: t.text, fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                    <YAxis type="category" dataKey="name" width={110} tick={{ fill: t.text, fontSize: 11 }} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip prefix="$" theme={theme} />} />
                    <Legend />
                    <Bar dataKey="revenue" name="Revenue" fill={TOKEN.primary} radius={[0, 6, 6, 0]}>
                      {productRevenue.map((_, i) => <Cell key={i} fill={TOKEN.PALETTE[i % TOKEN.PALETTE.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Revenue Share" subtitle="Market share by product">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={productTreemap} dataKey="size" cx="50%" cy="50%" outerRadius={100} label={({ name }) => name} labelLine>
                      {productTreemap.map((e, i) => <Cell key={i} fill={e.fill} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip prefix="$" theme={theme} />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            <ChartCard title="Profit Margin Analysis" subtitle="Revenue vs Cost vs Profit per product">
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={profitMargins}>
                  <CartesianGrid strokeDasharray="3 3" stroke={t.grid} />
                  <XAxis dataKey="name" tick={{ fill: t.text, fontSize: 10 }} tickLine={false} />
                  <YAxis yAxisId="left" tick={{ fill: t.text, fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fill: t.text, fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
                  <Tooltip content={<CustomTooltip prefix="$" theme={theme} />} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="revenue" name="Revenue" fill={TOKEN.primary} opacity={0.8} radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="left" dataKey="cost" name="Cost" fill={TOKEN.danger} opacity={0.7} radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="left" dataKey="profit" name="Profit" fill={TOKEN.success} opacity={0.9} radius={[4, 4, 0, 0]} />
                  <Line yAxisId="right" dataKey="margin" name="Margin %" stroke={TOKEN.warning} strokeWidth={2.5} dot={{ r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Units Sold vs Unit Price" subtitle="Volume & price relationship">
              <ResponsiveContainer width="100%" height={260}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke={t.grid} />
                  <XAxis dataKey="units" name="Units Sold" tick={{ fill: t.text, fontSize: 10 }} tickLine={false} label={{ value: 'Units Sold', position: 'insideBottom', offset: -5, fill: t.text, fontSize: 11 }} />
                  <YAxis dataKey="price" name="Unit Price" tick={{ fill: t.text, fontSize: 10 }} tickLine={false} axisLine={false} label={{ value: 'Price ($)', angle: -90, position: 'insideLeft', fill: t.text, fontSize: 11 }} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip prefix="$" theme={theme} />} />
                  <Scatter data={productRevenue} name="Products" fill={TOKEN.purple} />
                </ScatterChart>
              </ResponsiveContainer>
            </ChartCard>
          </>
        )}

        {/* ══════════════════════════════════════════
            CUSTOMERS TAB
        ══════════════════════════════════════════ */}
        {activeTab === 'customers' && (
          <>
            <div className="analytics-stats-row" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
              <KPICard label="New Users" value={newUsers.length} sub={`Last ${days} days`} accent={TOKEN.success} icon={<UserPlus size={18} color="#22c55e" />} />
              <KPICard label="Top Buyer Spend" value={`$${topBuyers[0]?.totalSpent?.toFixed(2) || 0}`} sub={topBuyers[0]?.username || '—'} accent={TOKEN.primary} icon={<Trophy size={18} color="#eab308" />} />
              <KPICard label="Repeat Buyers" value={topBuyers.filter(b => b.orderCount > 1).length} sub="Ordered more than once" accent={TOKEN.purple} icon={<Repeat2 size={18} color="#a855f7" />} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <ChartCard title="Top 10 Buyers by Spend" subtitle="Lifetime value ranking">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={buyerSpend} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke={t.grid} horizontal={false} />
                    <XAxis type="number" tick={{ fill: t.text, fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                    <YAxis type="category" dataKey="name" width={90} tick={{ fill: t.text, fontSize: 11 }} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip prefix="$" theme={theme} />} />
                    <Bar dataKey="spent" name="Total Spent" radius={[0, 6, 6, 0]}>
                      {buyerSpend.map((_, i) => <Cell key={i} fill={TOKEN.PALETTE[i % TOKEN.PALETTE.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Buyer: Spend vs Orders" subtitle="Engagement scatter">
                <ResponsiveContainer width="100%" height={300}>
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" stroke={t.grid} />
                    <XAxis dataKey="orders" name="Orders" tick={{ fill: t.text, fontSize: 10 }} tickLine={false} label={{ value: '# Orders', position: 'insideBottom', offset: -5, fill: t.text, fontSize: 11 }} />
                    <YAxis dataKey="spent" name="Total Spent" tick={{ fill: t.text, fontSize: 10 }} tickLine={false} axisLine={false} label={{ value: 'Spent ($)', angle: -90, position: 'insideLeft', fill: t.text, fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip prefix="$" theme={theme} />} />
                    <Scatter data={buyerSpend} name="Buyers" fill={TOKEN.success} />
                  </ScatterChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            <ChartCard title="New User Registrations" subtitle="Growth over time">
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={userGrowth}>
                  <defs>
                    <linearGradient id="ug2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={TOKEN.success} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={TOKEN.success} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={t.grid} />
                  <XAxis dataKey="date" tick={{ fill: t.text, fontSize: 10 }} tickLine={false} />
                  <YAxis tick={{ fill: t.text, fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip theme={theme} />} />
                  <Area type="monotone" dataKey="count" stroke={TOKEN.success} fill="url(#ug2)" strokeWidth={2} name="New Users" />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            {topSellers.length > 2 && (
              <ChartCard title="Seller Performance Radar" subtitle="Multidimensional comparison">
                <ResponsiveContainer width="100%" height={320}>
                  <RadarChart data={sellerRadar}>
                    <PolarGrid stroke={t.grid} />
                    <PolarAngleAxis dataKey="name" tick={{ fill: t.text, fontSize: 10 }} />
                    <PolarRadiusAxis tick={{ fill: t.text, fontSize: 8 }} axisLine={false} />
                    <Radar name="Revenue" dataKey="Revenue" stroke={TOKEN.primary} fill={TOKEN.primary} fillOpacity={0.25} />
                    <Radar name="Items" dataKey="Items" stroke={TOKEN.success} fill={TOKEN.success} fillOpacity={0.25} />
                    <Legend />
                    <Tooltip content={<CustomTooltip theme={theme} />} />
                  </RadarChart>
                </ResponsiveContainer>
              </ChartCard>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════
            OPERATIONS TAB
        ══════════════════════════════════════════ */}
        {activeTab === 'operations' && (
          <>
            <div className="analytics-stats-row" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
              <KPICard label="Total Orders" value={allOrders.length} sub="All time" accent={TOKEN.primary} icon={<Package size={18} color="#3b82f6" />} />
              <KPICard label="Shipped" value={allOrders.filter(o => ['shipped', 'delivered'].includes(o.status?.toLowerCase())).length} sub="Completed" accent={TOKEN.success} icon={<PackageCheck size={18} color="#22c55e" />} />
              <KPICard label="Pending" value={allOrders.filter(o => o.status?.toLowerCase() === 'pending').length} sub="Awaiting" accent={TOKEN.warning} icon={<Clock size={18} color="#f59e0b" />} />
              <KPICard label="Cancelled" value={allOrders.filter(o => o.status?.toLowerCase() === 'cancelled').length} sub="Lost orders" accent={TOKEN.danger} icon={<XCircle size={18} color="#ef4444" />} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <ChartCard title="Order Status Distribution" subtitle="Current fulfillment pipeline">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={orderStatusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100}
                      dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine>
                      {orderStatusData.map((_, i) => <Cell key={i} fill={TOKEN.PALETTE[i % TOKEN.PALETTE.length]} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip theme={theme} />} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Fulfillment Funnel" subtitle="Order pipeline breakdown">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={shippingFunnel} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke={t.grid} horizontal={false} />
                    <XAxis type="number" tick={{ fill: t.text, fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="status" width={85} tick={{ fill: t.text, fontSize: 11 }} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip theme={theme} />} />
                    <Bar dataKey="count" name="Orders" radius={[0, 6, 6, 0]}>
                      {shippingFunnel.map((_, i) => <Cell key={i} fill={TOKEN.PALETTE[i % TOKEN.PALETTE.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            <ChartCard title="Hourly Order Volume" subtitle="Peak hours analysis — plan your staffing">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={hourlyActivity}>
                  <CartesianGrid strokeDasharray="3 3" stroke={t.grid} />
                  <XAxis dataKey="hour" tick={{ fill: t.text, fontSize: 9 }} tickLine={false} interval={1} />
                  <YAxis tick={{ fill: t.text, fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip theme={theme} />} />
                  <Bar dataKey="orders" name="Orders" radius={[4, 4, 0, 0]}>
                    {hourlyActivity.map((d, i) => <Cell key={i} fill={d.orders > 0 ? TOKEN.primary : t.grid} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </>
        )}

        {/* ══════════════════════════════════════════
            RAW DATA TAB
        ══════════════════════════════════════════ */}
        {activeTab === 'tables' && (
          <>
            {/* Top Buyers */}
            <div className="analytics-section">
              <div className="section-header">
                <h2>Top Buyers <span className="badge">{topBuyers.length}</span></h2>
              </div>
              {topBuyers.length > 0 ? (
                <div className="table-wrapper">
                  <table className="analytics-table">
                    <thead><tr><th>Rank</th><th>Username</th><th>Total Spent</th><th>Orders</th><th>Avg Order</th></tr></thead>
                    <tbody>
                      {topBuyers.map((b, i) => (
                        <tr key={b.username}>
                          <td><span className="rank-number">{i + 1}</span></td>
                          <td className="cell-strong">{b.username}</td>
                          <td className="cell-green">${b.totalSpent.toFixed(2)}</td>
                          <td className="cell-center">{b.orderCount}</td>
                          <td>${(b.totalSpent / b.orderCount).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <p className="empty-state">No buyer data available</p>}
            </div>

            {/* Top Sellers */}
            <div className="analytics-section">
              <div className="section-header">
                <h2>Top Sellers <span className="badge">{topSellers.length}</span></h2>
              </div>
              {topSellers.length > 0 ? (
                <div className="table-wrapper">
                  <table className="analytics-table">
                    <thead><tr><th>Rank</th><th>Seller</th><th>Revenue</th><th>Items</th><th>Orders</th><th>Avg Price</th></tr></thead>
                    <tbody>
                      {topSellers.map((s, i) => (
                        <tr key={s.name}>
                          <td><span className="rank-number">{i + 1}</span></td>
                          <td className="cell-strong">{s.name}</td>
                          <td className="cell-green">${s.totalRevenue.toFixed(2)}</td>
                          <td className="cell-center">{s.itemsSold}</td>
                          <td className="cell-center">{s.ordersCount}</td>
                          <td>${(s.totalRevenue / s.itemsSold).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <p className="empty-state">No seller data available</p>}
            </div>

            {/* All Orders */}
            <div className="analytics-section">
              <div className="section-header">
                <h2>All Orders <span className="badge">{allOrders.length}</span></h2>
              </div>
              {allOrders.length > 0 ? (
                <div className="table-wrapper">
                  <table className="analytics-table orders-table">
                    <thead><tr><th>Order ID</th><th>Customer</th><th>Total</th><th>Status</th><th>Shipping</th><th>Date</th></tr></thead>
                    <tbody>
                      {allOrders.map(order => {
                        const si = getStatusBadge(order.status);
                        const shipped = ['shipped', 'delivered'].includes(order.status?.toLowerCase());
                        return (
                          <tr key={order.id}>
                            <td className="cell-accent">#{order.id}</td>
                            <td className="cell-strong">{order.owner_detail?.username || order.customer_name || 'N/A'}</td>
                            <td className="cell-green">${parseFloat(order.total || 0).toFixed(2)}</td>
                            <td><span className="status-badge" style={{ backgroundColor: si.color }}>{si.label}</span></td>
                            <td><span className={`shipping-badge ${shipped ? 'shipped' : ''}`}>{shipped ? '✓ Shipped' : '○ Pending'}</span></td>
                            <td className="cell-date">{new Date(order.created_at || order.order_date).toLocaleDateString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : <p className="empty-state">No orders found</p>}
            </div>

            {/* New Users */}
            <div className="analytics-section">
              <div className="section-header">
                <h2>New Users <span className="badge">{newUsers.length}</span></h2>
              </div>
              {newUsers.length > 0 ? (
                <div className="table-wrapper">
                  <table className="analytics-table">
                    <thead><tr><th>ID</th><th>Username</th><th>Email</th><th>Full Name</th><th>Joined</th></tr></thead>
                    <tbody>
                      {newUsers.map(u => (
                        <tr key={u.id}>
                          <td className="cell-id">#{u.id}</td>
                          <td className="cell-strong">{u.username}</td>
                          <td className="cell-muted">{u.email}</td>
                          <td>{`${u.first_name} ${u.last_name}`.trim() || '—'}</td>
                          <td className="cell-date">{new Date(u.date_joined).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <p className="empty-state">No new users in this period</p>}
            </div>

            {/* Top Products */}
            <div className="analytics-section">
              <div className="section-header">
                <h2>Top Products <span className="badge">{topProducts.length}</span></h2>
              </div>
              {topProducts.length > 0 ? (
                <div className="table-wrapper">
                  <table className="analytics-table">
                    <thead><tr><th>#</th><th>Product</th><th>Price</th><th>Units Sold</th><th>Revenue</th><th>Margin</th></tr></thead>
                    <tbody>
                      {topProducts.map((p, i) => {
                        const rev = parseFloat(p.total_revenue || 0);
                        const cost = parseFloat(p.cost || 0);
                        const margin = rev > 0 ? ((rev - cost) / rev * 100).toFixed(1) : '—';
                        return (
                          <tr key={p.id}>
                            <td><span className="rank-number">{i + 1}</span></td>
                            <td className="cell-strong">{p.name}</td>
                            <td>${parseFloat(p.price).toFixed(2)}</td>
                            <td className="cell-center">{p.total_sold}</td>
                            <td className="cell-green">${rev.toFixed(2)}</td>
                            <td className="cell-accent">{margin !== '—' ? `${margin}%` : '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : <p className="empty-state">No products sold in this period</p>}
            </div>

            {/* Purchases */}
            <div className="analytics-section">
              <div className="section-header">
                <h2>Recent Purchases <span className="badge">{purchases.length}</span></h2>
              </div>
              {purchases.length > 0 ? (
                <div className="table-wrapper">
                  <table className="analytics-table">
                    <thead><tr><th>Order</th><th>Customer</th><th>Product</th><th>Qty</th><th>Unit Price</th><th>Subtotal</th><th>Date</th></tr></thead>
                    <tbody>
                      {purchases.map((p, i) => (
                        <tr key={`${p.order_id}-${i}`}>
                          <td className="cell-accent">#{p.order_id}</td>
                          <td className="cell-strong">{p.username}</td>
                          <td>{p.product_name}</td>
                          <td className="cell-center">{p.quantity}</td>
                          <td>${parseFloat(p.unit_price).toFixed(2)}</td>
                          <td className="cell-green">${parseFloat(p.subtotal).toFixed(2)}</td>
                          <td className="cell-date">{new Date(p.order_date).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <p className="empty-state">No purchases in this period</p>}
            </div>
          </>
        )}

      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default AdminAnalytics;