import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  FaHome,
  FaUserCircle,
  FaBoxOpen,
  FaChartBar,
} from "react-icons/fa";
import { IoLogOut, IoLogIn, IoPersonAdd } from "react-icons/io5";
import { FaStore, FaStoreAlt, FaUserTie } from "react-icons/fa";
import { ACCESS_TOKEN } from "../../services/constants";
import { useAuth } from "../../services/auth";
import "./css/style.scss";

export default function Navbar({ onLogout }) {
  const location = useLocation();
  const [activeLink, setActiveLink] = useState("");
  const { data, isSuperuser, isSeller } = useAuth();

  useEffect(() => {
    setActiveLink(location.pathname);
  }, [location]);

  const access = localStorage.getItem(ACCESS_TOKEN);
  const isLoggedIn = access && access.trim() !== "";
  const isAdmin = isSuperuser || false;

  const navItems = [
    { to: "/", icon: <FaHome />, label: "Home" },
    { to: "/products", icon: <FaStore />, label: "Shop" },
    ...(isLoggedIn
      ? [
          { to: "/profile", icon: <FaUserCircle />, label: "Profile" },
          { to: "/orders", icon: <FaBoxOpen />, label: "Orders" },
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
              <div className="nav-icon">{item.icon}</div>
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
