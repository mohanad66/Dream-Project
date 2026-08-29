// src/Pages/About us/index.jsx

import React from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { FaGem, FaShieldHalved, FaHandshake, FaAward } from "react-icons/fa6";
import "./css/style.scss";

const VALUES = [
  {
    icon: <FaGem />,
    title: "Curated Quality",
    text: "Every product is hand-reviewed by our curation team, so only the most exceptional pieces earn a place in instaBrandz.",
  },
  {
    icon: <FaShieldHalved />,
    title: "Trust & Security",
    text: "Bank-grade payments, verified partners and protected purchases give every shopper complete peace of mind.",
  },
  {
    icon: <FaHandshake />,
    title: "Community First",
    text: "We champion independent designers and local artisans, helping them grow alongside a loyal community of buyers.",
  },
  {
    icon: <FaAward />,
    title: "Integrity",
    text: "Honest pricing, transparent partnerships and a relentless standard of excellence in everything we do.",
  },
];

const STATS = [
  { value: "100+", label: "Products" },
  { value: "50+", label: "Partner Brands" },
  { value: "24", label: "Categories" },
  { value: "4.9/5", label: "Customer Rating" },
];

const STORY_POINTS = [
  "Vetted selection across fashion, home, beauty and more",
  "Direct relationships with premium local brands and artisans",
  "Fair, transparent commissions that help makers thrive",
  "Fast nationwide delivery with a personal touch",
];

export default function About() {
  return (
    <>
      <Helmet>
        <title>About instaBrandz — The Story Behind the Marketplace</title>
        <meta
          name="description"
          content="instaBrandz is a curated marketplace connecting discerning shoppers with premium local brands, artisans and independent creators. Discover our story."
        />
        <link rel="canonical" href="https://dream-project-roan.vercel.app/about" />
        <meta property="og:title" content="About instaBrandz — The Story Behind the Marketplace" />
        <meta
          property="og:description"
          content="A curated marketplace built on taste, trust and craft."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://dream-project-roan.vercel.app/about" />
      </Helmet>

      <div className="about-page">
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
              About instaBrandz
              <span className="eyebrow-line" />
            </p>
            <h1 className="hero-title">
              The Story Behind <em className="gold-text">instaBrandz</em>
            </h1>
            <p className="hero-subtitle">
              A curated marketplace connecting discerning shoppers with the
              region's most promising artisans, designers and independent
              creators — one remarkable product at a time.
            </p>

            <div className="hero-actions">
              <Link to="/products" className="btn-primary">
                Explore the Collection
              </Link>
              <Link to="/seller-register" className="btn-secondary">
                Sell With Us
              </Link>
            </div>
          </div>
        </section>

        {/* ============ STORY / MISSION ============ */}
        <section className="story-section">
          <div className="story-grid">
            <div className="story-panel" aria-hidden="true">
              <div className="story-frame">
                <span className="story-monogram">D</span>
              </div>
            </div>

            <div className="story-content">
              <div className="section-heading">
                <p className="section-eyebrow">Our Mission</p>
                <h2 className="title">
                  A Marketplace Built on Taste, Trust and Craft
                </h2>
              </div>
              <p className="story-copy">
                instaBrandz began with a simple belief: exceptional products
                deserve a home that celebrates them. Too often, gifted local
                brands and independent artisans are crowded out of the
                mainstream — invisible behind mass-produced shelves and
                faceless marketplaces.
              </p>
              <p className="story-copy">
                So we built something different. A curated marketplace where
                every listing is personally vetted, where every partner is a
                name we know, and where quality always wins over quantity.
              </p>
              <ul className="story-points">
                {STORY_POINTS.map((point) => (
                  <li key={point}>
                    <span className="story-point-mark" aria-hidden="true" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ============ STATS BAND ============ */}
        <section className="stats-section">
          <div className="section-heading">
            <p className="section-eyebrow">By the Numbers</p>
            <h2 className="title">Growing With Every Order</h2>
          </div>
          <div className="stats-grid">
            {STATS.map((stat) => (
              <div className="stat-card" key={stat.label}>
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ============ VALUES ============ */}
        <section className="values-section">
          <div className="section-heading">
            <p className="section-eyebrow">What We Stand For</p>
            <h2 className="title">The Principles Behind Every Purchase</h2>
          </div>
          <div className="values-grid">
            {VALUES.map((value) => (
              <div className="value-card" key={value.title}>
                <div className="value-icon">{value.icon}</div>
                <h3>{value.title}</h3>
                <p>{value.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ============ CTA BANNER ============ */}
        <section className="cta-banner">
          <div className="cta-banner-bg" aria-hidden="true">
            <div className="hero-glow hero-glow--one" />
          </div>
          <div className="cta-content">
            <h2>Become Part of the instaBrandz Story</h2>
            <p>
              Whether you shop or sell, you are part of a community obsessed
              with quality, trust and craft.
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
        </section>
      </div>
    </>
  );
}
