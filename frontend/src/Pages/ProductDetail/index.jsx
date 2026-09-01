import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  FaHeart,
  FaThumbsDown,
  FaShareAlt,
  FaComment,
  FaPlay,
  FaVideo,
  FaImage,
  FaShoppingCart,
  FaBolt,
  FaMinus,
  FaPlus,
  FaCheckCircle,
  FaArrowLeft,
  FaTag,
} from "react-icons/fa";
import api from "../../services/api";
import { ACCESS_TOKEN } from "../../services/constants";
import { resolveMediaUrl } from "../../utils/media";
import Card from "../../Components/Card";
import "./css/style.scss";

export default function ProductDetail({ categories = [], tags = [] }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [disliked, setDisliked] = useState(false);
  const [dislikeCount, setDislikeCount] = useState(0);
  const [inWishlist, setInWishlist] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [added, setAdded] = useState(false);
  const [related, setRelated] = useState([]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setNotFound(false);
    api
      .get(`/api/products/${id}/`)
      .then((res) => {
        if (!active) return;
        setProduct(res.data);
        setLiked(!!res.data.is_liked);
        setLikeCount(res.data.like_count || 0);
        setDisliked(!!res.data.is_disliked);
        setDislikeCount(res.data.dislike_count || 0);
      })
      .catch(() => {
        if (active) setNotFound(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [id]);

  // Related products from the same category
  useEffect(() => {
    const productId = product?.id;
    const categoryId = product?.category;
    if (!productId || !categoryId) return;
    let active = true;
    api
      .get(`/api/products/?category=${categoryId}&page_size=12`)
      .then((res) => {
        if (!active) return;
        const results = res?.data?.results || res?.data?.products || [];
        setRelated(results.filter((p) => String(p.id) !== String(productId)).slice(0, 8));
      })
      .catch(() => {
        if (active) setRelated([]);
      });
    return () => { active = false; };
  }, [product?.id, product?.category]);

  useEffect(() => {
    if (!product?.id || !isLoggedIn()) return;
    api.get(`/api/wishlist/check/?product_id=${product.id}`).then((res) => {
      setInWishlist(res.data.in_wishlist);
    }).catch(() => {});
  }, [product?.id]);

  const images = useMemo(() => {
    if (!product) return [];
    return [
      resolveMediaUrl(product.image),
      ...(product.gallery_images?.map((g) => resolveMediaUrl(g.image)) || []),
    ].filter(Boolean);
  }, [product]);

  const galleryVideos = useMemo(
    () => (product?.gallery_videos || []).filter((g) => g && g.video),
    [product],
  );

  const sellerShown =
    !!product?.seller_name &&
    !!product?.seller &&
    String(product.seller_name).trim().toLowerCase() !==
      String(product.name || "").trim().toLowerCase();

  const categoryName = useMemo(() => {
    if (!product?.category) return null;
    return categories.find((c) => c.id === product.category)?.name || "Uncategorized";
  }, [product?.category, categories]);

  const isLoggedIn = () => {
    const access = localStorage.getItem(ACCESS_TOKEN);
    return access && access.trim() !== "";
  };

  const toggleLike = async () => {
    if (!isLoggedIn()) {
      window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    try {
      const res = await api.post(`/api/products/${product.id}/like/`);
      setLiked(res.data.liked);
      setLikeCount(res.data.like_count);
    } catch (err) {
      alert("Please log in to like products.");
    }
  };

  const toggleDislike = async () => {
    if (!isLoggedIn()) {
      window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    try {
      const res = await api.post(`/api/products/${product.id}/dislike/`);
      setDisliked(res.data.disliked);
      setDislikeCount(res.data.dislike_count);
    } catch (err) {
      alert(err.response?.data?.error || "Please log in to dislike products.");
    }
  };

  const toggleWishlist = async () => {
    if (!isLoggedIn()) {
      window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    try {
      if (inWishlist) {
        await api.delete("/api/wishlist/remove/", { data: { product_id: product.id } });
        setInWishlist(false);
      } else {
        await api.post("/api/wishlist/add/", { product_id: product.id });
        setInWishlist(true);
      }
    } catch (err) {
      alert("Please log in to save products.");
    }
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: product.name, text: product.description || product.name, url: shareUrl });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        alert("Link copied to clipboard!");
      }
    } catch (err) {}
  };

  const loadComments = async () => {
    const next = !commentsOpen;
    setCommentsOpen(next);
    if (!next || comments.length || commentsLoading) return;
    setCommentsLoading(true);
    try {
      const res = await api.get(`/api/products/${product.id}/comments/`);
      setComments(res.data);
    } catch (err) {
    } finally {
      setCommentsLoading(false);
    }
  };

  const submitComment = async (e) => {
    e.preventDefault();
    const text = commentText.trim();
    if (!text) return;
    try {
      const res = await api.post("/api/products/comments/create/", {
        product: product.id,
        content: text,
      });
      setComments((prev) => [...prev, res.data]);
      setCommentText("");
    } catch (err) {
      alert("Please log in to comment.");
    }
  };

  const addToCart = () => {
    let cart = JSON.parse(localStorage.getItem("cart")) || [];
    const existing = cart.findIndex((item) => item.id === product.id);
    if (existing !== -1) cart[existing].quantity = (cart[existing].quantity || 1) + quantity;
    else cart.push({ ...product, quantity });
    localStorage.setItem("cart", JSON.stringify(cart));
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
    window.dispatchEvent(new Event("cart-updated"));
  };

  const buyNow = () => {
    addToCart();
    navigate("/checkout");
  };

  const renderStars = (rating) => {
    const r = Math.round(rating || 0);
    return (
      <span className="pd-stars">
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className={i <= r ? "on" : ""}>★</span>
        ))}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="pd pd--state">
        <div className="pd-skeleton">
          <div className="pd-skeleton__media" />
          <div className="pd-skeleton__body">
            <div className="pd-skeleton__line w40" />
            <div className="pd-skeleton__line w70" />
            <div className="pd-skeleton__line w90" />
            <div className="pd-skeleton__line w55" />
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="pd pd--state">
        <div className="pd-empty">
          <FaImage />
          <h1>Product not found</h1>
          <p>This product may have been removed or is awaiting approval.</p>
          <Link className="pd-btn pd-btn--primary" to="/products">Browse products</Link>
        </div>
      </div>
    );
  }

  const effectivePrice =
    product.effective_price && parseFloat(product.effective_price) < parseFloat(product.price)
      ? product.effective_price
      : null;

  return (
    <div className="pd">
      <Helmet>
        <title>{product.name} — instaBrandz</title>
        <meta name="description" content={product.description || product.name} />
        <meta property="og:title" content={`${product.name} — instaBrandz`} />
        <meta property="og:description" content={product.description || product.name} />
        <meta property="og:type" content="product" />
      </Helmet>

      <nav className="pd-crumbs" aria-label="Breadcrumb">
        <Link to="/"><FaArrowLeft /> Home</Link>
        <span>/</span>
        <Link to="/products">Shop</Link>
        {categoryName && (<><span>/</span><span className="pd-crumb-current">{categoryName}</span></>)}
      </nav>

      <div className="pd-grid">
        {/* ---------- Media ---------- */}
        <div className="pd-media">
          {product.video ? (
            <div className="pd-media__video">
              <video src={resolveMediaUrl(product.video)} muted playsInline controls preload="metadata" />
              <span className="pd-video-tag"><FaVideo /> Video</span>
            </div>
          ) : images.length ? (
            <img className="pd-media__img" src={images[0]} alt={product.name} />
          ) : (
            <div className="pd-media__empty"><FaImage /></div>
          )}
          {images.length > 1 && (
            <div className="pd-thumbs">
              {images.map((src, i) => (
                <img key={i} src={src} alt="" className="pd-thumbs__img" />
              ))}
            </div>
          )}
          {galleryVideos.length > 0 && (
            <div className="pd-gallery-videos">
              <h3><FaVideo /> More videos</h3>
              <div className="pd-gallery-videos__row">
                {galleryVideos.map((g) => (
                  <video
                    key={g.id}
                    src={resolveMediaUrl(g.video)}
                    controls
                    muted
                    playsInline
                    preload="metadata"
                    style={{ maxWidth: 260 }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ---------- Info ---------- */}
        <div className="pd-info">
          <div className="pd-badges">
            {product.video && <span className="pd-badge pd-badge--video"><FaPlay /> Short available</span>}
            {product.sold_today > 0 && <span className="pd-badge pd-badge--sold">🔥 {product.sold_today} sold today</span>}
          </div>

          {sellerShown && (
            <Link to={`/seller/${product.seller}`} className="pd-seller">
              {product.seller_avatar && (
                <img src={resolveMediaUrl(product.seller_avatar)} alt="" />
              )}
              <span>
                {product.seller_name}
                {product.seller_verified && <FaCheckCircle className="pd-seller__verified" />}
              </span>
            </Link>
          )}

          <h1 className="pd-title">{product.name}</h1>

          <div className="pd-social">
            <button className={`pd-social-btn ${liked ? "on" : ""}`} onClick={toggleLike}>
              <FaHeart /> {likeCount} {likeCount === 1 ? "like" : "likes"}
            </button>
            {product.is_bought && (
              <button className={`pd-social-btn pd-dislike-btn ${disliked ? "on" : ""}`} onClick={toggleDislike}>
                <FaThumbsDown /> {dislikeCount} {dislikeCount === 1 ? "dislike" : "dislikes"}
              </button>
            )}
            <button className="pd-social-btn" onClick={loadComments}>
              <FaComment /> {product.comment_count ?? comments.length} comments
            </button>
            <button className="pd-social-btn" onClick={handleShare}>
              <FaShareAlt /> Share
            </button>
          </div>

          {(product.average_rating > 0 || product.comment_count > 0) && (
            <div className="pd-rating">
              {product.average_rating > 0 && (
                <>
                  {renderStars(product.average_rating)}
                  <span>{Number(product.average_rating).toFixed(1)}</span>
                </>
              )}
              {product.comment_count > 0 && <span>{product.comment_count} reviews</span>}
            </div>
          )}

          <div className="pd-price">
            {effectivePrice ? (
              <>
                <span className="pd-price__now">{effectivePrice} L.E</span>
                <span className="pd-price__was">{product.price} L.E</span>
              </>
            ) : (
              <span className="pd-price__now">{product.price} L.E</span>
            )}
          </div>

          {product.description && (
            <div className="pd-desc">
              <h2>About this product</h2>
              <p>{product.description}</p>
            </div>
          )}

          {product.tags?.length > 0 && (
            <div className="pd-tags">
              {product.tags.map((tagId) => {
                const tag = tags.find((t) => t.id === tagId);
                return tag ? <span key={tagId} className="pd-tag"><FaTag /> {tag.name}</span> : null;
              })}
            </div>
          )}

          {commentsOpen && (
            <div className="pd-comments">
              <div className="pd-comments__list">
                {commentsLoading ? (
                  <p className="pd-comments__empty pd-comments__loading">
                    <span className="pd-spinner" /> Loading comments…
                  </p>
                ) : comments.length === 0 ? (
                  <p className="pd-comments__empty">No comments yet. Be the first!</p>
                ) : comments.map((c) => (
                  <div key={c.id} className="pd-comment">
                    <strong>{c.user_name}</strong>
                    <p>{c.content}</p>
                    <span>{new Date(c.created_at).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
              {isLoggedIn() && product.is_bought ? (
                <form className="pd-comment-form" onSubmit={submitComment}>
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Write a comment..."
                    maxLength={500}
                  />
                  <button type="submit"><FaComment /></button>
                </form>
              ) : isLoggedIn() ? (
                <p className="pd-comments__hint">Buy this product to join the conversation.</p>
              ) : (
                <p className="pd-comments__hint"><Link to="/login">Log in</Link> to join the conversation.</p>
              )}
            </div>
          )}

          <div className="pd-buy">
            <div className="pd-qty">
              <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label="Decrease quantity"><FaMinus /></button>
              <input type="number" value={quantity} min="1" max="99" onChange={(e) => {
                const v = parseInt(e.target.value) || 1;
                if (v >= 1 && v <= 99) setQuantity(v);
              }} />
              <button onClick={() => setQuantity((q) => Math.min(99, q + 1))} aria-label="Increase quantity"><FaPlus /></button>
            </div>
            <button className="pd-btn pd-btn--cart" onClick={addToCart} disabled={added}>
              <FaShoppingCart /> {added ? "Added!" : "Add to Cart"}
            </button>
            <button className="pd-btn pd-btn--buy" onClick={buyNow}>
              <FaBolt /> Buy Now
            </button>
            <button
              className={`pd-btn pd-btn--wish ${inWishlist ? "on" : ""}`}
              onClick={toggleWishlist}
              aria-label="Toggle wishlist"
            >
              <FaHeart /> {inWishlist ? "Saved" : "Save"}
            </button>
          </div>

          {product.video && (
            <Link to={`/shorts?p=${product.id}`} className="pd-watch">
              <FaPlay /> Watch this product as a short
            </Link>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <section className="pd-related" aria-label="Related products">
          <div className="pd-related__head">
            <h2>You may also like</h2>
            <Link to={categoryName ? `/category/${product.category}` : "/products"}>
              {categoryName || "All products"} →
            </Link>
          </div>
          <div className="pd-related__grid">
            {related.map((p) => (
              <Card key={p.id} card={p} categories={categories} tags={tags} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}