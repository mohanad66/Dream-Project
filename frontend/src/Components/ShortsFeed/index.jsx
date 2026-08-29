import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  FaHeart,
  FaComment,
  FaShareAlt,
  FaShoppingCart,
  FaStar,
  FaRegStar,
  FaTrash,
  FaCheck,
  FaUserCircle,
  FaPlus,
} from "react-icons/fa";
import api from "../../services/api";
import { ACCESS_TOKEN } from "../../services/constants";
import "./css/style.scss";

export default function ShortsFeed({
  items = [],
  categories = [],
  tags = [],
  height = "100vh",
  onEnd = null,
  startIndex = 0,
}) {
  const [followStates, setFollowStates] = useState({});
  const [likeStates, setLikeStates] = useState({});
  const [comments, setComments] = useState({});
  const [commentOpenId, setCommentOpenId] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef(null);

  const isLoggedIn = () => {
    const access = localStorage.getItem(ACCESS_TOKEN);
    return access && access.trim() !== "";
  };

  // Track which slide is currently active (for lazy loading / active styles)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onScroll = () => {
      const index = Math.round(el.scrollTop / el.clientHeight);
      if (index !== activeIndex) setActiveIndex(index);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [activeIndex]);

  // Jump to startIndex once mounted
  useEffect(() => {
    if (startIndex <= 0) return;
    const el = containerRef.current;
    const scrollToTarget = () => {
      if (el) {
        el.scrollTo({ top: startIndex * el.clientHeight, behavior: "auto" });
        setActiveIndex(startIndex);
      }
    };
    const t1 = setTimeout(scrollToTarget, 100);
    const onLoad = () => setTimeout(scrollToTarget, 50);
    if (document.readyState !== "complete") {
      window.addEventListener("load", onLoad);
    }
    return () => {
      clearTimeout(t1);
      window.removeEventListener("load", onLoad);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startIndex]);

  const getLikeState = (product) => {
    if (likeStates[product.id] !== undefined) return likeStates[product.id];
    return { liked: !!product.is_liked, count: product.like_count || 0 };
  };

  const toggleFollow = async (sellerId, productOwn = false) => {
    if (productOwn) return;
    if (!isLoggedIn()) {
      window.location.href = "/login";
      return;
    }
    try {
      const response = await api.post(`/api/sellers/${sellerId}/follow/`);
      const data = response.data;
      if (data.self) {
        setFollowStates((prev) => ({
          ...prev,
          [sellerId]: { followed: true, count: data.followers_count || 0 },
        }));
        return;
      }
      setFollowStates((prev) => ({
        ...prev,
        [sellerId]: { followed: data.followed, count: data.followers_count },
      }));
    } catch (err) {
      console.error("Follow failed:", err);
    }
  };

  const getFollowState = (sellerId) => {
    if (followStates[sellerId] !== undefined) return followStates[sellerId];
    return { followed: false, count: 0 };
  };

  const toggleLike = async (product) => {
    if (!isLoggedIn()) {
      window.location.href = "/login";
      return;
    }
    try {
      const response = await api.post(`/api/products/${product.id}/like/`);
      setLikeStates((prev) => ({
        ...prev,
        [product.id]: { liked: response.data.liked, count: response.data.like_count },
      }));
    } catch (err) {
      console.error("Like failed:", err);
    }
  };

  const toggleComments = async (product) => {
    const nextOpen = commentOpenId === product.id ? null : product.id;
    setCommentOpenId(nextOpen);
    if (!nextOpen || comments[product.id]) return;
    try {
      const response = await api.get(`/api/products/${product.id}/comments/`);
      setComments((prev) => ({ ...prev, [product.id]: response.data }));
    } catch (err) {
      console.error("Comments failed:", err);
    }
  };

  const submitComment = async (product) => {
    const text = commentText.trim();
    if (!text) return;
    try {
      const response = await api.post("/api/products/comments/create/", {
        product: product.id,
        content: text,
      });
      setComments((prev) => ({
        ...prev,
        [product.id]: [...(prev[product.id] || []), response.data],
      }));
      setCommentText("");
    } catch (err) {
      console.error("Comment failed:", err);
      window.location.href = "/login";
    }
  };

  const deleteComment = async (productId, commentId) => {
    try {
      await api.delete(`/api/products/comments/${commentId}/delete/`);
      setComments((prev) => ({
        ...prev,
        [productId]: (prev[productId] || []).filter((c) => c.id !== commentId),
      }));
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const handleShare = async (product) => {
    try {
      const shareUrl = `${window.location.origin}/shorts?p=${product.id}`;
      if (navigator.share) {
        navigator.share({ title: product.name, text: product.description || product.name, url: shareUrl });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        alert("Link copied to clipboard!");
      }
    } catch (err) {}
  };

  const addToCart = (product) => {
    let cart = JSON.parse(localStorage.getItem("cart")) || [];
    const existing = cart.findIndex((item) => item.id === product.id);
    if (existing !== -1) {
      cart[existing].quantity = (cart[existing].quantity || 1) + 1;
    } else {
      cart.push({ ...product, quantity: 1 });
    }
    localStorage.setItem("cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("cart-updated"));
  };

  const renderStars = (rating) => {
    const r = Math.round(rating);
    return [1, 2, 3, 4, 5].map((i) =>
      i <= r ? <FaStar key={i} className="shorts-star filled" /> : <FaRegStar key={i} className="shorts-star" />
    );
  };

  const images = (product) => [product.image, ...(product.gallery_images?.map((g) => g.image) || [])].filter(Boolean);

  return (
    <div className={`shorts-feed ${onEnd ? "has-caption" : ""}`} ref={containerRef} style={{ height }}>
      {items.map((product, index) => {
        const like = getLikeState(product);
        const follow = getFollowState(product.seller);
        const productComments = comments[product.id] || [];
        const imgs = images(product);
        return (
          <div className="shorts-slide" key={product.id}>
            <div className="shorts-media">
              {imgs[0] ? (
                <img
                  src={imgs[0]}
                  alt={product.name}
                  loading={index > 1 ? "lazy" : "eager"}
                  decoding="async"
                />
              ) : (
                <div className="shorts-placeholder">
                  <FaShoppingCart size={48} />
                </div>
              )}
            </div>
            <div className="shorts-gradient top" />
            <div className="shorts-gradient bottom" />

            {/* Right action rail */}
            <div className="shorts-rail">
              {product.seller && (
                <div className="shorts-seller">
                  <Link to={`/seller/${product.seller}`} className="shorts-seller-avatar">
                    {product.seller_avatar ? (
                      <img src={product.seller_avatar} alt="" />
                    ) : (
                      <FaUserCircle />
                    )}
                  </Link>
                  {product.is_own_seller ? (
                    <span className="shorts-follow own" aria-label="Your store">✓</span>
                  ) : (
                    <button
                      className={`shorts-follow ${follow.followed ? "following" : ""}`}
                      onClick={() => toggleFollow(product.seller, product.is_own_seller)}
                      aria-label={follow.followed ? "Unfollow seller" : "Follow seller"}
                    >
                      {follow.followed ? <FaCheck /> : <FaPlus />}
                    </button>
                  )}
                </div>
              )}

              <button
                className={`shorts-rail-btn like ${like.liked ? "active" : ""}`}
                onClick={() => toggleLike(product)}
                aria-label="Like"
              >
                <FaHeart />
                {like.count > 0 && <span>{like.count}</span>}
              </button>

              <button
                className="shorts-rail-btn"
                onClick={() => toggleComments(product)}
                aria-label="Comments"
              >
                <FaComment />
                {(product.comment_count || productComments.length) > 0 && (
                  <span>{product.comment_count || productComments.length}</span>
                )}
              </button>

              <button className="shorts-rail-btn" onClick={() => handleShare(product)} aria-label="Share">
                <FaShareAlt />
              </button>

              <button className="shorts-rail-btn cart" onClick={() => addToCart(product)} aria-label="Add to cart">
                <FaShoppingCart />
              </button>
            </div>

            {/* Bottom info */}
            <div className="shorts-footer">
              <Link to={`/seller/${product.seller}`} className="shorts-brand">
                {product.seller_name}
              </Link>
              {product.average_rating > 0 && (
                <span className="shorts-rating">
                  {renderStars(product.average_rating)}
                  <em>{product.average_rating}</em>
                </span>
              )}
              <h2 className="shorts-title">{product.name}</h2>
              {product.effective_price && parseFloat(product.effective_price) < parseFloat(product.price) ? (
                <div className="shorts-price">
                  <span className="shorts-price-now">{product.effective_price} L.E</span>
                  <span className="shorts-price-was">{product.price} L.E</span>
                </div>
              ) : (
                <div className="shorts-price">
                  <span className="shorts-price-now">{product.price} L.E</span>
                </div>
              )}
              {product.description && <p className="shorts-desc">{product.description}</p>}
            </div>

            {/* Progress indicator */}
            <div className="shorts-progress">
              {items.map((_, i) => (
                <span key={i} className={`short-progress-bar ${i === index ? "current" : ""} ${i < index ? "done" : ""}`} />
              ))}
            </div>
          </div>
        );
      })}

      {onEnd && items.length > 0 && (
        <div className="shorts-end">
          <h3>You're all caught up!</h3>
          <button className="shorts-end-btn" onClick={onEnd}>
            Browse All Products
          </button>
        </div>
      )}

      {/* Comments bottom sheet */}
      {commentOpenId && (
        <div className="shorts-comments-overlay" onClick={() => setCommentOpenId(null)}>
          <div className="shorts-comments-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="shorts-comments-head">
              <h3>{comments[commentOpenId]?.length || 0} Comments</h3>
              <button onClick={() => setCommentOpenId(null)} aria-label="Close">✕</button>
            </div>
            <div className="shorts-comments-list">
              {productComments.length === 0 && <p className="shorts-comments-empty">No comments yet. Be the first!</p>}
              {productComments.map((comment) => {
                const target = items.find((p) => p.id === commentOpenId);
                return (
                  <div className="shorts-comment" key={comment.id}>
                    <div className="shorts-comment-avatar">
                      {comment.user_avatar ? <img src={comment.user_avatar} alt="" /> : <FaUserCircle />}
                    </div>
                    <div className="shorts-comment-body">
                      <strong>{comment.user_name}</strong>
                      <p>{comment.content}</p>
                      <span>{new Date(comment.created_at).toLocaleDateString()}</span>
                    </div>
                    {target && isLoggedIn() && (
                      <button className="shorts-comment-delete" onClick={() => deleteComment(target.id, comment.id)} aria-label="Delete">
                        <FaTrash />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <form
              className="shorts-comments-form"
              onSubmit={(e) => {
                e.preventDefault();
                submitComment(items.find((p) => p.id === commentOpenId));
              }}
            >
              <input
                type="text"
                placeholder={isLoggedIn() ? "Add a comment…" : "Log in to comment"}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                disabled={!isLoggedIn()}
                onClick={() => {
                  if (!isLoggedIn()) window.location.href = "/login";
                }}
              />
              <button type="submit">
                <FaComment />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Slide navigation dots */}
      <div className="shorts-nav-dots">
        {items.map((_, i) => (
          <span
            key={i}
            className={i === activeIndex ? "active" : ""}
            onClick={() => {
              containerRef.current?.scrollTo({ top: i * containerRef.current.clientHeight, behavior: "smooth" });
            }}
          />
        ))}
      </div>
    </div>
  );
}