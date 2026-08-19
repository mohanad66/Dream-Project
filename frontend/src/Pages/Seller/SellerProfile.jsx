import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../../services/api";
import { Package, Megaphone, Info, Truck, Store, Calendar, Star, Tag } from "lucide-react";
import "./SellerProfile.scss";

const OFFER_TYPE_COLORS = {
  discount: "#c9a24b",
  flash_sale: "#e06a5d",
  seasonal: "#3fa781",
  clearance: "#a27c28",
};

export default function SellerProfile() {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("products");

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get(`/api/sellers/${id}/profile/`);
        setProfile(response.data);
      } catch (err) {
        console.error("Failed to fetch seller profile:", err);
        setError("Failed to load seller profile. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [id]);

  if (loading) {
    return (
      <div className="seller-profile-page">
        <div className="sp-loader">
          <div className="sp-loader__spinner" />
          <p>Loading seller profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="seller-profile-page">
        <div className="sp-error">
          <Store size={48} />
          <h2>Something went wrong</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const { seller, products, products_count, offers } = profile;
  const initials = seller.business_name
    ? seller.business_name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "??";

  return (
    <div className="seller-profile-page">
      <div className="sp-cover">
        {seller.cover_image ? (
          <img src={seller.cover_image} alt={`${seller.business_name} cover`} />
        ) : (
          <div className="sp-cover__fallback" />
        )}
        <div className="sp-cover__gradient" />
      </div>

      <div className="sp-header container">
        <div className="sp-header__avatar">
          {seller.avatar ? (
            <img src={seller.avatar} alt={seller.business_name} />
          ) : (
            <span className="sp-header__initials">{initials}</span>
          )}
        </div>

        <div className="sp-header__info">
          <h1 className="sp-header__name">{seller.business_name}</h1>
          <p className="sp-header__meta">
            @{seller.user_username}
            <span className="sp-header__dot">·</span>
            <Calendar size={14} />
            Joined {new Date(seller.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
          </p>
          {seller.bio && <p className="sp-header__bio">{seller.bio}</p>}
          <div className="sp-header__stats">
            <span className="sp-stat">
              <Package size={15} />
              {products_count ?? seller.product_count ?? 0} products
            </span>
            <span className="sp-stat">
              <Truck size={15} />
              Delivery: {seller.delivery_type === "platform" ? "Platform" : "Seller"}
            </span>
            {seller.average_rating != null && (
              <span className="sp-stat">
                <Star size={15} />
                {Number(seller.average_rating).toFixed(1)}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="sp-tabs container">
        <button
          className={`sp-tab ${activeTab === "products" ? "sp-tab--active" : ""}`}
          onClick={() => setActiveTab("products")}
        >
          <Package size={18} />
          Products
        </button>
        <button
          className={`sp-tab ${activeTab === "offers" ? "sp-tab--active" : ""}`}
          onClick={() => setActiveTab("offers")}
        >
          <Megaphone size={18} />
          Offers
        </button>
        <button
          className={`sp-tab ${activeTab === "about" ? "sp-tab--active" : ""}`}
          onClick={() => setActiveTab("about")}
        >
          <Info size={18} />
          About
        </button>
      </div>

      <div className="sp-content container">
        {activeTab === "products" && (
          <div className="sp-products fade-in">
            {(products && products.length > 0) ? (
              <div className="sp-products__grid">
                {products.map((product) => (
                  <Link
                    to={`/products`}
                    key={product.id}
                    className="sp-product-card"
                  >
                    <div className="sp-product-card__image">
                      {product.image ? (
                        <img src={product.image} alt={product.name} />
                      ) : (
                        <div className="sp-product-card__placeholder">
                          <Package size={32} />
                        </div>
                      )}
                    </div>
                    <div className="sp-product-card__body">
                      <h3 className="sp-product-card__name">{product.name}</h3>
                      <p className="sp-product-card__price">
                        {Number(product.price).toLocaleString("en-EG")} L.E
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="sp-empty">
                <Package size={40} />
                <h3>No products yet</h3>
                <p>This seller hasn't listed any products.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "offers" && (
          <div className="sp-offers fade-in">
            {(offers && offers.length > 0) ? (
              <div className="sp-offers__list" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
                {offers.map((offer) => (
                  <div key={offer.id} className="sp-offer-card">
                    {offer.image && (
                      <img src={offer.image} alt={offer.title} className="sp-offer-card__image" />
                    )}
                    <div className="sp-offer-card__header">
                      <span
                        className="sp-offer-card__badge"
                        style={{
                          background: `${OFFER_TYPE_COLORS[offer.offer_type] || "#c9a24b"}22`,
                          color: OFFER_TYPE_COLORS[offer.offer_type] || "#c9a24b",
                          borderColor: `${OFFER_TYPE_COLORS[offer.offer_type] || "#c9a24b"}44`,
                        }}
                      >
                        <Tag size={12} />
                        {offer.offer_type?.replace("_", " ") || "Offer"}
                      </span>
                      {offer.discount_percent != null && (
                        <span className="sp-offer-card__discount">
                          -{offer.discount_percent}%
                        </span>
                      )}
                    </div>
                    <h3 className="sp-offer-card__title">{offer.title}</h3>
                    {offer.description && (
                      <p className="sp-offer-card__desc">{offer.description}</p>
                    )}
                    {(offer.start_date || offer.end_date) && (
                      <p className="sp-offer-card__dates">
                        <Calendar size={13} />
                        {offer.start_date && new Date(offer.start_date).toLocaleDateString()}
                        {offer.start_date && offer.end_date && " — "}
                        {offer.end_date && new Date(offer.end_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="sp-empty">
                <Megaphone size={40} />
                <h3>No offers available</h3>
                <p>This seller hasn't posted any offers yet.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "about" && (
          <div className="sp-about fade-in">
            <div className="sp-about__section">
              <h2>About {seller.business_name}</h2>
              {seller.business_description && (
                <p className="sp-about__text">{seller.business_description}</p>
              )}
              {seller.bio && (
                <>
                  <h3>Bio</h3>
                  <p className="sp-about__text">{seller.bio}</p>
                </>
              )}
            </div>

            <div className="sp-about__details">
              <div className="sp-about__detail">
                <Store size={18} />
                <div>
                  <span className="sp-about__label">Business Name</span>
                  <span className="sp-about__value">{seller.business_name}</span>
                </div>
              </div>
              <div className="sp-about__detail">
                <Truck size={18} />
                <div>
                  <span className="sp-about__label">Delivery Type</span>
                  <span className="sp-about__value">
                    {seller.delivery_type === "platform" ? "Platform Delivery" : "Seller Delivery"}
                  </span>
                </div>
              </div>
              <div className="sp-about__detail">
                <Calendar size={18} />
                <div>
                  <span className="sp-about__label">Member Since</span>
                  <span className="sp-about__value">
                    {new Date(seller.created_at).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>
              <div className="sp-about__detail">
                <Package size={18} />
                <div>
                  <span className="sp-about__label">Products Listed</span>
                  <span className="sp-about__value">{products_count ?? 0}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
