import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  FaHome,
  FaUserCircle,
  FaPlayCircle,
  FaStore,
  FaStoreAlt,
  FaUsers,
  FaVideo,
  FaBell,
  FaHeart,
  FaShoppingCart,
  FaChartLine,
} from "react-icons/fa";
import { IoLogOut, IoLogIn, IoPersonAdd } from "react-icons/io5";
import { ACCESS_TOKEN } from "../../services/constants";
import { useAuth } from "../../services/auth";
import api from "../../services/api";
import "./css/style.scss";

export default function Navbar({ onLogout }) {
  const location = useLocation();
  const [activeLink, setActiveLink] = useState("");

  useEffect(() => {
    setActiveLink(location.pathname);
  }, [location]);

  const access = localStorage.getItem(ACCESS_TOKEN);
  const isLoggedIn = access && access.trim() !== "";
  const { isSeller, isSuperuser, data } = useAuth();
  const isAdmin = isSuperuser || !!data?.user?.is_staff;

  const [cartCount, setCartCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);

  const isActive = (to) =>
    to === "/"
      ? location.pathname === "/"
      : location.pathname.startsWith(to);

  // Seller entry point: only authenticated sellers get the upload action;
  // everyone else gets a clearly separated "Sell on instaBrandz" entry.
  const sellerCta = isLoggedIn && isSeller
    ? { to: "/upload", label: "Upload video" }
    : { to: "/seller-register", label: "Sell on instaBrandz" };

  // Desktop top-navigation links
  const desktopLinks = [
    { to: "/", label: "Home" },
    { to: "/shorts", label: "Shorts" },
    { to: "/products", label: "Shop" },
    { to: "/sellers", label: "Sellers" },
    ...(isLoggedIn ? [{ to: "/profile", label: "Profile" }] : []),
  ];

  // Mobile bottom-tab links (5 slots, center slot is the seller CTA)
  const mobileLeft = [
    { to: "/", icon: <FaHome />, label: "Home" },
    { to: "/shorts", icon: <FaPlayCircle />, label: "Shorts" },
  ];
  const mobileRight = [
    { to: "/products", icon: <FaStore />, label: "Shop" },
    { to: "/sellers", icon: <FaUsers />, label: "Sellers" },
  ];

  // Cart badge (same localStorage store the checkout reads)
  useEffect(() => {
    const readCart = () => {
      try {
        const items = JSON.parse(localStorage.getItem("cart") || "[]");
        setCartCount(Array.isArray(items) ? items.length : 0);
      } catch {
        setCartCount(0);
      }
    };
    readCart();
    window.addEventListener("cart-updated", readCart);
    window.addEventListener("storage", readCart);
    return () => {
      window.removeEventListener("cart-updated", readCart);
      window.removeEventListener("storage", readCart);
    };
  }, []);

  // Unread notification badge
  useEffect(() => {
    if (!isLoggedIn) return;
    api
      .get("/api/notifications/count/")
      .then((res) => setNotifCount(res.data?.unread || 0))
      .catch(() => {});
  }, [isLoggedIn]);

  const toggleNotif = (e) => {
    e.stopPropagation();
    setNotifOpen((open) => !open);
  };

  // Close the panel when clicking anywhere else
  useEffect(() => {
    if (!notifOpen) return;
    const close = () => setNotifOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [notifOpen]);

  useEffect(() => {
    if (!notifOpen || !isLoggedIn) return;
    let active = true;
    setNotifLoading(true);
    api
      .get("/api/notifications/")
      .then((res) => {
        if (!active) return;
        const list = res.data?.results || res.data || [];
        setNotifications(list);
      })
      .catch(() => {})
      .finally(() => active && setNotifLoading(false));
    return () => { active = false; };
  }, [notifOpen, isLoggedIn]);

  const markRead = async (id) => {
    if (id == null || notifications.some((n) => n.id === id && n.is_read)) return;
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    setNotifCount((c) => Math.max(0, c - 1));
    try {
      await api.post("/api/notifications/mark-read/", { notification_id: id });
    } catch (err) {}
  };

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setNotifCount(0);
    try {
      await api.post("/api/notifications/mark-read/", {});
    } catch (err) {}
  };

  return (
    <>
      {/* ============ DESKTOP / TABLET : TOP HEADER ============ */}
      <header className="site-header">
        <div className="site-header__inner">
          <Link to="/" className="site-header__brand brand-wordmark" aria-label="instaBrandz home">
            <span className="brand-wordmark__mark">
              <FaVideo />
            </span>
            <span className="brand-wordmark__name">
              insta<span className="brand-wordmark__accent">Brandz</span>
            </span>
          </Link>

          <nav className="site-header__nav" aria-label="Primary">
            {desktopLinks.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`site-nav-link ${isActive(item.to) ? "active" : ""}`}
              >
                {item.label}
              </Link>
            ))}
            {isLoggedIn && isSeller && (
              <Link
                to="/seller/dashboard"
                className={`site-nav-link ${isActive("/seller") ? "active" : ""}`}
              >
                <FaStoreAlt /> Dashboard
              </Link>
            )}
          </nav>

          <div className="site-header__actions">
            <div className="site-header__icons">
              {isLoggedIn && (
                <div className="site-notif">
                  <button
                    className="site-icon-btn"
                    onClick={toggleNotif}
                    aria-label="Notifications"
                    title="Notifications"
                  >
                    <FaBell />
                    {notifCount > 0 && <span className="site-badge">{notifCount}</span>}
                  </button>
                  {notifOpen && (
                    <div className="site-notif-panel">
                      <div className="site-notif-panel__head">
                        <strong>Notifications</strong>
                        {notifications.some((n) => !n.is_read) && (
                          <button onClick={markAllRead}>Mark all read</button>
                        )}
                      </div>
                      <div className="site-notif-panel__list">
                        {notifLoading ? (
                          <p className="site-notif-empty">Loading notifications…</p>
                        ) : notifications.length === 0 ? (
                          <p className="site-notif-empty">No notifications yet.</p>
                        ) : (
                          notifications.slice(0, 10).map((n) => (
                            <Link
                              key={n.id}
                              to={n.link || "/profile"}
                              className={`site-notif-item${n.is_read ? "" : " unread"}`}
                              onClick={() => markRead(n.id)}
                            >
                              <strong>{n.title}</strong>
                              {n.message && <p>{n.message}</p>}
                              <span>{new Date(n.created_at).toLocaleString()}</span>
                            </Link>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
              <Link to="/wishlist" className="site-icon-btn" aria-label="Wishlist" title="Wishlist">
                <FaHeart />
              </Link>
              <Link to="/checkout" className="site-icon-btn" aria-label="Cart" title="Cart">
                <FaShoppingCart />
                {cartCount > 0 && <span className="site-badge site-badge--cart">{cartCount}</span>}
              </Link>
              {isAdmin && (
                <Link to="/admin/analytics" className="site-icon-btn" aria-label="Analytics Dashboard" title="Analytics Dashboard">
                  <FaChartLine />
                </Link>
              )}
            </div>

            <Link to={sellerCta.to} className="site-upload-cta">
              <span className="site-upload-cta__icon">
                <FaVideo />
              </span>
              {sellerCta.label}
            </Link>

            {isLoggedIn ? (
              <div className="site-header__account">
                <Link
                  to="/profile"
                  className="site-avatar"
                  aria-label="My profile"
                  title="My profile"
                >
                  <FaUserCircle />
                </Link>
                <button
                  className="site-logout"
                  onClick={() => {
                    onLogout();
                    window.location.reload();
                  }}
                  aria-label="Logout"
                  title="Logout"
                >
                  <IoLogOut />
                </button>
              </div>
            ) : (
              <div className="site-header__auth">
                <Link to="/login" className="site-auth site-auth--login">
                  <IoLogIn /> Log in
                </Link>
                <Link to="/register" className="site-auth site-auth--register">
                  <IoPersonAdd /> Sign up
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ============ MOBILE : BOTTOM TAB BAR ============ */}
      <nav className="performant-navbar" aria-label="Mobile">
        <div className="navbar-disc">
          <div className="nav-items">
            {mobileLeft.map((item) => (
              <NavTabItem key={item.to} item={item} activeLink={activeLink} />
            ))}

            <Link to={sellerCta.to} className="nav-center-cta" aria-label={sellerCta.label}>
              <span className="nav-center-cta__icon">
                <FaVideo />
              </span>
              <span className="nav-label">
                {isLoggedIn && isSeller ? "Upload" : "Sell"}
              </span>
            </Link>

            {mobileRight.map((item) => (
              <NavTabItem key={item.to} item={item} activeLink={activeLink} />
            ))}
          </div>

          <div className="active-indicator" />
        </div>
      </nav>
    </>
  );
}

function NavTabItem({ item, activeLink }) {
  const isActive = item.to === "/"
    ? activeLink === "/"
    : activeLink.startsWith(item.to);
  return (
    <Link
      to={item.to}
      className={`nav-link ${isActive ? "active" : ""}`}
    >
      <div className="nav-icon">{item.icon}</div>
      <span className="nav-label">{item.label}</span>
    </Link>
  );
}