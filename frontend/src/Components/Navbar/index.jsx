import React, { useEffect, useRef, useState } from "react";
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
  FaPlus,
  FaMinus,
  FaTrash,
  FaArrowRight,
  FaShoppingBag,
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
  const [cartItems, setCartItems] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const notifWrapRef = useRef(null);
  const cartWrapRef = useRef(null);

  const isActive = (to) =>
    to === "/"
      ? location.pathname === "/"
      : location.pathname.startsWith(to);

  // Primary CTA: sellers get the upload action; everyone else is invited to shop.
  const sellerCta = isLoggedIn && isSeller
    ? { to: "/upload", label: "Upload video" }
    : { to: "/products", label: "Shop Now" };
  const ctaIcon = isLoggedIn && isSeller ? <FaVideo /> : <FaShoppingBag />;

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
        const list = Array.isArray(items) ? items : [];
        setCartCount(list.length);
        setCartItems(list);
      } catch {
        setCartCount(0);
        setCartItems([]);
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

  const toggleCart = (e) => {
    e.stopPropagation();
    setCartOpen((open) => !open);
  };

  const persistCart = (items) => {
    localStorage.setItem("cart", JSON.stringify(items));
    window.dispatchEvent(new Event("cart-updated"));
  };

  const cartQuantityChange = (productId, change) => {
    const updated = cartItems.map((item) => {
      if (item.id === productId) {
        const q = (item.quantity || 1) + change;
        if (q >= 1 && q <= 99) return { ...item, quantity: q };
      }
      return item;
    });
    setCartItems(updated);
    persistCart(updated);
  };

  const cartRemoveItem = (productId) => {
    const updated = cartItems.filter((item) => item.id !== productId);
    setCartItems(updated);
    persistCart(updated);
  };

  // Close the panels when clicking anywhere else
  useEffect(() => {
    if (!notifOpen && !cartOpen) return;
    const close = (e) => {
      if (
        notifWrapRef.current?.contains(e.target) ||
        cartWrapRef.current?.contains(e.target)
      ) {
        return;
      }
      setNotifOpen(false);
      setCartOpen(false);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [notifOpen, cartOpen]);

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
                <div className="site-notif" ref={notifWrapRef}>
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
              <div className="site-cart" ref={cartWrapRef}>
                <button
                  className="site-icon-btn"
                  onClick={toggleCart}
                  aria-label="Cart"
                  title="Cart"
                >
                  <FaShoppingCart />
                  {cartCount > 0 && <span className="site-badge site-badge--cart">{cartCount}</span>}
                </button>
                {cartOpen && (
                  <div className="site-cart-panel">
                    <div className="site-cart-panel__head">
                      <strong>Shopping Cart</strong>
                      {cartCount > 0 && <span>{cartCount} item{cartCount !== 1 ? "s" : ""}</span>}
                    </div>
                    <div className="site-cart-panel__list">
                      {cartItems.length === 0 ? (
                        <p className="site-notif-empty">Your cart is empty.</p>
                      ) : (
                        cartItems.map((item) => (
                          <div key={item.id} className="site-cart-item">
                            <img src={item.image} alt={item.name} className="site-cart-item__img" />
                            <div className="site-cart-item__info">
                              <strong className="site-cart-item__name">{item.name}</strong>
                              <span className="site-cart-item__price">
                                {(parseFloat(item.price) || 0).toFixed(2)} L.E
                              </span>
                              <div className="site-cart-item__qty">
                                <button
                                  onClick={() => cartQuantityChange(item.id, -1)}
                                  disabled={(item.quantity || 1) <= 1}
                                  aria-label="Decrease quantity"
                                >
                                  <FaMinus />
                                </button>
                                <span>{item.quantity || 1}</span>
                                <button
                                  onClick={() => cartQuantityChange(item.id, 1)}
                                  disabled={(item.quantity || 1) >= 99}
                                  aria-label="Increase quantity"
                                >
                                  <FaPlus />
                                </button>
                                <em>
                                  {((parseFloat(item.price) || 0) * (item.quantity || 1)).toFixed(2)} L.E
                                </em>
                              </div>
                            </div>
                            <button
                              className="site-cart-item__remove"
                              onClick={() => cartRemoveItem(item.id)}
                              title="Remove item"
                              aria-label={`Remove ${item.name}`}
                            >
                              <FaTrash />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                    {cartItems.length > 0 && (
                      <div className="site-cart-panel__foot">
                        <span className="site-cart-panel__total">
                          Subtotal{" "}
                          <strong>
                            {cartItems
                              .reduce(
                                (t, it) =>
                                  t + (parseFloat(it.price) || 0) * (it.quantity || 1),
                                0,
                              )
                              .toFixed(2)}{" "}
                            L.E
                          </strong>
                        </span>
                        <Link to="/checkout" className="site-cart-checkout" onClick={() => setCartOpen(false)}>
                          Checkout <FaArrowRight />
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
              {isAdmin && (
                <Link to="/admin/analytics" className="site-icon-btn" aria-label="Analytics Dashboard" title="Analytics Dashboard">
                  <FaChartLine />
                </Link>
              )}
            </div>

            <Link to={sellerCta.to} className="site-upload-cta">
              <span className="site-upload-cta__icon">
                {ctaIcon}
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
                {ctaIcon}
              </span>
              <span className="nav-label">
                {isLoggedIn && isSeller ? "Upload" : "Shop"}
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