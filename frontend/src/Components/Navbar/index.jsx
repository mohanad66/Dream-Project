import React, { useEffect, useState } from 'react';
import { Link, useLocation } from "react-router-dom";
import { FaHome, FaSearch , FaShoppingCart , FaInfoCircle   } from 'react-icons/fa';
import "./css/style.scss";
import { IoLogOut } from "react-icons/io5";
import { FaStore } from "react-icons/fa";

export default function Navbar({onLogout}) {
  const location = useLocation();
  const [activeLink, setActiveLink] = useState("");

  useEffect(() => {
    setActiveLink(location.pathname);
  }, [location]);

  return (
    <div className="ufo-navbar-container">
      <div className="ufo-light-beam"></div>
      <nav className="ufo-navbar">
        <div className="ufo-navbar__disc">
          <div className="ufo-navbar__links">
            <Link
              to="/"
              className={`ufo-navbar__link ${activeLink === "/" ? 'ufo-navbar__link--active' : ''}`}
            >
              <FaHome className="ufo-navbar__icon" />
              <span className="ufo-navbar__label">Home</span>
            </Link>
            
            <Link
              to="/products"
              className={`ufo-navbar__link ${activeLink === "/products" ? 'ufo-navbar__link--active' : ''}`}
            >
              <FaStore className="ufo-navbar__icon" />
              <span className="ufo-navbar__label">Products</span>
            </Link>
            
            
            <Link
              to="/cart"
              className={`ufo-navbar__link ${activeLink === "/cart" ? 'ufo-navbar__link--active' : ''}`}
            >
              <FaShoppingCart  className="ufo-navbar__icon" />
              <span className="ufo-navbar__label">Cart</span>
            </Link>
            
            {/* <Link
              to="/about"
              className={`ufo-navbar__link ${activeLink === "/about" ? 'ufo-navbar__link--active' : ''}`}
            >
              <FaInfoCircle className="ufo-navbar__icon" />
              <span className="ufo-navbar__label">About</span>
            </Link> */}
            <Link
              to="/profile"
              className={`ufo-navbar__link ${activeLink === "/profile" ? 'ufo-navbar__link--active' : ''}`}
            >
              <FaInfoCircle className="ufo-navbar__icon" />
              <span className="ufo-navbar__label">profile</span>
            </Link>
            
            <button className="ufo-navbar__link btn" onClick={() => {onLogout(); window.location.reload() } }>
              <IoLogOut />
            </button>
          </div>
        </div>
      </nav>
    </div>
  );
}