import { useEffect, useState, useMemo, useCallback } from "react";
import Card from "../../Components/Card";
import "./css/style.scss";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import React from "react";
import api from "../../services/api";
import {
  FaSearch,
  FaShoppingCart,
  FaPlay,
  FaFire,
  FaCheckCircle,
  FaStar,
  FaArrowRight,
  FaTag,
  FaMobileAlt,
  FaTshirt,
  FaHome,
  FaGem,
  FaUtensils,
  FaBook,
  FaGamepad,
  FaHeartbeat,
  FaBaby,
  FaDog,
  FaCar,
  FaUserPlus,
} from "react-icons/fa";
import {
  FaShieldHalved,
  FaTruckFast,
  FaRotateLeft,
} from "react-icons/fa6";

const CATEGORY_ICONS = [
  [/electron|mobile|phone|computer|laptop|tech|gadget/i, <FaMobileAlt />],
  [/fashion|clothing|apparel|wear|shirt|shoe/i, <FaTshirt />],
  [/home|furniture|decor|kitchen|living/i, <FaHome />],
  [/beauty|cosmetic|skincare|makeup|perfume|jewel/i, <FaGem />],
  [/food|grocer|cooking/i, <FaUtensils />],
  [/book|station|office/i, <FaBook />],
  [/game|toy|console/i, <FaGamepad />],
  [/sport|fitness|health|wellness/i, <FaHeartbeat />],
  [/baby|kids|toddler/i, <FaBaby />],
  [/pet|animal/i, <FaDog />],
  [/auto|car|vehicle|motor/i, <FaCar />],
];

const getCategoryIcon = (name = "") => {
  for (const [re, icon] of CATEGORY_ICONS) if (re.test(name)) return icon;
  return <FaTag />;
};

const TRUST_ITEMS = [
  { icon: <FaTruckFast />, label: "Fast delivery" },
  { icon: <FaShieldHalved />, label: "Secure Paymob & Fawry" },
  { icon: <FaRotateLeft />, label: "Easy returns" },
];

export default function Home({
  categories = [],
  products = [],
  tags = [],
}) {
  const navigate = useNavigate();
  const [homeProducts, setHomeProducts] = useState(Array.isArray(products) ? products : []);
  const [sellers, setSellers] = useState([]);
  const [cartCount, setCartCount] = useState(0);
  const [query, setQuery] = useState("");

  // Fresher/richer product set specifically for the shopfront (page_size = 40)
  useEffect(() => {
    let active = true;
    api
      .get("/api/products/?page_size=40")
      .then((res) => {
        if (!active) return;
        const list = Array.isArray(res.data)
          ? res.data
          : res.data?.results || [];
        if (list.length > 0) setHomeProducts(list);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (Array.isArray(products) && products.length > 0) {
      setHomeProducts(products);
    }
  }, [products]);

  // Featured sellers — approved, active, most-followed first
  useEffect(() => {
    let active = true;
    api
      .get("/api/sellers/search/")
      .then((res) => {
        if (active && Array.isArray(res.data)) {
          setSellers(res.data.slice(0, 12));
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Cart count badge
  const refreshCart = useCallback(() => {
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    setCartCount((cart || []).reduce((sum, item) => sum + (item.quantity || 1), 0));
  }, []);

  useEffect(() => {
    refreshCart();
    window.addEventListener("cart-updated", refreshCart);
    window.addEventListener("storage", refreshCart);
    return () => {
      window.removeEventListener("cart-updated", refreshCart);
      window.removeEventListener("storage", refreshCart);
    };
  }, [refreshCart]);

  const activeProducts = useMemo(
    () => (Array.isArray(homeProducts) ? homeProducts.filter((p) => p.is_active) : []),
    [homeProducts],
  );

  // Shorts rail — products with real videos first, then any live product
  const shorts = useMemo(() => {
    const withVideo = activeProducts.filter((p) => p.video);
    const rest = activeProducts.filter((p) => !p.video);
    return [...withVideo, ...rest].slice(0, 12);
  }, [activeProducts]);

  // Trending grid — most-liked first
  const trending = useMemo(
    () =>
      [...activeProducts]
        .sort((a, b) => (b.like_count || 0) - (a.like_count || 0))
        .slice(0, 12),
    [activeProducts],
  );

  const handleSearch = (e) => {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/products?search=${encodeURIComponent(q)}` : "/products");
  };

  const renderStars = (rating) => {
    const r = Math.round(rating || 0);
    return (
      <span className="home-stars">
        {[1, 2, 3, 4, 5].map((i) => (
          <FaStar key={i} className={i <= r ? "filled" : ""} />
        ))}
      </span>
    );
  };

  return (
    <>
      <Helmet>
        <title>instaBrandz — Watch Shorts, Shop Sellers, Buy Fast</title>
        <meta
          name="description"
          content="instaBrandz is Egypt's multi-seller marketplace with short-video discovery. Watch shorts from real brands, shop their storefronts and check out with Paymob and Fawry."
        />
        <link rel="canonical" href="https://dream-project-roan.vercel.app/" />
        <meta property="og:title" content="instaBrandz — Watch Shorts, Shop Sellers, Buy Fast" />
        <meta
          property="og:description"
          content="Watch short videos from real brands, then shop their storefronts with secure Paymob and Fawry checkout."
        />
        <meta property="og:url" content="https://dream-project-roan.vercel.app/" />
        <meta property="og:type" content="website" />
      </Helmet>

      <div className="home">
        {/* ============ APP-HEADER: logo + search + cart ============ */}
        <header className="home-header">
          <Link to="/" className="home-logo" aria-label="instaBrandz home">
            <span className="home-logo-mark">
              <FaPlay />
            </span>
            <span className="home-logo-name">
              insta<span className="brand-accent">Brandz</span>
            </span>
          </Link>

          <form className="home-search" onSubmit={handleSearch} role="search">
            <FaSearch className="home-search-icon" />
            <input
              type="search"
              placeholder="Search products, brands…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search products"
            />
            <button type="submit">Search</button>
          </form>

          <Link to="/cart" className="home-cart" aria-label="Shopping cart">
            <FaShoppingCart />
            {cartCount > 0 && <span className="home-cart-count">{cartCount > 99 ? "99+" : cartCount}</span>}
          </Link>
        </header>

        {/* ============ TRUST STRIP ============ */}
        <div className="home-trust">
          {TRUST_ITEMS.map((t, i) => (
            <span key={i} className="home-trust-item">
              {t.icon} {t.label}
            </span>
          ))}
        </div>

        {/* ============ SHORTS RAIL ============ */}
        {shorts.length > 0 && (
          <section className="home-section home-shorts">
            <div className="section-bar">
              <div>
                <p className="section-eyebrow">Watch &amp; Shop</p>
                <h2 className="title">Shorts</h2>
              </div>
              <Link to="/shorts" className="section-link">
                Watch all <FaArrowRight />
              </Link>
            </div>
            <div className="home-shorts-rail">
              {shorts.map((p) => (
                <Link to={`/shorts?p=${p.id}`} key={p.id} className="shorts-rail-card">
                  <div className="shorts-rail-media">
                    {p.video ? (
                      <video
                        src={p.video}
                        muted
                        playsInline
                        preload="metadata"
                        title={p.name}
                      />
                    ) : (
                      p.image && <img src={p.image} alt={p.name} loading="lazy" decoding="async" />
                    )}
                    <span className="shorts-rail-play">
                      <FaPlay />
                    </span>
                    {p.like_count > 0 && (
                      <span className="shorts-rail-likes">
                        <FaFire /> {p.like_count}
                      </span>
                    )}
                  </div>
                  <span className="shorts-rail-seller">
                    {p.seller_avatar ? (
                      <img src={p.seller_avatar} alt="" loading="lazy" />
                    ) : (
                      <span className="shorts-rail-avatar-fallback">
                        {(p.seller_name || "?").charAt(0)}
                      </span>
                    )}
                    <em>{p.seller_name || "Seller"}</em>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ============ CATEGORY STRIP ============ */}
        <section className="home-section home-categories">
          <div className="section-bar">
            <div>
              <p className="section-eyebrow">Browse</p>
              <h2 className="title">Categories</h2>
            </div>
          </div>
          {Array.isArray(categories) && categories.length > 0 ? (
            <div className="home-category-strip">
              {categories.map((cat) => (
                <Link
                  to={`/products?category=${cat.id}`}
                  key={cat.id}
                  className="category-chip"
                >
                  <span className="category-chip-icon">{getCategoryIcon(cat.name)}</span>
                  <span className="category-chip-name">{cat.name}</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="home-empty">Categories are coming soon.</p>
          )}
        </section>

        {/* ============ FEATURED SELLERS ============ */}
        {sellers.length > 0 && (
          <section className="home-section home-sellers">
            <div className="section-bar">
              <div>
                <p className="section-eyebrow">Meet your shopkeepers</p>
                <h2 className="title">Featured Sellers</h2>
              </div>
              <Link to="/sellers" className="section-link">
                All sellers <FaArrowRight />
              </Link>
            </div>
            <div className="home-sellers-row">
              {sellers.map((s) => (
                <Link to={`/seller/${s.id}`} key={s.id} className="seller-badge">
                  <span className="seller-badge-avatar">
                    {s.avatar ? (
                      <img src={s.avatar} alt={s.business_name} loading="lazy" />
                    ) : (
                      <span className="seller-badge-fallback">
                        {(s.business_name || "?").charAt(0)}
                      </span>
                    )}
                  </span>
                  <span className="seller-badge-name">
                    {s.business_name}
                    {s.verified && <FaCheckCircle className="verified-badge" />}
                  </span>
                  <span className="seller-badge-rating">
                    {renderStars(s.average_rating)}
                    <em>{s.average_rating ? Number(s.average_rating).toFixed(1) : "New"}</em>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ============ TRENDING PRODUCTS ============ */}
        <section className="home-section home-trending">
          <div className="section-bar">
            <div>
              <p className="section-eyebrow">Most loved right now</p>
              <h2 className="title">Trending Now</h2>
            </div>
            <Link to="/products" className="section-link">
              Shop everything <FaArrowRight />
            </Link>
          </div>
          {trending.length > 0 ? (
            <div className="cards-grid">
              {trending.map((product) => (
                <Card key={product.id} card={product} categories={categories} tags={tags} />
              ))}
            </div>
          ) : (
            <div className="home-empty">
              <p>No products yet — check back soon.</p>
            </div>
          )}
        </section>

        {/* ============ SELLER CTA ============ */}
        <section className="home-cta">
          <div className="home-cta-inner">
            <span className="home-cta-icon">
              <FaUserPlus />
            </span>
            <div className="home-cta-text">
              <h2>Got a brand? Start selling today.</h2>
              <p>Upload your products, add short videos, and let shoppers find you in the feed.</p>
            </div>
            <Link to="/seller-register" className="home-cta-btn">
              Become a Seller
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}