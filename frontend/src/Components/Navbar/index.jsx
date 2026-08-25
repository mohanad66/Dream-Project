import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  FaHome,
  FaShoppingCart,
  FaUserCircle,
  FaBoxOpen,
  FaChartBar,
  FaHeart,
  FaBell,
} from "react-icons/fa";
import { IoLogOut, IoLogIn, IoPersonAdd } from "react-icons/io5";
import { FaStore, FaStoreAlt, FaUserTie } from "react-icons/fa";
import { ACCESS_TOKEN } from "../../services/constants";
import { useAuth } from "../../services/auth";
import api from "../../services/api";
import "./css/style.scss";

export default function Navbar({ onLogout }) {
  const location = useLocation();
  const [activeLink, setActiveLink] = useState("");
  const { data, isSuperuser, isSeller } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    setActiveLink(location.pathname);
  }, [location]);

  useEffect(() => {
    const fetchNotificationCount = async () => {
      try {
        const response = await api.get("/api/notifications/count/");
        setUnreadCount(response.data.unread || 0);
      } catch (err) {
        // Not logged in or error
      }
    };

    const access = localStorage.getItem(ACCESS_TOKEN);
    if (access && access.trim() !== "") {
      fetchNotificationCount();
      const interval = setInterval(fetchNotificationCount, 60000);
      return () => clearInterval(interval);
    }
  }, []);

  const access = localStorage.getItem(ACCESS_TOKEN);
  const isLoggedIn = access && access.trim() !== "";
  const isAdmin = isSuperuser || false;

  const navItems = [
    { to: "/", icon: <FaHome />, label: "Home" },
    { to: "/products", icon: <FaStore />, label: "Shop" },
    { to: "/cart", icon: <FaShoppingCart />, label: "Cart" },
    ...(isLoggedIn
      ? [
          { to: "/wishlist", icon: <FaHeart />, label: "Wishlist" },
          { to: "/notifications", icon: <FaBell />, label: "Notifications", badge: unreadCount },
          { to: "/profile", icon: <FaUserCircle />, label: "Profile" },
          { to: "/orders", icon: <FaBoxOpen />, label: "My Orders" },
        ]
      : []),
    ...(isLoggedIn && !isSeller
      ? [{ to: "/seller-register", icon: <FaUserTie />, label: "Sell" }]
      : []),
    ...(isLoggedIn && isSeller
      ? [{ to: "/seller/dashboard", icon: <FaStoreAlt />, label: "Dashboard" }]
      : []),
    ...(isAdmin
      ? [{ to: "/admin/analytics", icon: <FaChartBar />, label: "Analytics" }]
      : []),
  ];

  return (
    <nav className="performant-navbar">
      <div className="navbar-disc">
        <div className="nav-items">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`nav-link ${activeLink === item.to ? "active" : ""}`}
            >
              <div className="nav-icon">
                {item.icon}
                {item.badge > 0 && (
                  <span className="nav-badge">{item.badge > 99 ? "99+" : item.badge}</span>
                )}
              </div>
              <span className="nav-label">{item.label}</span>
            </Link>
          ))}

          {isLoggedIn ? (
            <button
              className="nav-logout"
              onClick={() => {
                onLogout();
                window.location.reload();
              }}
            >
              <IoLogOut className="logout-icon" />
              <span className="nav-label">Logout</span>
            </button>
          ) : (
            <>
              <Link to="/login" className="nav-auth nav-login">
                <IoLogIn className="auth-icon" />
                <span className="nav-label">Login</span>
              </Link>
              <Link to="/register" className="nav-auth nav-register">
                <IoPersonAdd className="auth-icon" />
                <span className="nav-label">Register</span>
              </Link>
            </>
          )}
        </div>

        {/* Simple active indicator */}
        <div className="active-indicator" />
      </div>
    </nav>
  );
}
