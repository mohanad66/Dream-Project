import React from "react";
import { Link } from "react-router-dom";
import {
  FaPhone,
  FaEnvelope,
  FaLocationDot,
  FaFacebookF,
  FaInstagram,
  FaXTwitter,
  FaPlay,
} from "react-icons/fa6";
import "./css/style.scss";

export default function Footer({ contacts = [], categories = [] }) {
  const contactList = Array.isArray(contacts) ? contacts : [];
  const categoryList = (Array.isArray(categories) ? categories : []).slice(0, 6);

  const phones = contactList.filter((c) => c.contact_type === "phone");
  const emails = contactList.filter((c) => c.contact_type === "email");
  const addresses = contactList.filter((c) => c.contact_type === "address");
  const socials = contactList.filter((c) => c.contact_type === "social");

  const hasAnyContact = phones.length + emails.length + addresses.length > 0;

  const renderContact = (items) =>
    items.map((item, i) => (
      <li key={i}>
        <span className="footer-contact-label">{item.name}</span>
        <span className="footer-contact-value">{item.value}</span>
      </li>
    ));

  return (
    <footer className="site-footer">
      <div className="footer-bg" aria-hidden="true">
        <div className="hero-glow hero-glow--two" />
      </div>

      <div className="footer-top">
        <div className="footer-brand">
          <div className="footer-logo">
            <span className="footer-logo-mark">
              <FaPlay />
            </span>
            <span className="footer-logo-name">
              insta<span className="brand-accent">Brandz</span>
            </span>
          </div>
          <p className="footer-tagline">
            A curated marketplace connecting discerning shoppers with premium
            local brands, artisans and independent creators.
          </p>
          <div className="footer-socials">
            {socials.map((s, i) => (
              <a
                key={i}
                href={s.value.startsWith("http") ? s.value : `https://${s.value}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.name}
              >
                {s.name.toLowerCase().includes("instagram") ? (
                  <FaInstagram />
                ) : s.name.toLowerCase().includes("twitter") ||
                  s.name.toLowerCase().includes("x") ? (
                  <FaXTwitter />
                ) : (
                  <FaFacebookF />
                )}
              </a>
            ))}
          </div>
        </div>

        <div className="footer-col">
          <h4>Explore</h4>
          <ul>
            <li>
              <Link to="/">Home</Link>
            </li>
            <li>
              <Link to="/shorts">Shorts</Link>
            </li>
            <li>
              <Link to="/products">Shop All</Link>
            </li>
            <li>
              <Link to="/cart">Your Cart</Link>
            </li>
            <li>
              <Link to="/seller-register">Sell With Us</Link>
            </li>
          </ul>
        </div>

        <div className="footer-col">
          <h4>Categories</h4>
          {categoryList.length > 0 ? (
            <ul>
              {categoryList.map((cat) => (
                <li key={cat.id}>
                  <Link to={`/category/${cat.id}`}>{cat.name}</Link>
                </li>
              ))}
            </ul>
          ) : (
            <ul>
              <li>
                <Link to="/products">All Products</Link>
              </li>
            </ul>
          )}
        </div>

        <div className="footer-col">
          <h4>Company</h4>
          <ul>
            <li>
              <Link to="/about">About us</Link>
            </li>
            <li>
              <Link to="/sellers">Find a seller</Link>
            </li>
            <li>
              <Link to="/register">Create an account</Link>
            </li>
          </ul>
        </div>

        <div className="footer-col footer-contact">
          <h4>Get in Touch</h4>
          {hasAnyContact ? (
            <ul>
              {renderContact(phones.slice(0, 2))}
              {renderContact(emails.slice(0, 2))}
              {renderContact(addresses.slice(0, 1))}
            </ul>
          ) : (
            <ul>
              <li>
                <span className="footer-contact-label">Email</span>
                <a href="mailto:support@instaBrandz.com" className="footer-contact-value">
                  support@instaBrandz.com
                </a>
              </li>
            </ul>
          )}
        </div>
      </div>

      <div className="footer-bottom">
        <p>
          © {new Date().getFullYear()} instaBrandz. All rights reserved. Crafted
          with care for our community.
        </p>
        <div className="footer-badges">
          <span className="footer-badge">
            <FaEnvelope /> Secure Checkout
          </span>
          <span className="footer-badge">
            <FaPhone /> 24/7 Support
          </span>
        </div>
      </div>
    </footer>
  );
}
