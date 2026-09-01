import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import api from "../../services/api";
import { ACCESS_TOKEN } from "../../services/constants";
import { cleanFeedItems } from "../../utils/cleanData";
import ShortsFeed from "../../Components/ShortsFeed";
import "./css/style.scss";

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// Sellers' standalone advertisement videos lead the feed (they're a brand
// pitch for the page), then product videos; after a random run of videos we
// splice in 1–2 seller products/offers, TikTok-style. Videos keep their
// curated order (ads → trending → recent → followed); products/offers rotate.
const buildShortsSequence = (products, offers, ads) => {
  const videos = [
    ...(Array.isArray(ads) ? ads : []),
    ...products.filter((p) => p && p.video),
  ];
  const rest = shuffle([
    ...products.filter((p) => p && !p.video),
    ...(Array.isArray(offers) ? offers : []),
  ]);
  if (!videos.length || !rest.length) return [...videos, ...rest];

  const merged = [];
  let v = 0;
  let r = 0;
  while (v < videos.length || r < rest.length) {
    const run = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < run && v < videos.length; i++) merged.push(videos[v++]);
    const mix = Math.random() < 0.5 ? 1 : 2;
    for (let j = 0; j < mix && r < rest.length; j++) merged.push(rest[r++]);
  }
  return merged;
};

export default function Shorts({
  categories = [],
  tags = [],
}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadFeed = async () => {
    setLoading(true);
    setError(null);
    try {
      const access = localStorage.getItem(ACCESS_TOKEN);
      const hasToken = access && access.trim() !== "";

      const [homeRes] = await Promise.all([api.get("/api/feed/home/")]);

      let followedProducts = [];
      let followedOffers = [];
      let followedAds = [];
      if (hasToken) {
        try {
          const followedRes = await api.get("/api/feed/followed/");
          followedProducts = followedRes.data.products || [];
          followedOffers = followedRes.data.offers || [];
          followedAds = followedRes.data.ads || [];
        } catch (err) {}
      }

      // Popular (most liked) first regardless of follows, then recent,
      // then followed sellers, then offers as brand slides.
      const combined = [];
      combined.push(...(homeRes.data.trending || []));
      combined.push(...(homeRes.data.recent || []));
      combined.push(...followedProducts);

      const seen = new Set();
      const uniqueProducts = combined.filter((p) => {
        if (!p?.id || seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      });

      const offers = [
        ...(followedOffers.length ? followedOffers : []),
        ...(homeRes.data.offers || []),
      ]
        .filter((o) => o && o.id)
        .filter((o, i, arr) => arr.findIndex((x) => x.id === o.id) === i);

      const ads = [
        ...(followedAds.length ? followedAds : []),
        ...(homeRes.data.ads || []),
      ]
        .filter((a) => a && a.video)
        .filter((a, i, arr) => arr.findIndex((x) => x.id === a.id) === i);

      setItems(cleanFeedItems(buildShortsSequence(uniqueProducts, offers, ads)));
    } catch (err) {
      console.error("Failed to load shorts feed:", err);
      setError(err?.response?.data?.detail || "We couldn't load Shorts right now.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeed();
  }, []);

  const targetId = searchParams.get("p") || searchParams.get("o");
  const startIndex = targetId ? Math.max(0, items.findIndex((it) => String(it.id) === String(targetId))) : 0;

  if (loading) {
    return (
      <div className="shorts-page shorts-page--loading">
        <div className="shorts-loader-spinner" />
        <p>Loading shorts…</p>
      </div>
    );
  }

  if (error && !items.length) {
    return (
      <div className="shorts-page shorts-page--error">
        <h2>We couldn't load Shorts</h2>
        <p>{error}</p>
        <button className="shorts-empty-btn" onClick={loadFeed}>
          Try again
        </button>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="shorts-page shorts-page--empty">
        <h2>No shorts available yet</h2>
        <p>Check back soon for the latest products.</p>
        <button className="shorts-empty-btn" onClick={() => navigate("/products")}>
          Browse Products
        </button>
      </div>
    );
  }

  return (
    <div className="shorts-page">
      <Link to="/" className="shorts-exit" aria-label="Back to home">
        <FaArrowLeft />
      </Link>
      <ShortsFeed
        items={items}
        categories={categories}
        tags={tags}
        startIndex={startIndex}
        onEnd={() => navigate("/products")}
      />
    </div>
  );
}