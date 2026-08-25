import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Heart, ShoppingCart, Trash2, ArrowLeft } from "lucide-react";
import api from "../../services/api";
import Card from "../../Components/Card";
import "./css/style.scss";

export default function WishlistPage() {
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchWishlist();
  }, []);

  const fetchWishlist = async () => {
    try {
      const response = await api.get("/api/wishlist/");
      setWishlist(response.data.results || response.data);
    } catch (err) {
      console.error("Failed to fetch wishlist:", err);
    } finally {
      setLoading(false);
    }
  };

  const removeFromWishlist = async (productId) => {
    try {
      await api.delete("/api/wishlist/remove/", { data: { product_id: productId } });
      setWishlist((prev) => prev.filter((item) => item.product !== productId));
    } catch (err) {
      console.error("Failed to remove from wishlist:", err);
    }
  };

  if (loading) {
    return (
      <div className="wishlist-page">
        <div className="wishlist-loading">
          <div className="wishlist-loading__spinner" />
          <p>Loading wishlist...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="wishlist-page">
      <div className="wishlist-header">
        <button className="wishlist-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </button>
        <Heart size={24} />
        <h1>My Wishlist</h1>
        <span className="wishlist-count">{wishlist.length} items</span>
      </div>

      <div className="wishlist-grid">
        {wishlist.length === 0 ? (
          <div className="wishlist-empty">
            <Heart size={48} />
            <h3>Your wishlist is empty</h3>
            <p>Save items you love for later.</p>
            <Link to="/products" className="wishlist-browse-btn">
              Browse Products
            </Link>
          </div>
        ) : (
          wishlist.map((item) => (
            <div key={item.id} className="wishlist-item">
              <Card product={item.product_detail} />
              <button
                className="wishlist-remove"
                onClick={() => removeFromWishlist(item.product)}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
