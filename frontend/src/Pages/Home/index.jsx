import { useEffect, useState, useRef } from "react";
import Card from "../../Components/Card";
import Carousel from "../../Components/Carousel";
import "./css/style.scss";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import React from "react";
import {
  FaGem,
  FaTruckFast,
  FaShieldHalved,
  FaHeadset,
  FaStar,
} from "react-icons/fa6";

function useReveal(threshold = 0.12) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { el.classList.add("revealed"); obs.unobserve(el); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return ref;
}

function RevealSection({ children, className = "", as: Tag = "div", ...props }) {
  const ref = useReveal();
  return <Tag ref={ref} className={`reveal ${className}`} {...props}>{children}</Tag>;
}

const FEATURES = [
  {
    icon: <FaGem />,
    title: "Curated Quality",
    text: "Every product is vetted by our team — only the finest brands and artisans make the cut.",
  },
  {
    icon: <FaTruckFast />,
    title: "Fast Delivery",
    text: "Reliable nationwide fulfilment with real-time tracking on every order.",
  },
  {
    icon: <FaShieldHalved />,
    title: "Secure Payments",
    text: "Bank-grade encryption and verified gateways protect every transaction from click to delivery.",
  },
  {
    icon: <FaHeadset />,
    title: "Dedicated Support",
    text: "A real team of specialists ready to assist you at every step of your journey.",
  },
];

export default function Home({
  categories = [],
  products = [],
  tags = [],
  img = [],
}) {
  const [isLoading, setIsLoading] = useState(true);

  const latestProducts = Array.isArray(products)
    ? [...products].slice(0, 8)
    : [];

  const activeProducts = (Array.isArray(products) ? products : []).filter(
    (p) => p.is_active === true,
  );

  const featuredProducts = [...activeProducts].sort(() => 0.5 - Math.random()).slice(0, 8);

  const uniqueBrands = [
    ...new Set(activeProducts.filter((p) => p.seller_name).map((p) => p.seller_name)),
  ].slice(0, 8);

  const sellerCount = new Set(
    (Array.isArray(products) ? products : []).map((p) => p.seller_name),
  ).size;

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 900);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (categories.length > 0 || products.length > 0) {
      setIsLoading(false);
    }
  }, [categories, products]);

  if (isLoading) {
    return (
      <div className="home-loading">
        <div className="home-loading-mark">
          <FaGem />
        </div>
        <p>Curating your experience…</p>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>DreamStore — Curated Marketplace for Premium & Local Brands</title>
        <meta
          name="description"
          content="DreamStore is a curated marketplace connecting discerning shoppers with premium local brands, artisans and independent creators."
        />
        <link rel="canonical" href="https://dream-project-roan.vercel.app/" />
        <meta
          property="og:title"
          content="DreamStore — Curated Marketplace for Premium & Local Brands"
        />
        <meta
          property="og:description"
          content="Discover a curated marketplace of premium local brands, artisans and independent creators."
        />
        <meta property="og:url" content="https://dream-project-roan.vercel.app/" />
        <meta property="og:type" content="website" />
      </Helmet>

      <div className="home">
        {/* ============ HERO ============ */}
        <section className="hero-section">
          <div className="hero-bg" aria-hidden="true">
            <div className="hero-glow hero-glow--one" />
            <div className="hero-glow hero-glow--two" />
            <div className="hero-grid" />
          </div>

          <div className="hero-content">
            <p className="hero-eyebrow">
              <span className="eyebrow-line" />
              The Marketplace of Tomorrow
              <span className="eyebrow-line" />
            </p>
            <h1 className="hero-title">
              Discover <em className="gold-text">Exceptional</em> Local Brands
            </h1>
            <p className="hero-subtitle">
              A curated marketplace connecting discerning shoppers with the
              region's most promising artisans, designers and independent
              creators.
            </p>

            <div className="hero-actions">
              <Link to="/products" className="btn-primary">
                Explore the Collection
              </Link>
              <Link to="/seller-register" className="btn-secondary">
                Sell With Us
              </Link>
            </div>

            <div className="hero-proof">
              <div className="proof-stat">
                <strong>{(Array.isArray(products) ? products.length : 0) || "100"}+</strong>
                <span>Products</span>
              </div>
              <div className="proof-stat">
                <strong>{categories.length || "24"}+</strong>
                <span>Categories</span>
              </div>
              <div className="proof-stat">
                <strong>{sellerCount || "50"}+</strong>
                <span>Partner Brands</span>
              </div>
              <div className="proof-stat">
                <strong>4.9/5</strong>
                <span>Customer Rating</span>
              </div>
            </div>
          </div>
        </section>

        {/* ============ SHOWCASE CAROUSEL ============ */}
        {Array.isArray(img) && img.length > 0 && <Carousel images={img} />}

        {/* ============ BRAND STRIP ============ */}
        {uniqueBrands.length > 0 && (
          <RevealSection className="featured-brands" as="section">
            <p className="brands-label">Trusted by leading local brands</p>
            <div className="brands-list">
              {uniqueBrands.map((brand, idx) => (
                <span key={idx} className="brand-badge">
                  {brand}
                </span>
            ))}
          </div>
          </RevealSection>
        )}

        {/* ============ WHY DREAMSTORE ============ */}
        <RevealSection className="features" as="section">
          <div className="section-heading">
            <p className="section-eyebrow">Why DreamStore</p>
            <h2 className="title">Built for the Next Generation of Commerce</h2>
          </div>
          <div className="features-grid">
            {FEATURES.map((f, i) => (
              <div className="feature-card" key={i}>
                <div className="feature-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </div>
            ))}
          </div>
        </RevealSection>

        {/* ============ CATEGORIES ============ */}
        <RevealSection className="categories" as="section">
          <div className="section-heading">
            <p className="section-eyebrow">Browse by Category</p>
            <h2 className="title">Shop the Finest Selection</h2>
          </div>
          {Array.isArray(categories) && categories.length > 0 ? (
            <div className="categories-grid">
              {categories.map((category) => (
                <Link
                  to={`/products?category=${category.id}`}
                  key={category.id}
                  className="category"
                >
                  <h3>{category.name}</h3>
                  <span className="category-arrow">→</span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="empty">
              <h2>Categories are coming soon</h2>
            </div>
          )}
        </RevealSection>

        {/* ============ FEATURED PRODUCTS ============ */}
        <RevealSection className="cards-container" as="section">
          <div className="section-heading">
            <p className="section-eyebrow">Handpicked for You</p>
            <h2 className="title">Featured Products</h2>
          </div>
          {featuredProducts.length > 0 ? (
            <div className="cards-grid">
              {featuredProducts.map((product) => (
                <Card
                  key={product.id}
                  card={product}
                  categories={categories}
                  tags={tags}
                />
              ))}
            </div>
          ) : (
            <div className="empty">
              <h2>There isn't any Products</h2>
            </div>
          )}
        </RevealSection>

        {/* ============ LATEST PRODUCTS ============ */}
        <RevealSection className="cards-container" as="section">
          <div className="section-heading">
            <p className="section-eyebrow">Fresh Arrivals</p>
            <h2 className="title">Our Latest Products</h2>
          </div>
          {latestProducts.length > 0 ? (
            <div className="cards-grid">
              {latestProducts
                .filter((product) => product.is_active === true)
                .map((product) => (
                  <Card
                    key={product.id}
                    card={product}
                    categories={categories}
                    tags={tags}
                  />
                ))}
            </div>
          ) : (
            <div className="empty">
              <h2>There isn't any Products</h2>
            </div>
          )}
        </RevealSection>

        {/* ============ CTA BANNER ============ */}
        <RevealSection className="cta-banner" as="section">
          <div className="cta-banner-bg" aria-hidden="true">
            <div className="hero-glow hero-glow--one" />
          </div>
          <div className="cta-content">
            <div className="cta-stars">
              <FaStar />
              <FaStar />
              <FaStar />
              <FaStar />
              <FaStar />
            </div>
            <h2>Become a Part of the DreamStore Story</h2>
            <p>
              Join a fast-growing marketplace loved by shoppers and backed by a
              team obsessed with quality and trust.
            </p>
            <div className="cta-actions">
              <Link to="/products" className="btn-primary">
                Start Shopping
              </Link>
              <Link to="/seller-register" className="btn-ghost">
                Become a Seller
              </Link>
            </div>
          </div>
        </RevealSection>
      </div>
    </>
  );
}
