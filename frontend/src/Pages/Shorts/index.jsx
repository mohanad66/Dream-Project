import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import api from "../../services/api";
import { ACCESS_TOKEN } from "../../services/constants";
import ShortsFeed from "../../Components/ShortsFeed";
import "./css/style.scss";

export default function Shorts({
  categories = [],
  tags = [],
}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFeed = async () => {
      setLoading(true);
      try {
        const access = localStorage.getItem(ACCESS_TOKEN);
        const followed = access && access.trim() !== "";

        const [homeRes] = await Promise.all([
          api.get("/api/feed/home/"),
        ]);

        const combined = [];
        if (followed) {
          try {
            const followedRes = await api.get("/api/feed/followed/");
            combined.push(...(followedRes.data.products || []));
          } catch (err) {}
        }

        combined.push(...(homeRes.data.trending || []));
        combined.push(...(homeRes.data.recent || []));

        // Deduplicate by id
        const seen = new Set();
        const unique = combined.filter((p) => {
          if (!p?.id || seen.has(p.id)) return false;
          seen.add(p.id);
          return true;
        });

        setItems(unique);
      } catch (err) {
        console.error("Failed to load shorts feed:", err);
      } finally {
        setLoading(false);
      }
    };

    loadFeed();
  }, []);

  const targetId = searchParams.get("p");
  const startIndex = targetId ? Math.max(0, items.findIndex((p) => String(p.id) === targetId)) : 0;

  if (loading) {
    return (
      <div className="shorts-page shorts-page--loading">
        <div className="shorts-loader-spinner" />
        <p>Loading shorts…</p>
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