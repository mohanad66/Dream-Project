import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FaSearch, FaCheck, FaPlus, FaUserCircle, FaBoxOpen, FaUsers } from "react-icons/fa";
import api from "../../services/api";
import { ACCESS_TOKEN } from "../../services/constants";
import "./css/style.scss";

export default function Sellers() {
  const [query, setQuery] = useState("");
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searched, setSearched] = useState(false);
  const [followStates, setFollowStates] = useState({});
  const [following, setFollowing] = useState([]);

  const loadSellers = async (q = "") => {
    setLoading(true);
    try {
      const response = await api.get(`/api/sellers/search/?q=${encodeURIComponent(q)}`);
      setSellers(response.data || []);
    } catch (err) {
      console.error("Seller search failed:", err);
      setSellers([]);
    } finally {
      setLoading(false);
      setSearched(true);
    }
  };

  useEffect(() => {
    loadSellers();
  }, []);

  useEffect(() => {
    const access = localStorage.getItem(ACCESS_TOKEN);
    if (!access || access.trim() === "") return;
    api
      .get("/api/sellers/following/")
      .then((res) => {
        if (Array.isArray(res.data)) setFollowing(res.data);
      })
      .catch(() => {});
  }, []);

  const submitSearch = (e) => {
    e.preventDefault();
    loadSellers(query);
  };

  const toggleFollow = async (seller) => {
    const access = localStorage.getItem(ACCESS_TOKEN);
    if (!access || access.trim() === "") {
      window.location.href = "/login";
      return;
    }
    try {
      const response = await api.post(`/api/sellers/${seller.id}/follow/`);
      setFollowStates((prev) => ({
        ...prev,
        [seller.id]: { followed: response.data.followed, count: response.data.followers_count },
      }));
    } catch (err) {
      console.error("Follow failed:", err);
    }
  };

  const getFollow = (seller) => {
    if (followStates[seller.id] !== undefined) return followStates[seller.id];
    return { followed: !!seller.is_followed, count: seller.followers_count || 0 };
  };

  return (
    <div className="sellers-page container">
      <div className="sellers-head">
        <p className="section-eyebrow">Discover Sellers</p>
        <h1 className="sellers-title">Search Stores &amp; Sellers</h1>
        <p className="sellers-subtitle">
          Find your favorite brands, follow them, and stay up to date with their newest products and offers.
        </p>

        <form className="sellers-search" onSubmit={submitSearch}>
          <FaSearch />
          <input
            type="text"
            placeholder="Search by store name, username, or bio…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit">Search</button>
        </form>
      </div>

      {following.length > 0 && (
        <section className="sellers-following">
          <div className="sellers-following__bar">
            <p className="section-eyebrow">Your Circle</p>
            <h2 className="sellers-following__title">Stores you follow</h2>
          </div>
          <div className="sellers-following__row">
            {following.map((seller) => (
              <Link to={`/seller/${seller.id}`} key={seller.id} className="sellers-following__chip">
                {seller.avatar ? (
                  <img src={seller.avatar} alt="" />
                ) : (
                  <FaUserCircle />
                )}
                <span>{seller.business_name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {loading && <div className="sellers-loading">Searching…</div>}

      {!loading && !searched && null}

      {!loading && searched && sellers.length === 0 && (
        <div className="sellers-empty">
          <FaUserCircle size={48} />
          <h3>{query ? `No sellers match "${query}"` : "No sellers yet"}</h3>
          <p>Try a different search term.</p>
        </div>
      )}

      {!loading && sellers.length > 0 && (
        <div className="sellers-grid">
          {sellers.map((seller) => {
            const follow = getFollow(seller);
            return (
              <div className="seller-card" key={seller.id}>
                <div className="seller-card-cover">
                  <Link to={`/seller/${seller.id}`} aria-label={seller.business_name}>
                    <img
                      src={seller.cover_image || undefined}
                      alt=""
                      onError={(e) => { e.currentTarget.style.display = "none"; }}
                    />
                  </Link>
                </div>
                <div className="seller-card-body">
                  <div className="seller-card-avatar">
                    <Link to={`/seller/${seller.id}`}>
                      {seller.avatar ? (
                        <img src={seller.avatar} alt={seller.business_name} />
                      ) : (
                        <FaUserCircle />
                      )}
                    </Link>
                  </div>
                  <h3 className="seller-card-name">
                    <Link to={`/seller/${seller.id}`}>
                      {seller.business_name}
                      {seller.verified && <span className="seller-card-verified" title="Verified">✓</span>}
                    </Link>
                  </h3>
                  <p className="seller-card-user">@{seller.user_username}</p>
                  {seller.bio && <p className="seller-card-bio">{seller.bio}</p>}
                  <div className="seller-card-stats">
                    <span><FaBoxOpen /> {seller.product_count} products</span>
                    <span><FaUsers /> {follow.count} followers</span>
                  </div>
                  {seller.is_self ? (
                    <span className="seller-card-follow self">Your Store</span>
                  ) : (
                    <button
                      className={`seller-card-follow ${follow.followed ? "is-following" : ""}`}
                      onClick={() => toggleFollow(seller)}
                    >
                      {follow.followed ? <><FaCheck /> Following</> : <><FaPlus /> Follow</>}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}