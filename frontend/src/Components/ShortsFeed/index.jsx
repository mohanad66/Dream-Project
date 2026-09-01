import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  FaHeart,
  FaRegHeart,
  FaComment,
  FaShareAlt,
  FaShoppingCart,
  FaShoppingBag,
  FaStar,
  FaRegStar,
  FaTrash,
  FaCheck,
  FaUserCircle,
  FaPlus,
  FaPlay,
  FaPercent,
  FaStore,
  FaBookmark,
  FaRegBookmark,
  FaVolumeMute,
  FaVolumeUp,
} from "react-icons/fa";
import api from "../../services/api";
import { ACCESS_TOKEN } from "../../services/constants";
import { useAuth } from "../../services/auth";
import { resolveMediaUrl, resolveVideoUrl } from "../../utils/media";
import "./css/style.scss";

const isOffer = (item) =>
  !!(item && (item.offer_type !== undefined || item.discount_percent !== undefined || (item.title && item.product === null)));

const isAd = (item) => !!(item && item.kind === "ad");

// Ads share the item "id" space with products, so give them a namespaced media
// key to keep video refs / pause / progress maps from colliding.
const mediaKey = (item) => (isAd(item) ? `ad-${String(item.id)}` : String(item.id));

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
  const [videoPaused, setVideoPaused] = useState({});
  const [muted, setMuted] = useState(true);
  const [progress, setProgress] = useState({});
  const [wishlistStates, setWishlistStates] = useState({});
  const [videoBroken, setVideoBroken] = useState({});
  const [burst, setBurst] = useState(null);
  const containerRef = useRef(null);
  const videoRefs = useRef({});
  const lastTapRef = useRef(0);
  const tapTimerRef = useRef(null);
  const burstTimerRef = useRef(null);
  const { data: authData } = useAuth();
  const currentUserId = authData?.user?.id ?? null;

  useEffect(() => {
    return () => {
      clearTimeout(tapTimerRef.current);
      clearTimeout(burstTimerRef.current);
    };
  }, []);

  const isLoggedIn = () => {
    const access = localStorage.getItem(ACCESS_TOKEN);
    return access && access.trim() !== "";
  };

  // When the active slide changes, fetch its wishlist state for logged-in users
  useEffect(() => {
    const item = items[activeIndex];
    if (!item || isOffer(item) || !isLoggedIn()) return;
    api
      .get(`/api/wishlist/check/?product_id=${item.id}`)
      .then((res) =>
        setWishlistStates((prev) => ({ ...prev, [item.id]: !!res.data.in_wishlist })),
      )
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, items]);

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

  // Play the active video, pause the rest
  useEffect(() => {
    items.forEach((item, idx) => {
      const key = item ? mediaKey(item) : null;
      const video = videoRefs.current[key];
      if (!video) return;
      const shouldPlay = idx === activeIndex && !videoPaused[key] && !videoBroken[key];
      if (shouldPlay) {
        const p = video.play();
        if (p && p.catch) p.catch(() => {});
      } else {
        video.pause();
      }
    });
  }, [activeIndex, items, videoPaused, videoBroken]);

  const toggleVideo = (item, index) => {
    const key = mediaKey(item);
    const video = videoRefs.current[key];
    if (!video) return;
    if (index === activeIndex) {
      if (video.paused) {
        video.play().catch(() => {});
        setVideoPaused((prev) => ({ ...prev, [key]: false }));
      } else {
        video.pause();
        setVideoPaused((prev) => ({ ...prev, [key]: true }));
      }
    }
  };

  const toggleMute = (item) => {
    const key = mediaKey(item);
    const video = videoRefs.current[key];
    const next = !muted;
    setMuted(next);
    if (video) {
      video.muted = next;
      if (!next && video.paused) {
        video.play().catch(() => {});
        setVideoPaused((prev) => ({ ...prev, [key]: false }));
      }
    }
  };

  const handleTimeUpdate = (item, e) => {
    const key = mediaKey(item);
    const video = e.currentTarget;
    if (!video.duration) return;
    const pct = (video.currentTime / video.duration) * 100;
    setProgress((prev) => {
      const next = Math.floor(pct * 10);
      if (Math.floor((prev[key] || 0) * 10) === next) return prev;
      return { ...prev, [key]: pct };
    });
  };

  const toggleWishlist = async (product) => {
    if (!isLoggedIn()) {
      window.location.href = "/login?next=/shorts";
      return;
    }
    try {
      if (wishlistStates[product.id]) {
        await api.delete("/api/wishlist/remove/", { data: { product_id: product.id } });
        setWishlistStates((prev) => ({ ...prev, [product.id]: false }));
      } else {
        await api.post("/api/wishlist/add/", { product_id: product.id });
        setWishlistStates((prev) => ({ ...prev, [product.id]: true }));
      }
    } catch (err) {
      console.error("Wishlist toggle failed:", err);
    }
  };

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

  // TikTok-style double-tap: show a heart burst and like, without pausing.
  const triggerLike = (item) => {
    setBurst(item.id);
    clearTimeout(burstTimerRef.current);
    burstTimerRef.current = setTimeout(() => setBurst(null), 800);
    // Only products have a like endpoint; ads/offers get the burst for fun.
    if (isLoggedIn() && item?.id && !isAd(item) && !isOffer(item)) toggleLike(item);
  };

  // Distinguish single-tap (pause/play) from double-tap (like).
  const handleMediaTap = (product, index) => {
    const now = Date.now();
    if (now - lastTapRef.current < 280) {
      clearTimeout(tapTimerRef.current);
      triggerLike(product);
      return;
    }
    lastTapRef.current = now;
    tapTimerRef.current = setTimeout(() => toggleVideo(product, index), 280);
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

  const handleShare = async (item, type) => {
    try {
      const key = type === "offer" ? "o" : "p";
      const shareUrl = `${window.location.origin}/shorts?${key}=${item.id}`;
      const text = item.title || item.name || "instaBrandz";
      if (navigator.share) {
        navigator.share({ title: text, text: item.description || text, url: shareUrl });
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

  const images = (product) => [
    resolveMediaUrl(product.image),
    ...(product.gallery_images?.map((g) => resolveMediaUrl(g.image)) || []),
  ].filter(Boolean);

  const renderSellerAvatar = (sellerId, avatar, size = "avatar") => (
    <Link
      to={sellerId ? `/seller/${sellerId}` : "/sellers"}
      className={`shorts-seller-avatar ${size}`}
      onClick={(e) => e.stopPropagation()}
    >
      {avatar ? <img src={resolveMediaUrl(avatar)} alt="" /> : <FaUserCircle />}
    </Link>
  );

  const renderBrandRow = (sellerId, sellerName, avatar, verified, ownSeller, follow) => (
    <div className="shorts-brand-row">
      {renderSellerAvatar(sellerId, avatar)}
      <div className="shorts-brand-text">
        <Link to={sellerId ? `/seller/${sellerId}` : "/sellers"} className="shorts-brand-name">
          {sellerName || "instaBrandz Seller"}
          {verified && <span className="shorts-verified" title="Verified Seller">✓</span>}
        </Link>
        <span className="shorts-brand-sub">
          {ownSeller ? (
            <em>Your Store</em>
          ) : (
            <button
              className={`shorts-inline-follow ${follow.followed ? "following" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                toggleFollow(sellerId, ownSeller);
              }}
            >
              {follow.followed ? <><FaCheck /> Following</> : <><FaPlus /> Follow</>}
            </button>
          )}
        </span>
      </div>
    </div>
  );

  const renderOfferSlide = (offer, index) => {
    const imagesList = [
      resolveMediaUrl(offer.image),
      resolveMediaUrl(offer.product_image),
    ].filter(Boolean);
    const bg = imagesList[0];

    return (
      <div className={`shorts-slide shorts-slide--offer ${index === activeIndex ? "active" : ""}`} key={`offer-${offer.id}`}>
        <div className="shorts-media">
          {bg ? (
            <img src={bg} alt={offer.title} loading={index > 1 ? "lazy" : "eager"} decoding="async" />
          ) : (
            <div className="shorts-placeholder">
              <FaPercent size={48} />
            </div>
          )}
        </div>
        <div className="shorts-gradient top" />
        <div className="shorts-gradient bottom" />

        <div className="shorts-offer-body">
          <span className="shorts-offer-chip">
            <FaPercent /> LIMITED OFFER
          </span>
          {offer.discount_percent && (
            <span className="shorts-offer-discount">-{offer.discount_percent}%</span>
          )}
          <h2 className="shorts-offer-title">{offer.title}</h2>
          {offer.description && <p className="shorts-offer-desc">{offer.description}</p>}
          {offer.original_price != null && (
            <p className="shorts-offer-price">From {Number(offer.original_price).toFixed(2)} L.E</p>
          )}
          <div className="shorts-offer-actions">
            <Link to={offer.seller ? `/seller/${offer.seller}` : "/sellers"} className="shorts-offer-cta">
              Visit Store <FaStore />
            </Link>
          </div>
          <div className="shorts-offer-brand">
            {renderBrandRow(
              offer.seller,
              offer.seller_name,
              offer.seller_avatar,
              offer.seller_verified,
              false,
              getFollowState(offer.seller),
            )}
          </div>
        </div>

        <div className="shorts-rail">
          <button className="shorts-rail-btn" onClick={() => handleShare(offer, "offer")} aria-label="Share offer">
            <FaShareAlt />
          </button>
        </div>
      </div>
    );
  };

  const renderProductSlide = (product, index) => {
    const like = getLikeState(product);
    const imgs = images(product);
    const hasVideo = !!product.video;
    const useVideo = hasVideo && product._type !== "forced-image";
    const effective = parseFloat(product.effective_price);
    const original = parseFloat(product.price);
    const isSale = product.effective_price && effective < original;

    return (
      <div className={`shorts-slide ${index === activeIndex ? "active" : ""}`} key={product.id}>
        <div className="shorts-media" onClick={() => handleMediaTap(product, index)}>
          {useVideo && !videoBroken[product.id] ? (
            <video
              ref={(el) => { videoRefs.current[product.id] = el; }}
              src={resolveVideoUrl(product.video)}
              poster={imgs[0]}
              preload="metadata"
              muted={muted}
              loop
              playsInline
              autoPlay={index === 0}
              onTimeUpdate={(e) => handleTimeUpdate(product, e)}
              onError={() => setVideoBroken((prev) => ({ ...prev, [product.id]: true }))}
            />
          ) : imgs[0] ? (
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
          {useVideo && (
            <>
              <span className="shorts-video-badge"><FaPlay /> Watch</span>
              {videoPaused[product.id] && (
                <span className="shorts-video-paused"><FaPlay /></span>
              )}
              {videoBroken[product.id] && (
                <span className="shorts-video-unavailable">Video unavailable</span>
              )}
              <button
                type="button"
                className="shorts-mute-btn"
                aria-label={muted ? "Unmute video" : "Mute video"}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMute(product);
                }}
              >
                {muted ? <FaVolumeMute /> : <FaVolumeUp />}
              </button>
              {!videoBroken[product.id] && progress[product.id] > 0 && (
                <div className="shorts-video-progress">
                  <span style={{ width: `${Math.min(progress[product.id], 100)}%` }} />
                </div>
              )}
            </>
          )}
        </div>
        <div className="shorts-gradient top" />
        <div className="shorts-gradient bottom" />

        {/* Double-tap heart burst */}
        {burst === product.id && (
          <div className="shorts-like-burst">
            <FaHeart />
          </div>
        )}

        {/* Seller branding */}
        <div className="shorts-top-bar">
          {renderBrandRow(product.seller, product.seller_name, product.seller_avatar, product.seller_verified, product.is_own_seller, getFollowState(product.seller))}
        </div>

        {/* Right action rail */}
        <div className="shorts-rail">
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
            {(product.comment_count || (comments[product.id] || []).length) > 0 && (
              <span>{product.comment_count || (comments[product.id] || []).length}</span>
            )}
          </button>

          <button className="shorts-rail-btn" onClick={() => handleShare(product, "product")} aria-label="Share">
            <FaShareAlt />
          </button>

          <button
            className={`shorts-rail-btn save ${wishlistStates[product.id] ? "active" : ""}`}
            onClick={() => toggleWishlist(product)}
            aria-label={wishlistStates[product.id] ? "Remove from saved" : "Save product"}
            title={wishlistStates[product.id] ? "Saved" : "Save"}
          >
            {wishlistStates[product.id] ? <FaBookmark /> : <FaRegBookmark />}
          </button>

          <button className="shorts-rail-btn cart" onClick={() => addToCart(product)} aria-label="Add to cart">
            <FaShoppingCart />
          </button>
        </div>

        {/* Bottom info */}
        <div className="shorts-footer">
          {product.average_rating > 0 && (
            <span className="shorts-rating">
              {renderStars(product.average_rating)}
              <em>{product.average_rating}</em>
            </span>
          )}
          <h2 className="shorts-title">{product.name}</h2>
          {product.description && <p className="shorts-desc">{product.description}</p>}
          <div className="shorts-buy-row">
            <div className="shorts-price">
              {isSale ? (
                <>
                  <span className="shorts-price-now">{parseFloat(product.effective_price || 0).toFixed(2)} L.E</span>
                  <span className="shorts-price-was">{parseFloat(product.price || 0).toFixed(2)} L.E</span>
                </>
              ) : (
                <span className="shorts-price-now">{parseFloat(product.price || 0).toFixed(2)} L.E</span>
              )}
            </div>
            <Link
              to={`/product/${product.id}`}
              className="shorts-shop-btn"
              onClick={(e) => e.stopPropagation()}
            >
              <FaShoppingBag /> Shop now
            </Link>
            <button className="shorts-buy-btn" onClick={() => addToCart(product)}>
              <FaShoppingCart /> Add to Cart
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderAdSlide = (ad, index) => {
    const posterImg = ad.poster ? resolveMediaUrl(ad.poster) : null;
    const key = mediaKey(ad);

    return (
      <div className={`shorts-slide shorts-slide--ad ${index === activeIndex ? "active" : ""}`} key={`ad-${ad.id}`}>
        <div className="shorts-media" onClick={() => handleMediaTap(ad, index)}>
          {!videoBroken[key] ? (
            <video
              ref={(el) => { videoRefs.current[key] = el; }}
              src={resolveVideoUrl(ad.video)}
              poster={posterImg || undefined}
              preload="metadata"
              muted={muted}
              loop
              playsInline
              autoPlay={index === 0}
              onTimeUpdate={(e) => handleTimeUpdate(ad, e)}
              onError={() => setVideoBroken((prev) => ({ ...prev, [key]: true }))}
            />
          ) : posterImg ? (
            <img src={posterImg} alt={ad.title || "Advertisement"} loading={index > 1 ? "lazy" : "eager"} decoding="async" />
          ) : (
            <div className="shorts-placeholder">
              <FaPercent size={48} />
            </div>
          )}
          <>
            <span className="shorts-video-badge"><FaPlay /> Watch</span>
            {videoPaused[key] && (
              <span className="shorts-video-paused"><FaPlay /></span>
            )}
            {videoBroken[key] && (
              <span className="shorts-video-unavailable">Video unavailable</span>
            )}
            <button
              type="button"
              className="shorts-mute-btn"
              aria-label={muted ? "Unmute video" : "Mute video"}
              onClick={(e) => {
                e.stopPropagation();
                toggleMute(ad);
              }}
            >
              {muted ? <FaVolumeMute /> : <FaVolumeUp />}
            </button>
            {!videoBroken[key] && progress[key] > 0 && (
              <div className="shorts-video-progress">
                <span style={{ width: `${Math.min(progress[key], 100)}%` }} />
              </div>
            )}
          </>
        </div>
        <div className="shorts-gradient top" />
        <div className="shorts-gradient bottom" />

        {burst === ad.id && (
          <div className="shorts-like-burst">
            <FaHeart />
          </div>
        )}

        {/* Seller branding */}
        <div className="shorts-top-bar">
          {renderBrandRow(
            ad.seller,
            ad.seller_name,
            ad.seller_avatar,
            ad.seller_verified,
            ad.is_own_seller,
            getFollowState(ad.seller),
          )}
        </div>

        {/* Right action rail */}
        <div className="shorts-rail">
          <button className="shorts-rail-btn" onClick={() => handleShare(ad, "p")} aria-label="Share ad">
            <FaShareAlt />
          </button>
        </div>

        {/* Bottom info */}
        <div className="shorts-footer">
          <span className="shorts-ad-chip"><FaVolumeUp /> Advertisement</span>
          {ad.title && <h2 className="shorts-title">{ad.title}</h2>}
          {ad.description && <p className="shorts-desc">{ad.description}</p>}
          <div className="shorts-buy-row">
            <Link
              to={ad.seller ? `/seller/${ad.seller}` : "/sellers"}
              className="shorts-shop-btn"
              onClick={(e) => e.stopPropagation()}
            >
              <FaUserCircle /> Visit Store
            </Link>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`shorts-feed ${onEnd ? "has-caption" : ""}`} ref={containerRef} style={{ height }}>
      {items.map((item, index) =>
        isAd(item) ? renderAdSlide(item, index) : isOffer(item) ? renderOfferSlide(item, index) : renderProductSlide(item, index)
      )}

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
              {(() => {
                const activeComments = comments[commentOpenId] || [];
                return (
                  <>
                    {activeComments.length === 0 && <p className="shorts-comments-empty">No comments yet. Be the first!</p>}
                    {activeComments.map((comment) => {
                      const target = items.find((p) => p && !isOffer(p) && p.id === commentOpenId);
                      return (
                        <div className="shorts-comment" key={comment.id}>
                          <div className="shorts-comment-avatar">
                            {comment.user_avatar ? <img src={resolveMediaUrl(comment.user_avatar)} alt="" /> : <FaUserCircle />}
                          </div>
                          <div className="shorts-comment-body">
                            <strong>{comment.user_name}</strong>
                            <p>{comment.content}</p>
                            <span>{new Date(comment.created_at).toLocaleDateString()}</span>
                          </div>
                          {target && currentUserId && comment.user_id === currentUserId && (
                            <button className="shorts-comment-delete" onClick={() => deleteComment(target.id, comment.id)} aria-label="Delete">
                              <FaTrash />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </>
                );
              })()}
            </div>
            <form
              className="shorts-comments-form"
              onSubmit={(e) => {
                e.preventDefault();
                submitComment(items.find((p) => p && !isOffer(p) && p.id === commentOpenId));
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
      {/* nav dots removed to keep the rails clean */}
    </div>
  );
}