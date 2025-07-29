import React, { useEffect, useState } from 'react';
import { Link, useLocation } from "react-router-dom";
import { FaHome, FaSearch, FaHeart, FaUser, FaShoppingCart , FaHandHoldingHeart , FaInfoCircle   } from 'react-icons/fa';
import "./css/style.scss";

export default function Navbar() {
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
              <FaShoppingCart className="ufo-navbar__icon" />
              <span className="ufo-navbar__label">Products</span>
            </Link>
            
            
            <Link
              to="/favourite"
              className={`ufo-navbar__link ${activeLink === "/favourite" ? 'ufo-navbar__link--active' : ''}`}
            >
              <FaHandHoldingHeart className="ufo-navbar__icon" />
              <span className="ufo-navbar__label">Loved</span>
            </Link>
            
            {/* <Link
              to="/about"
              className={`ufo-navbar__link ${activeLink === "/about" ? 'ufo-navbar__link--active' : ''}`}
            >
              <FaInfoCircle className="ufo-navbar__icon" />
              <span className="ufo-navbar__label">About</span>
            </Link> */}
          </div>
        </div>
      </nav>
    </div>
  );
}