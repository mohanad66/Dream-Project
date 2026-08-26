import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { FaShoppingCart, FaHeart, FaBell } from "react-icons/fa";
import { ACCESS_TOKEN } from "../../services/constants";
import api from "../../services/api";
import "./css/style.scss";

export default function TopBar() {
  const location = useLocation();
  const [cartCount, setCartCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);

  const access = localStorage.getItem(ACCESS_TOKEN);
  const isLoggedIn = access && access.trim() !== "";

  // Sync cart count from localStorage
  useEffect(() => {
    const updateCartCount = () => {
      const cart = JSON.parse(localStorage.getItem("cart")) || [];
      const count = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
      setCartCount(count);
    };

    updateCartCount();
    window.addEventListener("cart-updated", updateCartCount);
    window.addEventListener("storage", updateCartCount);
    return () => {
      window.removeEventListener("cart-updated", updateCartCount);
      window.removeEventListener("storage", updateCartCount);
    };
  }, []);

  // Poll notification count when logged in
  useEffect(() => {
    if (!isLoggedIn) return;
    const fetchCount = async () => {
      try {
        const response = await api.get("/api/notifications/count/");
        setUnreadCount(response.data.unread || 0);
      } catch (err) {}
    };
    fetchCount();
    const interval = setInterval(fetchCount, 60000);
    return () => clearInterval(interval);
  }, [isLoggedIn]);

  const items = [
    { to: "/cart", icon: <FaShoppingCart />, badge: cartCount, label: "Cart" },
    ...(isLoggedIn
      ? [
          { to: "/wishlist", icon: <FaHeart />, badge: 0, label: "Wishlist" },
          { to: "/notifications", icon: <FaBell />, badge: unreadCount, label: "Notifications" },
        ]
      : []),
  ];

  return (
    <div className="topbar">
      <div className="topbar-inner">
        {items.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={`topbar-btn ${location.pathname === item.to ? "active" : ""}`}
          >
            <span className="topbar-icon">
              {item.icon}
              {item.badge > 0 && (
                <span className="topbar-badge">{item.badge > 99 ? "99+" : item.badge}</span>
              )}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
