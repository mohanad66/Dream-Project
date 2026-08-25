// src/Components/Card/index.jsx

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import "./css/style.scss";
import useFancybox from "../FancyBox";
import { FaShoppingCart, FaBolt, FaPlus, FaMinus, FaHeart } from "react-icons/fa";
import { useNavigate, Link } from "react-router-dom";
import api from "../../services/api";

export default function Card({ card, categories, tags }) {
  const [showPopup, setShowPopup] = useState(false);
  const [isAddedToCart, setIsAddedToCart] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [inWishlist, setInWishlist] = useState(false);
  const navigate = useNavigate();

  // Check if product is in wishlist
  useEffect(() => {
    const checkWishlist = async () => {
      try {
        const response = await api.get(`/api/wishlist/check/?product_id=${card.id}`);
        setInWishlist(response.data.in_wishlist);
      } catch (err) {
        // Not logged in or error
      }
    };
    if (card.id) {
      checkWishlist();
    }
  }, [card.id]);

  const toggleWishlist = async (e) => {
    e.stopPropagation();
    try {
      if (inWishlist) {
        await api.delete("/api/wishlist/remove/", { data: { product_id: card.id } });
        setInWishlist(false);
      } else {
        await api.post("/api/wishlist/add/", { product_id: card.id });
        setInWishlist(true);
      }
    } catch (err) {
      console.error("Wishlist toggle failed:", err);
    }
  };

  // Build image list: primary + gallery
  const allImages = [card.image, ...(card.gallery_images?.map(g => g.image) || [])].filter(Boolean);

  // Preload adjacent images so navigation feels instant
  useEffect(() => {
    const preload = (idx) => {
      if (allImages[idx]) {
        const img = new Image();
        img.src = allImages[idx];
      }
    };
    preload((currentImageIndex + 1) % allImages.length);
    preload((currentImageIndex - 1 + allImages.length) % allImages.length);
  }, [currentImageIndex, allImages]);

  const nextImage = (e) => {
    e.stopPropagation();
    setImgLoaded(false);
    setCurrentImageIndex((prev) => (prev + 1) % allImages.length);
  };

  const prevImage = (e) => {
    e.stopPropagation();
    setImgLoaded(false);
    setCurrentImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
  };

  useEffect(() => {
    if (showPopup) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showPopup]);
  const [fancyboxRef] = useFancybox();

  const getDescriptionPreview = () => {
    if (!card.description) return "";
    return card.description.length >= 50
      ? `${card.description.substring(0, 50)}...`
      : card.description;
  };

  const handleQuantityChange = (change) => {
    const newQuantity = quantity + change;
    if (newQuantity >= 1 && newQuantity <= 99) {
      setQuantity(newQuantity);
    }
  };

  const handleAddToCart = () => {
    let cart = JSON.parse(localStorage.getItem("cart")) || [];
    const existingItemIndex = cart.findIndex((item) => item.id === card.id);

    if (existingItemIndex !== -1) {
      cart[existingItemIndex].quantity =
        (cart[existingItemIndex].quantity || 1) + quantity;
    } else {
      cart.push({ ...card, quantity });
    }

    localStorage.setItem("cart", JSON.stringify(cart));
    setIsAddedToCart(true);
    setTimeout(() => setIsAddedToCart(false), 2000);
  };

  const handleBuyNow = () => {
    let cart = JSON.parse(localStorage.getItem("cart")) || [];
    const existingItemIndex = cart.findIndex((item) => item.id === card.id);

    if (existingItemIndex !== -1) {
      cart[existingItemIndex].quantity =
        (cart[existingItemIndex].quantity || 1) + quantity;
    } else {
      cart.push({ ...card, quantity });
    }

    localStorage.setItem("cart", JSON.stringify(cart));
    navigate("/checkout");
  };

  return (
    <>
      <div className="card">
        <div className="card-carousel" onClick={() => setShowPopup(true)}>
          <button
            className={`wishlist-btn ${inWishlist ? "active" : ""}`}
            onClick={toggleWishlist}
            aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
          >
            <FaHeart />
          </button>
          <img
            className={`card-image${imgLoaded ? " img-ready" : ""}`}
            src={allImages[currentImageIndex]}
            alt={card.name}
            width={380}
            height={210}
            loading="lazy"
            decoding="async"
            onLoad={() => setImgLoaded(true)}
          />
          {allImages.length > 1 && (
            <>
              <button className="carousel-btn prev" onClick={prevImage}>❮</button>
              <button className="carousel-btn next" onClick={nextImage}>❯</button>
              <div className="carousel-dots">
                {allImages.map((_, i) => (
                  <span key={i} className={`dot ${i === currentImageIndex ? "active" : ""}`} />
                ))}
              </div>
            </>
          )}
        </div>
        {card.seller_name && card.seller && (
          <Link to={`/seller/${card.seller}`} className="card-brand card-seller-link" onClick={(e) => e.stopPropagation()}>
            {card.seller_avatar && (
              <img
                src={card.seller_avatar}
                alt=""
                width={20}
                height={20}
                decoding="async"
                style={{ borderRadius: "50%", marginRight: 6, verticalAlign: "middle" }}
              />
            )}
            {card.seller_name}
          </Link>
        )}
        <h2>{card.name}</h2>
        {card.effective_price && parseFloat(card.effective_price) < parseFloat(card.price) ? (
          <span className="price" style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <span style={{ color: "var(--color-success, #3fa781)", fontWeight: 700 }}>{card.effective_price} L.E</span>
            <span style={{ textDecoration: "line-through", color: "var(--text-muted)", fontSize: "0.85em" }}>{card.price} L.E</span>
          </span>
        ) : (
          <span className="price">{card.price} L.E</span>
        )}
        <p className="card-content">{getDescriptionPreview()}</p>

        <div className="tags">
          {card.tags && card.tags.length > 0 ? (
            card.tags.map((tagId) => {
              const tag = tags.find((t) => t.id === tagId);
              return tag ? (
                <span key={tagId} className="tag">
                  {tag.name}
                </span>
              ) : null;
            })
          ) : (
            <span className="tag">No tags</span>
          )}
        </div>

        <div className="card-actions-streamlined">
          <button
            className="quick-add-btn"
            onClick={handleAddToCart}
            disabled={isAddedToCart}
          >
            <FaPlus /> {isAddedToCart ? "Added" : "Quick Add"}
          </button>
        </div>
      </div>

      {showPopup && createPortal(
        <div className="card-popup-overlay" onClick={() => setShowPopup(false)}>
          <div
            className="card-popup-rectangle"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="close-btn" onClick={() => setShowPopup(false)}>
              ×
            </button>
            <div className="popup-content">
              <div className="popup-right">
                <div ref={fancyboxRef} className="popup-img card-carousel">
                  <img
                    src={allImages[currentImageIndex]}
                    alt={card.name}
                    width={600}
                    height={400}
                    loading="lazy"
                    decoding="async"
                    style={{ transition: "opacity 0.2s ease", opacity: imgLoaded ? 1 : 0.5 }}
                    onLoad={() => setImgLoaded(true)}
                  />
                  {allImages.length > 1 && (
                    <>
                      <button className="carousel-btn prev" onClick={prevImage}>❮</button>
                      <button className="carousel-btn next" onClick={nextImage}>❯</button>
                      <div className="carousel-dots">
                        {allImages.map((_, i) => (
                          <span key={i} className={`dot ${i === currentImageIndex ? "active" : ""}`} />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="popup-left">
                <div className="popup-header">
                  {card.seller_name && card.seller && (
                    <Link to={`/seller/${card.seller}`} className="card-brand popup-brand card-seller-link" onClick={(e) => e.stopPropagation()}>
                      {card.seller_avatar && (
                        <img
                          src={card.seller_avatar}
                          alt=""
                          width={20}
                          height={20}
                          decoding="async"
                          style={{ borderRadius: "50%", marginRight: 6, verticalAlign: "middle" }}
                        />
                      )}
                      {card.seller_name}
                    </Link>
                  )}
                  <h2>{card.name}</h2>
                  {card.price && (
                    <p className="card-price">
                      {card.effective_price && parseFloat(card.effective_price) < parseFloat(card.price) ? (
                        <span style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                          <span style={{ color: "var(--color-success, #3fa781)", fontWeight: 700 }}>Price: {card.effective_price} L.E</span>
                          <span style={{ textDecoration: "line-through", color: "var(--text-muted)", fontSize: "0.85em" }}>{card.price} L.E</span>
                        </span>
                      ) : (
                        `Price: ${card.price} L.E`
                      )}
                    </p>
                  )}
                  {card.category ? (
                    <p className="card-category">
                      Category:{" "}
                      {
                        categories.find(
                          (category) => category.id === card.category,
                        )?.name
                      }
                    </p>
                  ) : (
                    <p className="card-category">Category: Uncategorized</p>
                  )}
                </div>

                <div className="popup-scrollable">
                  <div className="popup-content-full">
                    {card.description || "No description available"}
                  </div>
                </div>

                {/* Display product tags in popup */}
                <div className="tags">
                  {card.tags && card.tags.length > 0 ? (
                    card.tags.map((tagId) => {
                      const tag = tags.find((t) => t.id === tagId);
                      return tag ? (
                        <span key={tagId} className="tag">
                          {tag.name}
                        </span>
                      ) : null;
                    })
                  ) : (
                    <span className="tag">No tags</span>
                  )}
                </div>

                <div className="quantity-selector">
                  <button
                    className="quantity-btn"
                    onClick={() => handleQuantityChange(-1)}
                    disabled={quantity <= 1}
                  >
                    <FaMinus />
                  </button>
                  <input
                    type="number"
                    className="quantity-input"
                    value={quantity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 1;
                      if (val >= 1 && val <= 99) setQuantity(val);
                    }}
                    min="1"
                    max="99"
                  />
                  <button
                    className="quantity-btn"
                    onClick={() => handleQuantityChange(1)}
                    disabled={quantity >= 99}
                  >
                    <FaPlus />
                  </button>
                </div>

                <div className="popup-actions">
                  <button
                    className="add-to-cart-btn"
                    onClick={handleAddToCart}
                    disabled={isAddedToCart}
                  >
                    <FaShoppingCart />{" "}
                    {isAddedToCart ? "Added!" : "Add to Cart"}
                  </button>
                  <button className="buy-now-btn" onClick={handleBuyNow}>
                    <FaBolt /> Buy Now
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
