// src/Components/Card/index.jsx

import React, { useState, useEffect } from "react";
import "./css/style.scss";
import useFancybox from "../FancyBox";
import { FaShoppingCart, FaBolt, FaPlus, FaMinus } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

export default function Card({ card, categories, tags }) {
  const [showPopup, setShowPopup] = useState(false);
  const [isAddedToCart, setIsAddedToCart] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imgLoaded, setImgLoaded] = useState(false);
  const navigate = useNavigate();

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
          <img
            className={`card-image${imgLoaded ? " img-ready" : ""}`}
            src={allImages[currentImageIndex]}
            alt={card.name}
            loading="lazy"
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
        {card.seller_name && <span className="card-brand">{card.seller_name}</span>}
        <h2>{card.name}</h2>
        <span className="price">{card.price} L.E</span>
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

      {showPopup && (
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
                    loading="lazy"
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
                  {card.seller_name && <span className="card-brand popup-brand">{card.seller_name}</span>}
                  <h2>{card.name}</h2>
                  {card.price && (
                    <p className="card-price">Price: {card.price} L.E</p>
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
        </div>
      )}
    </>
  );
}
