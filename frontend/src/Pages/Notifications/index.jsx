import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck, Package, Truck, CreditCard, UserCheck, AlertTriangle, XCircle, ChevronRight } from "lucide-react";
import api from "../../services/api";
import "./css/style.scss";

const NOTIFICATION_ICONS = {
  order_confirmed: <Package size={20} />,
  order_shipped: <Truck size={20} />,
  order_delivered: <Package size={20} />,
  order_cancelled: <XCircle size={20} />,
  payment_received: <CreditCard size={20} />,
  seller_approved: <UserCheck size={20} />,
  seller_rejected: <AlertTriangle size={20} />,
  product_approved: <Package size={20} />,
  product_rejected: <AlertTriangle size={20} />,
  payout_processed: <CreditCard size={20} />,
  system: <Bell size={20} />,
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState({ total: 0, unread: 0 });
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();
    fetchCount();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await api.get("/api/notifications/");
      setNotifications(response.data.results || response.data);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCount = async () => {
    try {
      const response = await api.get("/api/notifications/count/");
      setCount(response.data);
    } catch (err) {
      console.error("Failed to fetch count:", err);
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.post("/api/notifications/mark-read/", { notification_id: id });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setCount((prev) => ({ ...prev, unread: Math.max(0, prev.unread - 1) }));
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.post("/api/notifications/mark-read/", {});
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setCount((prev) => ({ ...prev, unread: 0 }));
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const handleClick = (notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="notifications-page">
        <div className="notifications-loading">
          <div className="notifications-loading__spinner" />
          <p>Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="notifications-page">
      <div className="notifications-header">
        <div className="notifications-header__left">
          <Bell size={24} />
          <h1>Notifications</h1>
          {count.unread > 0 && (
            <span className="notifications-badge">{count.unread}</span>
          )}
        </div>
        {count.unread > 0 && (
          <button className="notifications-mark-all" onClick={markAllAsRead}>
            <CheckCheck size={16} />
            Mark all as read
          </button>
        )}
      </div>

      <div className="notifications-list">
        {notifications.length === 0 ? (
          <div className="notifications-empty">
            <Bell size={48} />
            <h3>No notifications yet</h3>
            <p>You'll see updates about your orders and account here.</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`notifications-item ${!notification.is_read ? "unread" : ""}`}
              onClick={() => handleClick(notification)}
            >
              <div className="notifications-item__icon">
                {NOTIFICATION_ICONS[notification.notification_type] || <Bell size={20} />}
              </div>
              <div className="notifications-item__content">
                <div className="notifications-item__header">
                  <h4>{notification.title}</h4>
                  <span className="notifications-item__time">
                    {formatTime(notification.created_at)}
                  </span>
                </div>
                <p>{notification.message}</p>
              </div>
              {notification.link && (
                <div className="notifications-item__arrow">
                  <ChevronRight size={16} />
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
