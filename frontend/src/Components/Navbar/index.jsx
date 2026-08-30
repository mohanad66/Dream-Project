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
} from "react-icons/fa";
import { IoLogOut, IoLogIn, IoPersonAdd } from "react-icons/io5";
import { ACCESS_TOKEN } from "../../services/constants";
import { useAuth } from "../../services/auth";
import "./css/style.scss";

export default function Navbar({ onLogout }) {
  const location = useLocation();
  const [activeLink, setActiveLink] = useState("");

  useEffect(() => {
    setActiveLink(location.pathname);
  }, [location]);

  const access = localStorage.getItem(ACCESS_TOKEN);
  const isLoggedIn = access && access.trim() !== "";
  const { isSeller } = useAuth();

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